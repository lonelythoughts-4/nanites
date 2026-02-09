import React from 'react';
import { getInitData } from '../lib/telegram';
import TelegramLoginWidget from './TelegramLoginWidget';

const WebAppNotice = () => {
  const initData = getInitData();
  if (initData) return null;

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'rogueezbot';
  const telegramLink = `https://t.me/${botUsername}?startapp=webapp`;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-900 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex flex-col gap-2">
          <div className="font-semibold">Telegram WebApp required</div>
          <div className="text-xs">
            Open this app from the Telegram WebApp button to load live data.
          </div>
          <div>
            <a
              href={telegramLink}
              className="inline-flex items-center px-3 py-1 text-xs font-medium bg-yellow-900 text-yellow-50 rounded-md hover:bg-yellow-800"
            >
              Open in Telegram
            </a>
          </div>
          <TelegramLoginWidget />
          <div className="text-[11px] text-yellow-800">
            Dev fallback: set `VITE_DEV_TELEGRAM_ID` on the webapp and
            `ALLOW_UNVERIFIED_WEBAPP=true` on the backend.
          </div>
        </div>
      </div>
    </div>
  );
};

export default WebAppNotice;
