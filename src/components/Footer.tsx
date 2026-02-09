import React from 'react';
    import { Bot, ExternalLink } from 'lucide-react';

    const Footer = () => {
      return (
        <footer className="bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="col-span-1 md:col-span-2">
                <div className="flex items-center space-x-2 mb-4">
                  <Bot className="h-8 w-8 text-blue-600" />
                  <span className="text-xl font-bold text-gray-900">RougeRunner GENESYS</span>
                </div>
                <p className="text-gray-600 text-sm max-w-md">
                  Automated trading platform with tier-based profit cycles. 
                  Start your trading journey with secure deposits and transparent returns.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                  Platform
                </h3>
                <ul className="space-y-2">
                  <li>
                    <a href="/tutorials" className="text-gray-600 hover:text-gray-900 text-sm">
                      How it Works
                    </a>
                  </li>
                  <li>
                    <a href="/referrals" className="text-gray-600 hover:text-gray-900 text-sm">
                      Referral Program
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-600 hover:text-gray-900 text-sm flex items-center">
                      Support
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-900 tracking-wider uppercase mb-4">
                  Legal
                </h3>
                <ul className="space-y-2">
                  <li>
                    <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-gray-600 hover:text-gray-900 text-sm">
                      Risk Disclaimer
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <p className="text-gray-500 text-sm">
                  © 2026 RougeRunner GENESYS. All rights reserved.
                </p>
                <div className="mt-4 md:mt-0 flex space-x-6">
                  <a href="#" className="text-gray-400 hover:text-gray-500">
                    <span className="sr-only">Telegram</span>
                    <Bot className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </footer>
      );
    };

    export default Footer;