import { useEffect, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cx } from '../utils/cx';

/* ── Card ──────────────────────────────────────────────────────────────── */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cx('rounded-2xl border border-line bg-surface', className)}>
      {children}
    </section>
  );
}

export function CardHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/* ── Buttons ───────────────────────────────────────────────────────────── */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-strong shadow-[0_6px_20px_-6px_rgba(110,139,255,0.6)]',
  secondary: 'bg-surface-2 text-ink-2 border border-line-strong hover:bg-surface-3 hover:text-ink',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-loss-soft text-loss border border-loss/25 hover:bg-loss/20',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' | 'icon' }) {
  return (
    <button
      {...rest}
      className={cx(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl font-medium whitespace-nowrap transition-colors select-none',
        'disabled:cursor-not-allowed disabled:opacity-45 active:scale-[0.98]',
        size === 'sm' && 'h-9 px-3 text-[13px]',
        size === 'md' && 'h-11 px-4 text-sm',
        size === 'icon' && 'h-10 w-10',
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Segmented control ─────────────────────────────────────────────────── */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cx('inline-flex rounded-xl bg-surface-2 p-1', className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
            value === o.value ? 'bg-surface-3 text-ink shadow-sm' : 'text-muted hover:text-ink-2',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ── Change pill: +2.4% in a tinted chip ───────────────────────────────── */

export function ChangePill({ value, className }: { value: number | null; className?: string }) {
  if (value === null || !isFinite(value)) return <span className={cx('text-xs text-faint', className)}>—</span>;
  const up = value >= 0;
  return (
    <span
      className={cx(
        'num inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold',
        up ? 'bg-profit-soft text-profit' : 'bg-loss-soft text-loss',
        className,
      )}
    >
      {up ? '▲' : '▼'} {Math.abs(value).toFixed(2)}%
    </span>
  );
}

/* ── Sheet: bottom sheet on phones, centred dialog on larger screens ────── */

export function Sheet({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <div className="animate-fade absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div className="animate-sheet relative flex max-h-[92dvh] w-full flex-col rounded-t-3xl border border-line-strong bg-surface sm:max-w-[480px] sm:rounded-3xl">
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-surface-3 sm:hidden" />
        <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 sm:pt-5">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {sub && <div className="mt-0.5 text-[13px] text-muted">{sub}</div>}
          </div>
          <button onClick={onClose} className="-m-1 cursor-pointer rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="סגור">
            <X size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-4">{children}</div>
        {footer && (
          <div className="pb-safe border-t border-line px-5 pt-3">
            <div className="flex gap-2 pb-4">{footer}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-faint">{hint}</span>}
    </label>
  );
}

/* ── Empty state ───────────────────────────────────────────────────────── */

export function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-muted">{icon}</div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
