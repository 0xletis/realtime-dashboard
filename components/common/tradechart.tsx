import { createChart, CandlestickSeries } from 'lightweight-charts';
import { useEffect, useRef, memo } from 'react';

interface TradeChartProps {
    historicalKlines: any[];
}

const TradeChart = ({ historicalKlines }: TradeChartProps) => {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);

    useEffect(() => {
        if (chartContainerRef.current) {
            const container = chartContainerRef.current;

            const chartOptions = {
                width: container.clientWidth,
                height: container.clientHeight,
                layout: {
                    textColor: 'black',
                    background: { color: 'white' }
                }
            };

            chartRef.current = createChart(container, chartOptions);
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

            return () => {
                window.removeEventListener('resize', handleResize);
                chartRef.current.remove();
            };
        }
    }, []);

    useEffect(() => {
        if (seriesRef.current && historicalKlines.length > 0) {
            seriesRef.current.setData(historicalKlines);
        }
    }, [historicalKlines]);

    return (
        <div ref={chartContainerRef}
            className="h-[calc(80vh)] w-full flex-1 overflow-hidden rounded-xl border border-white/30 bg-white/10"
        />
    );
};

export default memo(TradeChart); 