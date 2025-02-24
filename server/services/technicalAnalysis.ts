import { log } from "../vite";
import * as tf from '@tensorflow/tfjs-node';

interface PatternResult {
  type: 'triangle' | 'head_and_shoulders' | 'double_top' | 'double_bottom';
  confidence: number;
  startIndex: number;
  endIndex: number;
}

interface VolatilityMetrics {
  historicalVolatility: number;
  relativeVolatility: number;
  volatilityTrend: 'increasing' | 'decreasing' | 'stable';
  riskMetrics: {
    valueAtRisk: number;
    expectedShortfall: number;
  };
}

export class TechnicalAnalysisService {
  private readonly PATTERN_WINDOW = 30;
  private readonly VOLATILITY_WINDOW = 30;

  constructor() {
    log("Initializing Technical Analysis Service with TensorFlow.js");
  }

  async detectPatterns(prices: number[]): Promise<PatternResult[]> {
    if (prices.length < this.PATTERN_WINDOW) {
      log("Not enough price data for pattern detection");
      return [];
    }

    try {
      // Get the most recent window of prices
      const priceWindow = prices.slice(-this.PATTERN_WINDOW);

      // Create input tensor with shape [batch_size, sequence_length, channels]
      const inputTensor = tf.tensor3d(
        [priceWindow.map(price => [price])], // Reshape to [1, sequence_length, 1]
        [1, this.PATTERN_WINDOW, 1]
      );

      // Normalize the data between 0 and 1
      const normalized = tf.div(
        tf.sub(inputTensor, tf.min(inputTensor)),
        tf.sub(tf.max(inputTensor), tf.min(inputTensor))
      );

      // Create kernels for pattern detection (shape: [1, kernel_size, in_channels, out_channels])
      const triangleKernel = tf.tensor4d(
        [[[[1]], [[0.5]], [[0]], [[-0.5]], [[-1]]]],
        [1, 5, 1, 1]
      );
      const hsKernel = tf.tensor4d(
        [[[[1]], [[-1]], [[2]], [[-1]], [[1]]]],
        [1, 5, 1, 1]
      );

      // Perform convolutions with proper shapes
      const triangleConv = tf.conv2d(
        tf.reshape(normalized, [1, this.PATTERN_WINDOW, 1, 1]),
        triangleKernel,
        1,
        'valid'
      );
      const hsConv = tf.conv2d(
        tf.reshape(normalized, [1, this.PATTERN_WINDOW, 1, 1]),
        hsKernel,
        1,
        'valid'
      );

      // Get pattern detection results
      const patterns: PatternResult[] = [];
      const triangleData = await triangleConv.squeeze().array() as number[];
      const hsData = await hsConv.squeeze().array() as number[];

      // Process triangle patterns
      for (let i = 0; i < triangleData.length; i++) {
        const confidence = Math.abs(triangleData[i]);
        if (confidence > 0.7) {
          patterns.push({
            type: 'triangle',
            confidence,
            startIndex: i,
            endIndex: i + 4
          });
        }
      }

      // Process head and shoulders patterns
      for (let i = 0; i < hsData.length; i++) {
        const confidence = Math.abs(hsData[i]);
        if (confidence > 0.7) {
          patterns.push({
            type: 'head_and_shoulders',
            confidence,
            startIndex: i,
            endIndex: i + 4
          });
        }
      }

      // Cleanup tensors
      tf.dispose([
        inputTensor,
        normalized,
        triangleKernel,
        hsKernel,
        triangleConv,
        hsConv
      ]);

      log(`Detected ${patterns.length} patterns in price data`);
      return patterns;

    } catch (error) {
      log("Error in pattern detection: " + error);
      return [];
    }
  }

  async calculateVolatility(prices: number[]): Promise<VolatilityMetrics | null> {
    if (prices.length < this.VOLATILITY_WINDOW) {
      log("Not enough price data for volatility calculation");
      return null;
    }

    try {
      // Calculate log returns
      const returns = [];
      for (let i = 1; i < prices.length; i++) {
        returns.push(Math.log(prices[i] / prices[i - 1]));
      }

      // Convert to tensor
      const returnsTensor = tf.tensor1d(returns);

      // Calculate historical volatility
      const { variance } = tf.moments(returnsTensor);
      const historicalVolatility = Math.sqrt(variance.dataSync()[0]) * Math.sqrt(252);

      // Calculate recent volatility
      const recentReturns = returns.slice(-this.VOLATILITY_WINDOW);
      const recentReturnsTensor = tf.tensor1d(recentReturns);
      const recentVariance = tf.moments(recentReturnsTensor).variance;
      const recentVol = Math.sqrt(recentVariance.dataSync()[0]) * Math.sqrt(252);

      // Determine trend
      const trend = recentVol > historicalVolatility * 1.1 
        ? 'increasing' 
        : recentVol < historicalVolatility * 0.9 
          ? 'decreasing' 
          : 'stable';

      // Calculate VaR and ES using sorted returns
      const sortedReturns = returns.sort((a, b) => a - b);
      const varIndex = Math.floor(returns.length * 0.05);
      const valueAtRisk = -sortedReturns[varIndex];
      const tailReturns = sortedReturns.slice(0, varIndex);
      const expectedShortfall = -tailReturns.reduce((sum, val) => sum + val, 0) / varIndex;

      // Cleanup tensors
      tf.dispose([returnsTensor, recentReturnsTensor, variance, recentVariance]);

      log(`Calculated volatility metrics: ${historicalVolatility.toFixed(4)}, trend: ${trend}`);

      return {
        historicalVolatility,
        relativeVolatility: recentVol / historicalVolatility,
        volatilityTrend: trend,
        riskMetrics: {
          valueAtRisk,
          expectedShortfall
        }
      };

    } catch (error) {
      log("Error calculating volatility: " + error);
      return null;
    }
  }

  public cleanup() {
    log("Cleaning up Technical Analysis Service");
    // Additional cleanup if needed
  }
}

export const technicalAnalysis = new TechnicalAnalysisService();