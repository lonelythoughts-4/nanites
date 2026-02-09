import React from 'react';
import { getInitData, getTelegramWebApp } from '../lib/telegram';
import TelegramLoginWidget from './TelegramLoginWidget';

const WebAppNotice = () => {
  const initData = getInitData();
  if (initData) return null;

  const botUsername = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'rogueezbot';
  const telegramLink = `https://t.me/${botUsername}?startapp=webapp`;
  const isTelegram = !!getTelegramWebApp();

  if (isTelegram) {
    return (
      <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-900 text-xs">
        <div className="max-w-7xl mx-auto px-3 py-2 flex flex-wrap items-center gap-2 justify-between">
          <span>
            Telegram init data missing. Open from the bot WebApp button.
          </span>
          <a
            href={telegramLink}
            className="inline-flex items-center px-2 py-1 text-[11px] font-medium bg-yellow-900 text-yellow-50 rounded-md hover:bg-yellow-800"
          >
            Open in Telegram
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-900 text-xs">
      <div className="max-w-7xl mx-auto px-3 py-2">
        <div className="flex flex-col gap-2">
          <div className="font-semibold text-sm">Open in Telegram</div>
          <div className="text-[11px]">
            To load live data, open this app from the bot WebApp button.
          </div>
          <div>
            <a
              href={telegramLink}
              className="inline-flex items-center px-2 py-1 text-[11px] font-medium bg-yellow-900 text-yellow-50 rounded-md hover:bg-yellow-800"
            >
              Open in Telegram
            </a>
          </div>
          <details className="text-[11px]">
            <summary className="cursor-pointer select-none">
              Having trouble? Use Telegram Login (fallback)
            </summary>
            <div className="mt-2">
              <TelegramLoginWidget compact />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default WebAppNotice;
