import type { AppData, Trade, PortfolioDeposit } from '../types/trade';
import { supabase } from './supabase';

const STORAGE_KEY = 'trading-journal-data';

const sampleDeposits: PortfolioDeposit[] = [
  { id: 'dep-1', amount: 10000, date: '2025-01-01', note: 'הפקדה ראשונית' },
];

const sampleTrades: Trade[] = [
  {
    id: 'trade-1',
    serialNumber: 1,
    type: 'long',
    stockName: 'APLD',
    date: '2025-01-15',
    initialEntry: { price: 8.50, quantity: 500, sl: 7.80, tp: 10.50, totalAmount: 4250, risk: 350 },
    reinforcements: [],
    exits: [{ price: 10.20, quantity: 500, totalAmount: 5100, profitLoss: 850, profitLossPercent: 20, notes: 'יצאתי ליד TP' }],
    totalShares: 500,
    avgEntryPrice: 8.50,
    totalInvested: 4250,
    totalProfitLoss: 850,
    totalProfitLossPercent: 20,
    rr: 2.43,
    commissions: 5,
    entryReason: '',
    exitReason: '',
    conclusions: '',
    notes: 'פריצה יפה עם נפח גבוה',
    behavioralTags: ['good-trade'],
    createdAt: '2025-01-15T10:00:00Z',
  },
  {
    id: 'trade-2',
    serialNumber: 2,
    type: 'short',
    stockName: 'SQQQ',
    date: '2025-01-22',
    initialEntry: { price: 15.30, quantity: 300, sl: 16.00, tp: 13.50, totalAmount: 4590, risk: 210 },
    reinforcements: [],
    exits: [{ price: 13.80, quantity: 300, totalAmount: 4140, profitLoss: 450, profitLossPercent: 9.8, notes: 'סגירה מוצלחת' }],
    totalShares: 300,
    avgEntryPrice: 15.30,
    totalInvested: 4590,
    totalProfitLoss: 450,
    totalProfitLossPercent: 9.8,
    rr: 2.14,
    commissions: 5,
    entryReason: '',
    exitReason: '',
    conclusions: '',
    notes: 'שורט יפה בירידת שוק',
    behavioralTags: ['good-trade'],
    createdAt: '2025-01-22T09:30:00Z',
  },
  {
    id: 'trade-3',
    serialNumber: 3,
    type: 'long',
    stockName: 'SOFI',
    date: '2025-02-05',
    initialEntry: { price: 12.40, quantity: 400, sl: 11.50, tp: 15.00, totalAmount: 4960, risk: 360 },
    reinforcements: [{ price: 11.80, quantity: 200, totalAmount: 2360, risk: 0 }],
    exits: [{ price: 11.20, quantity: 600, totalAmount: 6720, profitLoss: -530, profitLossPercent: -7.3, notes: 'נעצר בסטופ' }],
    totalShares: 600,
    avgEntryPrice: 12.13,
    totalInvested: 7280,
    totalProfitLoss: -530,
    totalProfitLossPercent: -7.3,
    rr: -0.81,
    commissions: 7.5,
    entryReason: '',
    exitReason: '',
    conclusions: '',
    notes: 'חיזקתי בירידה - טעות',
    behavioralTags: ['poor-management', 'FOMO'],
    createdAt: '2025-02-05T11:00:00Z',
  },
  {
    id: 'trade-4',
    serialNumber: 4,
    type: 'long',
    stockName: 'MSTU',
    date: '2025-02-18',
    initialEntry: { price: 22.00, quantity: 200, sl: 20.00, tp: 28.00, totalAmount: 4400, risk: 400 },
    reinforcements: [],
    exits: [{ price: 27.50, quantity: 200, totalAmount: 5500, profitLoss: 1100, profitLossPercent: 25, notes: 'יצאתי לפני TP' }],
    totalShares: 200,
    avgEntryPrice: 22.00,
    totalInvested: 4400,
    totalProfitLoss: 1100,
    totalProfitLossPercent: 25,
    rr: 2.75,
    commissions: 5,
    entryReason: '',
    exitReason: '',
    conclusions: '',
    notes: 'מגמה חזקה, החזקתי טוב',
    behavioralTags: ['good-trade'],
    createdAt: '2025-02-18T10:15:00Z',
  },
  {
    id: 'trade-5',
    serialNumber: 5,
    type: 'long',
    stockName: 'ACHR',
    date: '2025-03-03',
    initialEntry: { price: 5.80, quantity: 800, sl: 5.20, tp: 7.50, totalAmount: 4640, risk: 480 },
    reinforcements: [],
    exits: [{ price: 5.10, quantity: 800, totalAmount: 4080, profitLoss: -560, profitLossPercent: -12.1, notes: 'סטופ לוס' }],
    totalShares: 800,
    avgEntryPrice: 5.80,
    totalInvested: 4640,
    totalProfitLoss: -560,
    totalProfitLossPercent: -12.1,
    rr: -1.17,
    commissions: 5,
    entryReason: '',
    exitReason: '',
    conclusions: '',
    notes: 'כניסה מוקדמת מדי לפני אישור מגמה',
    behavioralTags: ['early-entry', 'no-plan'],
    createdAt: '2025-03-03T14:00:00Z',
  },
  {
    id: 'trade-6',
    serialNumber: 6,
    type: 'short',
    stockName: 'APLD',
    date: '2025-03-15',
    initialEntry: { price: 9.10, quantity: 600, sl: 9.80, tp: 7.50, totalAmount: 5460, risk: 420 },
    reinforcements: [],
    exits: [{ price: 7.80, quantity: 600, totalAmount: 4680, profitLoss: 780, profitLossPercent: 14.3, notes: 'יצאתי ב-TP' }],
    totalShares: 600,
    avgEntryPrice: 9.10,
    totalInvested: 5460,
    totalProfitLoss: 780,
    totalProfitLossPercent: 14.3,
    rr: 1.86,
    commissions: 5,
    entryReason: '',
    exitReason: '',
    conclusions: '',
    notes: 'שורט מוצלח לאחר כישלון פריצה',
    behavioralTags: ['good-trade'],
    createdAt: '2025-03-15T09:45:00Z',
  },
];

