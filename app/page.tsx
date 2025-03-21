'use client'

import { useState, useEffect } from "react";
import { useBinanceWebSocket } from "@/services/binanceWebSocket";
import TradeChart from "@/components/common/tradechart";
import Header from "@/components/common/header";
import Controls from "@/components/common/controls";
import Orderbook from "@/components/common/orderbook";

export default function Home() {
  const [timeframe, setTimeframe] = useState("1m");
  const [pair, setPair] = useState("btcusdt");
  const { 
    depthData, 
    klinesData, 
    historicalKlines,
    connectionStatus
  } = useBinanceWebSocket(true, timeframe, pair);

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  const handlePairChange = (newPair: string) => {
    setPair(newPair);
  };

  return (
    <div className="font-mono bg-[#001a0f] min-h-screen h-screen flex flex-col text-gray-100">
      <Header 
        title="PROTRADE"
        subtitle="Live Market Data"
        githubUrl="https://github.com/0xletis/realtime-dashboard"
      />
      <div className="flex gap-4 p-4 flex-1 h-[calc(100vh-4rem)]">
        <div className="w-3/4 flex flex-col">
          <Controls 
            connectionStatus={connectionStatus}
            onTimeframeChange={handleTimeframeChange}
            onPairChange={handlePairChange}
          />
          {/* Kline Chart */}
          <div className="flex-1 rounded-lg overflow-hidden">
            <TradeChart historicalKlines={historicalKlines} pair={pair} />
          </div>
        </div>
        {/* Depth Data */}
        <div className="w-1/4 h-full">
          <Orderbook depthData={depthData}></Orderbook>
        </div>
      </div>
    </div>
  );
}
