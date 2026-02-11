import React from 'react';
import { User } from 'lucide-react';
import { Link } from 'react-router-dom';

type HeaderProps = {
  variant?: 'light' | 'dark';
};

const Header = ({ variant = 'dark' }: HeaderProps) => {
  const isDark = variant === 'dark';

  const headerClass = isDark
    ? 'bg-[#05070d]/90 border-b border-slate-800/70 text-slate-100'
    : 'bg-white border-b border-gray-200';

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

          <div className="hidden md:flex items-center space-x-4">
            <div className={`flex items-center space-x-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              <User className="h-4 w-4" />
              <span>Welcome back</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
