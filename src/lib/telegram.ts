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
  const userId = webApp.initDataUnsafe?.user?.id;
  if (userId) {
    try {
      localStorage.setItem('tg_user_id', String(userId));
    } catch {
      // ignore storage errors
    }
  }
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

export function getTelegramId(): string {
  const webApp = getTelegramWebApp();
  const userId = webApp?.initDataUnsafe?.user?.id;
  if (userId) return String(userId);

  const searchParams = new URLSearchParams(window.location.search);
  const queryId =
    searchParams.get('telegramId') ||
    searchParams.get('tgid') ||
    searchParams.get('userId');
  if (queryId) return queryId;

  try {
    const stored = localStorage.getItem('tg_user_id');
    if (stored) return stored;
  } catch {
    // ignore storage errors
  }

  return '';
}
