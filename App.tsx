import React, { useEffect, useState } from 'react';
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
import { initializeWebApp, enforceInitDataFreshness } from './src/lib/telegram';
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

  useEffect(() => {
    initializeWebApp();
    enforceInitDataFreshness();
  }, []);

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
          <ToastContainer
            position="top-right"
            autoClose={3000}
            newestOnTop
            closeOnClick
            pauseOnHover
            className="z-50"
          />
        </div>
        <BottomNav />
      </Router>
    </Theme>
  );
};

export default App;
