import { ChevronDown, Plus, Archive, Trash2, X } from 'lucide-react';
import type { Investment } from '../../portfolio/types';
import { calcStats, fmtDate, fmtHeld, fmtPct, fmtShares, fmtSignedUsd, fmtUsd, plBadge, timeAgo, toneClass } from '../../portfolio/calc';
import { Button, ChangePill } from '../ui';
import { cx } from '../../utils/cx';

export function TickerBadge({ symbol, style, size = 'md' }: { symbol: string; style: React.CSSProperties; size?: 'md' | 'sm' }) {
  const len = symbol.length;
  return (
    <div
      className={cx(
        'flex shrink-0 items-center justify-center rounded-xl border font-semibold tracking-tight',
        size === 'md' ? 'h-11 w-11' : 'h-10 w-10',
        len > 4 ? 'text-[10px]' : 'text-[12px]',
      )}
      style={style}
    >
      {symbol}
    </div>
  );
}

interface Props {
  inv: Investment;
  all: Investment[];
  portfolioValue: number;
  expanded: boolean;
  onToggle: () => void;
  onAddPurchase: () => void;
  onClose: () => void;
  onDelete: () => void;
  onDeletePurchase: (purchaseId: string) => void;
}

export default function HoldingRow({ inv, all, portfolioValue, expanded, onToggle, onAddPurchase, onClose, onDelete, onDeletePurchase }: Props) {
  const s = calcStats(inv);
  const hasPrice = s.pl !== null;
  const weight = portfolioValue > 0 && hasPrice ? (s.currentValue / portfolioValue) * 100 : null;

  return (
    <li className={cx('transition-colors', expanded && 'bg-surface-2/40')}>
      <button onClick={onToggle} className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3.5 text-right hover:bg-surface-2/50 sm:px-5 md:grid-cols-[auto_minmax(0,1.6fr)_1fr_1fr_1fr_auto]">
        <TickerBadge symbol={inv.symbol} style={plBadge(inv, all)} />

        <div className="min-w-0">
          <div className="truncate text-[15px] font-medium text-ink">{inv.name}</div>
          <div className="mt-0.5 truncate text-xs text-muted">
            <bdi className="num">{fmtShares(s.totalShares)}</bdi> מניות · ממוצע <bdi className="num">{fmtUsd(s.avgEntry)}</bdi>
          </div>
        </div>

        {/* Price + daily move (desktop) */}
        <div className="hidden text-left md:block">
          <div className="num text-sm text-ink">{hasPrice ? fmtUsd(inv.currentPrice!) : '—'}</div>
          <div className="mt-0.5"><ChangePill value={s.dayChangePct} /></div>
        </div>

        {/* Value + weight (desktop) */}
        <div className="hidden text-left md:block">
          <div className="num text-sm font-medium text-ink">{hasPrice ? fmtUsd(s.currentValue) : '—'}</div>
          <div className="mt-0.5 text-xs text-muted">{weight !== null ? <><bdi className="num">{weight.toFixed(1)}%</bdi> מהתיק</> : <>עלות <bdi className="num">{fmtUsd(s.totalCost)}</bdi></>}</div>
        </div>

        {/* P&L (desktop) */}
        <div className="hidden text-left md:block">
          <div className={cx('num text-sm font-semibold', toneClass(s.pl))}>{s.pl !== null ? fmtSignedUsd(s.pl) : '—'}</div>
          <div className={cx('num mt-0.5 text-xs', toneClass(s.plPct))}>{s.plPct !== null ? fmtPct(s.plPct) : 'אין מחיר'}</div>
        </div>

        {/* Mobile summary */}
        <div className="text-left md:hidden">
          <div className="num text-[15px] font-medium text-ink">{hasPrice ? fmtUsd(s.currentValue, 0) : fmtUsd(s.totalCost, 0)}</div>
          <div className={cx('num mt-0.5 text-xs font-medium', toneClass(s.plPct))}>
            {s.plPct !== null ? fmtPct(s.plPct) : 'עלות'}
          </div>
        </div>

        <ChevronDown size={18} className={cx('hidden text-faint transition-transform md:block', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="animate-rise px-4 pb-4 sm:px-5">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
            {[
              { label: 'מחיר נוכחי', value: hasPrice ? fmtUsd(inv.currentPrice!) : '—', sub: inv.lastPriceUpdate ? timeAgo(inv.lastPriceUpdate) : undefined },
              { label: 'שינוי יומי', value: s.dayChange !== null ? fmtSignedUsd(s.dayChange) : '—', tone: toneClass(s.dayChange), sub: s.dayChangePct !== null ? fmtPct(s.dayChangePct) : undefined },
              { label: 'רווח/הפסד', value: s.pl !== null ? fmtSignedUsd(s.pl) : '—', tone: toneClass(s.pl), sub: s.plPct !== null ? fmtPct(s.plPct) : undefined },
              { label: 'עלות כוללת', value: fmtUsd(s.totalCost), sub: `מוחזק ${fmtHeld(s.heldDays)}` },
            ].map((m) => (
              <div key={m.label} className="bg-surface px-3 py-2.5">
                <div className="text-[11px] text-muted">{m.label}</div>
                <div className={cx('mt-0.5 text-sm font-semibold', m.tone ?? 'text-ink')}><bdi className="num">{m.value}</bdi></div>
                {m.sub && <div className="text-[11px] text-faint"><bdi className="num">{m.sub}</bdi></div>}
              </div>
            ))}
          </div>

          <div className="mt-4 mb-2 text-xs font-medium text-muted">רכישות ({inv.purchases.length})</div>
          <ul className="space-y-1.5">
            {[...inv.purchases].sort((a, b) => a.date.localeCompare(b.date)).map((p) => {
              const lotPl = hasPrice ? (inv.currentPrice! - p.pricePerShare) * p.shares : null;
              const lotPct = hasPrice && p.pricePerShare > 0 ? ((inv.currentPrice! - p.pricePerShare) / p.pricePerShare) * 100 : null;
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-2.5 text-[13px]">
                  <div className="min-w-0 flex-1">
                    <div className="text-ink">
                      <bdi className="num">
                        {fmtShares(p.shares)} × {fmtUsd(p.pricePerShare)}
                        <span className="text-muted"> = {fmtUsd(p.shares * p.pricePerShare)}</span>
                      </bdi>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-faint">
                      {fmtDate(p.date)}{p.notes && ` · ${p.notes}`}
                    </div>
                  </div>
                  {lotPl !== null && (
                    <div className="flex flex-col items-end">
                      <div className={cx('num text-xs font-semibold', toneClass(lotPl))}>{fmtSignedUsd(lotPl, 0)}</div>
                      <div className={cx('num text-[11px]', toneClass(lotPct))}>{fmtPct(lotPct!, 1)}</div>
                    </div>
                  )}
                  <button
                    onClick={() => confirm('למחוק את הרכישה הזו?') && onDeletePurchase(p.id)}
                    className="-m-1 cursor-pointer rounded-lg p-1.5 text-faint hover:bg-surface-2 hover:text-loss"
                    aria-label="מחק רכישה"
                  >
                    <X size={14} />
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={onAddPurchase}><Plus size={15} />הוסף רכישה</Button>
            <Button size="sm" onClick={onClose}><Archive size={15} />סגירת השקעה</Button>
            <Button size="sm" variant="ghost" className="mr-auto" onClick={onDelete}><Trash2 size={15} />מחיקה</Button>
          </div>
        </div>
      )}
    </li>
  );
}
