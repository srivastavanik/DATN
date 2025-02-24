import { pgTable, text, serial, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define schema object to export
export const schema = {
  users: pgTable("users", {
    id: serial("id").primaryKey(),
    username: text("username").notNull().unique(),
    password: text("password").notNull(),
    balance: numeric("balance", { precision: 18, scale: 8 }).notNull().default('500000')
  }),

  portfolio: pgTable("portfolio", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    symbol: text("symbol").notNull(),
    amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
    averagePrice: numeric("average_price", { precision: 18, scale: 8 }).notNull(),
    lastUpdated: timestamp("last_updated").notNull().defaultNow()
  }),

  portfolioHistory: pgTable("portfolio_history", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    totalValue: numeric("total_value", { precision: 18, scale: 8 }).notNull(),
    timestamp: timestamp("timestamp").notNull().defaultNow()
  }),

  watchlist: pgTable("watchlist", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    symbol: text("symbol").notNull(),
    addedAt: timestamp("added_at").notNull().defaultNow(),
    alert: numeric("alert_price", { precision: 18, scale: 8 })
  }),

  trades: pgTable("trades", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    symbol: text("symbol").notNull(),
    exchange: text("exchange"), // Made nullable for migration
    amount: numeric("amount", { precision: 18, scale: 8 }).notNull(),
    price: numeric("price", { precision: 18, scale: 8 }).notNull(),
    type: text("type").notNull(), // buy or sell
    status: text("status").notNull().default('completed'), // pending, completed, failed
    fee: numeric("fee", { precision: 18, scale: 8 }).notNull().default('0'),
    timestamp: timestamp("timestamp").notNull().defaultNow(),
  }),
};

// Re-export individual tables for convenience
export const { users, portfolio, portfolioHistory, watchlist, trades } = schema;

// Updated schema to handle numeric values correctly
export const insertTradeSchema = z.object({
  userId: z.number(),
  symbol: z.string(),
  amount: z.number().positive(),
  price: z.number().positive(),
  type: z.enum(["buy", "sell"]),
  exchange: z.string().optional(), // Made optional for migration
  fee: z.number().min(0).optional(),
});

export const insertPortfolioHistorySchema = createInsertSchema(portfolioHistory).omit({
  id: true,
  timestamp: true
});

export const insertPortfolioSchema = createInsertSchema(portfolio).omit({
  id: true,
  lastUpdated: true
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  addedAt: true
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type InsertPortfolioHistory = z.infer<typeof insertPortfolioHistorySchema>;
export type InsertWatchlist = z.infer<typeof insertWatchlistSchema>;
export type User = typeof users.$inferSelect;
export type Trade = typeof trades.$inferSelect;
export type Portfolio = typeof portfolio.$inferSelect;
export type PortfolioHistory = typeof portfolioHistory.$inferSelect;
export type Watchlist = typeof watchlist.$inferSelect;