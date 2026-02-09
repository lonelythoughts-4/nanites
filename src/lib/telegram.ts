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
  openTelegramLink?: (url: string) => void;
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

const LOGIN_STORAGE_KEY = 'tg_login_data';
const INIT_STORAGE_KEY = 'tg_init_data';
const INIT_TS_KEY = 'tg_init_data_ts';
const INIT_REDIRECT_KEY = 'tg_init_redirected';
const USERNAME_STORAGE_KEY = 'tg_user_name';
const FIRSTNAME_STORAGE_KEY = 'tg_user_first_name';
const INIT_MAX_AGE_SEC = Number(
  import.meta.env.VITE_WEBAPP_AUTH_MAX_AGE_SEC || 86400
);

function cacheInitData(value: string) {
  if (!value) return;
  try {
    localStorage.setItem(INIT_STORAGE_KEY, value);
    localStorage.setItem(INIT_TS_KEY, String(Date.now()));
  } catch {
    // ignore storage errors
  }
}

function getCachedInitData(): { value: string; ts: number } {
  try {
    const value = localStorage.getItem(INIT_STORAGE_KEY) || '';
    const ts = Number(localStorage.getItem(INIT_TS_KEY) || 0);
    return { value, ts };
  } catch {
    return { value: '', ts: 0 };
  }
}

function clearCachedInitData() {
  try {
    localStorage.removeItem(INIT_STORAGE_KEY);
    localStorage.removeItem(INIT_TS_KEY);
  } catch {
    // ignore storage errors
  }
}

function isExpired(ts: number) {
  if (!ts || !Number.isFinite(ts)) return false;
  return Date.now() - ts > INIT_MAX_AGE_SEC * 1000;
}

function forceOpenTelegram() {
  const botUsername =
    import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'rogueezbot';
  const link = `https://t.me/${botUsername}?startapp=webapp`;
  const webApp = getTelegramWebApp();
  if (webApp?.openTelegramLink) {
    webApp.openTelegramLink(link);
  } else {
    window.location.href = link;
  }
}

export function enforceInitDataFreshness(): void {
  const webApp = getTelegramWebApp();
  if (webApp?.initData) {
    cacheInitData(webApp.initData);
    return;
  }

  const cached = getCachedInitData();
  if (!cached.value) return;
  if (!isExpired(cached.ts)) return;

  clearCachedInitData();
  try {
    const alreadyRedirected = sessionStorage.getItem(INIT_REDIRECT_KEY);
    if (!alreadyRedirected) {
      sessionStorage.setItem(INIT_REDIRECT_KEY, '1');
      forceOpenTelegram();
    }
  } catch {
    forceOpenTelegram();
  }
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
  if (webApp.initData) cacheInitData(webApp.initData);
  const userId = webApp.initDataUnsafe?.user?.id;
  if (userId) {
    try {
      localStorage.setItem('tg_user_id', String(userId));
    } catch {
      // ignore storage errors
    }
  }
  const user = webApp.initDataUnsafe?.user;
  if (user) {
    try {
      if (user.username) localStorage.setItem(USERNAME_STORAGE_KEY, user.username);
      if (user.first_name) localStorage.setItem(FIRSTNAME_STORAGE_KEY, user.first_name);
    } catch {
      // ignore storage errors
    }
  }
}

export function getInitData(): string {
  const webApp = getTelegramWebApp();
  if (webApp?.initData) return webApp.initData;

  const rawQueryData = getRawParam(window.location.search, 'tgWebAppData');
  if (rawQueryData) {
    const decoded = decodeParamValue(rawQueryData);
    cacheInitData(decoded);
    return decoded;
  }

  if (window.location.hash) {
    const rawHashData = getRawParam(window.location.hash, 'tgWebAppData');
    if (rawHashData) {
      const decoded = decodeParamValue(rawHashData);
      cacheInitData(decoded);
      return decoded;
    }
  }

  const cached = getCachedInitData();
  if (cached.value && !isExpired(cached.ts)) return cached.value;
  if (cached.value && isExpired(cached.ts)) {
    clearCachedInitData();
    try {
      const alreadyRedirected = sessionStorage.getItem(INIT_REDIRECT_KEY);
      if (!alreadyRedirected) {
        sessionStorage.setItem(INIT_REDIRECT_KEY, '1');
        forceOpenTelegram();
      }
    } catch {
      forceOpenTelegram();
    }
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

export function setTelegramLoginData(data: unknown): void {
  try {
    localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore storage errors
  }
}

export function getTelegramLoginData(): string {
  try {
    return localStorage.getItem(LOGIN_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function clearTelegramLoginData(): void {
  try {
    localStorage.removeItem(LOGIN_STORAGE_KEY);
  } catch {
    // ignore storage errors
  }
}

function parseUserFromInitData(raw: string): { username?: string; first_name?: string } | null {
  if (!raw) return null;
  try {
    const params = new URLSearchParams(raw);
    const userParam = params.get('user');
    if (!userParam) return null;
    let decoded = userParam;
    try {
      decoded = decodeURIComponent(userParam);
    } catch {
      // ignore decode errors
    }
    const parsed = JSON.parse(decoded) as { username?: string; first_name?: string };
    return parsed || null;
  } catch {
    return null;
  }
}

export function getTelegramDisplayName(): string {
  const user = getTelegramUser();
  if (user?.username) return user.username;
  if (user?.first_name) return user.first_name;

  const initData = getInitData();
  if (initData) {
    const parsedUser = parseUserFromInitData(initData);
    if (parsedUser?.username) return parsedUser.username;
    if (parsedUser?.first_name) return parsedUser.first_name;
  }

  try {
    const rawLogin = getTelegramLoginData();
    if (rawLogin) {
      const parsed = JSON.parse(rawLogin) as { username?: string; first_name?: string };
      if (parsed?.username) return parsed.username;
      if (parsed?.first_name) return parsed.first_name;
    }
  } catch {
    // ignore parse errors
  }

  try {
    const cachedUsername = localStorage.getItem(USERNAME_STORAGE_KEY);
    if (cachedUsername) return cachedUsername;
    const cachedFirstName = localStorage.getItem(FIRSTNAME_STORAGE_KEY);
    if (cachedFirstName) return cachedFirstName;
  } catch {
    // ignore storage errors
  }

  return '';
}
