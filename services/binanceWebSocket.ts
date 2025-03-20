import { useEffect, useRef, useState } from "react";

const BINANCE_WS_URL = "wss://stream.binance.com:9443/stream";
const BINANCE_API_URL = "https://api.binance.com/api/v3/depth";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

interface KlineData {
  t: number;  // Kline start time
  T: number;  // Kline close time
  s: string;  // Symbol
  i: string;  // Interval
  o: string;  // Open price
  c: string;  // Close price
  h: string;  // High price
  l: string;  // Low price
  v: string;  // Base asset volume
  n: number;  // Number of trades
  x: boolean; // Is this kline closed?
  q: string;  // Quote asset volume
  V: string;  // Taker buy base asset volume
  Q: string;  // Taker buy quote asset volume
  B: string;  // Ignore
}

interface KlineMessage {
  e: string;  // Event type
  E: number;  // Event time
  s: string;  // Symbol
  k: KlineData;
}

interface WebSocketState {
  depthData: any;
  klinesData: KlineMessage | null;
}

export const useBinanceWebSocket = (isOpen: boolean, timeframe: string, pair: string) => {
  const [state, setState] = useState<WebSocketState>({
    depthData: null,
    klinesData: null,
  });
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const userInitiatedClose = useRef<boolean>(false);
  const currentPair = useRef<string>(pair);
  const currentTimeframe = useRef<string>(timeframe);
  const bufferedEvents = useRef<any[]>([]);
  const firstEventReceived = useRef<boolean>(false);
  const firstEventU = useRef<number | null>(null);
  const localOrderBook = useRef<any>(null);
  
  // Step 1: Open WebSocket connection
  const connect = async () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    userInitiatedClose.current = false;
    firstEventReceived.current = false;
    firstEventU.current = null;
    bufferedEvents.current = [];
    localOrderBook.current = null;

    try {
      ws.current = new WebSocket(BINANCE_WS_URL);

      ws.current.onopen = () => {
        reconnectAttempts.current = 0;
        console.log("WebSocket connected, subscribing to streams...");
        
        // Subscribe to streams first to start collecting events
        subscribeToDepth(currentPair.current);
        subscribeToKlines(currentPair.current, currentTimeframe.current);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.result !== undefined) {
            console.log("Subscription result:", message);
            return;
          }

          if (message.stream) {
            if (message.stream.includes('@depth')) {
              // Step 2: Buffer events from the stream
              const depthEvent = message.data;
              
              // Store the U from the first event
              if (!firstEventReceived.current) {
                firstEventU.current = depthEvent.U;
                firstEventReceived.current = true;
                console.log(`First depth event received, U=${firstEventU.current}`);
                
                // Step 3: Get depth snapshot
                fetchDepthSnapshot(currentPair.current);
              }
              
              // Add the event to the buffer
              bufferedEvents.current.push(depthEvent);
              console.log(`Buffered depth event: U=${depthEvent.U}, u=${depthEvent.u}`);
              
              // Process the events if we have a snapshot already
              if (localOrderBook.current) {
                processBufferedEvents();
              }
            } else if (message.stream.includes('@kline')) {
              setState(prev => ({ ...prev, klinesData: message.data }));
            }
          }
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      ws.current.onclose = (event) => {
        if (!userInitiatedClose.current) {
          if (isOpen && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts.current += 1;
            reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY);
          }
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket encountered an error:", error);
      };

    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
    }
  };
  
  // Step 3: Get depth snapshot
  const fetchDepthSnapshot = async (symbol: string) => {
    try {
      const upperSymbol = symbol.toUpperCase();
      console.log(`Fetching depth snapshot for ${upperSymbol}`);
      
      const response = await fetch(`${BINANCE_API_URL}?symbol=${upperSymbol}&limit=1000`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const snapshot = await response.json();
      console.log(`Depth snapshot received: lastUpdateId=${snapshot.lastUpdateId}`);
      
      // Step 4: Check if snapshot is newer than first event
      if (firstEventU.current !== null && snapshot.lastUpdateId < firstEventU.current) {
        console.log("Snapshot is older than first event, fetching again...");
        return fetchDepthSnapshot(symbol);
      }
      
      // Step 5 and 6: Set local order book and discard outdated events
      localOrderBook.current = snapshot;
      console.log(`Local order book initialized with lastUpdateId=${localOrderBook.current.lastUpdateId}`);
      
      // Update UI state
      setState(prev => ({ ...prev, depthData: { ...snapshot } }));
      
      // Step 7: Process buffered events
      processBufferedEvents();
      
      return snapshot;
    } catch (error) {
      console.error("Failed to fetch depth snapshot:", error);
      // Retry after a delay
      setTimeout(() => {
        if (firstEventReceived.current) {
          fetchDepthSnapshot(symbol);
        }
      }, 2000);
      return null;
    }
  };
  
  const processBufferedEvents = () => {
    if (!localOrderBook.current || bufferedEvents.current.length === 0) {
      return;
    }
    
    const events = [...bufferedEvents.current];
    bufferedEvents.current = [];
    
    console.log(`Processing ${events.length} buffered events`);
    
    for (const event of events) {
      applyDepthEvent(event);
    }
  };
  
  const applyDepthEvent = (event: any) => {
    if (!localOrderBook.current) {
      console.log("No local order book, can't apply event");
      return;
    }
    
    // Step 7 (part 1): Apply the update procedure
    const lastUpdateId = localOrderBook.current.lastUpdateId;
    
    // If event.u <= lastUpdateId, ignore the event
    if (event.u <= lastUpdateId) {
      console.log(`Ignoring event: event.u (${event.u}) <= lastUpdateId (${lastUpdateId})`);
      return;
    }
    
    // If event.U > lastUpdateId+1, restart
    if (event.U > lastUpdateId + 1) {
      console.log(`Gap detected: event.U (${event.U}) > lastUpdateId+1 (${lastUpdateId + 1}), restarting`);
      firstEventReceived.current = false;
      firstEventU.current = null;
      bufferedEvents.current = [];
      localOrderBook.current = null;
      setState(prev => ({ ...prev, depthData: null }));
      return;
    }
    
    // Step 7 (part a-c): Update the local order book
    // Process bid updates (b)
    if (event.b && Array.isArray(event.b)) {
      for (const bid of event.b) {
        const [price, quantity] = bid;
        const quantityNum = parseFloat(quantity);
        
        if (quantityNum === 0) {
          // Remove the price level
          localOrderBook.current.bids = localOrderBook.current.bids.filter(
            (b: [string, string]) => b[0] !== price
          );
        } else {
          // Find and update or insert the price level
          const index = localOrderBook.current.bids.findIndex(
            (b: [string, string]) => b[0] === price
          );
          
          if (index >= 0) {
            localOrderBook.current.bids[index] = bid;
          } else {
            localOrderBook.current.bids.push(bid);
            // Sort bids by price (descending)
            localOrderBook.current.bids.sort((a: [string, string], b: [string, string]) => 
              parseFloat(b[0]) - parseFloat(a[0])
            );
          }
        }
      }
    }
    
    // Process ask updates (a)
    if (event.a && Array.isArray(event.a)) {
      for (const ask of event.a) {
        const [price, quantity] = ask;
        const quantityNum = parseFloat(quantity);
        
        if (quantityNum === 0) {
          // Remove the price level
          localOrderBook.current.asks = localOrderBook.current.asks.filter(
            (a: [string, string]) => a[0] !== price
          );
        } else {
          // Find and update or insert the price level
          const index = localOrderBook.current.asks.findIndex(
            (a: [string, string]) => a[0] === price
          );
          
          if (index >= 0) {
            localOrderBook.current.asks[index] = ask;
          } else {
            localOrderBook.current.asks.push(ask);
            // Sort asks by price (ascending)
            localOrderBook.current.asks.sort((a: [string, string], b: [string, string]) => 
              parseFloat(a[0]) - parseFloat(b[0])
            );
          }
        }
      }
    }
    
    // Step 7 (part d): Update local order book's lastUpdateId
    localOrderBook.current.lastUpdateId = event.u;
    
    // Update UI state
    setState(prev => ({ 
      ...prev, 
      depthData: { ...localOrderBook.current } 
    }));
  };

  const subscribeToDepth = (pair: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const depthSubscribeMessage = JSON.stringify({
        method: "SUBSCRIBE",
        params: [`${pair.toLowerCase()}@depth`],
        id: 2
      });
      ws.current.send(depthSubscribeMessage);
      console.log(`Subscribed to depth for ${pair}`);
    }
  };

  const unsubscribeFromDepth = (pair: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const depthUnsubscribeMessage = JSON.stringify({
        method: "UNSUBSCRIBE",
        params: [`${pair.toLowerCase()}@depth`],
        id: 2
      });
      ws.current.send(depthUnsubscribeMessage);
      console.log(`Unsubscribed from depth for ${pair}`);
    }
  };

  const subscribeToKlines = (pair: string, timeframe: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const klinesSubscribeMessage = JSON.stringify({
        method: "SUBSCRIBE",
        params: [`${pair.toLowerCase()}@kline_${timeframe}`],
        id: 3
      });
      ws.current.send(klinesSubscribeMessage);
      console.log(`Subscribed to klines for ${pair} with timeframe ${timeframe}`);
    }
  };

  const unsubscribeFromKlines = (pair: string, timeframe: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const klinesUnsubscribeMessage = JSON.stringify({
        method: "UNSUBSCRIBE",
        params: [`${pair.toLowerCase()}@kline_${timeframe}`],
        id: 3
      });
      ws.current.send(klinesUnsubscribeMessage);
      console.log(`Unsubscribed from klines for ${pair} with timeframe ${timeframe}`);
    }
  };

  const disconnect = () => {
    userInitiatedClose.current = true;
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (ws.current) {
      if (ws.current.readyState === WebSocket.OPEN) {
        unsubscribeFromDepth(currentPair.current);
        unsubscribeFromKlines(currentPair.current, currentTimeframe.current);
        ws.current.close();
      }
      ws.current = null;
    }

    setState({
      depthData: null,
      klinesData: null,
    });
    
    reconnectAttempts.current = 0;
    firstEventReceived.current = false;
    firstEventU.current = null;
    bufferedEvents.current = [];
    localOrderBook.current = null;
  };

  useEffect(() => {
    currentPair.current = pair.toUpperCase();
    currentTimeframe.current = timeframe;

    if (isOpen) {
      disconnect();
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isOpen, pair]);

  useEffect(() => {
    if (isOpen) {
      unsubscribeFromKlines(currentPair.current, currentTimeframe.current);
      currentTimeframe.current = timeframe;
      subscribeToKlines(currentPair.current, currentTimeframe.current);
    }
  }, [timeframe]);

  return {
    depthData: state.depthData,
    klinesData: state.klinesData,
    isConnected: !!state.depthData && !!state.klinesData,
  };
};
