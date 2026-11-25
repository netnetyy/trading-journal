import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';
import type { AppData, Trade } from '../types/trade';
import type { PeriodStats } from '../utils/calculations';
import {
  formatCurrency,
  formatPercent,
  formatDate,
  getNetProfitLoss,
  getRiskUnits,
  getMonthlyStats,
  getYearlyStats,
} from '../utils/calculations';
import { Award, AlertTriangle, Calendar, Eye, EyeOff, ChevronRight } from 'lucide-react';

interface StatisticsProps {
  data: AppData;
  onView?: (id: string) => void;
}

const BEHAVIORAL_LABELS: Record<string, string> = {
  'good-trade': 'עסקה טובה',
  'self-analysis': 'ניתוח עצמי',
  'by-raz': 'לפי רז',
  'by-niv': 'לפי ניב',
  FOMO: 'FOMO',
  'movement-entry': 'כניסה בתנועה',
  'low-confidence': 'כניסה עם ביטחון נמוך',
  'early-entry': 'כניסה מוקדמת',
  'adding-before-confirmation': 'הוספה לפני אישור',
  'unexecuted-limit': 'לימיט שלא בוצע',
  'early-exit': 'יציאה מוקדמת',
  'late-exit': 'יציאה מאוחרת',
  'risk-unit-deviation': 'חריגה מיחידת סיכון',
  'missed-key-points': 'פספוס נקודות מפתח',
  'profit-to-loss': 'המרת רווח להפסד',
  'trade-infatuation': 'התאהבות בעסקה',
  'work-after-exit': 'עבודה אחרי יציאה',
  'stock-based-management': 'ניהול על בסיס המניה',
  'wrong-goal-planning': 'תכנון מטרה שגוי',
  'tight-stop-loss': 'סטופ לוס צמוד',
  'wrong-share-quantity': 'כמות מניות שגויה',
  'poor-management': 'ניהול לקוי',
  'no-plan': 'אין תוכנית',
  mistake: 'עסקה בטעות',
  'no-follow': 'לא עקבתי',
};

const TAG_COLORS: Record<string, string> = {
  'good-trade': '#34d399',
  'by-raz': '#a78bfa',
  'by-niv': '#fbbf24',
  'self-analysis': '#3b82f6',
};

function getTagColor(tag: string): string {
  return TAG_COLORS[tag] ?? '#f43f5e';
}

const card = (style?: React.CSSProperties): React.CSSProperties => ({
  backgroundColor: '#111621',
  borderRadius: '12px',
  border: '1px solid rgba(148,163,184,0.16)',
  padding: '20px',
  ...style,
});

const thStyle: React.CSSProperties = {
  padding: '8px 12px',
  color: '#565f73',
  fontWeight: 500,
  textAlign: 'right',
  fontSize: '12px',
  whiteSpace: 'nowrap',
};

// ─── Shared helpers ────────────────────────────────────────────────────────────

