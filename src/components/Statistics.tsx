import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { Trade } from '../types/trade';
import { formatCurrency, formatPercent, formatDate } from '../utils/calculations';
import { Award, AlertTriangle } from 'lucide-react';

interface StatisticsProps {
  trades: Trade[];
  onView?: (id: string) => void;
}

const BEHAVIORAL_LABELS: Record<string, string> = {
  'good-trade': 'עסקה טובה',
  FOMO: 'FOMO',
  'early-entry': 'כניסה מוקדמת',
  'poor-management': 'ניהול לקוי',
  'no-plan': 'אין תוכנית',
  mistake: 'עסקה בטעות',
  'no-follow': 'לא עקבתי',
  'by-raz': 'לפי רז',
  'by-niv': 'לפי ניב',
  'self-analysis': 'ניתוח עצמי',
};

const TAG_COLORS: Record<string, string> = {
  'good-trade': '#22c55e',
  'by-raz': '#a78bfa',
  'by-niv': '#fbbf24',
  'self-analysis': '#3b82f6',
  FOMO: '#e879f9',
  'early-entry': '#e879f9',
  mistake: '#e879f9',
  'poor-management': '#e879f9',
  'no-plan': '#e879f9',
  'no-follow': '#e879f9',
};

const card = (style?: React.CSSProperties): React.CSSProperties => ({
  backgroundColor: '#1e293b',
  borderRadius: '12px',
  border: '1px solid rgba(71,85,105,0.4)',
  padding: '20px',
  ...style,
});

