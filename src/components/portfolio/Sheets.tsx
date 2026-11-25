import { useState } from 'react';
import type { Investment } from '../../portfolio/types';
import type { NewPurchase } from '../../portfolio/usePortfolio';
import { calcStats, fmtPct, fmtShares, fmtSignedUsd, fmtUsd, today, toneClass } from '../../portfolio/calc';
import { Button, Field, Sheet } from '../ui';
import { cx } from '../../utils/cx';

function num(v: string): number {
  return parseFloat(v.replace(/,/g, ''));
}

/* ── New investment ────────────────────────────────────────────────────── */

export function AddInvestmentSheet({ open, onClose, onSave }: {
  open: boolean;
  onClose: () => void;
  onSave: (symbol: string, name: string, first: NewPurchase) => void;
}) {
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(today);
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const valid = symbol.trim() && num(shares) > 0 && num(price) >= 0 && date;
  const total = num(shares) * num(price);

  const save = () => {
    if (!valid) return;
    onSave(symbol, name, { date, shares: num(shares), pricePerShare: num(price), notes: notes.trim() });
    setSymbol(''); setName(''); setShares(''); setPrice(''); setNotes(''); setDate(today());
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="השקעה חדשה"
      sub="מניה או קרן שנכנסת לתיק לטווח ארוך"
      footer={<>
        <Button variant="primary" className="flex-1" disabled={!valid} onClick={save}>הוסף לתיק</Button>
        <Button onClick={onClose}>ביטול</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_1.6fr] gap-3">
          <Field label="סימול *">
            <input className="field ltr uppercase" value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="VOO" autoCapitalize="characters" autoCorrect="off" />
          </Field>
          <Field label="שם">
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vanguard S&P 500" />
          </Field>
        </div>
        <div className="text-xs font-medium tracking-wide text-faint">רכישה ראשונה</div>
        <Field label="תאריך *">
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="כמות מניות *">
            <input type="number" inputMode="decimal" className="field" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="10" />
          </Field>
          <Field label="מחיר למניה ($) *">
            <input type="number" inputMode="decimal" className="field" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="450.00" />
          </Field>
        </div>
        <Field label="הערות">
          <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="למה קניתי?" />
        </Field>
        {total > 0 && isFinite(total) && (
          <div className="flex justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
            <span className="text-muted">סה״כ השקעה</span>
            <span className="num font-semibold text-ink">{fmtUsd(total)}</span>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ── Add a purchase to an existing holding ─────────────────────────────── */

export function AddPurchaseSheet({ inv, onClose, onSave }: {
  inv: Investment | null;
  onClose: () => void;
  onSave: (invId: string, p: NewPurchase) => void;
}) {
  const [date, setDate] = useState(today);
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const valid = inv && num(shares) > 0 && num(price) >= 0 && date;

  // What the average cost becomes after this purchase
  const s = inv ? calcStats(inv) : null;
  const addCost = num(shares) * num(price);
  const newAvg = s && num(shares) > 0 && isFinite(addCost) ? (s.totalCost + addCost) / (s.totalShares + num(shares)) : null;

  const close = () => {
    setShares(''); setPrice(''); setNotes(''); setDate(today());
    onClose();
  };
  const save = () => {
    if (!valid || !inv) return;
    onSave(inv.id, { date, shares: num(shares), pricePerShare: num(price), notes: notes.trim() });
    close();
  };

  return (
    <Sheet
      open={!!inv}
      onClose={close}
      title={`רכישה נוספת · ${inv?.symbol ?? ''}`}
      sub={s && <><bdi className="num">{fmtShares(s.totalShares)}</bdi> מניות · ממוצע <bdi className="num">{fmtUsd(s.avgEntry)}</bdi></>}
      footer={<>
        <Button variant="primary" className="flex-1" disabled={!valid} onClick={save}>שמור רכישה</Button>
        <Button onClick={close}>ביטול</Button>
      </>}
    >
      <div className="space-y-4">
        <Field label="תאריך">
          <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="כמות מניות">
            <input type="number" inputMode="decimal" className="field" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="5" />
          </Field>
          <Field label="מחיר למניה ($)">
            <input
              type="number"
              inputMode="decimal"
              className="field"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={inv?.currentPrice ? inv.currentPrice.toFixed(2) : '0.00'}
            />
          </Field>
        </div>
        <Field label="הערות">
          <input className="field" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="הערה..." />
        </Field>
        {newAvg !== null && s && (
          <div className="flex justify-between rounded-xl bg-surface-2 px-4 py-3 text-sm">
            <span className="text-muted">ממוצע חדש</span>
            <span className="num text-ink">
              <span className="text-muted">{fmtUsd(s.avgEntry)} ← </span>
              <span className="font-semibold">{fmtUsd(newAvg)}</span>
            </span>
          </div>
        )}
      </div>
    </Sheet>
  );
}

/* ── Close a holding ───────────────────────────────────────────────────── */

export function CloseInvestmentSheet({ inv, onClose, onConfirm }: {
  inv: Investment | null;
  onClose: () => void;
  onConfirm: (id: string, date: string, price: number, reason: string) => void;
}) {
  // Keyed by the holding, so each opening starts from that holding's last price
  return inv ? <CloseForm key={inv.id} inv={inv} onClose={onClose} onConfirm={onConfirm} /> : null;
}

function CloseForm({ inv, onClose, onConfirm }: {
  inv: Investment;
  onClose: () => void;
  onConfirm: (id: string, date: string, price: number, reason: string) => void;
}) {
  const [date, setDate] = useState(today);
  // The last known market price is the likely closing price -- still editable
  const [price, setPrice] = useState(inv.currentPrice != null ? String(inv.currentPrice) : '');
  const [reason, setReason] = useState('');

  const { totalShares, totalCost, avgEntry } = calcStats(inv);
  const p = num(price);
  const valid = isFinite(p) && p >= 0 && !!date;
  const proceeds = valid ? totalShares * p : null;
  const pl = proceeds === null ? null : proceeds - totalCost;
  const plPct = pl === null || totalCost <= 0 ? null : (pl / totalCost) * 100;

  return (
    <Sheet
      open
      onClose={onClose}
      title={`סגירת השקעה · ${inv.symbol}`}
      sub={<><bdi className="num">{fmtShares(totalShares)}</bdi> מניות · ממוצע <bdi className="num">{fmtUsd(avgEntry)}</bdi> · עלות <bdi className="num">{fmtUsd(totalCost)}</bdi></>}
      footer={<>
        <Button variant="primary" className="flex-1" disabled={!valid} onClick={() => { onConfirm(inv.id, date, p, reason); onClose(); }}>סגור השקעה</Button>
        <Button onClick={onClose}>ביטול</Button>
      </>}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="תאריך סגירה">
            <input type="date" className="field" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label="מחיר למניה ($)">
            <input type="number" inputMode="decimal" className="field" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0.00" />
          </Field>
        </div>
        <Field label="למה סגרת?">
          <textarea className="field min-h-[84px] resize-y leading-relaxed" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="התזה השתנתה, הגעתי ליעד, צריך את הכסף..." />
        </Field>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line">
          <div className="bg-surface-2 px-4 py-3">
            <div className="text-xs text-muted">תמורה</div>
            <div className="num mt-0.5 text-right text-base font-semibold text-ink">{proceeds === null ? '—' : fmtUsd(proceeds)}</div>
          </div>
          <div className="bg-surface-2 px-4 py-3">
            <div className="text-xs text-muted">רווח/הפסד</div>
            <div className={cx('num mt-0.5 text-right text-base font-semibold', toneClass(pl))}>{pl === null ? '—' : fmtSignedUsd(pl)}</div>
            {plPct !== null && <div className={cx('num text-right text-xs', toneClass(plPct))}>{fmtPct(plPct)}</div>}
          </div>
        </div>

        <p className="text-xs leading-relaxed text-muted">
          ההשקעה תעבור ל״השקעות שנסגרו״ ותצא מהתיק: העלות, השווי והרווח שלה לא ייספרו יותר בשום סיכום — לא כאן ולא במעקב ההוצאות.
        </p>
      </div>
    </Sheet>
  );
}

/* ── Price-feed settings ───────────────────────────────────────────────── */

export function SettingsSheet({ open, onClose, apiKey, onSave }: {
  open: boolean;
  onClose: () => void;
  apiKey: string;
  onSave: (key: string) => void;
}) {
  const [value, setValue] = useState(apiKey);
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="עדכון מחירים"
      sub="מחירים נמשכים מ-Finnhub (חינם)"
      footer={<>
        <Button variant="primary" className="flex-1" disabled={!value.trim()} onClick={() => { onSave(value.trim()); onClose(); }}>שמור</Button>
        <Button onClick={onClose}>ביטול</Button>
      </>}
    >
      <ol className="mb-4 list-inside list-decimal space-y-1.5 text-sm text-ink-2">
        <li>היכנס ל-finnhub.io ולחץ ״Get free API key״</li>
        <li>הירשם עם מייל</li>
        <li>העתק את המפתח מהדשבורד שלהם והדבק כאן</li>
      </ol>
      <Field label="API Key" hint="נשמר רק בדפדפן הזה">
        <input className="field ltr" value={value} onChange={(e) => setValue(e.target.value)} placeholder="הדבק כאן..." autoCorrect="off" autoCapitalize="off" spellCheck={false} />
      </Field>
      <p className="mt-4 text-xs leading-relaxed text-faint">
        בנוסף, המחירים מתעדכנים אוטומטית כל ערב בימי מסחר, גם בלי לפתוח את האפליקציה.
      </p>
    </Sheet>
  );
}
