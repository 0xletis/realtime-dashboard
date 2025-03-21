import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Define the type for depth data
interface DepthData {
  lastUpdateId: number;
  bids: string[][];
  asks: string[][];
}

interface OrderBookProps {
  depthData: DepthData | null;
}

const OrderBook: React.FC<OrderBookProps> = ({ depthData }) => {
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('');

  useEffect(() => {
    // Update time when component mounts and when depthData changes
    setLastUpdateTime(new Date().toLocaleTimeString());

    // Optional: Update time every second
    const timer = setInterval(() => {
      setLastUpdateTime(new Date().toLocaleTimeString());
    }, 1000);

    return () => clearInterval(timer);
  }, [depthData?.lastUpdateId]);

  const filterNonZero = (orders: string[][]) => {
    return orders.filter(order => parseFloat(order[1]) > 0).slice(0, 9);
  };

  const formatPrice = (price: number) => {
    return price >= 1 ? price.toFixed(2) : price.toFixed(8);
  };

  const formatAmount = (amount: number) => {
    if (amount >= 10000) return amount.toFixed(0);
    if (amount >= 10) return amount.toFixed(2);
    return amount.toFixed(5);
  };

  if (!depthData || !depthData.bids || !depthData.asks) {
    // Create array of 9 items to match the filterNonZero slice
    const emptyRows = Array(9).fill(null);
    
    return (
      <Card className="w-full h-full bg-[#001a0f] border-[#003920] text-gray-100 flex flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-center">
            <span className="text-white text-sm">Order Book</span>
            <span className="text-xs font-normal text-gray-400 font-mono">
              Last Update: {lastUpdateTime}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col p-2">
          {/* Asks (Sells) */}
          <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-12 text-xs font-medium mb-1 px-2 text-gray-400">
              <div className="col-span-5 text-left">Price</div>
              <div className="col-span-4 text-right">Amount</div>
              <div className="col-span-3 text-right">Total</div>
            </div>
            <div className="space-y-[2px] flex-1 overflow-auto">
              {emptyRows.map((_, index) => (
                <div key={`empty-ask-${index}`} className="grid grid-cols-12 text-xs py-1 px-2">
                  <div className="col-span-5 text-left font-mono text-gray-500">---.--</div>
                  <div className="col-span-4 text-right font-mono text-gray-500">---.--</div>
                  <div className="col-span-3 text-right font-mono text-gray-500">---.--</div>
                </div>
              ))}
            </div>
          </div>

          {/* Spread */}
          <div className="py-1 px-2 my-1 border-y border-[#003920] flex justify-between text-xs">
            <span className="font-medium text-white">Spread</span>
            <span className="font-mono text-gray-300">0.00 (0.00%)</span>
          </div>

          {/* Bids (Buys) */}
          <div className="flex-1 flex flex-col">
            <div className="grid grid-cols-12 text-xs font-medium mb-1 px-2 text-gray-400">
              <div className="col-span-5 text-left">Price</div>
              <div className="col-span-4 text-right">Amount</div>
              <div className="col-span-3 text-right">Total</div>
            </div>
            <div className="space-y-[2px] flex-1 overflow-auto">
              {emptyRows.map((_, index) => (
                <div key={`empty-bid-${index}`} className="grid grid-cols-12 text-xs py-1 px-2">
                  <div className="col-span-5 text-left font-mono text-gray-500">---.--</div>
                  <div className="col-span-4 text-right font-mono text-gray-500">---.--</div>
                  <div className="col-span-3 text-right font-mono text-gray-500">---.--</div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort asks in ascending order (lowest ask first) and reverse for display
  const sortedAsks = filterNonZero([...depthData.asks].sort((a, b) => Number.parseFloat(a[0]) - Number.parseFloat(b[0]))).reverse();

  // Sort bids in descending order (highest bid first)
  const sortedBids = filterNonZero([...depthData.bids].sort((a, b) => Number.parseFloat(b[0]) - Number.parseFloat(a[0])));

  // Calculate the spread
  const lowestAsk = Number.parseFloat(sortedAsks[0][0]);
  const highestBid = Number.parseFloat(sortedBids[0][0]);
  const spread = lowestAsk - highestBid;
  const spreadPercentage = (spread / lowestAsk) * 100;

  // Find the maximum quantity for volume visualization
  const maxQuantity = Math.max(
    ...sortedAsks.map((ask) => Number.parseFloat(ask[1])),
    ...sortedBids.map((bid) => Number.parseFloat(bid[1])),
  );

  return (
    <Card className="w-full h-full bg-[#001a0f] border-[#003920] text-gray-100 flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span className="text-white text-sm">Order Book</span>
          <span className="text-xs font-normal text-gray-400 font-mono">
            Last Update: {lastUpdateTime}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-2">
        {/* Asks (Sells) */}
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-12 text-xs font-medium mb-1 px-2 text-gray-400">
            <div className="col-span-5 text-left">Price</div>
            <div className="col-span-4 text-right">Amount</div>
            <div className="col-span-3 text-right">Total</div>
          </div>
          <div className="space-y-[2px] flex-1 overflow-auto">
            {sortedAsks.map((ask, index) => {
              const price = Number.parseFloat(ask[0]);
              const quantity = Number.parseFloat(ask[1]);
              const volumePercentage = (quantity / maxQuantity) * 100;

              return (
                <div key={`ask-${index}`} className="grid grid-cols-12 text-xs relative py-1 px-2">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-red-500/10"
                    style={{ width: `${volumePercentage}%` }}
                  />
                  <div className="col-span-5 text-left font-mono text-red-400 z-10">{formatPrice(price)}</div>
                  <div className="col-span-4 text-right font-mono text-gray-300 z-10">{formatAmount(quantity)}</div>
                  <div className="col-span-3 text-right font-mono text-gray-400 z-10">
                    {(price * quantity).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spread */}
        <div className="py-1 px-2 my-1 border-y border-[#003920] flex justify-between text-xs">
          <span className="font-medium text-white">Spread</span>
          <span className="font-mono text-gray-300">
            {spread.toFixed(2)} ({spreadPercentage.toFixed(2)}%)
          </span>
        </div>

        {/* Bids (Buys) */}
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-12 text-xs font-medium mb-1 px-2 text-gray-400">
            <div className="col-span-5 text-left">Price</div>
            <div className="col-span-4 text-right">Amount</div>
            <div className="col-span-3 text-right">Total</div>
          </div>
          <div className="space-y-[2px] flex-1 overflow-auto">
            {sortedBids.map((bid, index) => {
              const price = Number.parseFloat(bid[0]);
              const quantity = Number.parseFloat(bid[1]);
              const volumePercentage = (quantity / maxQuantity) * 100;

              return (
                <div key={`bid-${index}`} className="grid grid-cols-12 text-xs relative py-1 px-2">
                  <div
                    className="absolute right-0 top-0 bottom-0 bg-green-500/10"
                    style={{ width: `${volumePercentage}%` }}
                  />
                  <div className="col-span-5 text-left font-mono text-green-400 z-10">{formatPrice(price)}</div>
                  <div className="col-span-4 text-right font-mono text-gray-300 z-10">{formatAmount(quantity)}</div>
                  <div className="col-span-3 text-right font-mono text-gray-400 z-10">
                    {(price * quantity).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderBook;

