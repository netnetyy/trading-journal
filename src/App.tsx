import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import Layout, { type NavPage } from './components/Layout';
import PortfolioPage from './components/portfolio/PortfolioPage';
import HistoryPage from './components/portfolio/HistoryPage';
import type { AppData, Trade, PortfolioDeposit } from './types/trade';
import { loadData, saveData, generateId } from './utils/storage';
import { usePortfolio } from './portfolio/usePortfolio';

// The swing screens are an archive now -- load them only when opened
const Dashboard = lazy(() => import('./components/Dashboard'));
const TradeLog = lazy(() => import('./components/TradeLog'));
const TradeForm = lazy(() => import('./components/TradeForm'));
const Statistics = lazy(() => import('./components/Statistics'));
const TradeDetail = lazy(() => import('./components/TradeDetail'));

type Page = NavPage | 'edit-trade' | 'trade-detail';

const PAGES: Page[] = ['portfolio', 'history', 'dashboard', 'trades', 'add-trade', 'statistics', 'edit-trade', 'trade-detail'];

/* The page lives in the URL hash, so the phone's back button and a
   home-screen bookmark both land where you expect. */
function readHash(): { page: Page; id: string | null } {
  const [, raw, id] = window.location.hash.split('/');
  const page = PAGES.includes(raw as Page) ? (raw as Page) : 'portfolio';
  return { page, id: id ?? null };
}

function Loader({ inline = false }: { inline?: boolean }) {
  return (
    <div className={`flex ${inline ? 'h-[60vh]' : 'h-dvh'} flex-col items-center justify-center gap-4 bg-bg`}>
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-accent/20 border-t-accent" />
      <span className="text-sm text-muted">טוען...</span>
    </div>
  );
}

function App() {
  const portfolio = usePortfolio();
  const [data, setData] = useState<AppData | null>(null);
  const [{ page, id: routeId }, setRoute] = useState(readHash);

  useEffect(() => {
    loadData().then(setData);
  }, []);

  useEffect(() => {
    const onHash = () => {
      setRoute(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = useCallback((p: Page, tradeId?: string) => {
    window.location.hash = tradeId ? `/${p}/${tradeId}` : `/${p}`;
  }, []);

  const persist = useCallback((updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      if (!prev) return prev;
      const updated = updater(prev);
      saveData(updated); // fire-and-forget, UI updates instantly
      return updated;
    });
  }, []);

  const handleSaveTrade = (trade: Trade) => {
    persist((prev) => {
      const exists = prev.trades.find((t) => t.id === trade.id);
      return exists
        ? { ...prev, trades: prev.trades.map((t) => (t.id === trade.id ? trade : t)) }
        : { ...prev, trades: [...prev.trades, trade] };
    });
    navigate('trades');
  };

  const handleDeleteTrade = (id: string) => {
    persist((prev) => ({ ...prev, trades: prev.trades.filter((t) => t.id !== id) }));
  };

  const handleSetPortfolioBase = (value: number) => {
    persist((prev) => ({ ...prev, portfolioBaseValue: value }));
  };

  const handleAddDeposit = (amount: number, date: string, note: string) => {
    const deposit: PortfolioDeposit = { id: generateId(), amount, date, note };
    persist((prev) => ({
      ...prev,
      deposits: [...prev.deposits, deposit],
      portfolioBaseValue: prev.portfolioBaseValue + amount,
    }));
  };

  const handleSetRiskUnit = (value: number) => {
    persist((prev) => ({ ...prev, riskUnitValue: value }));
  };

  const handleSetDefaultCommission = (value: number) => {
    persist((prev) => ({ ...prev, defaultCommissionPerAction: value }));
  };

  const handleDeleteDeposit = (id: string) => {
    persist((prev) => {
      const dep = prev.deposits.find((d) => d.id === id);
      if (!dep) return prev;
      return {
        ...prev,
        deposits: prev.deposits.filter((d) => d.id !== id),
        portfolioBaseValue: prev.portfolioBaseValue - dep.amount,
      };
    });
  };

  const isPortfolioPage = page === 'portfolio' || page === 'history';
  if (isPortfolioPage ? portfolio.loading : !data) return <Loader />;

  const renderSwing = (d: AppData) => {
    const nextSerial = d.trades.length > 0 ? Math.max(...d.trades.map((t) => t.serialNumber)) + 1 : 1;
    const routeTrade = routeId ? d.trades.find((t) => t.id === routeId) : undefined;
    switch (page) {
      case 'trades':
        return (
          <TradeLog
            data={d}
            onEdit={(id) => navigate('edit-trade', id)}
            onDelete={handleDeleteTrade}
            onAdd={() => navigate('add-trade')}
            onView={(id) => navigate('trade-detail', id)}
          />
        );
      case 'trade-detail':
        return routeTrade ? (
          <TradeDetail
            trade={routeTrade}
            riskUnitValue={d.riskUnitValue ?? 100}
            onBack={() => navigate('trades')}
            onEdit={(id) => navigate('edit-trade', id)}
          />
        ) : <div />;
      case 'add-trade':
      case 'edit-trade':
        return (
          <TradeForm
            key={page + (routeId ?? '')}
            existing={page === 'edit-trade' ? routeTrade : undefined}
            nextSerial={nextSerial}
            defaultCommissionPerAction={d.defaultCommissionPerAction ?? 2.5}
            onSave={handleSaveTrade}
            onCancel={() => navigate('trades')}
          />
        );
      case 'statistics':
        return <Statistics data={d} onView={(id) => navigate('trade-detail', id)} />;
      default:
        return (
          <Dashboard
            data={d}
            onNavigate={navigate}
            onSetPortfolioBase={handleSetPortfolioBase}
            onAddDeposit={handleAddDeposit}
            onDeleteDeposit={handleDeleteDeposit}
            onSetRiskUnit={handleSetRiskUnit}
            onSetDefaultCommission={handleSetDefaultCommission}
          />
        );
    }
  };

  const navPage: NavPage = page === 'edit-trade' || page === 'trade-detail' ? 'trades' : page;

  return (
    <Layout currentPage={navPage} onNavigate={(p) => navigate(p)}>
      {page === 'portfolio' ? (
        <PortfolioPage p={portfolio} />
      ) : page === 'history' ? (
        <HistoryPage p={portfolio} />
      ) : (
        <Suspense fallback={<Loader inline />}>{renderSwing(data!)}</Suspense>
      )}
    </Layout>
  );
}

export default App;
