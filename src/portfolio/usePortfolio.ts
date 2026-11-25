import { useCallback, useEffect, useRef, useState } from 'react';
import type { ClosedInvestment, Investment, Purchase, StoredData } from './types';
import { API_KEY_STORAGE, QUOTE_ERROR_TEXT, cleanApiKey, emptyStore, fetchQuote, loadPortfolio, savePortfolio, type QuoteError } from './store';
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
  /** Why the last refresh failed -- stays on screen until a refresh works */
  const [refreshError, setRefreshError] = useState('');

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
    const failed: { symbol: string; error: QuoteError }[] = [];
    for (const inv of targets) {
      const r = await fetchQuote(inv.symbol, key);
      if (r.ok) quotes.set(inv.id, r.quote);
      else {
        failed.push({ symbol: inv.symbol, error: r.error });
        // A bad key or a closed connection fails every symbol the same way
        if (r.error === 'invalid-key' || r.error === 'network') break;
      }
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

    if (quotes.size > 0) commit({ investments, snapshots });
    setRefreshing(false);

    const first = failed[0];
    if (first && (first.error === 'invalid-key' || first.error === 'network' || first.error === 'rate-limit')) {
      setRefreshError(QUOTE_ERROR_TEXT[first.error]);
    } else if (failed.length > 0) {
      setRefreshError(`לא נמצא מחיר עבור ${failed.map((f) => f.symbol).join(', ')}`);
    } else {
      setRefreshError('');
    }
    if (!silent && quotes.size > 0) {
      setRefreshMsg(failed.length === 0 ? 'המחירים עודכנו' : `עודכנו ${quotes.size} מתוך ${targets.length}`);
      setTimeout(() => setRefreshMsg(''), 3000);
    }
    return failed.length === 0;
  }, [commit]);

  // Auto-refresh stale prices once, when the data is in. (Saving a new key
  // refreshes everything itself, so this must not fire again on a key change.)
  const autoRefreshed = useRef(false);
  useEffect(() => {
    if (loading || autoRefreshed.current) return;
    autoRefreshed.current = true;
    if (!readApiKey()) return;
    const stale = storeRef.current.investments.filter((inv) => isOlderThan24h(inv.lastPriceUpdate));
    if (stale.length > 0) refreshPrices(stale.map((i) => i.id), true);
  }, [loading, refreshPrices]);

  /**
   * Checks the key against Finnhub, and only then saves it and refreshes
   * every price. Returns an error text when Finnhub turns the key down.
   */
  const setApiKey = useCallback(async (raw: string): Promise<string | null> => {
    const key = cleanApiKey(raw);
    if (!key) return 'המפתח ריק';
    const probe = storeRef.current.investments[0]?.symbol ?? 'AAPL';
    const r = await fetchQuote(probe, key);
    if (!r.ok && r.error !== 'no-data') return QUOTE_ERROR_TEXT[r.error];
    try { localStorage.setItem(API_KEY_STORAGE, key); } catch { /* ignore */ }
    setApiKeyState(key);
    setRefreshError('');
    refreshPrices();
    return null;
  }, [refreshPrices]);

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
    refreshError,
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
