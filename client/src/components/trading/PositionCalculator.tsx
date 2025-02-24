import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator } from "lucide-react";

interface PositionCalculatorProps {
  symbol: string;
}

export default function PositionCalculator({ symbol }: PositionCalculatorProps) {
  const [riskPercentage, setRiskPercentage] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  // Query user's balance
  const { data: user } = useQuery({
    queryKey: ["/api/users/1"], // Hardcoded user ID for demo
  });

  const balance = parseFloat(user?.balance ?? "500000");

  // Calculate maximum risk amount (limit to 2% of balance for safety)
  const maxRiskPercentage = Math.min(parseFloat(riskPercentage), 2);
  const riskAmount = (balance * maxRiskPercentage) / 100;

  let positionSize = 0;
  let riskPerUnit = 0;
  let maxPositionValue = balance * 0.5; // Limit position size to 50% of balance

  if (entryPrice && stopLoss) {
    const entryPriceNum = parseFloat(entryPrice);
    const stopLossNum = parseFloat(stopLoss);

    if (entryPriceNum > stopLossNum) { // Long position
      riskPerUnit = entryPriceNum - stopLossNum;
    } else { // Short position
      riskPerUnit = stopLossNum - entryPriceNum;
    }

    // Calculate raw position size based on risk
    const rawPositionSize = riskAmount / riskPerUnit;

    // Limit position size based on max position value
    positionSize = Math.min(rawPositionSize, maxPositionValue / entryPriceNum);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Position Calculator
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label>Account Balance</Label>
            <div className="text-xl font-semibold">${balance.toLocaleString()}</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="riskPercentage">Risk Percentage (Max 2%)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="riskPercentage"
                type="number"
                value={riskPercentage}
                onChange={(e) => setRiskPercentage(e.target.value)}
                min="0.1"
                max="2"
                step="0.1"
              />
              <span>%</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Risk amount: ${riskAmount.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price</Label>
              <Input
                id="entryPrice"
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopLoss">Stop Loss</Label>
              <Input
                id="stopLoss"
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {positionSize > 0 && (
            <div className="pt-4 border-t">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Risk per unit: ${riskPerUnit.toFixed(2)}
                </div>
                <div>
                  <div className="text-sm font-medium">Suggested Position Size</div>
                  <div className="text-2xl font-bold">
                    {positionSize.toFixed(4)} {symbol.split("/")[0]}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Position Value: ${(positionSize * parseFloat(entryPrice)).toLocaleString()}
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