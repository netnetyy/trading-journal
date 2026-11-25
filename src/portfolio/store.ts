import { supabase } from '../utils/supabase';
import type { Investment, StoredData } from './types';

const LOCAL_KEY = 'longterm_investments';
const SUPABASE_ROW_ID = 2;

export const API_KEY_STORAGE = 'finnhub_api_key';

export function emptyStore(): StoredData {
  return { investments: [], snapshots: [], closed: [] };
}

function parseStored(raw: unknown): StoredData {
  if (Array.isArray(raw)) return { investments: raw as Investment[], snapshots: [], closed: [] };
  if (raw && typeof raw === 'object' && 'investments' in raw) {
    const s = raw as Partial<StoredData>;
    // `closed` is newer than the stored rows -- older data simply has none.
    // Spread first so keys written by other apps on this row survive a save.
    return { ...s, investments: s.investments ?? [], snapshots: s.snapshots ?? [], closed: s.closed ?? [] };
  }
  return emptyStore();
}

function loadFromLocal(): StoredData {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? parseStored(JSON.parse(raw)) : emptyStore();
  } catch {
    return emptyStore();
  }
}

export async function loadPortfolio(): Promise<StoredData> {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', SUPABASE_ROW_ID)
      .single();
    if (!error && data?.data) return parseStored(data.data);
  } catch { /* fall through */ }
  return loadFromLocal();
}

export async function savePortfolio(stored: StoredData): Promise<void> {
  try {
    await supabase
      .from('app_state')
      .upsert({ id: SUPABASE_ROW_ID, data: stored, updated_at: new Date().toISOString() });
  } catch { /* fall through */ }
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(stored));
  } catch { /* storage full or blocked */ }
}

export interface Quote {
  price: number;
  prevClose?: number;
}

export type QuoteError = 'invalid-key' | 'rate-limit' | 'no-data' | 'network';

export type QuoteResult = { ok: true; quote: Quote } | { ok: false; error: QuoteError };

/** Finnhub keys are plain letters and digits; a key copied on a phone can carry invisible characters */
export function cleanApiKey(key: string): string {
  return key.replace(/[^A-Za-z0-9]/g, '');
}

export async function fetchQuote(symbol: string, apiKey: string): Promise<QuoteResult> {
  let res: Response;
  try {
    res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol.toUpperCase())}&token=${encodeURIComponent(apiKey)}`
    );
  } catch {
    return { ok: false, error: 'network' };
  }
  if (res.status === 401 || res.status === 403) return { ok: false, error: 'invalid-key' };
  if (res.status === 429) return { ok: false, error: 'rate-limit' };
  try {
    const json = await res.json();
    if (json.error) return { ok: false, error: /key|token/i.test(json.error) ? 'invalid-key' : 'no-data' };
    if (json.c && json.c > 0) return { ok: true, quote: { price: json.c, prevClose: json.pc > 0 ? json.pc : undefined } };
    return { ok: false, error: 'no-data' };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export const QUOTE_ERROR_TEXT: Record<QuoteError, string> = {
  'invalid-key': 'Finnhub דחה את המפתח — בדוק שהעתקת אותו נכון',
  'rate-limit': 'יותר מדי בקשות ל-Finnhub — נסה שוב בעוד דקה',
  'no-data': 'Finnhub לא החזיר מחיר',
  network: 'אין חיבור ל-Finnhub — בדוק את האינטרנט',
};
