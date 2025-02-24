import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTradeSchema } from "@shared/schema";
import { WebSocketManager } from "./ws";

let wsManager: WebSocketManager;

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/users/:userId", async (req, res) => {
    const user = await storage.getUser(parseInt(req.params.userId));
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json(user);
  });

  app.get("/api/trades/:userId", async (req, res) => {
    const trades = await storage.getUserTrades(parseInt(req.params.userId));
    res.json(trades);
  });

  app.get("/api/portfolio/:userId", async (req, res) => {
    const portfolio = await storage.getUserPortfolio(parseInt(req.params.userId));
    res.json(portfolio);
  });

  app.get("/api/portfolio/history/:userId", async (req, res) => {
    const { timeframe = '24h' } = req.query;
    const history = await storage.getPortfolioHistory(
      parseInt(req.params.userId),
      timeframe as string
    );
    res.json(history);
  });

  app.get("/api/market/prices", async (req, res) => {
    const prices = Array.from(wsManager.getLastMarketData().entries()).reduce((acc, [symbol, data]) => {
      acc[symbol] = { price: data.price, volume24h: data.volume24h };
      return acc;
    }, {} as Record<string, { price: number; volume24h: number }>);
    res.json(prices);
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const tradeData = insertTradeSchema.parse(req.body);

      // Get user and validate balance for buy orders
      const user = await storage.getUser(tradeData.userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const tradeTotal = tradeData.amount * tradeData.price;
      const currentBalance = parseFloat(user.balance.toString());

      // Validate sufficient balance for buy orders
      if (tradeData.type === "buy" && tradeTotal > currentBalance) {
        res.status(400).json({ message: "Insufficient balance for trade" });
        return;
      }

      // Create trade record
      const trade = await storage.createTrade(tradeData);

      // Update user balance
      const newBalance = tradeData.type === "buy"
        ? currentBalance - tradeTotal
        : currentBalance + tradeTotal;

      await storage.updateUserBalance(user.id, newBalance);

      // Update portfolio
      await storage.updatePortfolio(
        tradeData.userId,
        tradeData.symbol,
        tradeData.type,
        tradeData.amount,
        tradeData.price
      );

      res.json(trade);
    } catch (error) {
      console.error("Trade error:", error);
      res.status(400).json({ message: error instanceof Error ? error.message : "Invalid trade data" });
    }
  });

  app.get("/api/predictions/:symbol", async (req, res) => {
    const predictions = await storage.getPredictions(req.params.symbol);
    res.json(predictions);
  });

  const httpServer = createServer(app);
  wsManager = new WebSocketManager(httpServer);

  return httpServer;
}