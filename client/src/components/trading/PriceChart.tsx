import { useEffect, useRef, useState } from 'react';
import { createChart, type IChartApi, type CandlestickData, type ISeriesApi } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMarketData } from "@/hooks/useMarketData";

interface PriceChartProps {
  symbol: string;
  mini?: boolean;
}

export default function PriceChart({ symbol, mini = false }: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi>();
  const seriesRef = useRef<ISeriesApi<"Candlestick">>();
  const [prevPrice, setPrevPrice] = useState<number | null>(null);
  const { marketData, error } = useMarketData(symbol);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#D9D9D9',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: mini ? 200 : 400,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350'
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [mini]);

  useEffect(() => {
    if (marketData && seriesRef.current) {
      const candleData: CandlestickData = {
        time: Math.floor(Date.now() / 1000) as any,
        open: prevPrice || marketData.price,
        high: Math.max(prevPrice || marketData.price, marketData.price),
        low: Math.min(prevPrice || marketData.price, marketData.price),
        close: marketData.price,
      };
      seriesRef.current.update(candleData);
      setPrevPrice(marketData.price);

      if (marketData.volume24h) {
        chartRef.current?.timeScale().fitContent();
      }
    }
  }, [marketData]);

  const getPriceColor = () => {
    if (!prevPrice || !marketData) return 'text-primary';
    return marketData.price > prevPrice ? 'text-green-500' : 'text-red-500';
  };

  return (
    <Card className={mini ? 'hover:ring-2 hover:ring-primary transition-all' : ''}>
      <CardHeader className={mini ? 'p-3' : undefined}>
        <CardTitle className={`flex justify-between ${mini ? 'text-sm' : ''}`}>
          <span>{symbol}</span>
          {marketData && (
            <span className={getPriceColor()}>
              ${marketData.price.toLocaleString(undefined, { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              })}
              {!mini && marketData.volume24h && (
                <span className="text-sm text-muted-foreground ml-2">
                  Vol: ${(marketData.volume24h / 1000000).toFixed(2)}M
                </span>
              )}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={mini ? 'p-3' : undefined}>
        {error ? (
          <div className="text-destructive text-center py-4">{error}</div>
        ) : (
          <div ref={chartContainerRef} />
        )}
      </CardContent>
    </Card>
  );
}