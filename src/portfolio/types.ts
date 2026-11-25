export interface Purchase {
  id: string;
  date: string;
  shares: number;
  pricePerShare: number;
  notes: string;
}

export interface Investment {
  id: string;
  symbol: string;
  name: string;
  purchases: Purchase[];
  currentPrice?: number;
  /** Previous session's close, for the daily change. Absent on older rows. */
  prevClose?: number;
  lastPriceUpdate?: string;
}

export interface ValueSnapshot {
  date: string;  // YYYY-MM-DD
  value: number; // total portfolio value at that date
}

/**
 * A closed investment. The record freezes the numbers as they stood at closing
 * time, and it is history only: closing moves the investment out of
 * `investments`, so from that moment its cost and value are counted in no
 * portfolio total anywhere -- not in this app, and not in the expense tracker
 * that reads this same Supabase row.
 */
export interface ClosedInvestment {
  id: string;
  symbol: string;
  name: string;
  purchases: Purchase[];
  firstPurchaseDate: string;
  closeDate: string;          // YYYY-MM-DD
  closePrice: number;         // per share, at close
  closeReason: string;
  totalShares: number;
  totalCost: number;
  avgEntry: number;
  proceeds: number;           // totalShares * closePrice
  profitLoss: number;         // proceeds - totalCost
  profitLossPercent: number;
  holdingDays: number;
  closedAt: string;           // when the closing was recorded
}

export interface StoredData {
  investments: Investment[];
  snapshots: ValueSnapshot[];
  /** Sits beside the portfolio, never inside it -- see ClosedInvestment */
  closed: ClosedInvestment[];
}
