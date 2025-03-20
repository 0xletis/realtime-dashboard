'use client'

import { useBinanceWebSocket } from "./services/binanceWebSocket";
import { useState, useEffect } from "react";

export default function Home() {
  const [isOpen, setIsOpen] = useState(false);
  const { 
    depthData, 
    klinesData, 
    status, 
    error, 
    isConnecting,
    isConnected 
  } = useBinanceWebSocket(isOpen);

  // Add effect to log data changes
  useEffect(() => {
    console.log("Page component received new data:", {
      depthData,
      klinesData,
      status
    });
  }, [depthData, klinesData, status]);

  const handleOpenConnection = () => {
    console.log("Opening connection...");
    setIsOpen(true);
  };

  const handleCloseConnection = () => {
    console.log("Closing connection...");
    setIsOpen(false);
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return "🟢";
      case 'connecting':
        return "🟡";
      case 'error':
        return "🔴";
      default:
        return "⚪";
    }
  };

  // Add debugging information
  console.log("Current state:", {
    isOpen,
    status,
    hasDepthData: !!depthData,
    hasKlinesData: !!klinesData,
    depthData,
    klinesData
  });

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Binance WebSocket Test</h1>
      
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span>{getStatusIcon()}</span>
          <span>Status: {status}</span>
        </div>

        {error && (
          <div className="text-red-500 mb-2">
            Error: {error}
          </div>
        )}

        <button
          onClick={isConnected ? handleCloseConnection : handleOpenConnection}
          className={`px-4 py-2 rounded ${
            isConnected 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-green-500 hover:bg-green-600'
          } text-white`}
          disabled={isConnecting}
        >
          {isConnecting 
            ? 'Connecting...' 
            : isConnected 
              ? 'Close Connection' 
              : 'Open Connection'
          }
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Klines Data */}
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Klines Data:</h2>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {klinesData && klinesData.k ? (
              <div>
                <div className="mb-2">
                  <strong>Symbol:</strong> {klinesData.s}
                </div>
                <div className="mb-2">
                  <strong>Interval:</strong> {klinesData.k.i}
                </div>
                <div className="mb-2">
                  <strong>Event Time:</strong> {new Date(klinesData.E).toLocaleString()}
                </div>
                <div className="mt-2">
                  <h3 className="font-semibold mb-1">Candle Data:</h3>
                  <div className="space-y-1">
                    <div>Open Time: {new Date(klinesData.k.t).toLocaleString()}</div>
                    <div>Close Time: {new Date(klinesData.k.T).toLocaleString()}</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>Open: <span className="text-green-600">{klinesData.k.o}</span></div>
                      <div>Close: <span className="text-red-600">{klinesData.k.c}</span></div>
                      <div>High: <span className="text-green-600">{klinesData.k.h}</span></div>
                      <div>Low: <span className="text-red-600">{klinesData.k.l}</span></div>
                    </div>
                    <div>Volume: {klinesData.k.v}</div>
                    <div>Quote Volume: {klinesData.k.q}</div>
                    <div>Number of Trades: {klinesData.k.n}</div>
                    <div>Status: {klinesData.k.x ? 'Closed' : 'Open'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">No klines data available</div>
            )}
          </div>
        </div>

        {/* Depth Data */}
        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Order Book (Depth):</h2>
          <div className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {depthData && depthData.b && depthData.a ? (
              <div>
                <div className="mb-2">
                  <strong>Last Update ID:</strong> {depthData.u}
                </div>
                <div className="mb-2">
                  <strong>Event Time:</strong> {new Date(depthData.E).toLocaleString()}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-1">Bids (Top 10)</h3>
                    <div className="space-y-1">
                      {Array.isArray(depthData.b) && depthData.b.slice(0, 10).map((bid: string[], index: number) => (
                        <div key={index} className="text-green-600">
                          Price: {bid[0]} | Quantity: {bid[1]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Asks (Top 10)</h3>
                    <div className="space-y-1">
                      {Array.isArray(depthData.a) && depthData.a.slice(0, 10).map((ask: string[], index: number) => (
                        <div key={index} className="text-red-600">
                          Price: {ask[0]} | Quantity: {ask[1]}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500">No depth data available</div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
}
