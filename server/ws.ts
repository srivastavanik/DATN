import { WebSocket, WebSocketServer } from "ws";
import { type Server } from "http";
import { log } from "./vite";
import { storage } from "./storage";
import { technicalAnalysis } from "./services/technicalAnalysis";
import { aiAnalysis } from "./services/aiAnalysis";

interface MarketData {
  symbol: string;
  exchange: string;
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

export class WebSocketManager {
  private wss: WebSocketServer;
  private clients: Set<WebSocket>;
  private lastMarketData: Map<string, MarketData> = new Map();
  private simulatedDataInterval: NodeJS.Timeout | null = null;
  private portfolioUpdateInterval: NodeJS.Timeout | null = null;
  private priceHistory: Map<string, number[]> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: "/ws/market"
    });
    this.clients = new Set();

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);
      log("New WebSocket client connected");

      // Send initial market data
      this.lastMarketData.forEach((data, symbol) => {
        try {
          if (data) {
            ws.send(JSON.stringify(data));
            log(`Sent initial market data for ${symbol}`);
          }
        } catch (error) {
          log(`Error sending initial data for ${symbol}: ${error}`);
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        log("WebSocket client disconnected");
      });

      ws.on("error", (error) => {
        log("WebSocket client error: " + error);
        this.clients.delete(ws);
      });
    });

    // Start data processing
    this.startSimulatedDataFeed();
    this.startPortfolioTracking();
  }

  public getLastMarketData(): Map<string, MarketData> {
    return this.lastMarketData;
  }

  private updatePriceHistory(symbol: string, price: number) {
    if (!this.priceHistory.has(symbol)) {
      this.priceHistory.set(symbol, []);
    }
    const history = this.priceHistory.get(symbol)!;
    history.push(price);

    if (history.length > 100) {
      history.shift();
    }
  }

  private async analyzeTechnicals(symbol: string): Promise<{
    patterns: any[];
    volatility: any;
  }> {
    const prices = this.priceHistory.get(symbol) || [];

    try {
      const patterns = await technicalAnalysis.detectPatterns(prices);
      const volatility = await technicalAnalysis.calculateVolatility(prices);

      log(`Technical analysis for ${symbol} completed`);
      if (patterns.length > 0) {
        log(`Found patterns: ${JSON.stringify(patterns)}`);
      }
      if (volatility) {
        log(`Volatility metrics: ${JSON.stringify(volatility)}`);
      }

      return { patterns, volatility };
    } catch (error) {
      log(`Error in technical analysis for ${symbol}: ${error}`);
      return { patterns: [], volatility: null };
    }
  }

  private async startSimulatedDataFeed() {
    // IMPORTANT NOTE: These are simulated prices for development purposes only.
    // In production, these should be replaced with real-time market data from a cryptocurrency exchange API.
    // Prices updated as of February 24, 2024
    const basePrice = {
      "BTC/USD": 95000,  // Current BTC price ~$95k
      "ETH/USD": 3200,   // Current ETH price ~$3.2k
      "SOL/USD": 140,    // Current SOL price ~$140
      "ADA/USD": 0.70,   // Current ADA price ~$0.70
      "DOT/USD": 8.80,   // Current DOT price ~$8.80
      "AVAX/USD": 38,    // Current AVAX price ~$38
      "MATIC/USD": 1.10, // Current MATIC price ~$1.10
      "LINK/USD": 22,    // Current LINK price ~$22
      "UNI/USD": 12,     // Current UNI price ~$12
      "AAVE/USD": 115    // Current AAVE price ~$115
    };

    this.simulatedDataInterval = setInterval(async () => {
      for (const [symbol, price] of Object.entries(basePrice)) {
        try {
          // Generate new price with more realistic volatility
          const volatility = 0.001; // 0.1% base volatility
          const randomFactor = (Math.random() - 0.5) * 2; // Random between -1 and 1
          const change = price * volatility * randomFactor;
          const newPrice = price + change;
          basePrice[symbol as keyof typeof basePrice] = newPrice;

          // Update history and get analysis
          this.updatePriceHistory(symbol, newPrice);
          const technicals = await this.analyzeTechnicals(symbol);

          // Get AI analysis
          const aiResult = await aiAnalysis.analyzeMarket(
            symbol,
            newPrice,
            technicals,
            this.priceHistory.get(symbol) || []
          );

          log(`Generated AI analysis for ${symbol}: ${JSON.stringify(aiResult)}`);

          // Prepare market data
          const marketData: MarketData = {
            symbol,
            exchange: "crypto",
            price: newPrice,
            volume24h: Math.random() * 1000 + 5000,
            timestamp: Math.floor(Date.now() / 1000),
            patternAnalysis: technicals.patterns.length > 0 ? {
              patterns: technicals.patterns
            } : undefined,
            volatilityMetrics: technicals.volatility,
            aiAnalysis: aiResult
          };

          // Update and broadcast
          this.lastMarketData.set(symbol, marketData);
          this.broadcast(JSON.stringify(marketData));
          log(`Broadcasted market data for ${symbol}`);

        } catch (error) {
          log(`Error processing market data for ${symbol}: ${error}`);
        }
      }
    }, 1000);

    log("Started simulated data feed");
  }

  private async startPortfolioTracking() {
    const updatePortfolioValue = async () => {
      try {
        const portfolio = await storage.getUserPortfolio(1);
        if (portfolio.length > 0) {
          const totalValue = portfolio.reduce((sum, position) => {
            const currentPrice = this.lastMarketData.get(position.symbol)?.price || 0;
            return sum + (parseFloat(position.amount.toString()) * currentPrice);
          }, 0);
          await storage.recordPortfolioValue(1, totalValue);
        }
      } catch (error) {
        log("Error updating portfolio value: " + error);
      }
    };

    await updatePortfolioValue();
    this.portfolioUpdateInterval = setInterval(updatePortfolioValue, 1000);
  }

  private broadcast(data: string) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch (error) {
          log("Error broadcasting to client: " + error);
          this.clients.delete(client);
        }
      }
    });
  }

  public cleanup() {
    if (this.simulatedDataInterval) {
      clearInterval(this.simulatedDataInterval);
    }
    if (this.portfolioUpdateInterval) {
      clearInterval(this.portfolioUpdateInterval);
    }
    technicalAnalysis.cleanup();
  }
}