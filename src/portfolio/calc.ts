import type { Investment } from './types';

export interface HoldingStats {
  totalShares: number;
  totalCost: number;
  avgEntry: number;
  currentValue: number;
  pl: number | null;
  plPct: number | null;
  dayChange: number | null;
  dayChangePct: number | null;
  firstDate: string | null;
  heldDays: number;
}

const DAY = 86_400_000;

export function calcStats(inv: Investment): HoldingStats {
  const totalShares = inv.purchases.reduce((s, p) => s + p.shares, 0);
  const totalCost = inv.purchases.reduce((s, p) => s + p.shares * p.pricePerShare, 0);
  const avgEntry = totalShares > 0 ? totalCost / totalShares : 0;
  const hasPrice = inv.currentPrice != null && inv.currentPrice > 0;
  const currentValue = hasPrice ? totalShares * inv.currentPrice! : 0;
  const pl = hasPrice ? currentValue - totalCost : null;
  const plPct = hasPrice && totalCost > 0 ? ((currentValue - totalCost) / totalCost) * 100 : null;
  const hasPrev = hasPrice && inv.prevClose != null && inv.prevClose > 0;
  const dayChange = hasPrev ? (inv.currentPrice! - inv.prevClose!) * totalShares : null;
  const dayChangePct = hasPrev ? ((inv.currentPrice! - inv.prevClose!) / inv.prevClose!) * 100 : null;
  const firstDate = inv.purchases.reduce<string | null>((min, p) => (!min || p.date < min ? p.date : min), null);
  const heldDays = firstDate ? Math.max(0, Math.floor((Date.now() - new Date(firstDate).getTime()) / DAY)) : 0;
  return { totalShares, totalCost, avgEntry, currentValue, pl, plPct, dayChange, dayChangePct, firstDate, heldDays };
}

export interface PortfolioTotals {
  value: number;
  cost: number;
  pl: number;
  plPct: number;
  /** Cost of the holdings that have a price -- the base the P&L is measured on */
  pricedCost: number;
  dayChange: number | null;
  dayChangePct: number | null;
  hasPrices: boolean;
}

export function calcTotals(investments: Investment[]): PortfolioTotals {
  let value = 0, cost = 0, pricedCost = 0, day = 0, prevValue = 0, anyDay = false, hasPrices = false;
  for (const inv of investments) {
    const s = calcStats(inv);
    cost += s.totalCost;
    if (s.pl !== null) {
      hasPrices = true;
      value += s.currentValue;
      pricedCost += s.totalCost;
    }
    if (s.dayChange !== null) {
      anyDay = true;
      day += s.dayChange;
      prevValue += s.currentValue - s.dayChange;
    }
  }
  const pl = value - pricedCost;
  return {
    value,
    cost,
    pl,
    plPct: pricedCost > 0 ? (pl / pricedCost) * 100 : 0,
    pricedCost,
    dayChange: anyDay ? day : null,
    dayChangePct: anyDay && prevValue > 0 ? (day / prevValue) * 100 : null,
    hasPrices,
  };
}

/* ── Formatting ─────────────────────────────────────────────────────────── */

export function fmtUsd(n: number, digits = 2): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function fmtSignedUsd(n: number, digits = 2): string {
  return `${n >= 0 ? '+' : '-'}$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

export function fmtPct(n: number, digits = 2): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(digits)}%`;
}

export function fmtCompactUsd(n: number): string {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 10_000) return `${sign}$${(a / 1000).toFixed(0)}K`;
  if (a >= 1000) return `${sign}$${(a / 1000).toFixed(1)}K`;
  return `${sign}$${a.toFixed(0)}`;
}

export function fmtShares(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
}

export function fmtHeld(days: number): string {
  if (days < 1) return 'היום';
  if (days < 31) return `${days} ימים`;
  const months = days / 30.44;
  if (months < 12) return `${Math.round(months)} חודשים`;
  const years = days / 365.25;
  return years < 10 ? `${years.toFixed(1)} שנים` : `${Math.round(years)} שנים`;
}

export function timeAgo(iso?: string): string {
  if (!iso) return 'אף פעם';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} דק׳`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `לפני ${hours} שע׳`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'אתמול' : `לפני ${days} ימים`;
}

export function isOlderThan24h(dateStr?: string): boolean {
  if (!dateStr) return true;
  return Date.now() - new Date(dateStr).getTime() > DAY;
}

/* ── P&L colour intensity ──────────────────────────────────────────────────
   A holding's colour says how it is doing *relative to the others*: the
   biggest winner is the brightest green, the biggest loser the brightest red. */

export function plIntensity(inv: Investment, all: Investment[]): { sign: 1 | -1 | 0; ratio: number } {
  const { plPct } = calcStats(inv);
  if (plPct === null || plPct === 0) return { sign: 0, ratio: 0 };
  const pcts = all.map((i) => calcStats(i).plPct).filter((p): p is number => p !== null);
  const same = pcts.filter((p) => (plPct > 0 ? p > 0 : p < 0)).map(Math.abs);
  const max = Math.max(...same, Math.abs(plPct));
  const min = same.length > 1 ? Math.min(...same) : 0;
  const ratio = max === min ? 1 : (Math.abs(plPct) - min) / (max - min);
  return { sign: plPct > 0 ? 1 : -1, ratio };
}

/** Solid colour for chart slices */
export function plColor(inv: Investment, all: Investment[]): string {
  const { sign, ratio } = plIntensity(inv, all);
  if (sign === 0) return '#3a4356';
  if (sign > 0) return `hsl(156, ${45 + ratio * 25}%, ${30 + ratio * 26}%)`;
  return `hsl(0, ${50 + ratio * 30}%, ${34 + ratio * 26}%)`;
}

/** Soft tint + ink for the ticker badge */
export function plBadge(inv: Investment, all: Investment[]): { background: string; color: string; borderColor: string } {
  const { sign, ratio } = plIntensity(inv, all);
  if (sign === 0) return { background: 'rgba(148,163,184,0.10)', color: '#b6bdcc', borderColor: 'rgba(148,163,184,0.16)' };
  const a = 0.10 + ratio * 0.22;
  return sign > 0
    ? { background: `rgba(52,211,153,${a})`, color: '#6ee7b7', borderColor: `rgba(52,211,153,${a + 0.08})` }
    : { background: `rgba(248,113,113,${a})`, color: '#fca5a5', borderColor: `rgba(248,113,113,${a + 0.08})` };
}

export function toneClass(n: number | null | undefined): string {
  if (n == null || n === 0) return 'text-ink-2';
  return n > 0 ? 'text-profit' : 'text-loss';
}

export function today(): string {
  // Local date, not UTC: in Israel the UTC date is still yesterday until 02:00/03:00
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
