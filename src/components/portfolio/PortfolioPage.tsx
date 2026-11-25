import { useMemo, useState } from 'react';
import { Plus, RefreshCw, Settings, KeyRound, Sprout, ArrowUpDown, AlertTriangle } from 'lucide-react';
import type { PortfolioApi } from '../../portfolio/usePortfolio';
import { calcStats, calcTotals, fmtPct, fmtSignedUsd, fmtUsd, timeAgo, toneClass } from '../../portfolio/calc';
import { Button, Card, EmptyState } from '../ui';
import { cx } from '../../utils/cx';
import PerformanceChart from './PerformanceChart';
import AllocationCard from './AllocationCard';
import HoldingRow from './HoldingRow';
import { AddInvestmentSheet, AddPurchaseSheet, CloseInvestmentSheet, SettingsSheet } from './Sheets';

type SortKey = 'value' | 'pl' | 'day' | 'name';

const SORT_LABEL: Record<SortKey, string> = { value: 'שווי', pl: 'תשואה', day: 'שינוי יומי', name: 'שם' };

export default function PortfolioPage({ p }: { p: PortfolioApi }) {
  const { investments, closed, snapshots } = p;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [purchaseForId, setPurchaseForId] = useState<string | null>(null);
  const [closeForId, setCloseForId] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>('value');

  const totals = useMemo(() => calcTotals(investments), [investments]);
  const lastUpdate = investments.reduce<string | undefined>(
    (max, i) => (i.lastPriceUpdate && (!max || i.lastPriceUpdate > max) ? i.lastPriceUpdate : max),
    undefined,
  );

  const sorted = useMemo(() => {
    const rows = investments.map((inv) => ({ inv, s: calcStats(inv) }));
    const by: Record<SortKey, (a: (typeof rows)[number], b: (typeof rows)[number]) => number> = {
      value: (a, b) => (b.s.currentValue || b.s.totalCost) - (a.s.currentValue || a.s.totalCost),
      pl: (a, b) => (b.s.plPct ?? -Infinity) - (a.s.plPct ?? -Infinity),
      day: (a, b) => (b.s.dayChangePct ?? -Infinity) - (a.s.dayChangePct ?? -Infinity),
      name: (a, b) => a.inv.symbol.localeCompare(b.inv.symbol),
    };
    return rows.sort(by[sort]).map((r) => r.inv);
  }, [investments, sort]);

  const nextSort = () => {
    const keys: SortKey[] = ['value', 'pl', 'day', 'name'];
    setSort(keys[(keys.indexOf(sort) + 1) % keys.length]);
  };

  const refresh = () => {
    if (!p.apiKey) setShowSettings(true);
    else p.refreshPrices();
  };

  const purchaseInv = investments.find((i) => i.id === purchaseForId) ?? null;
  const closeInv = investments.find((i) => i.id === closeForId) ?? null;

  const winners = investments.filter((i) => (calcStats(i).pl ?? 0) > 0).length;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-5 pb-8 sm:px-6 lg:px-8 lg:pt-8">
      {/* Title row */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">התיק שלי</h1>
          <p className="mt-0.5 text-[13px] text-muted">
            {p.refreshing ? 'מעדכן מחירים...' : p.refreshMsg || `מחירים עודכנו ${timeAgo(lastUpdate)}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={refresh} disabled={p.refreshing} aria-label="עדכן מחירים" title="עדכן מחירים">
            <RefreshCw size={18} className={p.refreshing ? 'animate-spin' : ''} />
          </Button>
          <Button size="icon" variant="ghost" onClick={() => setShowSettings(true)} aria-label="הגדרות" title="הגדרות מחירים">
            <Settings size={18} />
          </Button>
          <div className="hidden sm:block">
            <Button variant="primary" onClick={() => setShowAdd(true)}>
              <Plus size={17} />
              השקעה חדשה
            </Button>
          </div>
        </div>
      </div>

      {!p.apiKey && (
        <button
          onClick={() => setShowSettings(true)}
          className="mb-5 flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-warn/25 bg-warn-soft px-4 py-3 text-right"
        >
          <KeyRound size={18} className="shrink-0 text-warn" />
          <span className="flex-1 text-sm text-ink-2">
            <span className="font-medium text-warn">חבר מקור מחירים</span> כדי לעדכן מחירים מהאפליקציה
          </span>
          <span className="text-xs font-medium text-warn">הגדר ←</span>
        </button>
      )}

      {p.apiKey && p.refreshError && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-loss/25 bg-loss-soft px-4 py-3">
          <AlertTriangle size={18} className="shrink-0 text-loss" />
          <span className="flex-1 text-sm text-ink-2">
            <span className="font-medium text-loss">המחירים לא עודכנו.</span> {p.refreshError}
          </span>
          <button onClick={() => setShowSettings(true)} className="cursor-pointer text-xs font-medium whitespace-nowrap text-loss">בדוק מפתח</button>
        </div>
      )}

      {investments.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Sprout size={26} />}
            title="התיק עוד ריק"
            text="הוסף את ההשקעה הראשונה שלך לטווח ארוך — מניה, קרן סל או מדד."
            action={<Button variant="primary" onClick={() => setShowAdd(true)}><Plus size={17} />השקעה חדשה</Button>}
          />
        </Card>
      ) : (
        <>
          {/* Hero */}
          <section className="relative mb-4 overflow-hidden rounded-3xl border border-line bg-surface p-5 sm:p-7">
            <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
            <div className="relative">
              <div className="text-[13px] text-muted">שווי התיק</div>
              <div className="num mt-1 text-right text-[34px] leading-none font-semibold tracking-tight text-ink sm:text-[44px]">
                {totals.hasPrices ? fmtUsd(totals.value) : '—'}
              </div>
              {totals.dayChange !== null && (
                <div className="mt-2.5 flex items-center gap-2 text-sm">
                  <span className={cx('num font-medium', toneClass(totals.dayChange))}>
                    {fmtSignedUsd(totals.dayChange)} ({fmtPct(totals.dayChangePct ?? 0)})
                  </span>
                  <span className="text-muted">היום</span>
                </div>
              )}

              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
                <div>
                  <div className="text-xs text-muted">רווח לא ממומש</div>
                  <div className={cx('num mt-1 text-right text-base font-semibold sm:text-lg', toneClass(totals.pl))}>
                    {totals.hasPrices ? fmtSignedUsd(totals.pl, 0) : '—'}
                  </div>
                  {totals.hasPrices && <div className={cx('num text-right text-xs', toneClass(totals.plPct))}>{fmtPct(totals.plPct)}</div>}
                </div>
                <div>
                  <div className="text-xs text-muted">סה״כ הושקע</div>
                  <div className="num mt-1 text-right text-base font-semibold text-ink sm:text-lg">{fmtUsd(totals.cost, 0)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted">אחזקות</div>
                  <div className="num mt-1 text-right text-base font-semibold text-ink sm:text-lg">{investments.length}</div>
                  <div className="text-xs text-muted">{winners} ברווח</div>
                </div>
              </div>
            </div>
          </section>

          {/* Holdings */}
          <Card className="mb-4 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 pt-4 pb-2 sm:px-5">
              <h2 className="text-[15px] font-semibold text-ink">אחזקות</h2>
              <button onClick={nextSort} className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-ink-2">
                <ArrowUpDown size={13} />
                מיון: {SORT_LABEL[sort]}
              </button>
            </div>
            <div className="hidden grid-cols-[auto_minmax(0,1.6fr)_1fr_1fr_1fr_auto] gap-3 border-b border-line px-5 pb-2 text-[11px] text-faint md:grid">
              <span className="w-11" />
              <span>נכס</span>
              <span className="text-left">מחיר · היום</span>
              <span className="text-left">שווי</span>
              <span className="text-left">רווח/הפסד</span>
              <span className="w-[18px]" />
            </div>
            <ul className="divide-y divide-line">
              {sorted.map((inv) => (
                <HoldingRow
                  key={inv.id}
                  inv={inv}
                  all={investments}
                  portfolioValue={totals.value}
                  expanded={expandedId === inv.id}
                  onToggle={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
                  onAddPurchase={() => setPurchaseForId(inv.id)}
                  onClose={() => setCloseForId(inv.id)}
                  onDelete={() => {
                    if (!confirm(`למחוק את ${inv.symbol} לגמרי? (לסגירה עם רישום בהיסטוריה — ״סגירת השקעה״)`)) return;
                    p.deleteInvestment(inv.id);
                  }}
                  onDeletePurchase={(pid) => p.deletePurchase(inv.id, pid)}
                />
              ))}
            </ul>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
            <PerformanceChart investments={investments} closed={closed} snapshots={snapshots} />
            <AllocationCard investments={investments} />
          </div>
        </>
      )}

      {/* Mobile floating add button */}
      <button
        onClick={() => setShowAdd(true)}
        className="fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-4 z-30 flex h-14 w-14 cursor-pointer items-center justify-center rounded-2xl bg-accent text-white shadow-[0_10px_30px_-8px_rgba(110,139,255,0.8)] active:scale-95 sm:hidden"
        aria-label="השקעה חדשה"
      >
        <Plus size={26} />
      </button>

      <AddInvestmentSheet open={showAdd} onClose={() => setShowAdd(false)} onSave={p.addInvestment} />
      <AddPurchaseSheet inv={purchaseInv} onClose={() => setPurchaseForId(null)} onSave={p.addPurchase} />
      <CloseInvestmentSheet
        inv={closeInv}
        onClose={() => setCloseForId(null)}
        onConfirm={(id, date, price, reason) => {
          p.closeInvestment(id, date, price, reason);
          if (expandedId === id) setExpandedId(null);
        }}
      />
      {showSettings && <SettingsSheet open onClose={() => setShowSettings(false)} apiKey={p.apiKey} onSave={p.setApiKey} />}
    </div>
  );
}
