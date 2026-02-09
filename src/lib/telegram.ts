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

function getRawParam(source: string, name: string): string {
  if (!source) return '';
  const normalized = source.startsWith('#') ? source.replace(/^#/, '?') : source;
  const match = normalized.match(new RegExp(`[?&]${name}=([^&]*)`));
  return match ? match[1] : '';
}

function decodeParamValue(value: string): string {
  if (!value) return '';
  try {
    // decode percent-encoding only; preserve '+' as '+'
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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

  const rawQueryData = getRawParam(window.location.search, 'tgWebAppData');
  if (rawQueryData) return decodeParamValue(rawQueryData);

  if (window.location.hash) {
    const rawHashData = getRawParam(window.location.hash, 'tgWebAppData');
    if (rawHashData) return decodeParamValue(rawHashData);
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
