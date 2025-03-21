'use client'

import { useState, useEffect } from "react";
import { useBinanceWebSocket } from "@/services/binanceWebSocket";
import TradeChart from "@/components/common/tradechart";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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

  const getStatusIcon = () => {
    return connectionStatus === 'connected' ? "🟢" : "🔴";
  };

  const getStatusText = () => {
    return connectionStatus === 'connected' ? 'Connected' : 'Disconnected';
  };

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe);
  };

  const handlePairChange = (newPair: string) => {
    setPair(newPair);
  };

  return (
    <div className="font-mono bg-[#001a0f] min-h-screen h-screen flex flex-col text-gray-100">
      <div className="border-b border-[#003920] p-2 w-full bg-[#002713]/50 shadow-lg">
        <h1 className="text-xl font-extrabold text-white">Realtime Dashboard</h1>
      </div>
      <div className="flex gap-4 p-4 flex-1 h-[calc(100vh-4rem)]">
        <div className="w-3/4 flex flex-col">
          {/* Status & Selectors */}
          <div className="flex items-center gap-2 justify-between mb-2 bg-[#002713]/50 p-2 rounded-lg border border-[#003920]">
              <div className="flex items-center gap-2 font-semibold">
                <span>{getStatusIcon()}</span>
                <span className="text-white">Status: {getStatusText()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={handleTimeframeChange}>
                  <SelectTrigger className="w-[180px] font-mono bg-[#001a0f] border-[#003920] text-gray-100">
                    <SelectValue placeholder="1m" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001a0f] border-[#003920]">
                    <SelectGroup className="font-mono text-gray-100">
                      <SelectLabel className="text-white">Timeframe</SelectLabel>
                      <SelectItem value="1m">1m</SelectItem>
                      <SelectItem value="5m">5m</SelectItem>
                      <SelectItem value="15m">15m</SelectItem>
                      <SelectItem value="1h">1h</SelectItem>
                      <SelectItem value="4h">4h</SelectItem>
                      <SelectItem value="1d">1D</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <Select onValueChange={handlePairChange}>
                  <SelectTrigger className="w-[180px] font-mono bg-[#001a0f] border-[#003920] text-gray-100">
                    <SelectValue placeholder="BTCUSDT" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#001a0f] border-[#003920]">
                    <SelectGroup className="font-mono text-gray-100">
                      <SelectLabel className="text-white">Pair</SelectLabel>
                      <SelectItem value="BTCUSDT">BTCUSDT</SelectItem>
                      <SelectItem value="ETHUSDT">ETHUSDT</SelectItem>
                      <SelectItem value="SOLUSDT">SOLUSDT</SelectItem>
                      <SelectItem value="PEPEUSDT">PEPEUSDT</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
          </div>
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
