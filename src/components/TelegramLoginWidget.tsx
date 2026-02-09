import React, { useEffect, useRef, useState } from 'react';
import { setTelegramLoginData, getTelegramLoginData, clearTelegramLoginData } from '../lib/telegram';

declare global {
  interface Window {
    onTelegramAuth?: (user: unknown) => void;
  }
}

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'rogueezbot';

type TelegramLoginWidgetProps = {
  compact?: boolean;
};

const TelegramLoginWidget = ({ compact = false }: TelegramLoginWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(!!getTelegramLoginData());

  useEffect(() => {
    window.onTelegramAuth = (user: unknown) => {
      setTelegramLoginData(user);
      setLoggedIn(true);
    };

    if (containerRef.current) {
      containerRef.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.async = true;
      script.setAttribute('data-telegram-login', BOT_USERNAME);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-userpic', 'false');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      containerRef.current.appendChild(script);
      setReady(true);
    }
  }, []);

  const handleClear = () => {
    clearTelegramLoginData();
    setLoggedIn(false);
  };

  const containerClass = compact
    ? 'rounded-md border border-yellow-200 bg-yellow-50 p-2 text-[11px] text-yellow-900'
    : 'mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900';

  return (
    <div className={containerClass}>
      <div className={compact ? 'font-semibold text-[11px]' : 'font-semibold'}>
        Telegram Login (fallback)
      </div>
      <div className={compact ? 'mt-1 text-[11px]' : 'mt-1 text-xs'}>
        If you are not inside Telegram WebApp, use this to verify your account.
      </div>
      <div className={compact ? 'mt-2' : 'mt-3'} ref={containerRef} />
      {!ready && (
        <div className={compact ? 'mt-1 text-[11px] text-yellow-700' : 'mt-2 text-xs text-yellow-700'}>
          Loading widget...
        </div>
      )}
      {loggedIn && (
        <div className={compact ? 'mt-1 flex items-center justify-between text-[11px] text-green-700' : 'mt-2 flex items-center justify-between text-xs text-green-700'}>
          <span>Logged in via Telegram widget.</span>
          <button
            onClick={handleClear}
            className={compact ? 'text-[11px] text-yellow-800 underline hover:text-yellow-900' : 'text-xs text-yellow-800 underline hover:text-yellow-900'}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default TelegramLoginWidget;
