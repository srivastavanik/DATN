import { useState } from "react";
import OrderForm from "@/components/trading/OrderForm";
import PositionCalculator from "@/components/trading/PositionCalculator";
import TechnicalAnalysis from "@/components/trading/TechnicalAnalysis";
import PortfolioOverview from "@/components/trading/PortfolioOverview";
import PriceChart from "@/components/trading/PriceChart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion } from "framer-motion";

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

export default function Home() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USD");

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <motion.h1 
          className="text-2xl font-bold bg-gradient-to-r from-green-500 to-blue-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            ease: "easeOut"
          }}
        >
          NVIDIA GTC - DATN
        </motion.h1>
        <div className="w-48">
          <Select onValueChange={setSelectedSymbol} defaultValue={selectedSymbol}>
            <SelectTrigger>
              <SelectValue placeholder="Select a cryptocurrency" />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_PAIRS.map((pair) => (
                <SelectItem key={pair} value={pair}>
                  {pair}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Portfolio Overview at the top */}
      <PortfolioOverview />

      {/* Trading Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <TechnicalAnalysis symbol={selectedSymbol} />
        </div>
        <div className="space-y-6">
          <OrderForm />
          <PositionCalculator symbol={selectedSymbol} />
        </div>
      </div>

      {/* Mini Price Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {AVAILABLE_PAIRS.map((pair) => (
          <div key={pair} className="cursor-pointer" onClick={() => setSelectedSymbol(pair)}>
            <PriceChart symbol={pair} mini />
          </div>
        ))}
      </div>
    </div>
  );
}