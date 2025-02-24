import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from "react";

const AVAILABLE_PAIRS = [
  "BTC/USD",
  "ETH/USD",
  "SOL/USD",
  "ADA/USD",
  "DOT/USD",
  "AVAX/USD",
  "MATIC/USD",
  "LINK/USD",
  "UNI/USD",
  "AAVE/USD"
];

const orderSchema = z.object({
  type: z.enum(["buy", "sell"]),
  symbol: z.string().min(1),
  amount: z.string().transform(Number).pipe(z.number().positive()),
  price: z.string().transform(Number).pipe(z.number().positive()),
});

type OrderFormValues = z.infer<typeof orderSchema>;

export default function OrderForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      type: "buy",
      symbol: "BTC/USD",
      amount: "",
      price: "",
    },
  });

  // Get market data for all pairs
  const { data: marketData } = useQuery({
    queryKey: ["/api/market/prices"],
    refetchInterval: 1000,
  });

  // Update price when market data changes or symbol changes
  useEffect(() => {
    const symbol = form.watch("symbol");
    if (marketData?.[symbol]?.price) {
      form.setValue("price", marketData[symbol].price.toString());
    }
  }, [marketData, form.watch("symbol")]);

  const placeTrade = useMutation({
    mutationFn: async (values: OrderFormValues) => {
      return apiRequest("POST", "/api/trades", {
        ...values,
        userId: 1, // Hardcoded for demo
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trades/1"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/1"] });
      toast({
        title: "Order placed successfully",
        description: `${form.getValues("type").toUpperCase()} ${form.getValues("amount")} ${form.getValues("symbol")}`,
      });
      form.reset({ type: "buy", symbol: form.getValues("symbol"), amount: "", price: form.getValues("price") });
    },
    onError: (error) => {
      toast({
        title: "Failed to place order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => placeTrade.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Order Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="buy" id="buy" />
                        <label htmlFor="buy">Buy</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sell" id="sell" />
                        <label htmlFor="sell">Sell</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cryptocurrency</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a cryptocurrency" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {AVAILABLE_PAIRS.map((pair) => (
                        <SelectItem key={pair} value={pair}>
                          {pair}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.0001" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (USD)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...field}
                      readOnly
                      className="bg-muted"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Button 
              type="submit" 
              className="w-full"
              disabled={placeTrade.isPending}
            >
              {placeTrade.isPending ? "Placing Order..." : "Place Order"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}