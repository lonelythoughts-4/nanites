import React from 'react';
import { Moon, Sun, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTheme } from '../lib/theme';

type HeaderProps = {
  variant?: 'light' | 'dark';
};

const Header = ({ variant }: HeaderProps) => {
  const { theme, toggle } = useTheme();
  const resolvedVariant = variant ?? theme;
  const isDark = resolvedVariant === 'dark';

  const headerClass = isDark
    ? 'bg-[#05070d]/90 border-b border-slate-800/70 text-slate-100'
    : 'bg-white border-b border-amber-200 text-slate-900';

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

          <div className="flex items-center space-x-3">
            <div className={`hidden md:flex items-center space-x-2 text-sm ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <User className="h-4 w-4" />
              <span>Welcome back</span>
            </div>
            <button
              type="button"
              onClick={toggle}
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[10px] uppercase tracking-[0.25em] transition ${
                isDark
                  ? 'border-slate-700 bg-slate-900/60 text-slate-200 hover:text-white'
                  : 'border-amber-200 bg-amber-50 text-amber-700 hover:text-amber-900'
              }`}
            >
              {theme === 'dark' ? <Sun className="h-3 w-3" /> : <Moon className="h-3 w-3" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
