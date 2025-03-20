import { useEffect, useRef, useState } from "react";

const BINANCE_WS_URL = "wss://stream.binance.com:9443/stream";
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

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    userInitiatedClose.current = false;

    try {
      ws.current = new WebSocket(BINANCE_WS_URL);

      ws.current.onopen = () => {
        reconnectAttempts.current = 0;
        subscribeToDepth(currentPair.current);
        subscribeToKlines(currentPair.current, currentTimeframe.current);
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.result !== undefined) {
            return;
          }

          if (message.stream) {
            if (message.stream.includes('@depth')) {
              setState(prev => ({ ...prev, depthData: message.data }));
            } else if (message.stream.includes('@kline')) {
              setState(prev => ({ ...prev, klinesData: message.data as KlineMessage }));
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
  };

  useEffect(() => {
    currentPair.current = pair;
    currentTimeframe.current = timeframe;

    if (isOpen) {
      disconnect(); // Ensure clean disconnection before connecting
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
      // Unsubscribe from the current klines stream
      unsubscribeFromKlines(currentPair.current, currentTimeframe.current);
      
      // Update the current timeframe reference
      currentTimeframe.current = timeframe;
      
      // Subscribe to the new klines stream
      subscribeToKlines(currentPair.current, currentTimeframe.current);
    }
  }, [timeframe]);

  return {
    depthData: state.depthData,
    klinesData: state.klinesData,
    isConnected: !!state.depthData && !!state.klinesData,
  };
};
