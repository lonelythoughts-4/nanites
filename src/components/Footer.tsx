import React from 'react';
import { ExternalLink, ShieldCheck, Sparkles, Wallet as WalletIcon } from 'lucide-react';
import { useTheme } from '../lib/theme';

type FooterProps = {
  variant?: 'light' | 'dark';
};

const Footer = ({ variant }: FooterProps) => {
  const { theme } = useTheme();
  const resolvedVariant = variant ?? theme;
  const isDark = resolvedVariant === 'dark';
  const wrapperClass = isDark
    ? 'bg-transparent border-t border-slate-800/70'
    : 'bg-amber-50 border-t border-amber-200';
  const heading = isDark ? 'text-slate-100' : 'text-gray-900';
  const muted = isDark ? 'text-slate-400' : 'text-slate-600';
  const hover = isDark ? 'hover:text-white' : 'hover:text-slate-900';
  const supportUrl = 'https://t.me/RogueEngineSupport';

  return (
    <footer className={wrapperClass}>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 space-y-4">
            <div className="flex items-center space-x-2">
              <span className={`rogue-logo rogue-logo-static ${isDark ? 'rogue-logo-dark' : 'rogue-logo-light'}`}>
                ROGUE
              </span>
            </div>
            <p className={`${muted} text-sm max-w-md`}>
              Automated trading platform with tier-based profit cycles.
              Start your trading journey with secure deposits and transparent returns.
            </p>
            <div className={`text-xs ${muted} flex items-center gap-2`}>
              <Sparkles className="h-4 w-4" />
              Built for 14-day cycles, vault visibility, and instant tier sync.
            </div>
          </div>

          <div>
            <h3 className={`text-sm font-semibold tracking-wider uppercase mb-4 ${heading}`}>
              Platform
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="/dashboard" className={`${muted} ${hover} text-sm`}>Dashboard</a>
              </li>
              <li>
                <a href="/trade" className={`${muted} ${hover} text-sm`}>Trade</a>
              </li>
              <li>
                <a href="/wallet" className={`${muted} ${hover} text-sm`}>Wallet</a>
              </li>
              <li>
                <a href="/deposit" className={`${muted} ${hover} text-sm`}>Deposit</a>
              </li>
              <li>
                <a href="/withdraw" className={`${muted} ${hover} text-sm`}>Withdraw</a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={`text-sm font-semibold tracking-wider uppercase mb-4 ${heading}`}>
              Rewards & Help
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="/referrals" className={`${muted} ${hover} text-sm flex items-center gap-2`}>
                  <WalletIcon className="h-3.5 w-3.5" />
                  Referral Program
                </a>
              </li>
              <li>
                <a href="/tutorials" className={`${muted} ${hover} text-sm flex items-center gap-2`}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Tutorials & FAQ
                </a>
              </li>
              <li>
                <a href={supportUrl} target="_blank" rel="noreferrer" className={`${muted} ${hover} text-sm flex items-center`}>
                  Support Chat
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className={`text-sm font-semibold tracking-wider uppercase mb-4 ${heading}`}>
              Legal
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className={`${muted} ${hover} text-sm`}>
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#" className={`${muted} ${hover} text-sm`}>
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#" className={`${muted} ${hover} text-sm`}>
                  Risk Disclaimer
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className={`mt-8 pt-8 border-t ${isDark ? 'border-slate-800/70' : 'border-amber-200'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className={`${isDark ? 'text-slate-500' : 'text-slate-500'} text-sm`}>
              (c) 2026 RougeRunner GENESYS. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
