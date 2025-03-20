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
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Binance WebSocket Test</h1>
      
      <div className="flex gap-4">
        <div className="w-3/4">
          {/* Status & Selectors */}
          <div className="flex items-center gap-2 justify-between mb-4">
              <div className="flex items-center gap-2">
                <span>{getStatusIcon()}</span>
                <span>Status: {getStatusText()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Select onValueChange={handleTimeframeChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="1m" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Timeframe</SelectLabel>
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
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="BTCUSDT" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Pair</SelectLabel>
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
          <TradeChart historicalKlines={historicalKlines} pair={pair} />
        </div>
        {/* Depth Data */}
        <div className="w-1/4">
          <Orderbook depthData={depthData}></Orderbook>
        </div>
      </div>
    </div>
  );
}
