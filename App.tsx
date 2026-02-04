import React from 'react';
    import '@radix-ui/themes/styles.css';
    import { Theme } from '@radix-ui/themes';
    import { ToastContainer } from 'react-toastify';
    import 'react-toastify/dist/ReactToastify.css';
    import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

    import Home from './src/pages/Home';
    import Dashboard from './src/pages/Dashboard';
    import Deposit from './src/pages/Deposit';
    import Withdraw from './src/pages/Withdraw';
    import Referrals from './src/pages/Referrals';
    import Tutorials from './src/pages/Tutorials';
    import NotFound from './src/pages/NotFound';

    const App: React.FC = () => {
      return (
        <Theme appearance="inherit" radius="large" scaling="100%">
          <Router>
            <div className="min-h-screen font-sans bg-gray-50">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/dashboard" element={<Dashboard />} />
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
          </Router>
        </Theme>
      );
    };

    export default App;