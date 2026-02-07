import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import Referrals from './pages/Referrals';
import Tutorials from './pages/Tutorials';
import Trading from './pages/Trading';
import Support from './pages/Support';
import History from './pages/History';
import Notifications from './pages/Notifications';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import NotFound from './pages/NotFound';

const App: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [telegramReady, setTelegramReady] = useState(false);

  useEffect(() => {
    // Initialize Telegram WebApp and extract user ID
    const initTelegram = async () => {
      // Access window.Telegram (injected by Telegram SDK script)
      const tg = (window as any).Telegram?.WebApp;
      
      if (tg) {
        // Ready the app
        tg.ready();
        tg.expand();

        // Extract user ID from Telegram's initData
        const user = tg.initDataUnsafe?.user;
        if (user?.id) {
          const uid = String(user.id);
          setUserId(uid);
          // Store in localStorage for API calls
          localStorage.setItem('userId', uid);
          localStorage.setItem('telegramUser', JSON.stringify(user));
        }
        setTelegramReady(true);
      } else {
        // Fallback for dev: use localStorage or demo ID from env
        const storedId = localStorage.getItem('userId') || localStorage.getItem('demoUserId');
        const demoUser = import.meta.env.VITE_DEMO_USER;
        const fallbackId = storedId || demoUser || 'demo_user_' + Date.now();
        setUserId(fallbackId);
        localStorage.setItem('userId', fallbackId);
        setTelegramReady(true);
      }
    };

    initTelegram();
  }, []);

  if (!telegramReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p>Initializing Telegram...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen font-sans bg-gray-50">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/deposit" element={<Deposit />} />
          <Route path="/withdraw" element={<Withdraw />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/tutorials" element={<Tutorials />} />
          <Route path="/trading" element={<Trading />} />
          <Route path="/support" element={<Support />} />
          <Route path="/history" element={<History />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
