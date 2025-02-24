import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, TrendingUp, TrendingDown, AlertTriangle, Activity, ArrowRight, BarChart } from "lucide-react";
import { useMarketData } from "@/hooks/useMarketData";

interface TechnicalAnalysisProps {
  symbol: string;
}

export default function TechnicalAnalysis({ symbol }: TechnicalAnalysisProps) {
  const { marketData, error } = useMarketData(symbol);

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40 text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!marketData) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="text-muted-foreground">Loading market data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { patternAnalysis, volatilityMetrics, aiAnalysis } = marketData;

  if (!patternAnalysis?.patterns && !volatilityMetrics && !aiAnalysis) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-40">
            <div className="text-muted-foreground">Analyzing market data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          GPU-Accelerated Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* AI Analysis */}
          {aiAnalysis && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-3">
                <Brain className="h-5 w-5" />
                AI Trading Recommendation
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  <span className={`font-medium capitalize ${
                    aiAnalysis.recommendation === 'buy' ? 'text-green-500' :
                    aiAnalysis.recommendation === 'sell' ? 'text-red-500' :
                    'text-yellow-500'
                  }`}>
                    {aiAnalysis.recommendation.toUpperCase()}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    ({Math.round(aiAnalysis.confidence * 100)}% confidence)
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Market Sentiment:</span>
                    <span className="ml-2 capitalize">{aiAnalysis.marketSentiment}</span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Risk Level:</span>
                    <span className={`ml-2 capitalize ${
                      aiAnalysis.riskLevel === 'high' ? 'text-red-500' :
                      aiAnalysis.riskLevel === 'medium' ? 'text-yellow-500' :
                      'text-green-500'
                    }`}>
                      {aiAnalysis.riskLevel}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-sm font-medium">Analysis Factors:</div>
                  {aiAnalysis.reasoning.map((reason, idx) => (
                    <div key={idx} className="text-sm text-muted-foreground pl-4">
                      • {reason}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Technical Patterns */}
          {patternAnalysis?.patterns?.length > 0 && (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                Neural Network Pattern Detection
              </h3>
              <div className="space-y-2">
                {patternAnalysis.patterns.map((pattern, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <span className="capitalize">
                        {pattern.type.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {Math.round(pattern.confidence * 100)}% confidence
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Volatility Metrics */}
          {volatilityMetrics && (
            <div className="border rounded-lg p-4">
              <h3 className="text-sm font-medium mb-2">Risk Analysis</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span>Historical Volatility</span>
                  <span>{(volatilityMetrics.historicalVolatility * 100).toFixed(2)}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <span>Trend</span>
                  <div className="flex items-center gap-1">
                    {volatilityMetrics.volatilityTrend === 'increasing' ? (
                      <>
                        <TrendingUp className="h-4 w-4 text-red-500" />
                        <span className="text-red-500">High Risk</span>
                      </>
                    ) : volatilityMetrics.volatilityTrend === 'decreasing' ? (
                      <>
                        <TrendingDown className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">Stabilizing</span>
                      </>
                    ) : (
                      <span>Stable</span>
                    )}
                  </div>
                </div>

                <div className="border-t pt-2 mt-2">
                  <h4 className="text-sm font-medium mb-1">Risk Metrics</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Value at Risk (95%)</span>
                      <span className="font-medium">
                        {(volatilityMetrics.riskMetrics.valueAtRisk * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Expected Shortfall</span>
                      <span className="font-medium">
                        {(volatilityMetrics.riskMetrics.expectedShortfall * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}