function migrate(parsed: AppData): AppData {
  if (parsed.portfolioBaseValue === undefined) {
    parsed.portfolioBaseValue = parsed.deposits?.reduce((s, d) => s + d.amount, 0) ?? 0;
  }
  if (parsed.defaultCommissionPerAction === undefined) parsed.defaultCommissionPerAction = 2.5;
  if (parsed.riskUnitValue === undefined) parsed.riskUnitValue = 100;
  if (parsed.trades) {
    parsed.trades = parsed.trades.map(t => ({
      commissions: (t.reinforcements?.length ?? 0) * 2.5 * 2 + 5,
      entryReason: '',
      exitReason: '',
      conclusions: '',
      ...t,
    }));
  }
  return parsed;
}

function defaultData(): AppData {
  return {
    trades: sampleTrades,
    deposits: sampleDeposits,
    portfolioBaseValue: 10000,
    defaultCommissionPerAction: 2.5,
    riskUnitValue: 100,
  };
}

// ── Supabase ──────────────────────────────────────────────────────────────────

export async function loadData(): Promise<AppData> {
  try {
    const { data, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('id', 1)
      .single();

    if (!error && data?.data && typeof data.data === 'object') {
      const parsed = data.data as AppData;
      // If cloud is empty (first time), seed with localStorage data if available
      if (!parsed.trades) {
        const local = loadFromLocalStorage();
        await saveData(local);
        return local;
      }
      return migrate(parsed);
    }
  } catch {
    // network error — fall back to localStorage
  }
  return loadFromLocalStorage();
}

export async function saveData(appData: AppData): Promise<void> {
  try {
    await supabase
      .from('app_state')
      .upsert({ id: 1, data: appData, updated_at: new Date().toISOString() });
    // Also keep a local copy for offline fallback
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appData));
  }
}

// ── Local fallback ────────────────────────────────────────────────────────────

function loadFromLocalStorage(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppData;
      return migrate(parsed);
    }
  } catch {
    // fall through
  }
  return defaultData();
}

export function generateId(): string {
  return crypto.randomUUID();
}
