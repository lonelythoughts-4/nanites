import { getInitData, getTelegramId, getTelegramLoginData } from './telegram';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://mambo-authorization-similar-packages.trycloudflare.com';

const DEV_TELEGRAM_ID = import.meta.env.VITE_DEV_TELEGRAM_ID || '';
const CACHE_TTL_MS = 12000;
const STORAGE_TTL_MS = 60000;
const STORAGE_PREFIX = 'api_cache:';
const inflightRequests = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, { ts: number; data: unknown }>();

type ApiError = {
  error?: string;
  message?: string;
};

type ApiFetchOptions = RequestInit & {
  timeoutMs?: number;
  skipCache?: boolean;
};

async function parseErrorResponse(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as ApiError;
    return data.error || data.message || res.statusText;
  } catch (err) {
    try {
      const text = await res.text();
      return text || res.statusText;
    } catch {
      return res.statusText;
    }
  }
}

function readStorageCache(
  key: string,
  allowExpired = false
): { ts: number; data: unknown } | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; data?: unknown };
    if (!parsed || typeof parsed.ts !== 'number') return null;
    if (!allowExpired && Date.now() - parsed.ts > STORAGE_TTL_MS) return null;
    return { ts: parsed.ts, data: parsed.data };
  } catch {
    return null;
  }
}

function writeStorageCache(key: string, data: unknown): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    // ignore storage errors
  }
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { timeoutMs = 20000, skipCache = false, ...fetchOptions } = options;
  const method = (fetchOptions.method || 'GET').toUpperCase();
  const isCacheable = method === 'GET' && !fetchOptions.body && !skipCache;
  const cacheKey = `${method}:${API_BASE_URL}${path}`;
  const now = Date.now();

  if (isCacheable) {
    const cached = responseCache.get(cacheKey);
    if (cached && now - cached.ts < CACHE_TTL_MS) {
      return cached.data as T;
    }
    const inflight = inflightRequests.get(cacheKey);
    if (inflight) {
      return (await inflight) as T;
    }
    const stored = readStorageCache(cacheKey);
    if (stored) {
      responseCache.set(cacheKey, stored);
      return stored.data as T;
    }
  }

  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const controller =
    fetchOptions.signal || timeoutMs <= 0 ? null : new AbortController();
  if (controller) {
    timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);
  }

  const initData = getInitData();
  const headers = new Headers(options.headers || {});

  if (initData) {
    headers.set('X-Telegram-Init-Data', initData);
    headers.set('Authorization', `tma ${initData}`);
  } else {
    const loginData = getTelegramLoginData();
    if (loginData) {
      headers.set('X-Telegram-Login', loginData);
    }
  }

  if (!headers.has('X-Telegram-Login') && !headers.has('X-Telegram-Init-Data')) {
    if (DEV_TELEGRAM_ID) {
      headers.set('X-Telegram-Id', DEV_TELEGRAM_ID);
    } else {
      const fallbackId = getTelegramId();
      if (fallbackId) {
        headers.set('X-Telegram-Id', fallbackId);
      }
    }
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Skip ngrok browser warning HTML interstitial
  if (API_BASE_URL.includes('ngrok-free.dev')) {
    headers.set('ngrok-skip-browser-warning', '1');
  }

  const doFetch = async (): Promise<T> => {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchOptions,
      signal: fetchOptions.signal || controller?.signal,
      headers
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      const text = await res.text();
      const snippet = text.slice(0, 120).replace(/\s+/g, ' ').trim();
      throw new Error(
        `API returned HTML (likely wrong base URL or ngrok warning). Status ${res.status}. Snippet: ${snippet}`
      );
    }

    if (!res.ok) {
      const message = await parseErrorResponse(res);
      throw new Error(message || 'Request failed');
    }

    const data = (await res.json()) as T;
    if (isCacheable) {
      responseCache.set(cacheKey, { ts: Date.now(), data });
      writeStorageCache(cacheKey, data);
    }
    return data;
  };

  const requestPromise = doFetch();
  if (isCacheable) {
    inflightRequests.set(cacheKey, requestPromise);
  }
  try {
    return await requestPromise;
  } catch (err: any) {
    const message = err?.message || '';
    const isAbort =
      err?.name === 'AbortError' || message.toLowerCase().includes('aborted');
    if (isAbort) {
      const stale = isCacheable ? readStorageCache(cacheKey, true) : null;
      if (stale) {
        responseCache.set(cacheKey, stale);
        return stale.data as T;
      }
      throw new Error('Request timed out. Please retry.');
    }
    throw err;
  } finally {
    if (isCacheable) {
      inflightRequests.delete(cacheKey);
    }
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

export const api = {
  getDashboard: () => apiFetch('/api/dashboard'),
  getReferrals: () => apiFetch('/api/referrals'),
  getTier: () => apiFetch('/api/user/tier'),
  getCycle: () => apiFetch('/api/user/cycle'),
  getTradingStatus: () => apiFetch('/api/trading/status'),
  startTrading: () =>
    apiFetch('/api/trading/start', {
      method: 'POST'
    }),
  stopTrading: () =>
    apiFetch('/api/trading/stop', {
      method: 'POST'
    }),
  getWalletStatus: () => apiFetch('/api/wallet/status'),
  getWalletTransfers: (limit = 20) =>
    apiFetch(`/api/wallet/transfers?limit=${encodeURIComponent(limit)}`),
  getWalletActivity: (limit = 20) =>
    apiFetch(`/api/wallet/activity?limit=${encodeURIComponent(limit)}`),
  walletTransfer: (to: string, amount: number) =>
    apiFetch('/api/wallet/transfer', {
      method: 'POST',
      body: JSON.stringify({ to, amount })
    }),
  setWalletAlias: (alias: string) =>
    apiFetch('/api/wallet/alias', {
      method: 'POST',
      body: JSON.stringify({ alias })
    }),
  walletPush: (chain: string, amount: number) =>
    apiFetch('/api/wallet/push', {
      method: 'POST',
      body: JSON.stringify({ chain, amount })
    }),
  scanWalletDeposits: (chain?: string) =>
    apiFetch('/api/wallet/deposit/scan', {
      method: 'POST',
      body: JSON.stringify(chain ? { chain } : {})
    }),
  getWalletSettings: () => apiFetch('/api/wallet/settings'),
  updateWalletSettings: (settings: {
    wallet_enabled?: boolean;
    wallet_transfer_fee_percent?: number;
    wallet_transfer_limit?: number;
    wallet_alias_change_enabled?: boolean;
  }) =>
    apiFetch('/api/wallet/settings', {
      method: 'POST',
      body: JSON.stringify(settings)
    }),
  continueCycle: () =>
    apiFetch('/api/trading/continue', {
      method: 'POST'
    }),
  getBalance: () => apiFetch('/api/user/balance'),
  requestDeposit: (amount: number, chain: string) =>
    apiFetch('/api/deposit/request', {
      method: 'POST',
      body: JSON.stringify({ amount, chain })
    }),
  getDepositStatus: (depositId: string) =>
    apiFetch(`/api/deposit/status?depositId=${encodeURIComponent(depositId)}`),
  requestWithdrawal: (amount: number, chain: string, recipient_address: string) =>
    apiFetch('/api/withdrawal/request', {
      method: 'POST',
      body: JSON.stringify({ amount, chain, recipient_address })
    }),
  getWithdrawalStatus: (withdrawalId: string) =>
    apiFetch(
      `/api/withdrawal/status?withdrawalId=${encodeURIComponent(withdrawalId)}`
    ),
  debugWebApp: () => apiFetch('/api/debug/webapp')
};
