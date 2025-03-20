import { createChart, CandlestickSeries } from 'lightweight-charts';
import { useEffect, useRef, memo } from 'react';

interface TradeChartProps {
    historicalKlines: any[]; // Receives kline data from parent
}

const TradeChart = ({ historicalKlines }: TradeChartProps) => {
    // Refs to maintain chart instances across re-renders
    const chartContainerRef = useRef<HTMLDivElement>(null);  // Reference to the DOM container
    const chartRef = useRef<any>(null);      // Reference to the main chart instance
    const seriesRef = useRef<any>(null);     // Reference to the candlestick series

    useEffect(() => {
        if (chartContainerRef.current) {
            const container = chartContainerRef.current;

            // Basic chart configuration
            const chartOptions = {
                width: container.clientWidth,
                height: container.clientHeight,
                layout: {
                    textColor: 'black',
                    background: { color: 'white' }
                }
            };

            // Create the chart
            chartRef.current = createChart(container, chartOptions);

            // Add the candlestick series
            seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350'
            });

            // Handle resize
            const handleResize = () => {
                chartRef.current.applyOptions({
                    width: container.clientWidth,
                    height: container.clientHeight
                });
            };
            window.addEventListener('resize', handleResize);

            // Cleanup on unmount
            return () => {
                window.removeEventListener('resize', handleResize);
                chartRef.current.remove();
            };
        }
    }, []);

    // Update the chart with new kline data
    useEffect(() => {
        if (seriesRef.current && historicalKlines.length > 0) {
            seriesRef.current.setData(historicalKlines);
        }
    }, [historicalKlines]);

    // Render the chart container
    return (
        <div ref={chartContainerRef}
            className="h-[calc(80vh)] w-full flex-1 overflow-hidden rounded-xl border border-white/30 bg-white/10"
        />
    );
};

export default memo(TradeChart); 