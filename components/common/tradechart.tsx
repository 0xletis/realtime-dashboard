import { createChart, CandlestickSeries, HistogramSeries } from 'lightweight-charts';
import { useEffect, useRef, memo } from 'react';

interface TradeChartProps {
    historicalKlines: any[]; // Receives kline data from parent
    pair: string; // Add pair prop
}

const TradeChart = ({ historicalKlines, pair }: TradeChartProps) => {
    // Refs to maintain chart instances across re-renders
    const chartContainerRef = useRef<HTMLDivElement>(null);  // Reference to the DOM container
    const chartRef = useRef<any>(null);      // Reference to the main chart instance
    const seriesRef = useRef<any>(null);     // Reference to the candlestick series
    const volumeSeriesRef = useRef<any>(null); // Reference to the volume series
    const previousPairRef = useRef<string>(pair);

    useEffect(() => {
        if (chartContainerRef.current) {
            const container = chartContainerRef.current;

            // Basic chart configuration
            const chartOptions = {
                width: container.clientWidth,
                height: container.clientHeight,
                layout: {
                    textColor: '#ffffff',
                    background: { color: '#001a0f' }
                },
                timeScale: {
                    timeVisible: true,
                    borderColor: '#003920'
                },
                grid: {
                    vertLines: { color: '#002713' },
                    horzLines: { color: '#002713' }
                }
            };

            // Create the chart
            chartRef.current = createChart(container, chartOptions);

            // Add the candlestick series
            const isLowValuePair = pair.toUpperCase() === 'PEPEUSDT';
            seriesRef.current = chartRef.current.addSeries(CandlestickSeries, {
                upColor: '#22c55e',
                downColor: '#ef4444',
                borderVisible: false,
                wickUpColor: '#22c55e',
                wickDownColor: '#ef4444',
                priceFormat: {
                    type: 'price',
                    precision: isLowValuePair ? 8 : 2,
                    minMove: isLowValuePair ? 0.00000001 : 0.01,
                }
            });

            // Configure candlestick series margins
            seriesRef.current.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.1, // highest point of the series will be 10% away from the top
                    bottom: 0.4, // lowest point will be 40% away from the bottom
                },
                autoScale: true
            });

            // Add the volume series
            volumeSeriesRef.current = chartRef.current.addSeries(HistogramSeries, {
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: '', // set as an overlay
            });

            // Configure volume series margins
            volumeSeriesRef.current.priceScale().applyOptions({
                scaleMargins: {
                    top: 0.7, // highest point of the series will be 70% away from the top
                    bottom: 0, // lowest point will be at the very bottom
                },
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
        if (seriesRef.current && volumeSeriesRef.current && historicalKlines.length > 0) {
            // Sort data by time in ascending order
            const sortedKlines = [...historicalKlines].sort((a, b) => a.time - b.time);

            // Update candlestick data
            seriesRef.current.setData(sortedKlines);

            // Find the scale factor for volume if needed
            const maxVolume = Math.max(...sortedKlines.map(kline => parseFloat(kline.volume || 0)));
            const VOLUME_LIMIT = 90071992547409;
            const scaleFactor = maxVolume > VOLUME_LIMIT ? VOLUME_LIMIT / maxVolume : 1;

            // Update volume data with colors based on price movement
            const volumeData = sortedKlines.map((kline: any) => ({
                time: kline.time,
                value: parseFloat(kline.volume || 0) * scaleFactor,
                color: kline.close >= kline.open ? '#22c55e80' : '#ef444480'
            }));
            volumeSeriesRef.current.setData(volumeData);

            // Only fit content and reset scale when pair changes
            if (previousPairRef.current !== pair) {
                // Adjust price format based on the pair
                const isLowValuePair = pair.toUpperCase() === 'PEPEUSDT';
                seriesRef.current.applyOptions({
                    priceFormat: {
                        type: 'price',
                        precision: isLowValuePair ? 8 : 2,
                        minMove: isLowValuePair ? 0.00000001 : 0.01,
                    }
                });

                seriesRef.current.priceScale().applyOptions({
                    autoScale: true
                });
                
                requestAnimationFrame(() => {
                    chartRef.current.timeScale().fitContent();
                });
                previousPairRef.current = pair;
            }
        }
    }, [historicalKlines, pair]);

    // Render the chart container
    return (
        <div ref={chartContainerRef}
            className="h-full w-full flex-1 overflow-hidden rounded-xl border border-[#003920] bg-[#001a0f]"
        />
    );
};

export default memo(TradeChart); 