import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, TrendingUp, TrendingDown } from "lucide-react";

interface AIPredictorProps {
  symbol: string;
}

export default function AIPredictor({ symbol }: AIPredictorProps) {
  const { data: predictions } = useQuery({
    queryKey: [`/api/predictions/${symbol}`],
    refetchInterval: 30000,
  });

  const latestPrediction = predictions?.[0] ?? {
    prediction: "bullish",
    confidence: 75,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Prediction
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span>Direction:</span>
            {latestPrediction.prediction === "bullish" ? (
              <div className="flex items-center text-green-500">
                <TrendingUp className="h-5 w-5 mr-1" />
                Bullish
              </div>
            ) : (
              <div className="flex items-center text-red-500">
                <TrendingDown className="h-5 w-5 mr-1" />
                Bearish
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Confidence</span>
              <span>{latestPrediction.confidence}%</span>
            </div>
            <Progress value={latestPrediction.confidence} />
          </div>

          <p className="text-sm text-muted-foreground">
            This is a simulated prediction using mock data.
            Do not use for actual trading decisions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
