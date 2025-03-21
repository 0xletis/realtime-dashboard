'use client'

import { useState } from "react";
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
        githubUrl="https://github.com/0xletis/realtime-dashboard"
      />
      {/* Main content area with responsive layout */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-1 h-[calc(100vh-4rem)] overflow-y-auto lg:overflow-hidden">
        {/* Chart section - full width on mobile, 3/4 on desktop */}
        <div className="w-full lg:w-3/4 flex flex-col min-h-[500px]">
          <Controls 
            connectionStatus={connectionStatus}
            onTimeframeChange={handleTimeframeChange}
            onPairChange={handlePairChange}
          />
          {/* Kline Chart */}
          <div className="flex-1 rounded-lg overflow-hidden bg-[#001a0f]">
            <TradeChart historicalKlines={historicalKlines} pair={pair} />
          </div>
        </div>
        {/* Depth Data - full width on mobile, 1/4 on desktop */}
        <div className="w-full lg:w-1/4 h-[600px] lg:h-full">
          <Orderbook depthData={depthData}></Orderbook>
        </div>
      </div>
    </div>
  );
}
