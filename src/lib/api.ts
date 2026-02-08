import { getInitData, getTelegramUser } from './telegram';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  'https://thankworthy-endmost-mitch.ngrok-free.dev';

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
  } else if (DEV_TELEGRAM_ID) {
    headers.set('X-Telegram-Id', DEV_TELEGRAM_ID);
  } else {
    const tgUser = getTelegramUser();
    if (tgUser?.id) {
      headers.set('X-Telegram-Id', String(tgUser.id));
    }
  }

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

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
    )
};
