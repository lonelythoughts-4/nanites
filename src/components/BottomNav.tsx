import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowDownLeft, ArrowUpRight, LayoutDashboard, Users, Wallet, Zap } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  const pathname = location.pathname;
  const isLight = pathname.startsWith('/wallet');

  const items = [
    { name: 'Trade', href: '/', icon: Zap },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Wallet', href: '/wallet', icon: Wallet },
    { name: 'Deposit', href: '/deposit', icon: ArrowDownLeft },
    { name: 'Withdraw', href: '/withdraw', icon: ArrowUpRight },
    { name: 'Referrals', href: '/referrals', icon: Users }
  ];

  return (
    <nav className={`bottom-nav ${isLight ? 'bottom-nav-light' : 'bottom-nav-dark'}`}>
      <div className="bottom-nav-inner">
        {items.map((item) => {
          const active =
            item.href === '/'
              ? pathname === '/' || pathname === ''
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`bottom-tab ${active ? 'bottom-tab-active' : ''}`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
