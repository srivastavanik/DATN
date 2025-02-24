import OpenAI from "openai";
import { log } from "../vite";

// The newest OpenAI model is "gpt-4o" which was released May 13, 2024
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

interface AIAnalysisResult {
  recommendation: 'buy' | 'sell' | 'hold';
  confidence: number;
  reasoning: string[];
  marketSentiment: string;
  riskLevel: 'low' | 'medium' | 'high';
}

export class AIAnalysisService {
  private analysisCache: Map<string, { result: AIAnalysisResult; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 10000; // 10 seconds

  async analyzeMarket(
    symbol: string,
    currentPrice: number,
    technicalData: any,
    historicalPrices: number[]
  ): Promise<AIAnalysisResult> {
    try {
      // Check cache to avoid rate limits
      const cached = this.analysisCache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
        return cached.result;
      }

      // Prepare market context
      const marketContext = {
        symbol,
        price: {
          current: currentPrice,
          change24h: this.calculatePriceChange(historicalPrices, 24),
          change1h: this.calculatePriceChange(historicalPrices, 60)
        },
        technicalAnalysis: {
          patterns: technicalData.patterns || [],
          volatility: technicalData.volatility || null
        }
      };

      // Request analysis from OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an advanced trading analysis system powered by NVIDIA GPU acceleration and TensorFlow.js neural networks.

Format your response in JSON:
{
  "recommendation": "buy/sell/hold",
  "confidence": <number between 0-1>,
  "reasoning": ["specific reasons"],
  "marketSentiment": "brief market sentiment",
  "riskLevel": "low/medium/high"
}`
          },
          {
            role: "user",
            content: `Analyze this market data: ${JSON.stringify(marketContext)}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0].message.content);

      // Cache the result
      this.analysisCache.set(symbol, {
        result: analysis,
        timestamp: Date.now()
      });

      return analysis;

    } catch (error) {
      log(`Error in AI analysis for ${symbol}: ${error}`);

      // Return default analysis on error
      const defaultResult = {
        recommendation: 'hold' as const,
        confidence: 0.5,
        reasoning: ["Technical analysis system is calibrating"],
        marketSentiment: "neutral",
        riskLevel: "medium" as const
      };

      this.analysisCache.set(symbol, {
        result: defaultResult,
        timestamp: Date.now()
      });

      return defaultResult;
    }
  }

  private calculatePriceChange(prices: number[], period: number): string {
    if (prices.length < period) return '0.00%';

    const currentPrice = prices[prices.length - 1];
    const previousPrice = prices[prices.length - period];
    const change = ((currentPrice - previousPrice) / previousPrice) * 100;

    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  }
}

export const aiAnalysis = new AIAnalysisService();