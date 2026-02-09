import React, { useEffect, useRef, useState } from 'react';
import { setTelegramLoginData, getTelegramLoginData, clearTelegramLoginData } from '../lib/telegram';

declare global {
  interface Window {
    onTelegramAuth?: (user: unknown) => void;
  }
}

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'rogueezbot';

const TelegramLoginWidget = () => {
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

  return (
    <div className="mt-3 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
      <div className="font-semibold">Telegram Login (fallback)</div>
      <div className="mt-1 text-xs">
        If you are not inside Telegram WebApp, use this to verify your account.
      </div>
      <div className="mt-3" ref={containerRef} />
      {!ready && <div className="mt-2 text-xs text-yellow-700">Loading widget...</div>}
      {loggedIn && (
        <div className="mt-2 flex items-center justify-between text-xs text-green-700">
          <span>Logged in via Telegram widget.</span>
          <button
            onClick={handleClear}
            className="text-xs text-yellow-800 underline hover:text-yellow-900"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
};

export default TelegramLoginWidget;
