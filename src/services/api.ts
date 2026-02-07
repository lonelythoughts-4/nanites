/**
 * WebApp API Service
 * Client-side service to communicate with bot backend
 * 
 * Handles all API calls from React webapp to bot server
 * Includes error handling, retries, timeout management, and automatic fallbacks
 */

// Hardcode for debugging
const NGROK_URL = 'https://thankworthy-endmost-mitch.ngrok-free.dev/api';
const REQUEST_TIMEOUT = 15000; // 15 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // start with 1 second, exponential backoff

// Use a same-origin proxy when running on Vercel to avoid CORS issues.
// On Vercel the frontend will call `/api/proxy/*` which forwards to the ngrok URL.
const API_BASE_URL = (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app'))
  ? '/api/proxy'
  : NGROK_URL;

/**
 * Quick health check: is the API reachable?
 */
let apiHealthCache: { ok: boolean; timestamp: number } | null = null;
async function isApiHealthy(): Promise<boolean> {
  try {
    // Return cached result if fresh (within 10 seconds)
    if (apiHealthCache && Date.now() - apiHealthCache.timestamp < 10000) {
      return apiHealthCache.ok;
    }

    const url = `${API_BASE_URL}/user/profile`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);
    const ok = response?.ok === true;
    apiHealthCache = { ok, timestamp: Date.now() };
    return ok;
  } catch {
    apiHealthCache = { ok: false, timestamp: Date.now() };
    return false;
  }
}

/**
 * Retry logic with exponential backoff
 * Skip retries if API health check fails — use fallback instead
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = MAX_RETRIES): Promise<T> {
  let lastError: any;
  
  // Quick health check first — if API is down, fail fast instead of retrying
  const isHealthy = await isApiHealthy().catch(() => false);
  if (!isHealthy) {
    console.warn('API health check failed, using fallback data immediately');
    throw new Error('API unreachable - using fallback data');
  }

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      const isRetryable = 
        (err instanceof Error && err.message?.includes('timeout')) ||
        (err instanceof Error && err.message?.includes('Failed to fetch')) ||
        (err instanceof Error && err.message?.includes('ERR_FAILED')) ||
        err?.status === 502 ||
        err?.status === 503 ||
        err?.status === 504;
      
      if (!isRetryable || attempt === maxRetries - 1) {
        throw err;
      }
      
      const delay = RETRY_DELAY * Math.pow(2, attempt);
      console.warn(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms:`, err?.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

/**
 * Generic fetch wrapper with timeout and error handling
 */
async function apiCall(endpoint: string, options: any = {}) {
  return withRetry(async () => {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log('Making API call to:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    // Get userId from localStorage for authentication
    const userId = localStorage.getItem('userId');

    try {
      const method = (options.method || 'GET').toUpperCase();
      const isBodyMethod = !['GET', 'HEAD'].includes(method);
      const headers = {
        ...(isBodyMethod && { 'Content-Type': 'application/json' }),
        ...(userId && { 'X-Telegram-ID': userId }),
        ...(options.headers || {})
      };

      const fetchOptions: any = {
        ...options,
        method,
        signal: controller.signal,
        headers
      };

      // Ensure body is a string when present
      if (isBodyMethod && fetchOptions.body && typeof fetchOptions.body !== 'string') {
        fetchOptions.body = JSON.stringify(fetchOptions.body);
      }

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

    // Read raw text first so we can detect HTML error pages or invalid JSON
    const contentType = response.headers.get('content-type') || '';
    const rawText = await response.text().catch(() => null);

    if (!response.ok) {
      let errorBody: any = null;
      if (contentType.includes('application/json') && rawText) {
        try { errorBody = JSON.parse(rawText); } catch (e) { /* ignore */ }
      }
      const message = (errorBody && (errorBody.error || errorBody.message)) || `HTTP ${response.status}`;
      const err = new Error(message);
      (err as any).status = response.status;
      (err as any).body = errorBody || rawText;
      throw err;
    }

    // Expect JSON response for API endpoints
    if (contentType.includes('application/json')) {
      try {
        return rawText ? JSON.parse(rawText) : {};
      } catch (e) {
        console.error('Failed to parse JSON response for', url, 'raw:', rawText);
        throw new Error('Invalid JSON response from server');
      }
    }

    // If we get here, server returned something other than JSON (likely HTML)
    console.error('Expected JSON but got', contentType, 'for', url, 'raw:', rawText);
    throw new Error('Server returned non-JSON response');

    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error?.name === 'AbortError') {
        throw new Error('Request timeout - server not responding');
      }
      throw error;
    }
  });
}

