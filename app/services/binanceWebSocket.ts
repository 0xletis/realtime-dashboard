import { useEffect, useRef, useState } from "react";

const BINANCE_WS_URL = "wss://stream.binance.com:9443/stream";
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 3;

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

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
  status: ConnectionStatus;
  error: string | null;
}

export const useBinanceWebSocket = (isOpen: boolean, timeframe: string) => {
  const [state, setState] = useState<WebSocketState>({
    depthData: null,
    klinesData: null,
    status: 'disconnected',
    error: null
  });
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const userInitiatedClose = useRef<boolean>(false);

  const subscribeToStreams = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      // First, set the combined property
      const setPropertyMessage = JSON.stringify({
        method: "SET_PROPERTY",
        params: ["combined", true],
        id: 1
      });
      ws.current.send(setPropertyMessage);
      console.log("Setting combined property:", setPropertyMessage);

      // Subscribe to depth stream
      const depthSubscribeMessage = JSON.stringify({
        method: "SUBSCRIBE",
        params: ["btcusdt@depth"],
        id: 2
      });
      ws.current.send(depthSubscribeMessage);
      console.log("Subscribing to depth:", depthSubscribeMessage);

      // Subscribe to klines stream (1m interval)
      const klinesSubscribeMessage = JSON.stringify({
        method: "SUBSCRIBE",
        params: ["btcusdt@kline_1m"],
        id: 3
      });
      ws.current.send(klinesSubscribeMessage);
      console.log("Subscribing to klines:", klinesSubscribeMessage);
    }
  };

  const unsubscribeFromStreams = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      // Unsubscribe from depth stream
      const depthUnsubscribeMessage = JSON.stringify({
        method: "UNSUBSCRIBE",
        params: ["btcusdt@depth"],
        id: 2
      });
      ws.current.send(depthUnsubscribeMessage);

      // Unsubscribe from klines stream
      const klinesUnsubscribeMessage = JSON.stringify({
        method: "UNSUBSCRIBE",
        params: ["btcusdt@kline_1m"],
        id: 3
      });
      ws.current.send(klinesUnsubscribeMessage);
    }
  };

  const subscribeToKlines = (timeframe: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const klinesSubscribeMessage = JSON.stringify({
        method: "SUBSCRIBE",
        params: [`btcusdt@kline_${timeframe}`],
        id: 3
      });
      ws.current.send(klinesSubscribeMessage);
      console.log("Subscribing to klines:", klinesSubscribeMessage);
    }
  };

  const unsubscribeFromKlines = (timeframe: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      const klinesUnsubscribeMessage = JSON.stringify({
        method: "UNSUBSCRIBE",
        params: [`btcusdt@kline_${timeframe}`],
        id: 3
      });
      ws.current.send(klinesUnsubscribeMessage);
      console.log("Unsubscribing from klines:", klinesUnsubscribeMessage);
    }
  };

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Reset state for new connection
    setState(prev => ({ ...prev, status: 'connecting', error: null }));
    userInitiatedClose.current = false;

    try {
      ws.current = new WebSocket(BINANCE_WS_URL);

      ws.current.onopen = () => {
        console.log("WebSocket connected, setting up streams...");
        setState(prev => ({ ...prev, status: 'connected', error: null }));
        reconnectAttempts.current = 0; // Reset reconnect attempts on successful connection
        subscribeToStreams();
      };

      ws.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log("Raw WebSocket message:", message);
          
          // Skip subscription responses
          if (message.result !== undefined) {
            console.log("Skipping subscription response:", message);
            return;
          }

          // Handle stream messages
          if (message.stream) {
            if (message.stream.includes('@depth')) {
              console.log("Processing depth data:", message.data);
              setState(prev => {
                console.log("Previous state before depth update:", prev);
                const newState = { ...prev, depthData: message.data };
                console.log("New state after depth update:", newState);
                return newState;
              });
            } else if (message.stream.includes('@kline')) {
              console.log("Processing klines data:", message.data);
              setState(prev => {
                console.log("Previous state before klines update:", prev);
                const newState = { ...prev, klinesData: message.data as KlineMessage };
                console.log("New state after klines update:", newState);
                return newState;
              });
            }
          }
        } catch (error) {
          console.error("Failed to parse message:", error);
        }
      };

      ws.current.onclose = (event) => {
        console.log("WebSocket closed:", event);
        setState(prev => ({ 
          ...prev, 
          status: 'disconnected',
          error: userInitiatedClose.current ? null : 'Connection closed unexpectedly'
        }));

        // Only attempt to reconnect if:
        // 1. It wasn't user initiated
        // 2. We're still meant to be open
        // 3. Haven't exceeded max attempts
        if (!userInitiatedClose.current && isOpen && reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts.current += 1;
          setState(prev => ({
            ...prev,
            error: `Connection lost. Reconnecting... (Attempt ${reconnectAttempts.current}/${MAX_RECONNECT_ATTEMPTS})`
          }));
          
          reconnectTimeout.current = setTimeout(connect, RECONNECT_DELAY);
        } else if (reconnectAttempts.current >= MAX_RECONNECT_ATTEMPTS) {
          setState(prev => ({
            ...prev,
            status: 'error',
            error: 'Maximum reconnection attempts reached. Please try again later.'
          }));
        }
      };

      ws.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setState(prev => ({
          ...prev,
          status: 'error',
          error: 'WebSocket encountered an error'
        }));
      };

    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Failed to create WebSocket connection'
      }));
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
        unsubscribeFromStreams();
        ws.current.close();
      }
      ws.current = null;
    }

    setState({
      depthData: null,
      klinesData: null,
      status: 'disconnected',
      error: null
    });
    
    reconnectAttempts.current = 0;
  };

  useEffect(() => {
    if (isOpen) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      subscribeToKlines(timeframe);
    }
    return () => {
      unsubscribeFromKlines(timeframe);
    };
  }, [isOpen, timeframe]);

  // Add state change logging
  useEffect(() => {
    console.log("State changed:", state);
  }, [state]);

  return {
    depthData: state.depthData,
    klinesData: state.klinesData,
    status: state.status,
    error: state.error,
    isConnecting: state.status === 'connecting',
    isConnected: state.status === 'connected',
    hasError: state.status === 'error'
  };
};
