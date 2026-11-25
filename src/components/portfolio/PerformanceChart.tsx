import { useMemo, useState } from 'react';
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { ClosedInvestment, Investment, ValueSnapshot } from '../../portfolio/types';
import { fmtCompactUsd, fmtSignedUsd, fmtUsd, toneClass } from '../../portfolio/calc';
import { Card, CardHeader, Segmented } from '../ui';
import { cx } from '../../utils/cx';

type Range = '1m' | '3m' | '6m' | '1y' | 'all';

const RANGE_DAYS: Record<Range, number> = { '1m': 31, '3m': 92, '6m': 183, '1y': 366, all: Infinity };

interface Point {
  date: string;
  cost: number;
  value?: number;
}

/**
 * Cost basis on each date: every purchase made by then, including holdings
 * that were later closed -- they were in the portfolio (and in the value
 * snapshots) until their close date.
 */
function buildSeries(investments: Investment[], closed: ClosedInvestment[], snapshots: ValueSnapshot[]): Point[] {
  const lots = [
    ...investments.flatMap((inv) => inv.purchases.map((p) => ({ date: p.date, until: '9999', cost: p.shares * p.pricePerShare }))),
    ...closed.flatMap((c) => c.purchases.map((p) => ({ date: p.date, until: c.closeDate, cost: p.shares * p.pricePerShare }))),
  ];
  const dates = Array.from(new Set([
    ...lots.map((l) => l.date),
    ...closed.map((c) => c.closeDate),
    ...snapshots.map((s) => s.date),
  ])).sort();
  const snapByDate = new Map(snapshots.map((s) => [s.date, s.value]));
  return dates.map((date) => ({
    date,
    cost: +lots.filter((l) => l.date <= date && l.until > date).reduce((s, l) => s + l.cost, 0).toFixed(2),
    value: snapByDate.get(date),
  }));
}

function shortDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' });
}

export default function PerformanceChart({
  investments,
  closed,
  snapshots,
}: {
  investments: Investment[];
  closed: ClosedInvestment[];
  snapshots: ValueSnapshot[];
}) {
  const [range, setRange] = useState<Range>('all');
  const [now] = useState(() => Date.now());
  const all = useMemo(() => buildSeries(investments, closed, snapshots), [investments, closed, snapshots]);

  const data = useMemo(() => {
    if (range === 'all') return all;
    const from = new Date(now - RANGE_DAYS[range] * 86400000).toISOString().slice(0, 10);
    const inRange = all.filter((p) => p.date >= from);
    // Carry the cost line in from before the window so it does not start at zero
    const before = all.filter((p) => p.date < from).pop();
    return before ? [{ date: from, cost: before.cost }, ...inRange] : inRange;
  }, [all, range, now]);

  // Gain over the window, net of new money: change in (value - cost)
  const valued = data.filter((p) => p.value !== undefined);
  const first = valued[0];
  const last = valued[valued.length - 1];
  const periodGain = first && last && first !== last ? (last.value! - last.cost) - (first.value! - first.cost) : null;

  const rangeLabel: Record<Range, string> = { '1m': 'בחודש האחרון', '3m': 'ב-3 חודשים', '6m': 'בחצי שנה', '1y': 'בשנה האחרונה', all: 'מאז שהתחלת' };

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="ביצועי התיק"
        sub={
          periodGain !== null ? (
            <>
              <span className={cx('num font-semibold', toneClass(periodGain))}>{fmtSignedUsd(periodGain)}</span>{' '}
              {rangeLabel[range]} · בניכוי הפקדות
            </>
          ) : snapshots.length === 0 ? 'נקודות שווי ייצברו עם כל עדכון מחירים' : 'שווי מול עלות לאורך זמן'
        }
      />
      <div className="px-4 pt-3 sm:px-5">
        <Segmented
          value={range}
          onChange={setRange}
          className="w-full sm:w-auto [&>button]:flex-1"
          options={[
            { value: '1m', label: 'חודש' },
            { value: '3m', label: '3 ח׳' },
            { value: '6m', label: '6 ח׳' },
            { value: '1y', label: 'שנה' },
            { value: 'all', label: 'הכל' },
          ]}
        />
      </div>

      <div className="h-[220px] px-1 pt-4 sm:h-[260px] sm:px-3" dir="ltr">
        {data.length < 2 ? (
          <div className="flex h-full items-center justify-center text-sm text-faint" dir="rtl">אין מספיק נתונים לטווח הזה</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6e8bff" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#6e8bff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="rgba(148,163,184,0.08)" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fill: '#7d879a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={fmtCompactUsd}
                tick={{ fill: '#7d879a', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={48}
                domain={['auto', 'auto']}
              />
              <Tooltip
                cursor={{ stroke: 'rgba(148,163,184,0.35)', strokeWidth: 1 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as Point;
                  const gain = p.value !== undefined ? p.value - p.cost : null;
                  return (
                    <div dir="rtl" className="rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-xs shadow-xl">
                      <div className="mb-1 text-muted">{new Date(String(label)).toLocaleDateString('he-IL')}</div>
                      {p.value !== undefined && (
                        <div className="flex justify-between gap-4"><span className="text-ink-2">שווי</span><span className="num font-semibold text-ink">{fmtUsd(p.value)}</span></div>
                      )}
                      <div className="flex justify-between gap-4"><span className="text-ink-2">עלות</span><span className="num text-ink-2">{fmtUsd(p.cost)}</span></div>
                      {gain !== null && (
                        <div className="flex justify-between gap-4"><span className="text-ink-2">רווח</span><span className={cx('num font-semibold', toneClass(gain))}>{fmtSignedUsd(gain)}</span></div>
                      )}
                    </div>
                  );
                }}
              />
              <Line type="stepAfter" dataKey="cost" stroke="#7d879a" strokeWidth={1.5} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#6e8bff"
                strokeWidth={2}
                fill="url(#valueFill)"
                connectNulls
                dot={false}
                activeDot={{ r: 4, fill: '#6e8bff', stroke: '#111621', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="flex items-center gap-4 px-4 pt-1 pb-4 text-xs text-muted sm:px-5">
        <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded bg-accent" />שווי התיק</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t-[1.5px] border-dashed border-muted" />עלות מצטברת</span>
      </div>
    </Card>
  );
}
