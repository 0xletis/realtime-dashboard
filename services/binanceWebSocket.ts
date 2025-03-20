import { useEffect, useRef, useState } from "react";

const BINANCE_WS_URL = "wss://stream.binance.com:9443/stream";
const BINANCE_API_URL = "https://api.binance.com/api/v3";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;
const CONNECTION_CHECK_INTERVAL = 3000; // 3 seconds

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
  historicalKlines: any[];
  connectionStatus: 'connected' | 'disconnected';
  lastError: string | null;
}

export const useBinanceWebSocket = (isOpen: boolean, timeframe: string, pair: string) => {
  const [state, setState] = useState<WebSocketState>({
    depthData: null,
    klinesData: null,
    historicalKlines: [],
    connectionStatus: 'disconnected',
    lastError: null
  });
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const connectionCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const userInitiatedClose = useRef<boolean>(false);
  const currentPair = useRef<string>(pair);
  const currentTimeframe = useRef<string>(timeframe);
  const bufferedEvents = useRef<any[]>([]);
  const firstEventReceived = useRef<boolean>(false);
  const firstEventU = useRef<number | null>(null);
  const localOrderBook = useRef<any>(null);
  const lastMessageTimestamp = useRef<number>(Date.now());

  const checkConnection = () => {
    const now = Date.now();
    const timeSinceLastMessage = now - lastMessageTimestamp.current;

    // If no message received in last 5 seconds, consider disconnected
    setState(prev => ({
      ...prev,
      connectionStatus: timeSinceLastMessage > 5000 ? 'disconnected' : 'connected'
    }));
  };

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
        
        // Start connection check interval
        if (connectionCheckInterval.current) {
          clearInterval(connectionCheckInterval.current);
        }
        connectionCheckInterval.current = setInterval(checkConnection, CONNECTION_CHECK_INTERVAL);
        
        subscribeToDepth(currentPair.current);
        subscribeToKlines(currentPair.current, currentTimeframe.current);
      };

      ws.current.onmessage = (event) => {
        lastMessageTimestamp.current = Date.now();
        setState(prev => ({ ...prev, connectionStatus: 'connected' }));
        
        try {
          const message = JSON.parse(event.data);
          
          if (message.result !== undefined) {
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
                fetchDepthSnapshot(currentPair.current);
              }
              
              // Add the event to the buffer
              bufferedEvents.current.push(depthEvent);
              
              // Process the events if we have a snapshot already
              if (localOrderBook.current) {
                processBufferedEvents();
              }
            } else if (message.stream.includes('@kline')) {
              const klineData = message.data;
              const newKline = {
                time: klineData.k.t / 1000,
                open: parseFloat(klineData.k.o),
                high: parseFloat(klineData.k.h),
                low: parseFloat(klineData.k.l),
                close: parseFloat(klineData.k.c),
                volume: parseFloat(klineData.k.v)  // Add volume here
              };

              setState(prev => {
                // Update the last candle if it's the same timestamp, otherwise add new
                const updatedKlines = [...prev.historicalKlines];
                const lastIndex = updatedKlines.length - 1;
                
                if (lastIndex >= 0 && updatedKlines[lastIndex].time === newKline.time) {
                  updatedKlines[lastIndex] = newKline;
                } else {
                  updatedKlines.push(newKline);
                }

                return {
                  ...prev,
                  klinesData: message.data,
                  historicalKlines: updatedKlines
                };
              });
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
      
      const response = await fetch(`${BINANCE_API_URL}/depth?symbol=${upperSymbol}&limit=1000`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const snapshot = await response.json();
      
      // Step 4: Check if snapshot is newer than first event
      if (firstEventU.current !== null && snapshot.lastUpdateId < firstEventU.current) {
        return fetchDepthSnapshot(symbol);
      }
      
      // Step 5 and 6: Set local order book and discard outdated events
      localOrderBook.current = snapshot;
      
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
    
    
    for (const event of events) {
      applyDepthEvent(event);
    }
  };
  
  const applyDepthEvent = (event: any) => {
    if (!localOrderBook.current) {
      return;
    }
    
    // Step 7 (part 1): Apply the update procedure
    const lastUpdateId = localOrderBook.current.lastUpdateId;
    
    // If event.u <= lastUpdateId, ignore the event
    if (event.u <= lastUpdateId) {
      return;
    }
    
    // If event.U > lastUpdateId+1, restart
    if (event.U > lastUpdateId + 1) {
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
    }
  };

  const disconnect = () => {
    userInitiatedClose.current = true;
    
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (connectionCheckInterval.current) {
      clearInterval(connectionCheckInterval.current);
      connectionCheckInterval.current = null;
    }

    if (ws.current) {
      if (ws.current.readyState === WebSocket.OPEN) {
        unsubscribeFromDepth(currentPair.current);
        unsubscribeFromKlines(currentPair.current, currentTimeframe.current);
        ws.current.close();
      }
      ws.current = null;
    }

    setState(prev => ({
      ...prev,
      depthData: null,
      klinesData: null,
      historicalKlines: [],
      connectionStatus: 'disconnected'
    }));
    
    reconnectAttempts.current = 0;
    firstEventReceived.current = false;
    firstEventU.current = null;
    bufferedEvents.current = [];
    localOrderBook.current = null;
  };

  const fetchHistoricalKlines = async (symbol: string, interval: string) => {
    try {
      setState(prev => ({ ...prev, lastError: null }));
      const response = await fetch(`${BINANCE_API_URL}/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=1000`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      const formattedKlines = data.map((kline: any[]) => ({
        time: kline[0] / 1000,
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])  // Add volume from historical data
      }));
      
      
      setState(prev => ({ ...prev, historicalKlines: formattedKlines }));
      return formattedKlines;
    } catch (error) {
      console.error("Failed to fetch historical klines:", error);
      setState(prev => ({
        ...prev,
        lastError: 'Failed to fetch historical data',
        historicalKlines: []
      }));
      return [];
    }
  };

  useEffect(() => {
    currentPair.current = pair.toUpperCase();
    currentTimeframe.current = timeframe;

    if (isOpen) {
      disconnect();
      connect();
      fetchHistoricalKlines(currentPair.current, currentTimeframe.current);
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
      fetchHistoricalKlines(currentPair.current, currentTimeframe.current).then(() => {
        subscribeToKlines(currentPair.current, currentTimeframe.current);
      });
    }
  }, [timeframe]);

  return {
    depthData: state.depthData,
    klinesData: state.klinesData,
    historicalKlines: state.historicalKlines,
    connectionStatus: state.connectionStatus,
    lastError: state.lastError,
  };
};
