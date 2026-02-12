
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Copy, RefreshCw, Send, ShieldCheck, Terminal, UserCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';
import { getTelegramDisplayName, getTelegramUser } from '../lib/telegram';
type WalletStatus = {
  enabled: boolean;
  transfer_fee_percent: number;
  transfer_limit: number;
  available_balance: number;
  bot_balance?: number;
  vault_balance?: number;
  wallet_alias?: string | null;
  wallet_alias_change_enabled?: boolean;
  telegram_username?: string | null;
  vault_balances?: Record<string, { balance: number; address: string; last_balance_usd?: number }>;
  locked_amount?: number;
  earliest_unlock_cycle?: number | null;
  active_locks?: Array<{ amount: number; unlock_cycle?: number | null }>;
  addresses: Record<string, { address: string; chain: string }>;
  is_admin?: boolean;
};

type OnboardingStep = 'intro' | 'alias' | 'terms' | 'declined' | 'done';
type AssetSymbol = 'ETH' | 'BNB' | 'SOL' | 'USDT' | 'USDC';

type SummaryMode = 'wallet' | 'vault';
const MIN_PUSH = 20;
const DEPOSIT_FEE_PERCENT = 0.1;
const TERMS_KEY = 'rogue_wallet_terms_accepted';

const WalletPage = () => {
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
  const [vaultActivity, setVaultActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [adminEnabled, setAdminEnabled] = useState(true);
  const [adminFee, setAdminFee] = useState('5');
  const [adminLimit, setAdminLimit] = useState('1000');
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [scanResults, setScanResults] = useState<any[]>([]);
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('done');
  const [aliasInput, setAliasInput] = useState('');
  const [aliasSaving, setAliasSaving] = useState(false);
  const [aliasOverride, setAliasOverride] = useState('');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [pushAmount, setPushAmount] = useState('');
  const [pushChain, setPushChain] = useState('eth');
  const [pushing, setPushing] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('wallet');
  const [vaultChain, setVaultChain] = useState<'eth' | 'bsc' | 'sol'>('eth');
  const [vaultPickerOpen, setVaultPickerOpen] = useState(false);
  const [vaultSendOpen, setVaultSendOpen] = useState(false);
  const [vaultSendAmount, setVaultSendAmount] = useState('');
  const [vaultSendRecipient, setVaultSendRecipient] = useState('');
  const [vaultSendAsset, setVaultSendAsset] = useState<AssetSymbol>('ETH');
  const [vaultSending, setVaultSending] = useState(false);

  const telegramUser = getTelegramUser();
  const displayName = getTelegramDisplayName() || 'Runner';

  const chains = [
    { id: 'eth', name: 'Ethereum', symbol: 'ETH' },
    { id: 'bsc', name: 'Binance Smart Chain', symbol: 'BNB' },
    { id: 'sol', name: 'Solana', symbol: 'SOL' }
  ];


  const vaultOptions = [
    { id: 'eth' as const, name: 'Ethereum', symbol: 'ETH', logo: '/assets/eth.svg' },
    { id: 'bsc' as const, name: 'BNB Smart Chain', symbol: 'BNB', logo: '/assets/bnb.svg' },
    { id: 'sol' as const, name: 'Solana', symbol: 'SOL', logo: '/assets/sol.svg' }
  ];


  const vaultAssetOptions = useMemo<AssetSymbol[]>(() => {
    if (vaultChain === 'eth') return ['ETH', 'USDT', 'USDC'];
    if (vaultChain === 'bsc') return ['BNB', 'USDT', 'USDC'];
    return ['SOL', 'USDT', 'USDC'];
  }, [vaultChain]);



  useEffect(() => {
    if (!vaultAssetOptions.includes(vaultSendAsset)) {
      setVaultSendAsset(vaultAssetOptions[0]);
    }
  }, [vaultAssetOptions, vaultSendAsset]);


  const withTimeout = async <T,>(promise: Promise<T>, ms = 10000): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Request timed out')), ms);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const loadAll = async () => {
    const [statusRes, transferRes, activityRes] = await Promise.allSettled([
      api.getWalletStatus(),
      api.getWalletTransfers(20),
      api.getWalletActivity(20)
    ]);

    if (statusRes.status === 'fulfilled') {
      const statusValue = statusRes.value as WalletStatus;
      setStatus(statusValue);
      setAdminEnabled(statusValue.enabled);
      setAdminFee(String(statusValue.transfer_fee_percent ?? 5));
      setAdminLimit(String(statusValue.transfer_limit ?? 1000));
    }
    if (transferRes.status === 'fulfilled') {
      setTransfers((transferRes.value as any[]) || []);
    }
    if (activityRes.status === 'fulfilled') {
      setVaultActivity((activityRes.value as any[]) || []);
    }
  };

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        await loadAll();
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    };
    init();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      setTermsAccepted(localStorage.getItem(TERMS_KEY) === 'true');
    } catch {
      // ignore
    }
  }, []);
  const effectiveAlias = aliasOverride || status?.wallet_alias || '';

  useEffect(() => {
    if (loading) return;
    if (!effectiveAlias) {
      setShowOnboarding(true);
      setOnboardingStep('intro');
      return;
    }
    if (!termsAccepted) {
      setShowOnboarding(true);
      setOnboardingStep('terms');
      return;
    }
    setShowOnboarding(false);
    setOnboardingStep('done');
  }, [loading, effectiveAlias, termsAccepted]);


  useEffect(() => {
    if (!showOnboarding || (onboardingStep !== 'alias' && onboardingStep !== 'terms')) return;
    const prompt =
      onboardingStep === 'alias'
        ? `What would you like to be called, ${displayName}?`
        : 'Read carefully. Accept to unlock Rogue Wallet.';
    let index = 0;
    setTypedText('');
    const timer = setInterval(() => {
      index += 1;
      setTypedText(prompt.slice(0, index));
      if (index >= prompt.length) {
        clearInterval(timer);
      }
    }, 28);
    return () => clearInterval(timer);
  }, [showOnboarding, onboardingStep, displayName]);

  const feePercent = status?.transfer_fee_percent ?? 5;
  const transferLimit = status?.transfer_limit ?? 1000;
  const botBalance = status?.bot_balance ?? status?.available_balance ?? 0;
  const vaultBalance = status?.vault_balance ?? 0;
  const enabled = status?.enabled !== false;
  const isAdmin = !!status?.is_admin;
  const lockedAmount = status?.locked_amount ?? 0;
  const unlockCycle = status?.earliest_unlock_cycle;
  const allowAliasChange = status?.wallet_alias_change_enabled === true;
  const telegramUsername = (status?.telegram_username || telegramUser?.username || '').trim();
  const vaultEntry = status?.vault_balances?.[vaultChain];
  const vaultAddress =
    vaultEntry?.address || status?.addresses?.[vaultChain]?.address || '-';
  const vaultChainBalance = Number(vaultEntry?.balance || 0);
  const vaultMeta = vaultOptions.find((opt) => opt.id === vaultChain);
  const summaryAmount = summaryMode === 'wallet' ? botBalance : vaultChainBalance;
  const summaryLabel =
    summaryMode === 'wallet'
      ? 'Wallet balance'
      : `Vault balance (${vaultMeta?.symbol || vaultChain.toUpperCase()})`;
  const summaryDisplayText = `$${Number(summaryAmount).toLocaleString()}`;

  const handleSummarySelect = (mode: SummaryMode) => {
    if (mode === 'vault') {
      setSummaryMode('vault');
      setVaultPickerOpen(true);
      return;
    }
    setSummaryMode(mode);
  };



  const numericAmount = Number(amount || 0);

  if (loading) {
    return (
      <div className="min-h-screen wallet-shell">
        <Header />
        <main className="wallet-container">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" className="border-gray-300 border-t-blue-500" />
          </div>
        </main>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="min-h-screen wallet-shell">
        <Header />
        <main className="wallet-container">
          <div className="wallet-card text-center py-10">
            <div className="wallet-label">Wallet data unavailable</div>
            <p className="wallet-muted mt-2">We could not load your wallet data yet.</p>
            <button
              type="button"
              className="wallet-button mt-6"
              onClick={() => {
                setLoading(true);
                loadAll()
                  .catch(() => null)
                  .finally(() => setLoading(false));
              }}
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }
  const feeAmount =
    numericAmount && Number.isFinite(numericAmount)
      ? Number((numericAmount * (feePercent / 100)).toFixed(2))
      : 0;
  const netAmount = Math.max(0, Number((numericAmount - feeAmount).toFixed(2)));

  const pushAmountNumber = Number(pushAmount || 0);
  const pushFee = pushAmountNumber ? pushAmountNumber * DEPOSIT_FEE_PERCENT : 0;
  const pushNet = pushAmountNumber ? pushAmountNumber - pushFee : 0;

  const handleCopy = async (value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Copied');
    } catch {
      toast.error('Copy failed');
    }
  };

  const handleSend = async () => {
    if (!recipient.trim()) {
      toast.error('Enter a Rogue ID');
      return;
    }
    if (!numericAmount || numericAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setSending(true);
    try {
      await api.walletTransfer(recipient.trim(), numericAmount);
      toast.success('Transfer sent');
      setRecipient('');
      setAmount('');
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || 'Transfer failed');
    } finally {
      setSending(false);
    }
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res: any = await api.scanWalletDeposits();
      setScanResults(res?.results || []);
      await loadAll();
      toast.success('Scan complete');
    } catch (err: any) {
      toast.error(err?.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const handlePush = async () => {
    if (!pushAmountNumber || pushAmountNumber <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (pushAmountNumber < MIN_PUSH) {
      toast.error(`Minimum push is $${MIN_PUSH}`);
      return;
    }
    setPushing(true);
    try {
      await api.walletPush(pushChain, pushAmountNumber);
      toast.success('Funds moved into Rogue Engine');
      setPushAmount('');
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || 'Push failed');
    } finally {
      setPushing(false);
    }
  };

  const handleVaultSend = async () => {
    const amountNumber = Number(vaultSendAmount || 0);
    const destination = vaultSendRecipient.trim();

    if (!destination) {
      toast.error('Enter a recipient address');
      return;
    }
    if (!amountNumber || amountNumber <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setVaultSending(true);
    try {
      await api.walletVaultSend({
        chain: vaultChain,
        asset: vaultSendAsset,
        amount: amountNumber,
        recipient_address: destination
      });
      toast.success('Vault transfer sent');
      setVaultSendAmount('');
      setVaultSendRecipient('');
      setVaultSendOpen(false);
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || 'Vault transfer failed');
    } finally {
      setVaultSending(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingAdmin(true);
    try {
      await api.updateWalletSettings({
        wallet_enabled: adminEnabled,
        wallet_transfer_fee_percent: Number(adminFee),
        wallet_transfer_limit: Number(adminLimit),
        wallet_alias_change_enabled: allowAliasChange
      });
      toast.success('Wallet settings updated');
      await loadAll();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update settings');
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleAliasSave = async () => {
    const clean = aliasInput.trim();
    if (!clean) {
      toast.error('Enter a Rogue ID');
      return;
    }
    if (telegramUsername && clean.replace(/^@/, '').toLowerCase() === telegramUsername.replace(/^@/, '').toLowerCase()) {
      toast.error('Rogue ID cannot match your Telegram username');
      return;
    }
    const previousAlias = status?.wallet_alias || '';
    const optimisticAlias = clean.replace(/^@/, '').trim();
    setAliasSaving(true);
    setAliasOverride(optimisticAlias);
    setStatus(prev =>
      prev ? { ...prev, wallet_alias: optimisticAlias } : ({ wallet_alias: optimisticAlias } as WalletStatus)
    );
    if (!termsAccepted) {
      setOnboardingStep('terms');
    } else {
      setShowOnboarding(false);
      setOnboardingStep('done');
    }
    try {
      const res: any = await withTimeout(api.setWalletAlias(clean), 8000);
      const savedAlias = res?.alias || optimisticAlias;
      setStatus(prev => (prev ? { ...prev, wallet_alias: savedAlias } : prev));
      if (!res?.pending) {
        setAliasOverride('');
      }
      await loadAll();
      toast.success(res?.pending ? 'Rogue ID saved. Syncing...' : 'Rogue ID locked in');
      if (res?.pending) {
        setTimeout(() => {
          loadAll().catch(() => null);
        }, 1200);
      }
    } catch (err: any) {
      setAliasOverride('');
      setStatus(prev => (prev ? { ...prev, wallet_alias: previousAlias || null } : prev));
      setShowOnboarding(true);
      setOnboardingStep('alias');
      toast.error(err?.message || 'Failed to set Rogue ID');
    } finally {
      setAliasSaving(false);
    }
  };

  const handleAcceptTerms = () => {
    try {
      localStorage.setItem(TERMS_KEY, 'true');
    } catch {
      // ignore
    }
    setTermsAccepted(true);
    setShowOnboarding(false);
    setOnboardingStep('done');
  };

  const handleDeclineTerms = () => {
    setOnboardingStep('declined');
  };

  const aliasDisplay = effectiveAlias;
  return (
    <div className="min-h-screen wallet-shell">
      <Header />

      {vaultPickerOpen && !showOnboarding && (
        <div className="wallet-modal">
          <div className="wallet-modal-card">
            <div className="wallet-label">Select Vault</div>
            <div className="mt-2 text-sm text-slate-700">
              Which vault do you want to access?
            </div>
            <div className="wallet-chain-grid mt-4">
              {vaultOptions.map((option) => (
                <button
                  key={option.id}
                  className="wallet-chain-card"
                  onClick={() => {
                    setVaultChain(option.id);
                    setVaultPickerOpen(false);
                  }}
                >
                  <div className={`wallet-chain-icon ${option.id}`}>
                    <img src={option.logo} alt={`${option.name} logo`} />
                  </div>
                  <div className="wallet-chain-name">{option.name}</div>
                </button>
              ))}
            </div>
            <button
              className="wallet-button-secondary w-full mt-4 text-xs"
              onClick={() => setVaultPickerOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {vaultSendOpen && !showOnboarding && (
        <div className="wallet-modal">
          <div className="wallet-modal-card">
            <div className="wallet-label">Send from Vault</div>
            <div className="mt-2 text-sm text-slate-700">
              {vaultMeta?.name || 'Vault'} • {vaultMeta?.symbol}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button
                className="wallet-button-secondary text-[10px]"
                onClick={() => {
                  setVaultSendOpen(false);
                  setVaultPickerOpen(true);
                }}
              >
                Change vault
              </button>
            </div>

            <div className="mt-4">
              <label className="wallet-label">Recipient Address</label>
              <input
                value={vaultSendRecipient}
                onChange={(e) => setVaultSendRecipient(e.target.value)}
                className="wallet-input w-full text-sm mt-2"
                placeholder="Destination address"
              />
            </div>

            <div className="mt-4">
              <label className="wallet-label">Asset</label>
              <div className="mt-2 flex gap-2">
                {vaultAssetOptions.map((asset) => (
                  <button
                    key={asset}
                    onClick={() => setVaultSendAsset(asset)}
                    className={`flex-1 rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.25em] ${
                      vaultSendAsset === asset
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-slate-500 border border-slate-200'
                    }`}
                  >
                    {asset}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <label className="wallet-label">Amount</label>
              <input
                value={vaultSendAmount}
                onChange={(e) => setVaultSendAmount(e.target.value)}
                className="wallet-input w-full text-sm mt-2"
                placeholder="Enter amount"
              />
              <div className="text-xs wallet-muted mt-2">
                Vault available: ${vaultChainBalance.toLocaleString()}
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <button
                onClick={handleVaultSend}
                disabled={vaultSending}
                className="wallet-button text-sm disabled:opacity-50"
              >
                {vaultSending ? 'Sending...' : 'Send'}
              </button>
              <button
                className="wallet-button-secondary text-[10px]"
                onClick={() => setVaultSendOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showOnboarding && (
        <div className="matrix-screen">
          <div className="matrix-rain" />
          <div className="matrix-content">
            {onboardingStep === 'intro' && (
              <div className="matrix-card">
                <div className="matrix-badge">ROGUE WALLET MATRIX</div>
                <h2 className="matrix-title">Welcome, {displayName}</h2>
                <p className="matrix-sub">
                  You are entering a private ledger. Set your Rogue ID to unlock internal
                  transfers.
                </p>
                <button className="matrix-button" onClick={() => setOnboardingStep('alias')}>
                  Enter Rogue ID
                </button>
              </div>
            )}
            {onboardingStep === 'alias' && (
              <div className="matrix-card">
                <div className="matrix-badge">IDENTITY SEQUENCE</div>
                <p className="matrix-typing">
                  {typedText}
                  <span className="matrix-caret" />
                </p>
                <div className="matrix-input-group">
                  <UserCircle className="h-5 w-5" />
                  <input
                    value={aliasInput}
                    onChange={(e) => setAliasInput(e.target.value)}
                    placeholder="Rogue ID (unique)"
                  />
                </div>
                <p className="matrix-hint">Letters, numbers, underscore. 3-20 chars.</p>
                <button className="matrix-button" onClick={handleAliasSave} disabled={aliasSaving}>
                  {aliasSaving ? 'Saving...' : 'Lock Rogue ID'}
                </button>
              </div>
            )}
            {onboardingStep === 'terms' && (
              <div className="matrix-card">
                <div className="matrix-badge">TERMS AND CONDITIONS</div>
                <p className="matrix-typing">
                  {typedText}
                  <span className="matrix-caret" />
                </p>
                <div className="matrix-terms">
                  <p>
                    By unlocking Rogue Wallet, you accept responsibility for your keys and
                    transactions. Supported assets include ETH, BNB, SOL, USDT, and USDC on
                    supported networks. Always verify addresses before sending funds.
                  </p>
                  <p>
                    Rogue Wallet uses permanent vault addresses and internal transfers.
                    Never share your private keys or recovery phrases with anyone.
                  </p>
                </div>
                <div className="matrix-choice">
                  <button className="matrix-button" onClick={handleAcceptTerms}>
                    Accept
                  </button>
                  <button className="matrix-button ghost" onClick={handleDeclineTerms}>
                    Decline
                  </button>
                </div>
              </div>
            )}
            {onboardingStep === 'declined' && (
              <div className="matrix-card">
                <div className="matrix-badge">ACCESS BLOCKED</div>
                <h2 className="matrix-title">Terms declined</h2>
                <p className="matrix-sub">
                  You must accept the terms to use Rogue Wallet features.
                </p>
                <button className="matrix-button" onClick={() => setOnboardingStep('terms')}>
                  Review Terms
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="wallet-container">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Rogue Wallet</h1>
            <p className="wallet-muted text-sm">
              On-chain vault plus internal transfers, fully synced with Rogue Engine.
            </p>
            {aliasDisplay && (
              <div className="mt-2 wallet-label">
                Rogue ID: {aliasDisplay}
              </div>
            )}
            {aliasDisplay && allowAliasChange && (
              <button
                onClick={() => {
                  setAliasInput(aliasDisplay);
                  setOnboardingStep('alias');
                  setShowOnboarding(true);
                }}
                className="mt-2 text-xs uppercase tracking-[0.3em] text-blue-600 hover:text-blue-500"
              >
                Change Rogue ID
              </button>
            )}
          </div>
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 wallet-button-secondary text-xs"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        {!enabled && (
          <div className="mb-6 wallet-panel text-sm">
            <span className="wallet-pill">Disabled</span>
            <span className="ml-3 wallet-muted">Wallet feature is currently disabled by admin.</span>
          </div>
        )}

        <div className="wallet-card mb-8">
          <div className="wallet-label">Payment Data</div>
          <div className="wallet-amount mt-2">{summaryDisplayText}</div>
          <div className="wallet-muted text-xs mt-1">{summaryLabel}</div>

          <div className="wallet-panel mt-4">
            <div className="wallet-label">Payment Method</div>
            <div className="mt-2 flex gap-2">
              {(['wallet', 'vault'] as SummaryMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => handleSummarySelect(mode)}
                  className={`flex-1 rounded-full px-3 py-2 text-[10px] uppercase tracking-[0.25em] ${
                    summaryMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-500 border border-slate-200'
                  }`}
                >
                  {mode === 'wallet' ? 'Wallet' : 'Vault'}
                </button>
              ))}
            </div>
          </div>

          {summaryMode === 'wallet' && (
            <div className="mt-4 grid grid-cols-1 gap-3">
              <div>
                <label className="wallet-label">Rogue ID</label>
                <input className="wallet-input w-full text-sm mt-2" value={aliasDisplay || '-'} readOnly />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="wallet-label">Available</label>
                  <input
                    className="wallet-input w-full text-sm mt-2"
                    value={`$${Number(botBalance || 0).toLocaleString()}`}
                    readOnly
                  />
                </div>
                <div>
                  <label className="wallet-label">Vault</label>
                  <input
                    className="wallet-input w-full text-sm mt-2"
                    value={`$${Number(vaultBalance || 0).toLocaleString()}`}
                    readOnly
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="wallet-label">Transfer Fee</label>
                  <input className="wallet-input w-full text-sm mt-2" value={`${feePercent}%`} readOnly />
                </div>
                <div>
                  <label className="wallet-label">Locked Funds</label>
                  <input
                    className="wallet-input w-full text-sm mt-2"
                    value={`$${Number(lockedAmount).toLocaleString()}`}
                    readOnly
                  />
                </div>
              </div>
              {lockedAmount > 0 && (
                <div className="text-xs wallet-muted">
                  Locked funds release after Cycle {unlockCycle || '-'}.
                </div>
              )}
            </div>
          )}

          {summaryMode === 'vault' && (
            <div className="mt-4 space-y-3">
              <div className="wallet-panel">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="wallet-label">Selected Vault</div>
                    <div className="text-sm text-slate-900">
                      {vaultMeta?.name || 'Vault'} • {vaultMeta?.symbol}
                    </div>
                    <div className="text-xs wallet-muted">
                      Accepts native + USDT/USDC on this chain.
                    </div>
                  </div>
                  <button
                    className="wallet-button-secondary text-[10px]"
                    onClick={() => setVaultPickerOpen(true)}
                  >
                    Change
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="wallet-label">Vault Balance</label>
                    <input
                      className="wallet-input w-full text-sm mt-2"
                      value={`$${vaultChainBalance.toLocaleString()}`}
                      readOnly
                    />
                  </div>
                  <div>
                    <label className="wallet-label">Vault Address</label>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        className="wallet-input w-full text-sm"
                        value={vaultAddress}
                        readOnly
                      />
                      <button
                        onClick={() => handleCopy(vaultAddress)}
                        className="wallet-button-secondary text-[10px]"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="text-xs wallet-muted">
                Balance reflects deposits on {vaultMeta?.name || vaultChain.toUpperCase()} vault.
              </div>
            </div>
          )}
        </div>

        {summaryMode === 'vault' && (
          <>
            <div className="wallet-card mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Vault Assets</h2>
                <ShieldCheck className="h-4 w-4 text-blue-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    symbol: vaultChain === 'bsc' ? 'BNB' : vaultChain === 'sol' ? 'SOL' : 'ETH',
                    chain: vaultChain.toUpperCase(),
                    hint: 'Main asset',
                    value: `$${vaultChainBalance.toFixed(2)}`
                  },
                  { symbol: 'USDT', chain: vaultChain.toUpperCase(), hint: 'Stablecoin', value: '$0.00' },
                  { symbol: 'USDC', chain: vaultChain.toUpperCase(), hint: 'Stablecoin', value: '$0.00' }
                ].map((token) => (
                  <div key={token.symbol} className="wallet-panel">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-900">{token.symbol}</div>
                      <span className="text-xs wallet-muted">{token.chain}</span>
                    </div>
                    <div className="mt-2 text-lg text-slate-900">{token.value}</div>
                    <div className="text-xs wallet-muted">{token.hint}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-xs wallet-muted">
                USDT and USDC balances are detected on scan and included in your vault totals.
              </div>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button
                  onClick={handleScan}
                  disabled={!enabled || scanning}
                  className="inline-flex items-center justify-center wallet-button-secondary text-xs disabled:opacity-50"
                >
                  {scanning ? 'Scanning...' : 'Scan Vault'}
                </button>
                {scanResults.length > 0 && (
                  <div className="text-xs wallet-muted space-y-1">
                    {scanResults.map((r, idx) => (
                      <div key={`${r.chain}-${idx}`}>
                        {r.chain.toUpperCase()}: {r.status} {r.credited ? `+$${r.credited}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="wallet-card mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Vault Actions</h2>
                <Terminal className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-xs wallet-muted mb-4">
                Funds sent here stay in your personal vault until you push them into the Rogue Engine.
              </p>
              <div className="mt-6 wallet-panel">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Push to Rogue Engine</h3>
                  <ArrowUpRight className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-xs wallet-muted mt-2">
                  Move vault funds into your bot balance to trade. 10% engine fee applies.
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    value={pushAmount}
                    onChange={(e) => setPushAmount(e.target.value)}
                    className="wallet-input w-full text-sm"
                    placeholder={`Amount (min $${MIN_PUSH})`}
                  />
                  <div className="flex gap-2">
                    {chains.map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => setPushChain(chain.id)}
                        className={`flex-1 rounded-xl border px-2 py-2 text-xs uppercase tracking-[0.25em] ${
                          pushChain === chain.id
                            ? 'border-blue-500 bg-blue-600 text-white'
                            : 'border-slate-200 bg-white text-slate-500'
                        }`}
                      >
                        {chain.symbol}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handlePush}
                    disabled={!enabled || pushing}
                    className="wallet-button text-sm disabled:opacity-50"
                  >
                    {pushing ? 'Moving...' : 'Push'}
                  </button>
                </div>
                <div className="mt-2 text-xs wallet-muted">Fee: ${pushFee.toFixed(2)} - Net to bot: ${pushNet.toFixed(2)}</div>
              </div>

              <div className="mt-6 wallet-panel">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Send from Vault</h3>
                  <Send className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-xs wallet-muted mt-2">
                  Send funds to an external address on this chain.
                </p>
                <button
                  onClick={() => setVaultSendOpen(true)}
                  disabled={!enabled}
                  className="mt-4 wallet-button text-sm disabled:opacity-50"
                >
                  Send Out
                </button>
              </div>

              <div className="mt-6 wallet-panel">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-900">Vault Activity</h3>
                  <ShieldCheck className="h-4 w-4 text-blue-500" />
                </div>
                <div className="mt-3 space-y-2 text-xs wallet-muted">
                  {vaultActivity.length === 0 && <div className="wallet-muted">No vault activity yet.</div>}
                  {vaultActivity.map((tx) => (
                    <div key={tx.id} className="flex flex-col sm:flex-row sm:justify-between border-b wallet-divider pb-2">
                      <div>
                        <div className="text-slate-900">
                          {tx.type === 'wallet_push'
                            ? 'Pushed to Engine'
                            : tx.type === 'wallet_vault_send'
                              ? 'Sent from Vault'
                              : 'Vault Deposit'} ${Number(tx.meta?.grossAmount || tx.amount || 0).toFixed(2)}
                        </div>
                        <div className="text-xs wallet-muted">{tx.chain ? tx.chain.toUpperCase() : '-'}</div>
                        {tx.type === 'wallet_vault_send' && tx.meta?.to && (
                          <div className="text-xs wallet-muted">
                            To: {String(tx.meta.to).slice(0, 12)}...
                          </div>
                        )}
                      </div>
                      <div className="text-xs wallet-muted mt-1 sm:mt-0">
                        {tx.created_at ? new Date(tx.created_at * 1000).toLocaleString() : ''}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {summaryMode === 'wallet' && (
          <>
            <div className="wallet-card mb-8" id="wallet-send">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Send to Rogue ID</h2>
                <Send className="h-4 w-4 text-blue-500" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs uppercase tracking-[0.25em] wallet-muted mb-2">
                    Recipient Rogue ID
                  </label>
                  <input
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="wallet-input w-full text-sm"
                    placeholder="Rogue ID"
                    disabled={!enabled || sending}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-[0.25em] wallet-muted mb-2">
                    Amount
                  </label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="wallet-input w-full text-sm"
                    placeholder="0.00"
                    disabled={!enabled || sending}
                  />
                  <div className="mt-2 text-xs wallet-muted">
                    Fee: ${feeAmount.toFixed(2)} - Recipient receives: ${netAmount.toFixed(2)}
                  </div>
                  <div className="mt-1 text-xs wallet-muted">
                    Max per transfer: ${transferLimit.toLocaleString()}
                  </div>
                </div>
                <button
                  onClick={handleSend}
                  disabled={!enabled || sending}
                  className="wallet-button w-full text-sm disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send'}
                </button>
                <div className="wallet-panel text-xs wallet-muted">
                  Transfers lock for two cycles before withdrawal. Tier changes apply instantly.
                </div>
              </div>
            </div>

            <div className="wallet-card mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Transfer History</h2>
              </div>
              <div className="space-y-3 text-sm wallet-muted">
                {transfers.length === 0 && <div className="wallet-muted text-sm">No transfers yet.</div>}
                {transfers.map((tx) => {
                  const isOut = tx.type === 'wallet_transfer_out';
                  const counterpart = isOut ? tx.meta?.to_alias || tx.meta?.to || '-' : tx.meta?.from_alias || tx.meta?.from || '-';
                  return (
                    <div key={tx.id} className="flex flex-col sm:flex-row sm:justify-between border-b wallet-divider pb-2">
                      <div>
                        <div className="text-slate-900">{isOut ? 'Sent' : 'Received'} ${Number(tx.amount || 0).toFixed(2)}</div>
                        <div className="text-xs wallet-muted">{isOut ? `To: ${counterpart}` : `From: ${counterpart}`}</div>
                      </div>
                      <div className="text-xs wallet-muted mt-1 sm:mt-0">
                        {tx.created_at ? new Date(tx.created_at * 1000).toLocaleString() : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {isAdmin && (
          <div className="wallet-card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Admin Wallet Settings</h2>
              <ShieldCheck className="h-4 w-4 text-blue-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-sm wallet-muted">
                <input type="checkbox" checked={adminEnabled} onChange={(e) => setAdminEnabled(e.target.checked)} />
                Wallet enabled
              </label>
              <div>
                <label className="block text-xs uppercase tracking-[0.25em] wallet-muted mb-2">Fee %</label>
                <input value={adminFee} onChange={(e) => setAdminFee(e.target.value)} className="wallet-input w-full text-sm" />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.25em] wallet-muted mb-2">Transfer Limit</label>
                <input value={adminLimit} onChange={(e) => setAdminLimit(e.target.value)} className="wallet-input w-full text-sm" />
              </div>
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm wallet-muted">
              <input
                type="checkbox"
                checked={allowAliasChange}
                onChange={(e) => setStatus(prev => (prev ? { ...prev, wallet_alias_change_enabled: e.target.checked } : prev))}
              />
              Allow Rogue ID changes
            </label>
            <button
              onClick={handleSaveSettings}
              disabled={savingAdmin}
              className="mt-4 wallet-button text-sm disabled:opacity-50"
            >
              {savingAdmin ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default WalletPage;