export default function Statistics({ trades, onView }: StatisticsProps) {
  const wins = trades.filter((t) => t.totalProfitLoss > 0);
  const losses = trades.filter((t) => t.totalProfitLoss <= 0);
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.totalProfitLoss, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.totalProfitLoss, 0) / losses.length : 0;
  const bestTrade = trades.length > 0 ? [...trades].sort((a, b) => b.totalProfitLoss - a.totalProfitLoss)[0] : null;
  const worstTrade = trades.length > 0 ? [...trades].sort((a, b) => a.totalProfitLoss - b.totalProfitLoss)[0] : null;
  const avgRR = trades.length > 0 ? trades.reduce((s, t) => s + t.rr, 0) / trades.length : 0;

  const longs = trades.filter((t) => t.type === 'long');
  const shorts = trades.filter((t) => t.type === 'short');
  const longPL = longs.reduce((s, t) => s + t.totalProfitLoss, 0);
  const shortPL = shorts.reduce((s, t) => s + t.totalProfitLoss, 0);
  const longWinRate = longs.length > 0 ? (longs.filter((t) => t.totalProfitLoss > 0).length / longs.length) * 100 : 0;
  const shortWinRate = shorts.length > 0 ? (shorts.filter((t) => t.totalProfitLoss > 0).length / shorts.length) * 100 : 0;

  // Behavioral tag frequency
  const tagCounts: Record<string, number> = {};
  for (const trade of trades) {
    for (const tag of trade.behavioralTags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const behavioralData = Object.entries(tagCounts)
    .map(([tag, count]) => ({ name: BEHAVIORAL_LABELS[tag] || tag, count, tag }))
    .sort((a, b) => b.count - a.count);

  const top5 = [...trades]
    .filter((t) => t.totalProfitLoss > 0)
    .sort((a, b) => b.totalProfitLoss - a.totalProfitLoss)
    .slice(0, 5);
  const bottom5 = [...trades]
    .filter((t) => t.totalProfitLoss < 0)
    .sort((a, b) => a.totalProfitLoss - b.totalProfitLoss)
    .slice(0, 5);

  const TradeRow = ({ trade }: { trade: Trade }) => {
    const isProfit = trade.totalProfitLoss >= 0;
    return (
      <tr
        style={{ borderBottom: '1px solid rgba(71,85,105,0.2)', cursor: onView ? 'pointer' : 'default', transition: 'background 0.1s' }}
        onClick={() => onView?.(trade.id)}
        onMouseEnter={(e) => { if (onView) (e.currentTarget as HTMLTableRowElement).style.backgroundColor = 'rgba(14,165,233,0.06)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = ''; }}
      >
        <td style={{ padding: '9px 12px', color: '#f1f5f9', fontWeight: 700 }}>{trade.stockName}</td>
        <td style={{ padding: '9px 12px', color: '#94a3b8', fontSize: '13px' }}>{formatDate(trade.date)}</td>
        <td style={{ padding: '9px 12px' }}>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: trade.type === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
              color: trade.type === 'long' ? '#22c55e' : '#ef4444',
            }}
          >
            {trade.type === 'long' ? 'לונג' : 'שורט'}
          </span>
        </td>
        <td style={{ padding: '9px 12px', color: isProfit ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
          {formatCurrency(trade.totalProfitLoss)}
        </td>
        <td style={{ padding: '9px 12px', color: isProfit ? '#22c55e' : '#ef4444' }}>
          {formatPercent(trade.totalProfitLossPercent)}
        </td>
        <td style={{ padding: '9px 12px', color: trade.rr >= 1 ? '#22c55e' : '#f59e0b' }}>
          {trade.rr.toFixed(2)}
        </td>
      </tr>
    );
  };

  return (
    <div style={{ padding: '28px', direction: 'rtl' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#f1f5f9', margin: 0 }}>סטטיסטיקות</h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>ניתוח מעמיק של ביצועי המסחר</p>
      </div>

      {/* Overall Stats */}
      <div style={{ ...card(), marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginTop: 0, marginBottom: '16px' }}>
          סטטיסטיקה כוללת
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'סה"כ עסקאות', value: trades.length.toString(), color: '#0ea5e9' },
            { label: 'אחוז הצלחה', value: winRate.toFixed(1) + '%', color: winRate >= 50 ? '#22c55e' : '#f59e0b' },
            { label: 'ממוצע רווח', value: formatCurrency(avgWin), color: '#22c55e' },
            { label: 'ממוצע הפסד', value: formatCurrency(avgLoss), color: '#ef4444' },
            {
              label: 'עסקה הטובה ביותר',
              value: bestTrade ? formatCurrency(bestTrade.totalProfitLoss) : '—',
              color: '#22c55e',
            },
            {
              label: 'עסקה הגרועה ביותר',
              value: worstTrade ? formatCurrency(worstTrade.totalProfitLoss) : '—',
              color: '#ef4444',
            },
            { label: 'R/R ממוצע', value: avgRR.toFixed(2), color: avgRR >= 1 ? '#22c55e' : '#f59e0b' },
            {
              label: 'פקטור רווח',
              value: Math.abs(avgLoss) > 0 ? (avgWin / Math.abs(avgLoss)).toFixed(2) : '—',
              color: '#a78bfa',
            },
          ].map((item, i) => (
            <div key={i} style={{ padding: '14px', backgroundColor: '#0f172a', borderRadius: '10px' }}>
              <div style={{ fontSize: '11px', color: '#475569', marginBottom: '6px' }}>{item.label}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Long vs Short */}
      <div style={{ ...card(), marginBottom: '20px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginTop: 0, marginBottom: '16px' }}>
          לונג vs שורט
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            {
              label: 'לונג',
              trades: longs,
              pl: longPL,
              winRate: longWinRate,
              color: '#22c55e',
              bg: 'rgba(34,197,94,0.05)',
              border: 'rgba(34,197,94,0.2)',
            },
            {
              label: 'שורט',
              trades: shorts,
              pl: shortPL,
              winRate: shortWinRate,
              color: '#ef4444',
              bg: 'rgba(239,68,68,0.05)',
              border: 'rgba(239,68,68,0.2)',
            },
          ].map((side) => (
            <div
              key={side.label}
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: side.bg,
                border: `1px solid ${side.border}`,
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: 700, color: side.color, marginBottom: '12px' }}>
                {side.label}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>עסקאות</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#e2e8f0' }}>{side.trades.length}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>אחוז הצלחה</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: side.color }}>{side.winRate.toFixed(1)}%</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#475569' }}>רווח/הפסד</div>
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: side.pl >= 0 ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {formatCurrency(side.pl)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Behavioral Analysis */}
      {behavioralData.length > 0 && (
        <div style={{ ...card(), marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#f1f5f9', marginTop: 0, marginBottom: '16px' }}>
            ניתוח התנהגותי
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={behavioralData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(71,85,105,0.3)" />
              <XAxis
                dataKey="name"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid rgba(71,85,105,0.5)',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
                formatter={(value) => [String(value) + ' פעמים', 'תדירות']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {behavioralData.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={TAG_COLORS[entry.tag] ?? '#0ea5e9'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Best Trades */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={card()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Award size={18} color="#22c55e" />
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
              העסקאות הטובות ביותר
            </h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(71,85,105,0.3)' }}>
                {['מניה', 'תאריך', 'סוג', 'רווח $', 'רווח %', 'R/R'].map((h) => (
                  <th key={h} style={{ padding: '6px 12px', color: '#475569', fontWeight: 500, textAlign: 'right', fontSize: '11px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {top5.map((t) => (
                <TradeRow key={t.id} trade={t} />
              ))}
              {top5.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#475569' }}>
                    אין עסקאות רווח
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={card()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertTriangle size={18} color="#ef4444" />
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9', margin: 0 }}>
              העסקאות הגרועות ביותר
            </h2>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(71,85,105,0.3)' }}>
                {['מניה', 'תאריך', 'סוג', 'רווח $', 'רווח %', 'R/R'].map((h) => (
                  <th key={h} style={{ padding: '6px 12px', color: '#475569', fontWeight: 500, textAlign: 'right', fontSize: '11px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bottom5.map((t) => (
                <TradeRow key={t.id} trade={t} />
              ))}
              {bottom5.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#475569' }}>
                    אין עסקאות הפסד
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
