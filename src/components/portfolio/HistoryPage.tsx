import { useState } from 'react';
import { ChevronDown, History, Trash2 } from 'lucide-react';
import type { PortfolioApi } from '../../portfolio/usePortfolio';
import { fmtDate, fmtHeld, fmtPct, fmtShares, fmtSignedUsd, fmtUsd, toneClass } from '../../portfolio/calc';
import { Button, Card, EmptyState } from '../ui';
import { cx } from '../../utils/cx';
import { TickerBadge } from './HoldingRow';

const winBadge = { background: 'rgba(52,211,153,0.12)', color: '#6ee7b7', borderColor: 'rgba(52,211,153,0.2)' };
const lossBadge = { background: 'rgba(248,113,113,0.12)', color: '#fca5a5', borderColor: 'rgba(248,113,113,0.2)' };

/**
 * Closed long-term investments. Records only -- every number here is
 * deliberately absent from the portfolio totals on the main screen.
 */
export default function HistoryPage({ p }: { p: PortfolioApi }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const history = [...p.closed].sort(
    (a, b) => b.closeDate.localeCompare(a.closeDate) || b.closedAt.localeCompare(a.closedAt),
  );
  const realized = history.reduce((s, c) => s + c.profitLoss, 0);
  const cost = history.reduce((s, c) => s + c.totalCost, 0);
  const wins = history.filter((c) => c.profitLoss >= 0).length;
  const avgDays = history.length ? history.reduce((s, c) => s + c.holdingDays, 0) / history.length : 0;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-5 pb-8 sm:px-6 lg:px-8 lg:pt-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">השקעות שנסגרו</h1>
      <p className="mt-0.5 mb-5 text-[13px] text-muted">רישום בלבד — לא נספר בשווי התיק או ברווח שלו</p>

      {history.length === 0 ? (
        <Card>
          <EmptyState
            icon={<History size={26} />}
            title="עוד לא נסגרו השקעות"
            text="כשתסגור אחזקה מהתיק, היא תופיע כאן עם הרווח, משך ההחזקה והסיבה לסגירה."
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'רווח ממומש', value: fmtSignedUsd(realized, 0), tone: toneClass(realized), sub: cost > 0 ? fmtPct((realized / cost) * 100) : undefined },
              { label: 'השקעות שנסגרו', value: String(history.length) },
              { label: 'ברווח', value: `${wins}/${history.length}`, sub: `${Math.round((wins / history.length) * 100)}%` },
              { label: 'החזקה ממוצעת', value: fmtHeld(Math.round(avgDays)) },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border border-line bg-surface px-4 py-3.5">
                <div className="text-xs text-muted">{k.label}</div>
                <div className={cx('mt-1 text-lg font-semibold', k.tone ?? 'text-ink')}><bdi className="num">{k.value}</bdi></div>
                {k.sub && <div className={cx('text-xs', k.tone ?? 'text-muted')}><bdi className="num">{k.sub}</bdi></div>}
              </div>
            ))}
          </div>

          <Card className="overflow-hidden">
            <ul className="divide-y divide-line">
              {history.map((c) => {
                const win = c.profitLoss >= 0;
                const open = openId === c.id;
                return (
                  <li key={c.id} className={cx(open && 'bg-surface-2/40')}>
                    <button
                      onClick={() => setOpenId(open ? null : c.id)}
                      className="grid w-full cursor-pointer grid-cols-[auto_1fr_auto_auto] items-center gap-3 px-4 py-3.5 text-right hover:bg-surface-2/50 sm:px-5"
                    >
                      <TickerBadge symbol={c.symbol} style={win ? winBadge : lossBadge} />
                      <div className="min-w-0">
                        <div className="truncate text-[15px] font-medium text-ink">{c.name}</div>
                        <div className="mt-0.5 truncate text-xs text-muted">
                          נסגרה {fmtDate(c.closeDate)} · {fmtHeld(c.holdingDays)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <div className={cx('num text-[15px] font-semibold', win ? 'text-profit' : 'text-loss')}>{fmtSignedUsd(c.profitLoss, 0)}</div>
                        <div className={cx('num text-xs', win ? 'text-profit' : 'text-loss')}>{fmtPct(c.profitLossPercent)}</div>
                      </div>
                      <ChevronDown size={18} className={cx('text-faint transition-transform', open && 'rotate-180')} />
                    </button>

                    {open && (
                      <div className="animate-rise px-4 pb-4 sm:px-5">
                        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
                          {[
                            { label: 'כניסה ממוצעת', value: fmtUsd(c.avgEntry) },
                            { label: 'מחיר סגירה', value: fmtUsd(c.closePrice) },
                            { label: 'עלות', value: fmtUsd(c.totalCost) },
                            { label: 'תמורה', value: fmtUsd(c.proceeds) },
                          ].map((m) => (
                            <div key={m.label} className="bg-surface px-3 py-2.5">
                              <div className="text-[11px] text-muted">{m.label}</div>
                              <div className="mt-0.5 text-sm font-semibold text-ink"><bdi className="num">{m.value}</bdi></div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 text-xs font-medium text-muted">סיבת הסגירה</div>
                        <p className={cx('mt-1 text-sm leading-relaxed whitespace-pre-wrap', c.closeReason ? 'text-ink-2' : 'text-faint')}>
                          {c.closeReason || 'לא נרשמה סיבה'}
                        </p>

                        <div className="mt-4 mb-2 text-xs font-medium text-muted">רכישות · {fmtShares(c.totalShares)} מניות מ-{fmtDate(c.firstPurchaseDate)}</div>
                        <ul className="space-y-1.5">
                          {c.purchases.map((pu) => (
                            <li key={pu.id} className="rounded-xl bg-surface px-3 py-2 text-[13px]">
                              <div className="text-ink">
                                <bdi className="num">
                                  {fmtShares(pu.shares)} × {fmtUsd(pu.pricePerShare)}
                                  <span className="text-muted"> = {fmtUsd(pu.shares * pu.pricePerShare)}</span>
                                </bdi>
                              </div>
                              <div className="text-xs text-faint">{fmtDate(pu.date)}{pu.notes && ` · ${pu.notes}`}</div>
                            </li>
                          ))}
                        </ul>

                        <div className="mt-4 flex items-center justify-between">
                          <span className="text-[11px] text-faint">נרשם ב-{fmtDate(c.closedAt)}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => confirm('למחוק את הרשומה הזו מההיסטוריה?') && p.deleteClosed(c.id)}
                          >
                            <Trash2 size={15} />
                            מחק רשומה
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
