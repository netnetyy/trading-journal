import type { ReactNode } from 'react';
import { PieChart, History, LayoutDashboard, List, BarChart2, Plus, Archive } from 'lucide-react';
import { cx } from '../utils/cx';

export type NavPage = 'portfolio' | 'history' | 'dashboard' | 'trades' | 'add-trade' | 'statistics';

interface LayoutProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  children: ReactNode;
}

const investNav = [
  { id: 'portfolio' as const, label: 'התיק שלי', icon: PieChart },
  { id: 'history' as const, label: 'השקעות שנסגרו', icon: History },
];

const swingNav = [
  { id: 'dashboard' as const, label: 'דשבורד', icon: LayoutDashboard },
  { id: 'trades' as const, label: 'יומן עסקאות', icon: List },
  { id: 'statistics' as const, label: 'סטטיסטיקות', icon: BarChart2 },
  { id: 'add-trade' as const, label: 'עסקה חדשה', icon: Plus },
];

const SWING_PAGES: NavPage[] = ['dashboard', 'trades', 'statistics', 'add-trade'];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#8aa0ff] to-[#4f63e0] shadow-[0_6px_18px_-6px_rgba(110,139,255,0.7)]">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 17l6-6 4 4 8-8" />
          <path d="M15 7h6v6" />
        </svg>
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-semibold text-ink">היומן שלי</div>
        <div className="text-[11px] text-muted">השקעות לטווח ארוך</div>
      </div>
    </div>
  );
}

export default function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const inSwing = SWING_PAGES.includes(currentPage);

  const sideItem = (item: { id: NavPage; label: string; icon: typeof PieChart }, subtle = false) => {
    const Icon = item.icon;
    const active = currentPage === item.id;
    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        className={cx(
          'flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 text-right transition-colors',
          subtle ? 'h-9 text-[13px]' : 'h-11 text-sm',
          active ? 'bg-accent-soft font-medium text-ink' : 'text-muted hover:bg-surface-2 hover:text-ink-2',
        )}
      >
        <Icon size={subtle ? 16 : 18} className={active ? 'text-accent' : ''} />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-l border-line bg-bg px-3 py-5 lg:flex">
        <div className="px-2 pb-6">
          <Logo />
        </div>

        <div className="px-3 pb-2 text-[11px] font-medium tracking-wide text-faint">השקעות</div>
        <nav className="space-y-1">{investNav.map((i) => sideItem(i))}</nav>

        <div className="mt-8 flex items-center gap-1.5 px-3 pb-2 text-[11px] font-medium tracking-wide text-faint">
          <Archive size={12} />
          סווינג · ארכיון
        </div>
        <nav className="space-y-0.5">{swingNav.map((i) => sideItem(i, true))}</nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="pt-safe sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur-xl lg:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <Logo />
          </div>
          {inSwing && (
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto px-4 pb-2.5">
              {swingNav.map((item) => {
                const active = currentPage === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={cx(
                      'flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium',
                      active ? 'bg-accent text-white' : 'bg-surface-2 text-muted',
                    )}
                  >
                    <Icon size={13} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </header>

        <main className="min-w-0 flex-1 pb-24 lg:pb-0">{children}</main>
      </div>

      {/* Mobile tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/90 backdrop-blur-xl lg:hidden">
        <div className="grid h-16 grid-cols-3">
          {[
            { id: 'portfolio' as NavPage, label: 'התיק', icon: PieChart, active: currentPage === 'portfolio' },
            { id: 'history' as NavPage, label: 'נסגרו', icon: History, active: currentPage === 'history' },
            { id: 'dashboard' as NavPage, label: 'סווינג', icon: Archive, active: inSwing },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => onNavigate(t.id)}
                className={cx('flex cursor-pointer flex-col items-center justify-center gap-1 text-[11px] font-medium', t.active ? 'text-accent' : 'text-muted')}
              >
                <Icon size={22} strokeWidth={t.active ? 2.2 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
