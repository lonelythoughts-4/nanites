import React, { useCallback, useEffect, useState } from 'react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './src/pages/Home';
import Dashboard from './src/pages/Dashboard';
import Deposit from './src/pages/Deposit';
import Trade from './src/pages/Trade';
import Withdraw from './src/pages/Withdraw';
import Wallet from './src/pages/Wallet';
import Referrals from './src/pages/Referrals';
import Tutorials from './src/pages/Tutorials';
import NotFound from './src/pages/NotFound';
import LoadingSpinner from './src/components/LoadingSpinner';
import { initializeWebApp, enforceInitDataFreshness } from './src/lib/telegram';
import { api } from './src/lib/api';
import WebAppNotice from './src/components/WebAppNotice';
import LaunchGate from './src/components/LaunchGate';
import LaunchLoading from './src/components/LaunchLoading';
import BottomNav from './src/components/BottomNav';

const App: React.FC = () => {
  const launchGateEnabled = true;
  const [gateDismissed, setGateDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('rogue_launch_gate_seen') === '1';
    } catch {
      return false;
    }
  });
  const [showLaunchLoading, setShowLaunchLoading] = useState(false);
  const [gateRolling, setGateRolling] = useState(false);
  const [gateHidden, setGateHidden] = useState(false);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState<string | null>(null);

  const warmUpData = useCallback(async () => {
    setBooting(true);
    setBootError(null);
    const results = await Promise.allSettled([
      api.getDashboard(),
      api.getReferrals(),
      api.getTier(),
      api.getCycle(),
      api.getTradingStatus(),
      api.getWalletStatus()
    ]);
    const errors = results.filter((res) => res.status === 'rejected') as PromiseRejectedResult[];
    if (errors.length) {
      const message = errors
        .map((err) => err.reason?.message || 'Failed to load live data.')
        .slice(0, 3)
        .join(' ');
      setBootError(message || 'Failed to load live data.');
    }
    setBooting(false);
  }, []);

  useEffect(() => {
    initializeWebApp();
    enforceInitDataFreshness();
    warmUpData();
  }, [warmUpData]);

  if (launchGateEnabled && !gateDismissed) {
    return (
      <Theme appearance="inherit" radius="large" scaling="100%">
        {showLaunchLoading && (
          <LaunchLoading
            onComplete={() => {
              try {
                sessionStorage.setItem('rogue_launch_gate_seen', '1');
              } catch {
                // ignore
              }
              setGateDismissed(true);
              setShowLaunchLoading(false);
              setGateRolling(false);
              setGateHidden(false);
            }}
          />
        )}
        {!gateHidden && (
          <LaunchGate
            rolling={gateRolling}
            onEnter={() => {
              if (gateRolling) return;
              setShowLaunchLoading(true);
              setGateRolling(true);
              setTimeout(() => {
                setGateHidden(true);
              }, 650);
            }}
          />
        )}
      </Theme>
    );
  }

  return (
    <Theme appearance="inherit" radius="large" scaling="100%">
      <Router>
        <div className="min-h-screen font-sans app-shell pb-24">
          <WebAppNotice />
          {booting ? (
            <div className="flex min-h-[70vh] items-center justify-center px-6 text-center">
              <div className="space-y-4">
                <LoadingSpinner size="lg" className="border-gray-500 border-t-yellow-400 mx-auto" />
                <div className="text-sm text-slate-200">
                  Loading live data...
                </div>
              </div>
            </div>
          ) : bootError ? (
            <div className="flex min-h-[70vh] items-center justify-center px-6 text-center">
              <div className="space-y-4 max-w-md">
                <div className="text-base font-semibold text-slate-100">Live data unavailable</div>
                <div className="text-xs text-slate-300">{bootError}</div>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-full border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-100 hover:border-slate-500"
                  onClick={warmUpData}
                >
                  Retry loading
                </button>
              </div>
            </div>
          ) : (
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/trade" element={<Trade />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/deposit" element={<Deposit />} />
              <Route path="/withdraw" element={<Withdraw />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/tutorials" element={<Tutorials />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
          <ToastContainer
            position="top-right"
            autoClose={3000}
            newestOnTop
            closeOnClick
            pauseOnHover
            className="z-50"
          />
        </div>
        {!booting && !bootError && <BottomNav />}
      </Router>
    </Theme>
  );
};

export default App;
