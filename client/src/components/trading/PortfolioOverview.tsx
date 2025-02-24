import { useQuery } from "@tanstack/react-query";
import { createChart, ColorType } from 'lightweight-charts';
import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Portfolio } from "@shared/schema";
import { TrendingUp, TrendingDown } from "lucide-react";

export default function PortfolioOverview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [dataPoints, setDataPoints] = useState<{ time: number; value: number }[]>([]);

  // Real-time portfolio data with 1-second updates
  const { data: portfolio = [], isLoading: portfolioLoading } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolio/1"],
    refetchInterval: 1000, // Update every second
  });

  // Real-time market prices with 1-second updates
  const { data: prices } = useQuery<Record<string, { price: number }>>({
    queryKey: ["/api/market/prices"],
    refetchInterval: 1000, // Update every second
  });

  // Calculate positions with current market prices
  const positions = portfolio.map(pos => {
    const currentPrice = prices?.[pos.symbol]?.price || 0;
    const amount = parseFloat(pos.amount.toString());
    const avgPrice = parseFloat(pos.averagePrice.toString());
    const marketValue = amount * currentPrice;
    const costBasis = amount * avgPrice;
    const openPnL = marketValue - costBasis;
    const openPnLPercent = ((currentPrice - avgPrice) / avgPrice) * 100;

    return {
      symbol: pos.symbol,
      quantity: amount,
      marketValue,
      markPrice: currentPrice,
      avgPrice,
      openPnL,
      openPnLPercent,
      costBasis
    };
  });

  const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalCostBasis = positions.reduce((sum, pos) => sum + pos.costBasis, 0);
  const totalPnL = totalValue - totalCostBasis;
  const totalPnLPercent = totalCostBasis > 0 ? (totalPnL / totalCostBasis) * 100 : 0;

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    try {
      // Clear previous chart instance if it exists
      if (chartRef.current) {
        chartRef.current.remove();
      }

      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: 'transparent' },
          textColor: '#999999',
        },
        width: containerRef.current.clientWidth,
        height: 300,
        grid: {
          vertLines: { color: '#2d2d2d' },
          horzLines: { color: '#2d2d2d' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: true,
          borderColor: '#2d2d2d',
          tickMarkFormatter: (time: number) => {
            const date = new Date(time * 1000);
            return date.toLocaleTimeString();
          },
        },
      });

      const lineSeries = chart.addLineSeries({
        color: '#3b82f6',
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });

      chartRef.current = chart;
      seriesRef.current = lineSeries;

      // Initialize with current data point
      const now = Math.floor(Date.now() / 1000);
      if (totalValue > 0) {
        const initialData = [{ time: now, value: totalValue }];
        lineSeries.setData(initialData);
        setDataPoints(initialData);
      }

      const handleResize = () => {
        if (containerRef.current && chartRef.current) {
          chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          chartRef.current.remove();
        }
      };
    } catch (error) {
      console.error('Error initializing chart:', error);
    }
  }, [containerRef.current]); // Only reinitialize when container changes

  // Update chart with real-time data
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current || totalValue === 0) return;

    try {
      const now = Math.floor(Date.now() / 1000);
      const newPoint = { time: now, value: totalValue };

      // Add new data point
      const newDataPoints = [...dataPoints, newPoint];

      // Keep only last 5 minutes of data
      const fiveMinutesAgo = now - 300;
      const filteredPoints = newDataPoints.filter(point => point.time > fiveMinutesAgo);

      setDataPoints(filteredPoints);

      // Update chart
      seriesRef.current.setData(filteredPoints);

      // Keep the last 5 minutes visible
      chartRef.current.timeScale().setVisibleRange({
        from: fiveMinutesAgo,
        to: now,
      });
    } catch (error) {
      console.error('Error updating chart:', error);
    }
  }, [totalValue]);

  if (portfolioLoading) {
    return <div className="p-6">Loading portfolio data...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Portfolio Overview</span>
          <div className="text-right">
            <div className="text-2xl font-bold">
              ${totalValue.toLocaleString(undefined, { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              })}
            </div>
            <div className={`text-sm ${totalPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnLPercent.toFixed(2)}%
              ({totalPnL >= 0 ? '+' : ''}${Math.abs(totalPnL).toLocaleString(undefined, { 
                minimumFractionDigits: 2,
                maximumFractionDigits: 2 
              })})
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div ref={containerRef} className="w-full h-[300px]" />

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="text-right">Mark Price</TableHead>
              <TableHead className="text-right">Avg Price</TableHead>
              <TableHead className="text-right">P&L</TableHead>
              <TableHead className="text-right">P&L %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {positions.map((position) => (
              <TableRow key={position.symbol}>
                <TableCell>{position.symbol}</TableCell>
                <TableCell className="text-right">{position.quantity.toFixed(4)}</TableCell>
                <TableCell className="text-right">
                  ${position.marketValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  ${position.markPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right">
                  ${position.avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className={`text-right ${position.openPnL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${Math.abs(position.openPnL).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  {position.openPnL >= 0 ? <TrendingUp className="inline ml-1 h-4 w-4" /> : <TrendingDown className="inline ml-1 h-4 w-4" />}
                </TableCell>
                <TableCell className={`text-right ${position.openPnLPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {position.openPnLPercent >= 0 ? '+' : ''}{position.openPnLPercent.toFixed(2)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}