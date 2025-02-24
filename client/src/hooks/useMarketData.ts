import { useState, useEffect, useRef } from "react";

interface MarketData {
  symbol: string;
  price: number;
  volume24h: number;
  timestamp: number;
  patternAnalysis?: {
    patterns: Array<{
      type: string;
      confidence: number;
      startIndex: number;
      endIndex: number;
    }>;
  };
  volatilityMetrics?: {
    historicalVolatility: number;
    relativeVolatility: number;
    volatilityTrend: 'increasing' | 'decreasing' | 'stable';
    riskMetrics: {
      valueAtRisk: number;
      expectedShortfall: number;
    };
  };
  aiAnalysis?: {
    recommendation: 'buy' | 'sell' | 'hold';
    confidence: number;
    reasoning: string[];
    marketSentiment: string;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

export function useMarketData(symbol: string) {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    function connect() {
      if (!mounted.current) return;

      try {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.close();
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/ws/market`);
        wsRef.current = ws;

        ws.onopen = () => {
          if (mounted.current) {
            console.log("Connected to market data WebSocket");
            setError(null);
          }
        };

        ws.onmessage = (event) => {
          if (!mounted.current) return;
          try {
            const data = JSON.parse(event.data);
            if (data.symbol === symbol) {
              setMarketData(data);
              setError(null);
            }
          } catch (err) {
            console.error("Error parsing market data:", err);
          }
        };

        ws.onerror = (event) => {
          if (!mounted.current) return;
          console.error("WebSocket error:", event);
          if (!marketData) {
            setError("Failed to connect to market data feed");
          }
        };

        ws.onclose = () => {
          if (!mounted.current) return;
          console.log("Market data WebSocket closed, attempting to reconnect...");
          wsRef.current = null;

          // Schedule reconnection with backoff
          if (reconnectTimeoutRef.current === null && mounted.current) {
            reconnectTimeoutRef.current = window.setTimeout(() => {
              reconnectTimeoutRef.current = null;
              if (mounted.current) {
                connect();
              }
            }, 3000);
          }
        };
      } catch (error) {
        console.error("Error establishing WebSocket connection:", error);
        if (mounted.current) {
          setError("Failed to connect to market data feed");
        }
      }
    }

    connect();

    return () => {
      mounted.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current !== null) {
        window.clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [symbol]);

  return { marketData, error };
}