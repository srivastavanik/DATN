import React from "react";
import { useState } from "react";
import { useAccountBalance } from "../../hooks/useAccountBalance";
import { calculatePositionSize } from "../../utils/calculatePositionSize";

const TradingPage = () => {
  const [riskPercentage, setRiskPercentage] = useState(1);
  const [entryPrice, setEntryPrice] = useState(0);
  const [stopLoss, setStopLoss] = useState(0);
  const { accountBalance } = useAccountBalance();

  const positionSize = calculatePositionSize(accountBalance, riskPercentage, entryPrice, stopLoss);

  return (
    <div className="trading-page">
      <h1>Trading</h1>
      <div className="position-calculator">
        <h2>Position Calculator</h2>
        <div>
          <label>Account Balance: ${accountBalance}</label>
        </div>
        <div>
          <label>Risk Percentage:</label>
          <input
            type="number"
            value={riskPercentage}
            onChange={(e) => setRiskPercentage(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <label>Entry Price:</label>
          <input
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <label>Stop Loss:</label>
          <input
            type="number"
            value={stopLoss}
            onChange={(e) => setStopLoss(parseFloat(e.target.value))}
          />
        </div>
        <div>
          <label>Position Size: {positionSize}</label>
        </div>
      </div>
    </div>
  );
};

export default TradingPage;
