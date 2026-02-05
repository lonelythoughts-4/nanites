/**
 * WebApp API Service
 * Client-side service to communicate with bot backend
 * 
 * Handles all API calls from React webapp to bot server
 * Includes error handling, retries, and timeout management
 */

let API_BASE_URL = 'http://localhost:3001/api';
// Prefer Vite env var (import.meta.env.VITE_API_URL), fall back to process.env if present
try {
  // @ts-ignore - import.meta may not be recognized by some editors/tools
  const viteUrl = (import.meta as any)?.env?.VITE_API_URL;
  if (viteUrl) API_BASE_URL = viteUrl;
} catch (e) {
  // ignore
}
if (typeof process !== 'undefined' && (process as any)?.env?.REACT_APP_API_URL) {
  API_BASE_URL = (process as any).env.REACT_APP_API_URL;
}
const REQUEST_TIMEOUT = 15000; // 15 seconds

/**
 * Generic fetch wrapper with timeout and error handling
 */
async function apiCall(endpoint: string, options: any = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorBody: any = null;
      try { errorBody = await response.json(); } catch (e) { /* ignore */ }
      const message = (errorBody && (errorBody.error || errorBody.message)) || `HTTP ${response.status}`;
      const err = new Error(message);
      (err as any).status = response.status;
      (err as any).body = errorBody;
      throw err;
    }

    return await response.json();

  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error?.name === 'AbortError') {
      throw new Error('Request timeout - server not responding');
    }
    throw error;
  }
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
 * Get expected confirmation time for a chain
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
  getReferralData,
  formatErrorMessage,
  formatUSD,
  getExpectedTime
};
