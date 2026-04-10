import type { Trade, AppData } from '../types/trade';

export function getPortfolioValue(data: AppData): number {
  return data.portfolioBaseValue + getTotalProfitLoss(data.trades);
}

// Portfolio value just before the given trade executed (chronological)
export function getPortfolioValueAtTrade(data: AppData, trade: Trade): number {
  const priorPL = data.trades
    .filter((t) => t.date < trade.date || (t.date === trade.date && t.createdAt < trade.createdAt))
    .reduce((sum, t) => sum + t.totalProfitLoss, 0);
  return data.portfolioBaseValue + priorPL;
}

export function getPLPercentOfPortfolio(data: AppData, trade: Trade): number {
  const base = getPortfolioValueAtTrade(data, trade);
  if (base === 0) return 0;
  return (trade.totalProfitLoss / base) * 100;
}

export function getTotalProfitLoss(trades: Trade[]): number {
  return trades.reduce((sum, t) => sum + t.totalProfitLoss, 0);
}

export function getWinRate(trades: Trade[]): number {
  if (trades.length === 0) return 0;
  const wins = trades.filter((t) => t.totalProfitLoss > 0).length;
  return (wins / trades.length) * 100;
}

// Chart 1: total portfolio value over time (includes deposits at their dates + trade P&L)
export function getEquityCurve(data: AppData): { date: string; value: number; label?: string }[] {
  const totalDeposits = data.deposits.reduce((s, d) => s + d.amount, 0);
  const initialBase = data.portfolioBaseValue - totalDeposits; // base before tracked deposits

  // Build a unified event list: deposits + trades, sorted by date
  type Event = { date: string; delta: number; kind: 'deposit' | 'trade' };
  const events: Event[] = [
    ...data.deposits.map((d) => ({ date: d.date, delta: d.amount, kind: 'deposit' as const })),
    ...data.trades.map((t) => ({ date: t.date, delta: t.totalProfitLoss, kind: 'trade' as const })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  if (events.length === 0) return [];

  // Aggregate same-date events into one point, preserving deposit label
  const byDate = new Map<string, { delta: number; hasDeposit: boolean }>();
  for (const ev of events) {
    const existing = byDate.get(ev.date) ?? { delta: 0, hasDeposit: false };
    byDate.set(ev.date, {
      delta: existing.delta + ev.delta,
      hasDeposit: existing.hasDeposit || ev.kind === 'deposit',
    });
  }

  const curve: { date: string; value: number; label?: string }[] = [];
  let running = initialBase;

  const firstDate = new Date(events[0].date);
  firstDate.setDate(firstDate.getDate() - 1);
  curve.push({ date: firstDate.toISOString().split('T')[0], value: Math.round(running * 100) / 100 });

  for (const [date, { delta, hasDeposit }] of byDate) {
    running += delta;
    curve.push({
      date,
      value: Math.round(running * 100) / 100,
      label: hasDeposit ? 'הפקדה' : undefined,
    });
  }

  return curve;
}

// Chart 2: cumulative P&L from trades only (no deposits)
export function getPLCurve(data: AppData): { date: string; value: number }[] {
  const sorted = [...data.trades].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return [];

  // Aggregate same-date trades into one point to avoid Recharts tooltip confusion
  const byDate = new Map<string, number>();
  for (const trade of sorted) {
    byDate.set(trade.date, (byDate.get(trade.date) ?? 0) + trade.totalProfitLoss);
  }

  const curve: { date: string; value: number }[] = [];
  let running = 0;

  const firstDate = new Date(sorted[0].date);
  firstDate.setDate(firstDate.getDate() - 1);
  curve.push({ date: firstDate.toISOString().split('T')[0], value: 0 });

  for (const [date, dayPL] of byDate) {
    running += dayPL;
    curve.push({ date, value: Math.round(running * 100) / 100 });
  }

  return curve;
}

export function calculateAvgEntryPrice(
  initialEntry: { price: number; quantity: number },
  reinforcements: { price: number; quantity: number }[]
): number {
  let totalCost = initialEntry.price * initialEntry.quantity;
  let totalQty = initialEntry.quantity;
  for (const r of reinforcements) {
    totalCost += r.price * r.quantity;
    totalQty += r.quantity;
  }
  return totalQty > 0 ? totalCost / totalQty : 0;
}

export function formatCurrency(value: number): string {
  const abs = Math.abs(value);
  const formatted = abs.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (value < 0 ? '-$' : '$') + formatted;
}

export function formatPercent(value: number): string {
  return (value >= 0 ? '+' : '') + value.toFixed(2) + '%';
}

export function formatDate(isoDate: string): string {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}
