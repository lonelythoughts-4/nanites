import { getInitData, getTelegramId, getTelegramLoginData } from './telegram';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://mambo-authorization-similar-packages.trycloudflare.com';

const DEV_TELEGRAM_ID = import.meta.env.VITE_DEV_TELEGRAM_ID || '';

type ApiError = {
  error?: string;
  message?: string;
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

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
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

  return (await res.json()) as T;
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
