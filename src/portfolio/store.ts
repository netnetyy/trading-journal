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

export async function fetchQuote(symbol: string, apiKey: string): Promise<Quote | null> {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol.toUpperCase())}&token=${apiKey}`
    );
    const json = await res.json();
    if (json.c && json.c > 0) return { price: json.c, prevClose: json.pc > 0 ? json.pc : undefined };
    return null;
  } catch {
    return null;
  }
}
