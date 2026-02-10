import React from 'react';
import { ExternalLink } from 'lucide-react';

type FooterProps = {
  variant?: 'light' | 'dark';
};

const Footer = ({ variant = 'dark' }: FooterProps) => {
  const isDark = variant === 'dark';
  const wrapperClass = isDark
    ? 'bg-transparent border-t border-slate-800/70'
    : 'bg-gray-50 border-t border-gray-200';
  const heading = isDark ? 'text-slate-100' : 'text-gray-900';
  const muted = isDark ? 'text-slate-400' : 'text-gray-600';
  const hover = isDark ? 'hover:text-white' : 'hover:text-gray-900';

  return (
    <footer className={wrapperClass}>
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <span className={`rogue-logo rogue-logo-static ${isDark ? 'rogue-logo-dark' : 'rogue-logo-light'}`}>
                ROGUE
              </span>
            </div>
            <p className={`${muted} text-sm max-w-md`}>
              Automated trading platform with tier-based profit cycles.
              Start your trading journey with secure deposits and transparent returns.
            </p>
          </div>

          <div>
            <h3 className={`text-sm font-semibold tracking-wider uppercase mb-4 ${heading}`}>
              Platform
            </h3>
            <ul className="space-y-2">
              <li>
                <a href="/tutorials" className={`${muted} ${hover} text-sm`}>
                  How it Works
                </a>
              </li>
              <li>
                <a href="/referrals" className={`${muted} ${hover} text-sm`}>
                  Referral Program
                </a>
              </li>
              <li>
                <a href="#" className={`${muted} ${hover} text-sm flex items-center`}>
                  Support
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

        <div className={`mt-8 pt-8 border-t ${isDark ? 'border-slate-800/70' : 'border-gray-200'}`}>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className={`${isDark ? 'text-slate-500' : 'text-gray-500'} text-sm`}>
              © 2026 RougeRunner GENESYS. All rights reserved.
            </p>
            <div className="mt-4 md:mt-0 flex space-x-6" />
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
