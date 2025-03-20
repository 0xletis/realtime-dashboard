import React from 'react';
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

  const filterNonZero = (orders: string[][]) => {
    return orders.filter(order => parseFloat(order[1]) > 0).slice(0, 9);
  };

  const formatPrice = (price: number) => {
    return price < 0.1 ? price.toFixed(8) : price.toFixed(2);
  };

  if (!depthData || !depthData.bids || !depthData.asks) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order Book (Depth)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground flex items-center justify-center h-[400px]">
            No depth data available
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
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex justify-between items-center">
          <span>Order Book (Depth)</span>
          <span className="text-sm font-normal text-muted-foreground">
            Last Update: {new Date().toLocaleTimeString()}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Asks (Sells) - Displayed in descending order (highest first) */}
        <div className="mb-4">
          <div className="grid grid-cols-12 text-xs font-medium mb-1 px-2">
            <div className="col-span-5 text-left">Price</div>
            <div className="col-span-4 text-right">Amount</div>
            <div className="col-span-3 text-right">Total</div>
          </div>
          <div className="space-y-[2px]">
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
                  <div className="col-span-5 text-left font-mono text-red-500 z-10">{formatPrice(price)}</div>
                  <div className="col-span-4 text-right font-mono z-10">{quantity.toFixed(6)}</div>
                  <div className="col-span-3 text-right font-mono text-muted-foreground z-10">
                    {(price * quantity).toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Spread */}
        <div className="py-2 px-2 mb-2 border-y border-border flex justify-between text-xs">
          <span className="font-medium">Spread</span>
          <span className="font-mono">
            {spread.toFixed(2)} ({spreadPercentage.toFixed(2)}%)
          </span>
        </div>

        {/* Bids (Buys) */}
        <div>
          <div className="grid grid-cols-12 text-xs font-medium mb-1 px-2">
            <div className="col-span-5 text-left">Price</div>
            <div className="col-span-4 text-right">Amount</div>
            <div className="col-span-3 text-right">Total</div>
          </div>
          <div className="space-y-[2px]">
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
                  <div className="col-span-5 text-left font-mono text-green-500 z-10">{formatPrice(price)}</div>
                  <div className="col-span-4 text-right font-mono z-10">{quantity.toFixed(4)}</div>
                  <div className="col-span-3 text-right font-mono text-muted-foreground z-10">
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

