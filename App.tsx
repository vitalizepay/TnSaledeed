// src/App.tsx
import React, { useContext, useEffect, useState } from 'react';
import { UserContext } from './contexts/UserContext';
import { Loader } from './components/Loader';
import { isGeminiConfigured } from './services/geminiService';
import { isSupabaseConfigured } from './lib/supabaseClient';

import Landing from './components/Landing';
import Dashboard from './components/Dashboard';        // ⬅️ now from components/
import MODGenerator from './components/MODGenerator';   // ⬅️
import SaleAgreement from './components/SaleAgreement'; // ⬅️

type AppView = 'dashboard' | 'mod' | 'sale-agreement';

const App: React.FC = () => {
  const { user, loading: authLoading, fatalError, clearSiteDataAndReload } = useContext(UserContext);

  const geminiConfigured = isGeminiConfigured();
  const supabaseConfigured = isSupabaseConfigured();

  // --- tiny hash router (#/mod, #/sale-agreement) ---
  const getInitialView = (): AppView => {
    const h = (location.hash || '').replace(/^#\/?/, '').toLowerCase();
    if (h === 'mod') return 'mod';
    if (h === 'sale-agreement' || h === 'sale') return 'sale-agreement';
    return 'dashboard';
  };

  const [view, setView] = useState<AppView>(getInitialView);
  useEffect(() => {
    const onHashChange = () => setView(getInitialView());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = (next: AppView) => {
    setView(next);
    if (next === 'mod') location.hash = '/mod';
    else if (next === 'sale-agreement') location.hash = '/sale-agreement';
    else history.replaceState(null, '', location.pathname + location.search);
  };

  // 1) Config guard
  if (!geminiConfigured || !supabaseConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans p-4">
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-lg border border-red-200/80 max-w-2xl w-full mx-4 text-center">
          <h1 className="text-3xl font-bold text-red-600 mb-4">Configuration Required</h1>
          <p className="text-slate-700 mb-8 text-lg">
            This application is not configured correctly. Please provide your API keys to continue.
          </p>
        </div>
      </div>
    );
  }

  // 2) Auth loading guard
  if (authLoading) return <Loader message="Initializing..." />;

  // 3) Fatal error guard
  if (fatalError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-lg border border-red-200/80 text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">An error occurred</h1>
          <p className="text-slate-700 mb-4">{fatalError}</p>
          <button
            onClick={clearSiteDataAndReload}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            Clear Site Data & Reload
          </button>
        </div>
      </div>
    );
  }

  // 4) Landing vs. App
  if (!user) return <Landing />;

  // Views
  if (view === 'mod') {
    return (
      <MODGenerator
        onOpenSaleDeed={() => go('dashboard')}
        onOpenSaleAgreement={() => go('sale-agreement')}
      />
    );
  }

  if (view === 'sale-agreement') {
    return (
      <SaleAgreement
        onOpenSaleDeed={() => go('dashboard')}
        onOpenMOD={() => go('mod')}
      />
    );
  }

  // default: dashboard (Sale Deed)
  return (
    <Dashboard
      onOpenMOD={() => go('mod')}
      onOpenSaleAgreement={() => go('sale-agreement')}
    />
  );
};

export default App;
