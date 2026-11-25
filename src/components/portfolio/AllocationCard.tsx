import { useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { Investment } from '../../portfolio/types';
import { calcStats, fmtCompactUsd, fmtUsd, plColor, toneClass, fmtPct } from '../../portfolio/calc';
import { Card, CardHeader, Segmented } from '../ui';
import { cx } from '../../utils/cx';

type Basis = 'cost' | 'value';

export default function AllocationCard({ investments }: { investments: Investment[] }) {
  const [basis, setBasis] = useState<Basis>('cost');

  const rows = investments
    .map((inv) => {
      const s = calcStats(inv);
      return {
        id: inv.id,
        symbol: inv.symbol,
        amount: basis === 'cost' ? s.totalCost : s.currentValue,
        plPct: s.plPct,
        color: plColor(inv, investments),
      };
    })
    .filter((r) => r.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const top = rows[0];
  const topWeight = top && total > 0 ? (top.amount / total) * 100 : 0;

  return (
    <Card className="flex flex-col">
      <CardHeader
        title="הרכב התיק"
        sub="צבע = רווח/הפסד של האחזקה"
        right={
          <Segmented
            value={basis}
            onChange={setBasis}
            options={[
              { value: 'cost', label: 'לפי עלות' },
              { value: 'value', label: 'לפי שווי' },
            ]}
          />
        }
      />

      {rows.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-5 py-12 text-sm text-faint">
          {basis === 'value' ? 'אין עדיין מחירים עדכניים' : 'אין אחזקות'}
        </div>
      ) : (
        <>
          <div className="relative mx-auto h-[190px] w-[190px] shrink-0 pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="amount"
                  nameKey="symbol"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={rows.length > 1 ? 2 : 0}
                  stroke="#111621"
                  strokeWidth={2}
                  startAngle={90}
                  endAngle={-270}
                  isAnimationActive={false}
                >
                  {rows.map((r) => <Cell key={r.id} fill={r.color} />)}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const r = payload[0].payload as (typeof rows)[number];
                    return (
                      <div dir="rtl" className="rounded-xl border border-line-strong bg-surface-2 px-3 py-2 text-xs shadow-xl">
                        <div className="font-semibold text-ink">{r.symbol}</div>
                        <div className="num text-ink-2">{fmtUsd(r.amount)} · {((r.amount / total) * 100).toFixed(1)}%</div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pt-2">
              <span className="text-[11px] text-muted">{basis === 'cost' ? 'עלות' : 'שווי'}</span>
              <span className="num text-lg font-semibold text-ink">{fmtCompactUsd(total)}</span>
            </div>
          </div>

          <ul className="mt-3 space-y-2.5 px-4 pb-4 sm:px-5">
            {rows.map((r) => {
              const w = total > 0 ? (r.amount / total) * 100 : 0;
              return (
                <li key={r.id} className="grid grid-cols-[auto_3.5rem_1fr_auto] items-center gap-2.5 text-[13px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                  <span className="font-medium text-ink">{r.symbol}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <span className="block h-full rounded-full bg-ink-2/40" style={{ width: `${w}%` }} />
                  </span>
                  <span className="num w-24 text-left text-ink-2">
                    {w.toFixed(1)}%
                    {r.plPct !== null && <span className={cx('ml-1.5 text-[11px]', toneClass(r.plPct))}>{fmtPct(r.plPct, 0)}</span>}
                  </span>
                </li>
              );
            })}
          </ul>

          {rows.length > 1 && topWeight >= 35 && (
            <div className="mx-4 mb-4 rounded-xl bg-warn-soft px-3 py-2 text-xs text-warn sm:mx-5">
              {top.symbol} מהווה {topWeight.toFixed(0)}% מהתיק — ריכוזיות גבוהה
            </div>
          )}
        </>
      )}
    </Card>
  );
}