// ============================================================================
// DEPOSIT API FUNCTIONS
// ============================================================================

/**
 * Request a deposit address from the bot
 * @param {number} amount - Deposit amount in USD
 * @param {string} chain - Blockchain ('eth', 'bsc', 'sol')
 * @returns {Promise<Object>} Deposit info with address and QR
 */
export async function requestDepositAddress(amount, chain) {
  // Get userId from localStorage (set by App.tsx from Telegram)
  const userId = localStorage.getItem('userId');
  const body: any = { amount, chain };
  if (userId) body.userId = userId;

  return apiCall('/deposit/request', {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

/**
 * Poll deposit status until confirmed
 * @param {string} depositId - Deposit transaction ID
 * @param {number} maxAttempts - Max polling attempts (default 60 for 5 min)
 * @returns {Promise<Object>} Current deposit status
 */
export async function checkDepositStatus(depositId, maxAttempts = 60) {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const status = await apiCall(`/deposit/status?depositId=${depositId}`);

        if (status.status === 'confirmed') {
          resolve(status);
        } else if (attempts < maxAttempts) {
          attempts++;
          // Wait 5 seconds before next check
          setTimeout(checkStatus, 5000);
        } else {
          reject(new Error('Deposit confirmation timeout'));
        }
      } catch (error) {
        reject(error);
      }
    };

    checkStatus();
  });
}

/**
 * One-time check of deposit status (no polling)
 */
export async function getDepositStatus(depositId) {
  return apiCall(`/deposit/status?depositId=${depositId}`);
}

// ============================================================================
// WITHDRAWAL API FUNCTIONS
// ============================================================================

/**
 * Submit a withdrawal request
 * @param {number} amount - Withdrawal amount in USD
 * @param {string} chain - Blockchain ('eth', 'bsc', 'sol')
 * @param {string} recipientAddress - Recipient wallet address
 * @returns {Promise<Object>} Withdrawal ID and status
 */
export async function requestWithdrawal(amount, chain, recipientAddress) {
  const userId = localStorage.getItem('userId');
  return apiCall('/withdrawal/request', {
    method: 'POST',
    body: JSON.stringify({
      amount,
      chain,
      recipient_address: recipientAddress,
      ...(userId && { userId })
    })
  });
}

/**
 * Poll withdrawal status (awaiting admin approval and processing)
 * @param {string} withdrawalId - Withdrawal ID
 * @param {number} maxAttempts - Max polling attempts (default 480 for 40 min)
 * @param {number} pollInterval - Poll interval in ms (default 5000)
 * @returns {Promise<Object>} Final withdrawal status
 */
export async function checkWithdrawalStatus(withdrawalId, maxAttempts = 480, pollInterval = 5000) {
  let attempts = 0;

  return new Promise((resolve, reject) => {
    const checkStatus = async () => {
      try {
        const status = await apiCall(`/withdrawal/status?withdrawalId=${withdrawalId}`);

        // Check if completed or failed
        if (['completed', 'failed', 'rejected'].includes(status.status)) {
          resolve(status);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, pollInterval);
        } else {
          reject(new Error('Withdrawal status check timeout'));
        }
      } catch (error) {
        reject(error);
      }
    };

    checkStatus();
  });
}

/**
 * One-time check of withdrawal status (no polling)
 */
export async function getWithdrawalStatus(withdrawalId) {
  return apiCall(`/withdrawal/status?withdrawalId=${withdrawalId}`);
}

// ============================================================================
// USER API FUNCTIONS
// ============================================================================

/**
 * Get user profile information
 * @returns {Promise<Object>} User profile data
 */
export async function getUserProfile() {
  return apiCall('/user/profile');
}

/**
 * Get user balance and tier information
 * @returns {Promise<Object>} Balance and tier data
 */
export async function getUserBalance() {
  return apiCall('/user/balance');
}

/**
 * Get user transaction history
 * @param {number} limit - Max transactions to return (default 20)
 * @param {number} offset - Offset for pagination (default 0)
 * @returns {Promise<Object>} Transaction list
 */
export async function getUserTransactions(limit = 20, offset = 0) {
  return apiCall(`/user/transactions?limit=${limit}&offset=${offset}`);
}

/**
 * Get user referral information
 * @returns {Promise<Object>} Referral data
 */
