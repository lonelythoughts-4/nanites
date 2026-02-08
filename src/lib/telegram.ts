export type TelegramWebAppUser = {
  id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
};

export type TelegramWebApp = {
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramWebAppUser;
  };
  ready?: () => void;
  expand?: () => void;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return window.Telegram?.WebApp;
}

export function initializeWebApp(): void {
  const webApp = getTelegramWebApp();
  if (!webApp) return;
  if (typeof webApp.ready === 'function') webApp.ready();
  if (typeof webApp.expand === 'function') webApp.expand();
}

export function getInitData(): string {
  const webApp = getTelegramWebApp();
  if (webApp?.initData) return webApp.initData;

  const searchParams = new URLSearchParams(window.location.search);
  const queryData = searchParams.get('tgWebAppData');
  if (queryData) return queryData;

  if (window.location.hash) {
    const hash = window.location.hash.replace(/^#/, '');
    const hashParams = new URLSearchParams(hash);
    const hashData = hashParams.get('tgWebAppData');
    if (hashData) return hashData;
  }

  return '';
}

export function getTelegramUser(): TelegramWebAppUser | undefined {
  return getTelegramWebApp()?.initDataUnsafe?.user;
}
