import React, { useState } from 'react';
import { Menu, X, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type HeaderProps = {
  variant?: 'light' | 'dark';
};

const Header = ({ variant = 'dark' }: HeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const isDark = variant === 'dark';

  const navigation = [
    { name: 'Trade', href: '/' },
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Deposit', href: '/deposit' },
    { name: 'Withdraw', href: '/withdraw' },
    { name: 'Referrals', href: '/referrals' },
    { name: 'Tutorials', href: '/tutorials' }
  ];

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const headerClass = isDark
    ? 'bg-[#05070d]/90 border-b border-slate-800/70 text-slate-100'
    : 'bg-white border-b border-gray-200';
  const navActive = isDark
    ? 'bg-amber-400/15 text-amber-200'
    : 'bg-blue-100 text-blue-700';
  const navIdle = isDark
    ? 'text-slate-300 hover:text-amber-100 hover:bg-amber-400/10'
    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50';

  return (
    <header className={`${headerClass} sticky top-0 z-50 backdrop-blur`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <span className={`rogue-logo ${isDark ? 'rogue-logo-dark' : 'rogue-logo-light'}`}>
                ROGUE
              </span>
            </Link>
          </div>

          <nav className="hidden md:flex space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(item.href) ? navActive : navIdle
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden md:flex items-center space-x-4">
            <div className={`flex items-center space-x-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              <User className="h-4 w-4" />
              <span>Welcome back</span>
            </div>
          </div>

          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md ${
                isDark
                  ? 'text-slate-300 hover:text-white hover:bg-white/10'
                  : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'
              } focus:outline-none focus:ring-2 focus:ring-inset ${isDark ? 'focus:ring-cyan-400' : 'focus:ring-blue-500'}`}
              aria-expanded="false"
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden">
          <div className={`px-2 pt-2 pb-3 space-y-1 sm:px-3 ${isDark ? 'bg-[#05070d]/95 border-t border-slate-800/70' : 'bg-white border-t border-gray-200'}`}>
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                  isActive(item.href) ? navActive : navIdle
                }`}
                onClick={() => setIsMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