export async function getUserReferrals() {
  return apiCall('/user/referrals');
}

/**
 * Get user trading cycle status
 * @returns {Promise<Object>} Trading status
 */
export async function getTradingStatus() {
  return apiCall('/trading/status');
}

/**
 * Start a 14-day trading cycle
 * @returns {Promise<Object>} Cycle start response
 */
export async function startTrading() {
  return apiCall('/trading/start', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

/**
 * Stop/pause current trading cycle
 * @returns {Promise<Object>} Cycle stop response
 */
export async function stopTrading() {
  return apiCall('/trading/stop', {
    method: 'POST',
    body: JSON.stringify({})
  });
}

/**
 * Check if current user is admin (has admin access)
 * @returns {Promise<boolean>} True if user is admin
 */
export async function isAdmin() {
  try {
    const profile = await getUserProfile();
    // Check if user has admin_id or admin flag (set by backend)
    return profile?.is_admin === true || localStorage.getItem('isAdmin') === 'true';
  } catch (e) {
    return false;
  }
}

/**
 * Get user trading cycle information
 * @returns {Promise<Object>} Cycle data
 */
export async function getUserCycle() {
  return apiCall('/user/cycle');
}

/**
 * Format error messages for user display
 */
export function formatErrorMessage(error) {
  if (error.message.includes('timeout')) {
    return 'Server not responding. Please check your connection and try again.';
  }
  if (error.message.includes('Insufficient balance')) {
    return 'Your balance is not sufficient for this withdrawal.';
  }
  if (error.message.includes('Invalid')) {
    return error.message;
  }
  if (error.message.includes('HTTP 5')) {
    return 'Server error. Please try again later.';
  }
  return error.message || 'An error occurred. Please try again.';
}

/**
 * Format USD amounts with proper decimals
 */
export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// ============================================================================
// REFERRAL API FUNCTIONS
// ============================================================================

/**
 * Fetch user's referral program data
 * @returns {Promise<Object>} Referral data including link, count, earnings, and list
 */
export async function getReferralData() {
  const userId = localStorage.getItem('userId');
  return apiCall(`/referrals${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, {
    method: 'GET'
  });
}

/**
 * Get user tier information
 * @returns {Promise<Object>} Tier data
 */
export async function getUserTier() {
  return apiCall('/user/tier');
}

/**
 * Get user notifications
 * @param {number} limit - Max notifications to return (default 20)
 * @returns {Promise<Object>} Notifications list
 */
export async function getUserNotifications(limit = 20) {
  return apiCall(`/user/notifications?limit=${limit}`);
}

/**
 * Get user deposits history
 * @param {number} limit - Max deposits to return
 * @returns {Promise<Object>} Deposits list
 */
export async function getUserDeposits(limit = 20) {
  return apiCall(`/user/deposits?limit=${limit}`);
}

/**
 * Get user withdrawals history
 * @param {number} limit - Max withdrawals to return
 * @returns {Promise<Object>} Withdrawals list
 */
export async function getUserWithdrawals(limit = 20) {
  return apiCall(`/user/withdrawals?limit=${limit}`);
}

/**
 * Submit a support/contact message
 * @param {string} category - Support category
 * @param {string} subject - Subject line
 * @param {string} message - Message content
 * @returns {Promise<Object>} Support ticket response
 */
export async function submitSupportMessage(category, subject, message) {
  return apiCall('/support/contact', {
    method: 'POST',
    body: JSON.stringify({
      category,
      subject,
      message
    })
  });
}

/**
 * Get format error messages for user display
 */
export function getExpectedTime(chain) {
  const times = {
    eth: { confirmations: 12, minutes: 3, seconds: 180 },
    bsc: { confirmations: 5, minutes: 2, seconds: 120 },
    sol: { confirmations: 30, seconds: 30 }
  };
  return times[chain] || times.eth;
}

export default {
  requestDepositAddress,
  checkDepositStatus,
  getDepositStatus,
  requestWithdrawal,
  checkWithdrawalStatus,
  getWithdrawalStatus,
  getUserProfile,
  getUserBalance,
  getUserTransactions,
  getUserReferrals,
  getUserTier,
  getUserCycle,
  getUserNotifications,
  getUserDeposits,
  getUserWithdrawals,
  getTradingStatus,
  startTrading,
  stopTrading,
  getReferralData,
  submitSupportMessage,
  isAdmin,
  formatErrorMessage,
  formatUSD,
  getExpectedTime
};
