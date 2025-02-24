import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { TrendingUp, TrendingDown } from "lucide-react";
import type { Trade, Portfolio, User } from "@shared/schema";

interface Position {
  symbol: string;
  exchange: string;
  totalAmount: number;
  averagePrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
}

export default function PortfolioPage() {
  const { data: trades = [], isLoading: tradesLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades/1"], // Hardcoded user ID for demo
  });

  const { data: portfolioData = [], isLoading: portfolioLoading } = useQuery<Portfolio[]>({
    queryKey: ["/api/portfolio/1"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: marketData } = useQuery<Record<string, { price: number }>>({
    queryKey: ["/api/market/prices"],
    refetchInterval: 5000,
  });

  const { data: user } = useQuery<User>({
    queryKey: ["/api/users/1"],
  });

  if (tradesLoading || portfolioLoading) {
    return <div className="p-6">Loading...</div>;
  }

  // Calculate positions from portfolio data
  const positions: Position[] = portfolioData.map(position => {
    const currentPrice = marketData?.[position.symbol]?.price || 0;
    const profitLoss = parseFloat(position.amount) * (currentPrice - parseFloat(position.averagePrice));
    const profitLossPercentage = ((currentPrice - parseFloat(position.averagePrice)) / parseFloat(position.averagePrice)) * 100;

    return {
      symbol: position.symbol,
      exchange: "crypto", // Default to crypto for now
      totalAmount: parseFloat(position.amount),
      averagePrice: parseFloat(position.averagePrice),
      currentPrice,
      profitLoss,
      profitLossPercentage,
    };
  });

  const totalPortfolioValue = positions.reduce(
    (sum, pos) => sum + pos.totalAmount * pos.currentPrice,
    0
  );

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Portfolio Value</CardTitle>
            <CardDescription>Current portfolio statistics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${totalPortfolioValue.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              Available Balance: $
              {parseFloat(user?.balance?.toString() || "0").toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Positions</CardTitle>
            <CardDescription>Current open positions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {positions.map((position) => (
                <div key={position.symbol} className="flex justify-between items-center">
                  <div>
                    <div className="font-medium">{position.symbol}</div>
                    <div className="text-sm text-muted-foreground">
                      {position.totalAmount.toFixed(4)} units
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={position.profitLoss >= 0 ? "text-green-500" : "text-red-500"}>
                      {position.profitLoss >= 0 ? (
                        <TrendingUp className="inline h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="inline h-4 w-4 mr-1" />
                      )}
                      {position.profitLossPercentage.toFixed(2)}%
                    </div>
                    <div className="text-sm text-muted-foreground">
                      ${(position.totalAmount * position.currentPrice).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>Your trading activity</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell>
                    {format(new Date(trade.timestamp), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>{trade.symbol}</TableCell>
                  <TableCell>
                    <span
                      className={
                        trade.type === "buy" ? "text-green-500" : "text-red-500"
                      }
                    >
                      {trade.type.toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell>{parseFloat(trade.amount.toString()).toFixed(4)}</TableCell>
                  <TableCell>${parseFloat(trade.price.toString()).toFixed(2)}</TableCell>
                  <TableCell>
                    ${(parseFloat(trade.amount.toString()) * parseFloat(trade.price.toString())).toFixed(2)}
                  </TableCell>
                  <TableCell>{trade.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}