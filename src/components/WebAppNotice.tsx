import React from 'react';
import { getInitData } from '../lib/telegram';

const WebAppNotice = () => {
  const initData = getInitData();
  if (initData) return null;

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 text-yellow-900 text-sm">
      <div className="max-w-7xl mx-auto px-4 py-2">
        Open this app from the Telegram WebApp button to load data. If you are
        testing outside Telegram, set `VITE_DEV_TELEGRAM_ID` on the webapp and
        `ALLOW_UNVERIFIED_WEBAPP=true` on the backend.
      </div>
    </div>
  );
};

export default WebAppNotice;
