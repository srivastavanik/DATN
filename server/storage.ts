import { schema, users, trades, type User, type InsertUser, type Trade, type InsertTrade, type Portfolio, type PortfolioHistory, type InsertPortfolioHistory } from "@shared/schema";
import { db } from "./db";
import { eq, and, gte } from "drizzle-orm";
import { subHours, subDays } from "date-fns";

// TODO: Add NVIDIA CUDA Integration Points:
// 1. Technical Analysis: Implement GPU-accelerated technical indicators
// 2. Pattern Recognition: Real-time chart pattern detection using CUDA
// 3. Market Data Processing: Parallel processing of high-frequency trading data
// 4. Risk Analysis: GPU-accelerated Monte Carlo simulations for portfolio risk assessment

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserBalance(id: number, balance: number): Promise<User>;

  // Trades
  createTrade(trade: InsertTrade): Promise<Trade>;
  getUserTrades(userId: number): Promise<Trade[]>;

  // Portfolio
  getUserPortfolio(userId: number): Promise<Portfolio[]>;
  updatePortfolio(userId: number, symbol: string, type: string, amount: number, price: number): Promise<void>;

  // Portfolio History
  getPortfolioHistory(userId: number, timeframe: string): Promise<PortfolioHistory[]>;
  recordPortfolioValue(userId: number, totalValue: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUserPortfolio(userId: number): Promise<Portfolio[]> {
    return db
      .select()
      .from(schema.portfolio)
      .where(eq(schema.portfolio.userId, userId));
  }

  async updatePortfolio(userId: number, symbol: string, type: string, amount: number, price: number): Promise<void> {
    try {
      const existingPosition = await db
        .select()
        .from(schema.portfolio)
        .where(and(
          eq(schema.portfolio.userId, userId),
          eq(schema.portfolio.symbol, symbol)
        ))
        .limit(1);

      const newAmount = type === "buy" ? amount : -amount;

      if (existingPosition.length > 0) {
        const currentAmount = parseFloat(existingPosition[0].amount.toString());
        const currentAvgPrice = parseFloat(existingPosition[0].averagePrice.toString());
        const totalAmount = currentAmount + newAmount;

        if (Math.abs(totalAmount) < 0.00000001) {
          // Delete position if amount is effectively zero
          await db
            .delete(schema.portfolio)
            .where(eq(schema.portfolio.id, existingPosition[0].id));
        } else {
          const newAvgPrice = type === "buy"
            ? (currentAmount * currentAvgPrice + amount * price) / totalAmount
            : currentAvgPrice;

          await db
            .update(schema.portfolio)
            .set({
              amount: totalAmount.toString(),
              averagePrice: newAvgPrice.toString(),
              lastUpdated: new Date(),
            })
            .where(eq(schema.portfolio.id, existingPosition[0].id));
        }
      } else if (type === "buy") {
        await db
          .insert(schema.portfolio)
          .values({
            userId,
            symbol,
            amount: amount.toString(),
            averagePrice: price.toString(),
            lastUpdated: new Date(),
          });
      }
    } catch (error) {
      console.error("Error updating portfolio:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to update portfolio");
    }
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUserBalance(id: number, newBalance: number): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ balance: newBalance.toString() })
      .where(eq(users.id, id))
      .returning();
    if (!user) throw new Error("User not found");
    return user;
  }

  async createTrade(insertTrade: InsertTrade): Promise<Trade> {
    try {
      const [trade] = await db
        .insert(trades)
        .values({
          userId: insertTrade.userId,
          symbol: insertTrade.symbol,
          type: insertTrade.type,
          amount: insertTrade.amount.toString(),
          price: insertTrade.price.toString(),
          exchange: insertTrade.exchange || 'crypto',
          fee: (insertTrade.fee || 0).toString(),
          timestamp: new Date(),
        })
        .returning();

      // Update portfolio
      await this.updatePortfolio(
        insertTrade.userId,
        insertTrade.symbol,
        insertTrade.type,
        insertTrade.amount,
        insertTrade.price
      );

      // Get updated portfolio and record total value
      const portfolio = await this.getUserPortfolio(insertTrade.userId);
      const totalValue = portfolio.reduce((sum, pos) =>
        sum + parseFloat(pos.amount.toString()) * parseFloat(pos.averagePrice.toString()),
        0
      );
      await this.recordPortfolioValue(insertTrade.userId, totalValue);

      return trade;
    } catch (error) {
      console.error("Error creating trade:", error);
      throw new Error(error instanceof Error ? error.message : "Failed to create trade");
    }
  }

  async getUserTrades(userId: number): Promise<Trade[]> {
    return db
      .select()
      .from(trades)
      .where(eq(trades.userId, userId))
      .orderBy(trades.timestamp);
  }

  async recordPortfolioValue(userId: number, totalValue: number): Promise<void> {
    try {
      // First check if we have any history
      const history = await db
        .select()
        .from(schema.portfolioHistory)
        .where(eq(schema.portfolioHistory.userId, userId))
        .limit(1);

      // If no history exists, create initial history points
      if (history.length === 0) {
        console.log('Creating initial portfolio history');
        const now = new Date();
        const timestamps = [
          subDays(now, 7), // 1 week ago
          subDays(now, 6),
          subDays(now, 5),
          subDays(now, 4),
          subDays(now, 3),
          subDays(now, 2),
          subDays(now, 1),
          subHours(now, 20),
          subHours(now, 16),
          subHours(now, 12),
          subHours(now, 8),
          subHours(now, 4),
          subHours(now, 2),
          subHours(now, 1),
          now
        ];

        // Insert historical data points with slight variations
        await Promise.all(timestamps.map(timestamp => {
          const variance = (Math.random() - 0.5) * 0.02; // ±1% variance
          const value = totalValue * (1 + variance);
          console.log(`Creating history point: ${timestamp.toISOString()} = $${value}`);
          return db.insert(schema.portfolioHistory).values({
            userId,
            totalValue: value.toString(),
            timestamp
          });
        }));
      } else {
        // Add current value
        await db.insert(schema.portfolioHistory).values({
          userId,
          totalValue: totalValue.toString(),
          timestamp: new Date()
        });
      }
    } catch (error) {
      console.error("Error recording portfolio value:", error);
      throw new Error("Failed to record portfolio value");
    }
  }

  async getPortfolioHistory(userId: number, timeframe: string): Promise<PortfolioHistory[]> {
    const now = new Date();
    let startDate: Date;

    switch (timeframe) {
      case '1h':
        startDate = subHours(now, 1);
        break;
      case '24h':
        startDate = subHours(now, 24);
        break;
      default:
        startDate = subHours(now, 24);
    }

    // Get base history from trades
    const trades = await db
      .select()
      .from(schema.trades)
      .where(and(
        eq(schema.trades.userId, userId),
        gte(schema.trades.timestamp, startDate)
      ))
      .orderBy(schema.trades.timestamp);

    const snapshots = await db
      .select()
      .from(schema.portfolioHistory)
      .where(and(
        eq(schema.portfolioHistory.userId, userId),
        gte(schema.portfolioHistory.timestamp, startDate)
      ))
      .orderBy(schema.portfolioHistory.timestamp);

    if (snapshots.length === 0 && trades.length === 0) {
      // No history exists, initialize with current portfolio value
      const portfolio = await this.getUserPortfolio(userId);
      const totalValue = portfolio.reduce((sum, pos) => {
        return sum + parseFloat(pos.amount.toString()) * parseFloat(pos.averagePrice.toString());
      }, 0);

      if (totalValue > 0) {
        await this.recordPortfolioValue(userId, totalValue);
        return this.getPortfolioHistory(userId, timeframe);
      }

      return [];
    }

    const timeline = [...trades.map(trade => ({
      timestamp: trade.timestamp,
      value: parseFloat(trade.amount.toString()) * parseFloat(trade.price.toString())
    })), ...snapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      value: parseFloat(snapshot.totalValue.toString())
    }))].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return timeline.map((point, index) => ({
      id: index + 1,
      userId,
      totalValue: point.value.toString(),
      timestamp: point.timestamp
    }));
  }
}

export const storage = new DatabaseStorage();
