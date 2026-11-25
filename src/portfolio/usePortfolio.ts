import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClosedInvestment, Investment, Purchase, StoredData } from './types';
import { API_KEY_STORAGE, emptyStore, fetchQuote, loadPortfolio, savePortfolio } from './store';
import { calcStats, isOlderThan24h } from './calc';

function readApiKey(): string {
  try { return localStorage.getItem(API_KEY_STORAGE) ?? ''; } catch { return ''; }
}

export interface NewPurchase {
  date: string;
  shares: number;
  pricePerShare: number;
  notes: string;
}

export function usePortfolio() {
  const [store, setStore] = useState<StoredData>(emptyStore);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKeyState] = useState(readApiKey);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState('');

  // Mirror of what was last persisted. A price refresh takes seconds, and
  // whatever the user does meanwhile (closing an investment, say) must not be
  // undone by a save that still holds the pre-refresh state.
  const storeRef = useRef<StoredData>(emptyStore());

  const commit = useCallback((patch: Partial<StoredData>) => {
    const next: StoredData = { ...storeRef.current, ...patch };
    storeRef.current = next;
    setStore(next);
    savePortfolio(next);
  }, []);

  useEffect(() => {
    loadPortfolio().then((stored) => {
      storeRef.current = stored;
      setStore(stored);
      setLoading(false);
    });
  }, []);

  const refreshPrices = useCallback(async (ids?: string[], silent = false) => {
    const key = readApiKey();
    if (!key) return false;
    setRefreshing(true);
    if (!silent) setRefreshMsg('');
    const targets = storeRef.current.investments.filter((i) => !ids || ids.includes(i.id));
    const quotes = new Map<string, { price: number; prevClose?: number }>();
    for (const inv of targets) {
      const q = await fetchQuote(inv.symbol, key);
      if (q) quotes.set(inv.id, q);
    }

    // Apply onto the latest state, not onto the list captured before the fetch:
    // an investment closed while prices were loading must stay closed.
    const now = new Date().toISOString();
    const investments = storeRef.current.investments.map((inv) => {
      const q = quotes.get(inv.id);
      return q ? { ...inv, currentPrice: q.price, prevClose: q.prevClose ?? inv.prevClose, lastPriceUpdate: now } : inv;
    });

    // One portfolio-value snapshot per day
    const day = now.slice(0, 10);
    const totalValue = investments.reduce((s, inv) => s + calcStats(inv).currentValue, 0);
    const snapshots = quotes.size > 0
      ? [
          ...storeRef.current.snapshots.filter((s) => s.date !== day),
          { date: day, value: +totalValue.toFixed(2) },
        ].sort((a, b) => a.date.localeCompare(b.date))
      : storeRef.current.snapshots;

    commit({ investments, snapshots });
    setRefreshing(false);
    if (!silent) {
      setRefreshMsg(quotes.size === targets.length ? 'המחירים עודכנו' : `עודכנו ${quotes.size} מתוך ${targets.length}`);
      setTimeout(() => setRefreshMsg(''), 3000);
    }
    return true;
  }, [commit]);

  // Auto-refresh stale prices once the data is in
  useEffect(() => {
    if (loading || !apiKey) return;
    const stale = storeRef.current.investments.filter((inv) => isOlderThan24h(inv.lastPriceUpdate));
    if (stale.length > 0) refreshPrices(stale.map((i) => i.id), true);
  }, [loading, apiKey, refreshPrices]);

  const setApiKey = useCallback((key: string) => {
    try { localStorage.setItem(API_KEY_STORAGE, key); } catch { /* ignore */ }
    setApiKeyState(key);
  }, []);

  const addInvestment = useCallback((symbol: string, name: string, first: NewPurchase) => {
    const sym = symbol.toUpperCase().trim();
    const inv: Investment = {
      id: crypto.randomUUID(),
      symbol: sym,
      name: name.trim() || sym,
      purchases: [{ id: crypto.randomUUID(), ...first }],
    };
    commit({ investments: [...storeRef.current.investments, inv] });
    if (readApiKey()) refreshPrices([inv.id], true);
  }, [commit, refreshPrices]);

  const addPurchase = useCallback((invId: string, p: NewPurchase) => {
    const purchase: Purchase = { id: crypto.randomUUID(), ...p };
    commit({
      investments: storeRef.current.investments.map((inv) =>
        inv.id === invId ? { ...inv, purchases: [...inv.purchases, purchase] } : inv
      ),
    });
  }, [commit]);

  const deletePurchase = useCallback((invId: string, purchaseId: string) => {
    commit({
      investments: storeRef.current.investments
        .map((inv) => (inv.id === invId ? { ...inv, purchases: inv.purchases.filter((p) => p.id !== purchaseId) } : inv))
        .filter((inv) => inv.purchases.length > 0),
    });
  }, [commit]);

  const deleteInvestment = useCallback((id: string) => {
    commit({ investments: storeRef.current.investments.filter((i) => i.id !== id) });
  }, [commit]);

  /**
   * Closing takes the investment out of the portfolio entirely: it leaves
   * `investments`, so its cost and value stop being counted in every total,
   * and moves into `closed` as a frozen record.
   */
  const closeInvestment = useCallback((id: string, closeDate: string, closePrice: number, reason: string) => {
    const inv = storeRef.current.investments.find((i) => i.id === id);
    if (!inv || !isFinite(closePrice) || closePrice < 0 || !closeDate) return;
    const { totalShares, totalCost, avgEntry } = calcStats(inv);
    const proceeds = totalShares * closePrice;
    const firstPurchaseDate = inv.purchases.reduce(
      (min, p) => (p.date < min ? p.date : min),
      inv.purchases[0]?.date ?? closeDate
    );
    const record: ClosedInvestment = {
      id: inv.id,
      symbol: inv.symbol,
      name: inv.name,
      purchases: inv.purchases,
      firstPurchaseDate,
      closeDate,
      closePrice,
      closeReason: reason.trim(),
      totalShares,
      totalCost,
      avgEntry,
      proceeds,
      profitLoss: proceeds - totalCost,
      profitLossPercent: totalCost > 0 ? ((proceeds - totalCost) / totalCost) * 100 : 0,
      holdingDays: Math.max(0, Math.round((new Date(closeDate).getTime() - new Date(firstPurchaseDate).getTime()) / 86400000)),
      closedAt: new Date().toISOString(),
    };
    commit({
      investments: storeRef.current.investments.filter((i) => i.id !== id),
      closed: [...storeRef.current.closed, record],
    });
  }, [commit]);

  const deleteClosed = useCallback((id: string) => {
    commit({ closed: storeRef.current.closed.filter((c) => c.id !== id) });
  }, [commit]);

  return {
    ...store,
    loading,
    apiKey,
    setApiKey,
    refreshing,
    refreshMsg,
    refreshPrices,
    addInvestment,
    addPurchase,
    deletePurchase,
    deleteInvestment,
    closeInvestment,
    deleteClosed,
  };
}

export type PortfolioApi = ReturnType<typeof usePortfolio>;