function StatsGrid({ trades, riskUnitValue }: { trades: Trade[]; riskUnitValue: number }) {
  const netPLs = trades.map(getNetProfitLoss);
  const wins = trades.filter((_, i) => netPLs[i] > 0);
  const losses = trades.filter((_, i) => netPLs[i] <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + getNetProfitLoss(t), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + getNetProfitLoss(t), 0) / losses.length : 0;
  const best = trades.length > 0 ? [...trades].sort((a, b) => getNetProfitLoss(b) - getNetProfitLoss(a))[0] : null;
  const worst = trades.length > 0 ? [...trades].sort((a, b) => getNetProfitLoss(a) - getNetProfitLoss(b))[0] : null;
  const avgRR = trades.length > 0 ? trades.reduce((s, t) => s + t.rr, 0) / trades.length : 0;
  const totalCommissions = trades.reduce((s, t) => s + (t.commissions ?? 0), 0);
  const totalRiskUnits = riskUnitValue > 0 ? trades.reduce((s, t) => s + getRiskUnits(t, riskUnitValue), 0) : 0;
  const profitFactor = Math.abs(avgLoss) > 0 ? avgWin / Math.abs(avgLoss) : null;

  const items = [
    { label: 'סה"כ עסקאות', value: trades.length.toString(), color: '#6e8bff' },
    { label: 'אחוז הצלחה', value: winRate.toFixed(1) + '%', color: winRate >= 50 ? '#34d399' : '#f59e0b' },
    { label: 'ממוצע רווח נטו', value: formatCurrency(avgWin), color: '#34d399' },
    { label: 'ממוצע הפסד נטו', value: formatCurrency(avgLoss), color: '#f87171' },
    { label: 'עסקה הטובה ביותר', value: best ? formatCurrency(getNetProfitLoss(best)) : '—', color: '#34d399' },
    { label: 'עסקה הגרועה ביותר', value: worst ? formatCurrency(getNetProfitLoss(worst)) : '—', color: '#f87171' },
    { label: 'R/R ממוצע', value: avgRR.toFixed(2), color: avgRR >= 1 ? '#34d399' : '#f59e0b' },
    {
      label: 'פקטור רווח',
      value: profitFactor !== null ? profitFactor.toFixed(2) : '—',
      color: profitFactor !== null && profitFactor >= 1 ? '#a78bfa' : '#f59e0b',
    },
    { label: 'סה"כ עמלות', value: formatCurrency(totalCommissions), color: '#f59e0b' },
    ...(riskUnitValue > 0 ? [{
      label: 'סה"כ יחידות R',
      value: (totalRiskUnits >= 0 ? '+' : '') + totalRiskUnits.toFixed(2) + 'R',
      color: totalRiskUnits >= 0 ? '#34d399' : '#f87171',
    }] : []),
  ];

  return (
    <div className="rg-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      {items.map((item, i) => (
        <div key={i} style={{ padding: '14px', backgroundColor: '#0a0d14', borderRadius: '10px' }}>
          <div style={{ fontSize: '11px', color: '#565f73', marginBottom: '6px' }}>{item.label}</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: item.color }}>{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function LongShortSection({ trades }: { trades: Trade[] }) {
  const longs = trades.filter(t => t.type === 'long');
  const shorts = trades.filter(t => t.type === 'short');
  const longPL = longs.reduce((s, t) => s + getNetProfitLoss(t), 0);
  const shortPL = shorts.reduce((s, t) => s + getNetProfitLoss(t), 0);
  const longWR = longs.length > 0 ? (longs.filter(t => getNetProfitLoss(t) > 0).length / longs.length) * 100 : 0;
  const shortWR = shorts.length > 0 ? (shorts.filter(t => getNetProfitLoss(t) > 0).length / shorts.length) * 100 : 0;

  return (
    <div className="rg-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {[
        { label: 'לונג', ts: longs, pl: longPL, wr: longWR, color: '#34d399', bg: 'rgba(52,211,153,0.05)', border: 'rgba(52,211,153,0.2)' },
        { label: 'שורט', ts: shorts, pl: shortPL, wr: shortWR, color: '#f87171', bg: 'rgba(248,113,113,0.05)', border: 'rgba(248,113,113,0.2)' },
      ].map(s => (
        <div key={s.label} style={{ padding: '16px', borderRadius: '10px', backgroundColor: s.bg, border: `1px solid ${s.border}` }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: s.color, marginBottom: '12px' }}>{s.label}</div>
          <div className="rg-kpi" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div><div style={{ fontSize: '11px', color: '#565f73' }}>עסקאות</div><div style={{ fontSize: '18px', fontWeight: 700, color: '#dfe4ec' }}>{s.ts.length}</div></div>
            <div><div style={{ fontSize: '11px', color: '#565f73' }}>הצלחה</div><div style={{ fontSize: '18px', fontWeight: 700, color: s.color }}>{s.wr.toFixed(1)}%</div></div>
            <div><div style={{ fontSize: '11px', color: '#565f73' }}>P&L נטו</div><div style={{ fontSize: '16px', fontWeight: 700, color: s.pl >= 0 ? '#34d399' : '#f87171' }}>{formatCurrency(s.pl)}</div></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function BehavioralSection({ trades }: { trades: Trade[] }) {
  const tagCounts: Record<string, number> = {};
  for (const t of trades) for (const tag of t.behavioralTags) tagCounts[tag] = (tagCounts[tag] || 0) + 1;
  const data = Object.entries(tagCounts)
    .map(([tag, count]) => ({ name: BEHAVIORAL_LABELS[tag] || tag, count, tag }))
    .sort((a, b) => b.count - a.count);

  if (data.length === 0) return null;
  return (
    <div style={{ ...card(), marginBottom: '20px' }}>
      <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#eef1f6', marginTop: 0, marginBottom: '16px' }}>ניתוח התנהגותי</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.12)" />
          <XAxis dataKey="name" tick={{ fill: '#7d879a', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: '#7d879a', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#111621', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: '#dfe4ec' }}
            formatter={(value) => [String(value) + ' פעמים', 'תדירות']}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => <Cell key={i} fill={getTagColor(entry.tag)} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TradeRowEl({ trade, onView }: { trade: Trade; onView?: (id: string) => void }) {
  const netPL = getNetProfitLoss(trade);
  const isProfit = netPL >= 0;
  return (
    <tr
      style={{ borderBottom: '1px solid rgba(148,163,184,0.08)', cursor: onView ? 'pointer' : 'default' }}
      onClick={() => onView?.(trade.id)}
      onMouseEnter={(e) => { if (onView) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'rgba(110,139,255,0.06)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
    >
      <td style={{ padding: '9px 12px', color: '#eef1f6', fontWeight: 700 }}>{trade.stockName}</td>
      <td style={{ padding: '9px 12px', color: '#b6bdcc', fontSize: '13px' }}>{formatDate(trade.date)}</td>
      <td style={{ padding: '9px 12px' }}>
        <span style={{
          padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 700,
          backgroundColor: trade.type === 'long' ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)',
          color: trade.type === 'long' ? '#34d399' : '#f87171',
        }}>{trade.type === 'long' ? 'לונג' : 'שורט'}</span>
      </td>
      <td style={{ padding: '9px 12px', color: isProfit ? '#34d399' : '#f87171', fontWeight: 700 }}>{formatCurrency(netPL)}</td>
      <td style={{ padding: '9px 12px', color: isProfit ? '#34d399' : '#f87171' }}>{formatPercent(trade.totalProfitLossPercent)}</td>
      <td style={{ padding: '9px 12px', color: trade.rr >= 1 ? '#34d399' : '#f59e0b' }}>{trade.rr.toFixed(2)}</td>
    </tr>
  );
}

function BestWorstSection({ trades, onView }: { trades: Trade[]; onView?: (id: string) => void }) {
  const top = [...trades].sort((a, b) => getNetProfitLoss(b) - getNetProfitLoss(a)).filter(t => getNetProfitLoss(t) > 0).slice(0, 5);
  const bot = [...trades].sort((a, b) => getNetProfitLoss(a) - getNetProfitLoss(b)).filter(t => getNetProfitLoss(t) < 0).slice(0, 5);
  const headers = ['מניה', 'תאריך', 'סוג', 'P&L נטו', '%', 'R/R'];

  return (
    <div className="rg-stack" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
      {[
        { icon: <Award size={18} color="#34d399" />, title: 'העסקאות הטובות ביותר', rows: top, empty: 'אין עסקאות רווח' },
        { icon: <AlertTriangle size={18} color="#f87171" />, title: 'העסקאות הגרועות ביותר', rows: bot, empty: 'אין עסקאות הפסד' },
      ].map(({ icon, title, rows, empty }) => (
        <div key={title} style={card()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            {icon}
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#eef1f6', margin: 0 }}>{title}</h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(148,163,184,0.12)' }}>
                {headers.map(h => <th key={h} style={{ padding: '6px 12px', color: '#565f73', fontWeight: 500, textAlign: 'right', fontSize: '11px' }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(t => <TradeRowEl key={t.id} trade={t} onView={onView} />)}
              {rows.length === 0 && <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#565f73' }}>{empty}</td></tr>}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

// ─── Period Detail Page ────────────────────────────────────────────────────────

interface PeriodDetailViewProps {
  data: AppData;
  period: PeriodStats;
  onBack: () => void;
  onView?: (id: string) => void;
}

function PeriodDetailView({ data, period, onBack, onView }: PeriodDetailViewProps) {
  const riskUnitValue = data.riskUnitValue ?? 100;
  const periodTrades = data.trades.filter(t => period.tradeIds.includes(t.id));

  // Portfolio value at start of this period
  const sortedPeriodDates = periodTrades.map(t => t.date).sort();
  const earliestDate = sortedPeriodDates[0] ?? '';
  const priorPL = data.trades
    .filter(t => t.date < earliestDate)
    .reduce((s, t) => s + getNetProfitLoss(t), 0);
  const portfolioAtStart = data.portfolioBaseValue + priorPL;
  const portfolioAtEnd = portfolioAtStart + period.netPL;
  const portfolioChangePct = portfolioAtStart > 0 ? (period.netPL / portfolioAtStart) * 100 : 0;

  // Cumulative P&L curve within the period
  const sorted = [...periodTrades].sort((a, b) => a.date.localeCompare(b.date));
  const plCurve: { date: string; value: number }[] = [];
  let running = portfolioAtStart;
  if (sorted.length > 0) {
    const dayBefore = new Date(sorted[0].date);
    dayBefore.setDate(dayBefore.getDate() - 1);
    plCurve.push({ date: dayBefore.toISOString().split('T')[0], value: Math.round(portfolioAtStart * 100) / 100 });
  }
  const byDate = new Map<string, number>();
  for (const t of sorted) byDate.set(t.date, (byDate.get(t.date) ?? 0) + getNetProfitLoss(t));
  for (const [date, delta] of byDate) {
    running += delta;
    plCurve.push({ date, value: Math.round(running * 100) / 100 });
  }

  const isProfit = period.netPL >= 0;
  const totalRiskUnits = riskUnitValue > 0 ? period.riskUnits : 0;

  return (
    <div className="page" style={{ direction: 'rtl' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            background: 'none', border: '1px solid rgba(148,163,184,0.16)',
            borderRadius: '8px', padding: '6px 12px', cursor: 'pointer',
            color: '#b6bdcc', fontSize: '13px',
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#6e8bff'; (e.currentTarget as HTMLButtonElement).style.color = '#6e8bff'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(148,163,184,0.16)'; (e.currentTarget as HTMLButtonElement).style.color = '#b6bdcc'; }}
        >
          <ChevronRight size={16} />
          סטטיסטיקות
        </button>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#eef1f6', margin: 0 }}>{period.period}</h1>
          <p style={{ color: '#7d879a', fontSize: '14px', marginTop: '4px' }}>
            {period.count} עסקאות · הצלחה {period.winRate.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Summary banner */}
      <div className="rg-kpi" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
        {[
          {
            label: 'P&L נטו',
            value: formatCurrency(period.netPL),
            sub: `גרוס: ${formatCurrency(periodTrades.reduce((s, t) => s + t.totalProfitLoss, 0))}`,
            color: isProfit ? '#34d399' : '#f87171',
            border: isProfit ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)',
            bg: isProfit ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
          },
          {
            label: 'יחידות סיכון',
            value: (totalRiskUnits >= 0 ? '+' : '') + totalRiskUnits.toFixed(2) + 'R',
            sub: `יחידה = ${formatCurrency(riskUnitValue)}`,
            color: totalRiskUnits >= 0 ? '#34d399' : '#f87171',
            border: totalRiskUnits >= 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)',
            bg: totalRiskUnits >= 0 ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
          },
          {
            label: 'שינוי בתיק',
            value: (portfolioChangePct >= 0 ? '+' : '') + portfolioChangePct.toFixed(2) + '%',
            sub: `${formatCurrency(portfolioAtStart)} → ${formatCurrency(portfolioAtEnd)}`,
            color: portfolioChangePct >= 0 ? '#34d399' : '#f87171',
            border: portfolioChangePct >= 0 ? 'rgba(52,211,153,0.3)' : 'rgba(248,113,113,0.3)',
            bg: portfolioChangePct >= 0 ? 'rgba(52,211,153,0.05)' : 'rgba(248,113,113,0.05)',
          },
          {
            label: 'עמלות',
            value: formatCurrency(period.commissions),
            sub: `${period.count} עסקאות`,
            color: '#f59e0b',
            border: 'rgba(245,158,11,0.3)',
            bg: 'rgba(245,158,11,0.05)',
          },
        ].map((item, i) => (
          <div key={i} style={{
            backgroundColor: item.bg,
            border: `1px solid ${item.border}`,
            borderRadius: '12px', padding: '18px',
          }}>
            <div style={{ fontSize: '12px', color: '#7d879a', marginBottom: '8px' }}>{item.label}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: item.color, marginBottom: '4px' }}>{item.value}</div>
            <div style={{ fontSize: '11px', color: '#565f73' }}>{item.sub}</div>
          </div>
        ))}
      </div>

      {/* Portfolio curve within period */}
      {plCurve.length > 1 && (
        <div style={{ ...card(), marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#eef1f6', marginTop: 0, marginBottom: '16px' }}>ערך תיק במהלך התקופה</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={plCurve} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="date" tick={{ fill: '#7d879a', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#7d879a', fontSize: 11 }} axisLine={false} tickLine={false}
                tickFormatter={(v) => '$' + Math.round(v).toLocaleString()} />
              <Tooltip
                contentStyle={{ backgroundColor: '#111621', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '8px', color: '#dfe4ec' }}
                formatter={(v) => [typeof v === 'number' ? formatCurrency(v) : '—', 'ערך תיק']}
              />
              <ReferenceLine y={portfolioAtStart} stroke="rgba(148,163,184,0.16)" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="value" stroke={isProfit ? '#34d399' : '#f87171'} strokeWidth={2} dot={{ r: 4, fill: isProfit ? '#34d399' : '#f87171' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Overall stats */}
      <div style={{ ...card(), marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#eef1f6', marginTop: 0, marginBottom: '16px' }}>סטטיסטיקה כוללת</h2>
        <StatsGrid trades={periodTrades} riskUnitValue={riskUnitValue} />
      </div>

      {/* Long vs Short */}
      <div style={{ ...card(), marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#eef1f6', marginTop: 0, marginBottom: '16px' }}>לונג vs שורט</h2>
        <LongShortSection trades={periodTrades} />
      </div>

      {/* Behavioral */}
      <BehavioralSection trades={periodTrades} />

      {/* Best / Worst */}
      <BestWorstSection trades={periodTrades} onView={onView} />
    </div>
  );
}

// ─── Main Statistics page ──────────────────────────────────────────────────────

export default function Statistics({ data, onView }: StatisticsProps) {
  const trades = data.trades;
  const riskUnitValue = data.riskUnitValue ?? 100;
  const [periodTab, setPeriodTab] = useState<'monthly' | 'yearly'>('monthly');
  const [showPL, setShowPL] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodStats | null>(null);

  const monthlyStats = getMonthlyStats(data);
  const yearlyStats = getYearlyStats(data);
  const periodStats = periodTab === 'monthly' ? monthlyStats : yearlyStats;

  // If a period is selected, render the detail view
  if (selectedPeriod) {
    return (
      <PeriodDetailView
        data={data}
        period={selectedPeriod}
        onBack={() => setSelectedPeriod(null)}
        onView={onView}
      />
    );
  }

  return (
    <div className="page" style={{ direction: 'rtl' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#eef1f6', margin: 0 }}>סטטיסטיקות</h1>
        <p style={{ color: '#7d879a', fontSize: '14px', marginTop: '4px' }}>ניתוח מעמיק של ביצועי המסחר</p>
      </div>

      {/* Overall Stats */}
      <div style={{ ...card(), marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#eef1f6', marginTop: 0, marginBottom: '16px' }}>סטטיסטיקה כוללת</h2>
        <StatsGrid trades={trades} riskUnitValue={riskUnitValue} />
      </div>

      {/* Long vs Short */}
      <div style={{ ...card(), marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#eef1f6', marginTop: 0, marginBottom: '16px' }}>לונג vs שורט</h2>
        <LongShortSection trades={trades} />
      </div>

      {/* Monthly / Yearly Analysis */}
      <div style={{ ...card(), marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={18} color="#6e8bff" />
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#eef1f6', margin: 0 }}>ניתוח תקופתי</h2>
          </div>
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#0a0d14', borderRadius: '8px', padding: '3px' }}>
            {(['monthly', 'yearly'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setPeriodTab(tab)}
                style={{
                  padding: '5px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: 500,
                  backgroundColor: periodTab === tab ? '#5470f0' : 'transparent',
                  color: periodTab === tab ? 'white' : '#7d879a',
                  transition: 'all 0.15s',
                }}
              >
                {tab === 'monthly' ? 'חודשי' : 'שנתי'}
              </button>
            ))}
          </div>
        </div>
        {periodStats.length === 0 ? (
          <div style={{ color: '#565f73', fontSize: '13px', padding: '24px', textAlign: 'center' }}>אין נתונים להצגה</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0a0d14', borderBottom: '1px solid rgba(148,163,184,0.16)' }}>
                  {[
                    'תקופה', 'עסקאות', 'הצלחה %',
                    ...(riskUnitValue > 0 ? ['יחידות R'] : []),
                    'R/R ממוצע', 'הטובה', 'הגרועה', 'עמלות',
                  ].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  <th style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }}>
                    <span
                      onClick={() => setShowPL(v => !v)}
                      title={showPL ? 'הסתר P&L' : 'הצג P&L'}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}
                    >
                      P&L נטו
                      {showPL ? <Eye size={13} color="#6e8bff" /> : <EyeOff size={13} color="#565f73" />}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {periodStats.map((row, i) => {
                  const isProfit = row.netPL >= 0;
                  return (
                    <tr
                      key={i}
                      style={{
                        borderBottom: '1px solid rgba(148,163,184,0.08)',
                        backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(10,13,20,0.3)',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedPeriod(row)}
                      onMouseEnter={(e) => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'rgba(110,139,255,0.06)'}
                      onMouseLeave={(e) => (e.currentTarget as HTMLTableRowElement).style.backgroundColor = i % 2 === 0 ? 'transparent' : 'rgba(10,13,20,0.3)'}
                    >
                      <td style={{ padding: '10px 12px', color: '#6e8bff', fontWeight: 600, textDecoration: 'underline dotted' }}>{row.period}</td>
                      <td style={{ padding: '10px 12px', color: '#dfe4ec' }}>{row.count}</td>
                      <td style={{ padding: '10px 12px', color: row.winRate >= 50 ? '#34d399' : '#f59e0b', fontWeight: 600 }}>{row.winRate.toFixed(1)}%</td>
                      {riskUnitValue > 0 && (
                        <td style={{ padding: '10px 12px', color: row.riskUnits >= 0 ? '#34d399' : '#f87171', fontWeight: 600 }}>
                          {(row.riskUnits >= 0 ? '+' : '') + row.riskUnits.toFixed(2)}R
                        </td>
                      )}
                      <td style={{ padding: '10px 12px', color: row.avgRR >= 1 ? '#34d399' : '#f59e0b' }}>{row.avgRR.toFixed(2)}</td>
                      <td style={{ padding: '10px 12px', color: '#34d399' }}>{formatCurrency(row.bestTrade)}</td>
                      <td style={{ padding: '10px 12px', color: '#f87171' }}>{formatCurrency(row.worstTrade)}</td>
                      <td style={{ padding: '10px 12px', color: '#f59e0b' }}>{formatCurrency(row.commissions)}</td>
                      <td style={{
                        padding: '10px 12px', color: isProfit ? '#34d399' : '#f87171', fontWeight: 700,
                        filter: showPL ? 'none' : 'blur(6px)', userSelect: showPL ? 'auto' : 'none',
                      }}>
                        {formatCurrency(row.netPL)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Behavioral */}
      <BehavioralSection trades={trades} />

      {/* Best / Worst */}
      <BestWorstSection trades={trades} onView={onView} />
    </div>
  );
}
