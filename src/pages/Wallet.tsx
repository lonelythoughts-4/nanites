
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Copy, RefreshCw, Send, ShieldCheck, Terminal, UserCircle, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { api } from '../lib/api';
import { getTelegramDisplayName, getTelegramUser } from '../lib/telegram';
import {
  deriveImportedWallet,
  getImportedBalances,
  sendImportedTransaction,
  ImportedBalances,
  ImportedWallet
} from '../lib/importWallet';

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

type OnboardingStep = 'intro' | 'alias' | 'terms' | 'choice' | 'import' | 'declined' | 'done';

type ImportMode = 'seed' | 'private';

type WalletMode = 'native' | 'import' | '';

const MIN_PUSH = 20;
const DEPOSIT_FEE_PERCENT = 0.1;
const TERMS_KEY = 'rogue_wallet_terms_accepted';
const MODE_KEY = 'rogue_wallet_mode';

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
  const [walletMode, setWalletMode] = useState<WalletMode>('');
  const [importMode, setImportMode] = useState<ImportMode>('seed');
  const [importValue, setImportValue] = useState('');
  const [importedWallet, setImportedWallet] = useState<ImportedWallet | null>(null);
  const [importBalances, setImportBalances] = useState<ImportedBalances | null>(null);
  const [importError, setImportError] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importRefreshing, setImportRefreshing] = useState(false);
  const [importChain, setImportChain] = useState<'eth' | 'bsc' | 'sol'>('eth');
  const [importAsset, setImportAsset] = useState<'ETH' | 'BNB' | 'SOL' | 'USDT' | 'USDC'>('ETH');
  const [importRecipient, setImportRecipient] = useState('');
  const [importSendAmount, setImportSendAmount] = useState('');
  const [importSending, setImportSending] = useState(false);
  const [importTx, setImportTx] = useState<string | null>(null);

  const telegramUser = getTelegramUser();
  const displayName = getTelegramDisplayName() || 'Runner';

  const chains = [
    { id: 'eth', name: 'Ethereum', symbol: 'ETH' },
    { id: 'bsc', name: 'Binance Smart Chain', symbol: 'BNB' },
    { id: 'sol', name: 'Solana', symbol: 'SOL' }
  ];

  const tokenList = [
    { symbol: 'ETH', chain: 'ETH', hint: 'Main asset' },
    { symbol: 'BNB', chain: 'BSC', hint: 'Main asset' },
    { symbol: 'SOL', chain: 'SOL', hint: 'Main asset' },
    { symbol: 'USDT', chain: 'MULTI', hint: 'Stablecoin' },
    { symbol: 'USDC', chain: 'MULTI', hint: 'Stablecoin' }
  ];

  const importAssetOptions = useMemo(() => {
    if (importChain === 'eth') return ['ETH', 'USDT', 'USDC'] as const;
    if (importChain === 'bsc') return ['BNB', 'USDT', 'USDC'] as const;
    return ['SOL', 'USDT', 'USDC'] as const;
  }, [importChain]);

  useEffect(() => {
    if (!importAssetOptions.includes(importAsset)) {
      setImportAsset(importAssetOptions[0]);
    }
  }, [importAssetOptions, importAsset]);

  const getExplorerTxUrl = (chain: 'eth' | 'bsc' | 'sol', txid: string) => {
    if (!txid) return '';
    if (chain === 'eth') return `https://etherscan.io/tx/${txid}`;
    if (chain === 'bsc') return `https://bscscan.com/tx/${txid}`;
    return `https://solscan.io/tx/${txid}`;
  };

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
      setStatus(statusRes.value);
      setAdminEnabled(statusRes.value.enabled);
      setAdminFee(String(statusRes.value.transfer_fee_percent ?? 5));
      setAdminLimit(String(statusRes.value.transfer_limit ?? 1000));
    }
    if (transferRes.status === 'fulfilled') {
      setTransfers(transferRes.value || []);
    }
    if (activityRes.status === 'fulfilled') {
      setVaultActivity(activityRes.value || []);
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
      const savedMode = (localStorage.getItem(MODE_KEY) || '') as WalletMode;
      setWalletMode(savedMode);
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
    if (!walletMode) {
      setShowOnboarding(true);
      setOnboardingStep('choice');
      return;
    }
    setShowOnboarding(false);
    setOnboardingStep('done');
  }, [loading, effectiveAlias, termsAccepted, walletMode]);

  useEffect(() => {
    if (!importedWallet) return;
    let active = true;
    const refresh = async () => {
      setImportRefreshing(true);
      try {
        const balances = await getImportedBalances(importedWallet);
        if (active) {
          setImportBalances(balances);
          setImportError('');
        }
      } catch (err: any) {
        if (active) setImportError(err?.message || 'Failed to load balances');
      } finally {
        if (active) setImportRefreshing(false);
      }
    };
    refresh();
    return () => {
      active = false;
    };
  }, [importedWallet]);

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
  const importHasEvm = !!importedWallet?.evm;
  const importHasSol = !!importedWallet?.sol;

  useEffect(() => {
    if (!importedWallet) return;
    if (!importHasEvm && importChain !== 'sol') {
      setImportChain('sol');
      return;
    }
    if (!importHasSol && importChain === 'sol') {
      setImportChain('eth');
    }
  }, [importedWallet, importHasEvm, importHasSol, importChain]);

  const numericAmount = Number(amount || 0);
  const feeAmount = useMemo(() => {
    if (!numericAmount || !Number.isFinite(numericAmount)) return 0;
    return Number((numericAmount * (feePercent / 100)).toFixed(2));
  }, [numericAmount, feePercent]);
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
    } else if (!walletMode) {
      setOnboardingStep('choice');
    } else {
      setShowOnboarding(false);
      setOnboardingStep('done');
    }
    try {
      const res: any = await withTimeout(api.setWalletAlias(clean), 8000);
      setStatus(prev => (prev ? { ...prev, wallet_alias: res.alias } : prev));
      setAliasOverride('');
      await loadAll();
      toast.success('Rogue ID locked in');
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
    setOnboardingStep('choice');
  };

  const handleDeclineTerms = () => {
    setOnboardingStep('declined');
  };

  const handleSelectMode = (mode: WalletMode) => {
    if (mode === 'import') {
      setOnboardingStep('import');
      return;
    }
    try {
      localStorage.setItem(MODE_KEY, mode);
    } catch {
      // ignore
    }
    setWalletMode(mode);
    setShowOnboarding(false);
    setOnboardingStep('done');
  };

  const handleImport = async () => {
    if (!importValue.trim()) {
      toast.error('Enter your seed phrase or private key');
      return;
    }
    setImportLoading(true);
    setImportError('');
    try {
      const wallet = await deriveImportedWallet(importMode, importValue);
      setImportedWallet(wallet);
      setImportTx(null);
      try {
        localStorage.setItem(MODE_KEY, 'import');
      } catch {
        // ignore
      }
      setWalletMode('import');
      setImportValue('');
      setShowOnboarding(false);
      setOnboardingStep('done');
      toast.success('Wallet imported');
      getImportedBalances(wallet)
        .then((balances) => {
          setImportBalances(balances);
          setImportError('');
        })
        .catch((err: any) => {
          setImportError(err?.message || 'Balances unavailable');
        });
    } catch (err: any) {
      const message = err?.message || 'Failed to import wallet';
      setImportError(message);
      toast.error(message);
    } finally {
      setImportLoading(false);
    }
  };

  const handleRefreshImported = async () => {
    if (!importedWallet) return;
    setImportRefreshing(true);
    try {
      const balances = await getImportedBalances(importedWallet);
      setImportBalances(balances);
      setImportError('');
      toast.success('Balances updated');
    } catch (err: any) {
      const message = err?.message || 'Failed to refresh balances';
      setImportError(message);
      toast.error(message);
    } finally {
      setImportRefreshing(false);
    }
  };

  const handleSendImported = async () => {
    if (!importedWallet) {
      toast.error('Import your wallet first');
      return;
    }
    if (!importRecipient.trim()) {
      toast.error('Enter a recipient address');
      return;
    }
    const amountValue = Number(importSendAmount || 0);
    if (!amountValue || amountValue <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    setImportSending(true);
    try {
      const res = await sendImportedTransaction({
        wallet: importedWallet,
        chain: importChain,
        asset: importAsset,
        to: importRecipient.trim(),
        amount: amountValue
      });
      setImportTx(res?.txid || null);
      toast.success('Transaction sent');
      await handleRefreshImported();
      setImportRecipient('');
      setImportSendAmount('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send transaction');
    } finally {
      setImportSending(false);
    }
  };

  const aliasDisplay = effectiveAlias;
  return (
    <div className="min-h-screen wallet-shell">
      <Header variant="light" />

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
                    Rogue Wallet is non-custodial for imported wallets. Imported keys are stored
                    locally only and never sent to our servers.
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
            {onboardingStep === 'choice' && (
              <div className="matrix-card">
                <div className="matrix-badge">WALLET MODE</div>
                <h2 className="matrix-title">Choose your setup</h2>
                <div className="matrix-choice-grid">
                  <button className="matrix-choice-card" onClick={() => handleSelectMode('native')}>
                    <Wallet className="h-6 w-6" />
                    <div>
                      <div className="matrix-choice-title">Use Rogue Wallet</div>
                      <div className="matrix-choice-sub">Permanent addresses, vault balance, internal transfers.</div>
                    </div>
                  </button>
                  <button className="matrix-choice-card" onClick={() => handleSelectMode('import')}>
                    <ShieldCheck className="h-6 w-6" />
                    <div>
                      <div className="matrix-choice-title">Import Wallet</div>
                      <div className="matrix-choice-sub">Bring your own seed or private key.</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
            {onboardingStep === 'import' && (
              <div className="matrix-card">
                <div className="matrix-badge">IMPORT WALLET</div>
                <p className="matrix-sub">
                  Keys never leave your device. Choose seed phrase or private key.
                </p>
                <div className="matrix-import-tabs">
                  <button
                    className={importMode === 'seed' ? 'active' : ''}
                    onClick={() => setImportMode('seed')}
                  >
                    Seed Phrase
                  </button>
                  <button
                    className={importMode === 'private' ? 'active' : ''}
                    onClick={() => setImportMode('private')}
                  >
                    Private Key
                  </button>
                </div>
                <textarea
                  className="matrix-textarea"
                  value={importValue}
                  onChange={(e) => setImportValue(e.target.value)}
                  placeholder={importMode === 'seed' ? 'Enter 12 or 24 word seed phrase' : 'Enter private key'}
                />
                {importError && <div className="mt-2 text-xs text-rose-500">{importError}</div>}
                <button className="matrix-button" onClick={handleImport} disabled={importLoading}>
                  {importLoading ? 'Importing...' : 'Import Wallet'}
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
            {walletMode && (
              <div className="mt-2 text-xs uppercase tracking-[0.3em] wallet-muted">
                Wallet Mode: {walletMode === 'import' ? 'Imported' : 'Rogue Wallet'}
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

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="wallet-card wallet-card-tight">
            <div className="wallet-label">Bot Balance</div>
            <div className="wallet-metric mt-2">${botBalance.toLocaleString()}</div>
          </div>
          <div className="wallet-card wallet-card-tight">
            <div className="wallet-label">Vault Balance</div>
            <div className="wallet-metric mt-2">${vaultBalance.toLocaleString()}</div>
          </div>
          <div className="wallet-card wallet-card-tight">
            <div className="wallet-label">Transfer Fee</div>
            <div className="wallet-metric mt-2">{feePercent}%</div>
          </div>
          <div className="wallet-card wallet-card-tight">
            <div className="wallet-label">Locked Funds</div>
            <div className="wallet-metric mt-2">${Number(lockedAmount).toLocaleString()}</div>
            {lockedAmount > 0 && (
              <div className="text-xs wallet-muted mt-2">Unlocks after Cycle {unlockCycle || '-'}</div>
            )}
          </div>
        </div>

        {walletMode === 'import' && (
          <div className="wallet-card mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Imported Wallet</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshImported}
                  disabled={!importedWallet || importRefreshing}
                  className="inline-flex items-center gap-2 wallet-button-secondary text-[10px] disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  {importRefreshing ? 'Refreshing' : 'Refresh'}
                </button>
              </div>
            </div>
            {!importedWallet ? (
              <div className="wallet-panel text-slate-700">
                <div className="text-sm text-slate-900">Imported wallet not loaded</div>
                <div className="text-xs wallet-muted mt-1">
                  Re-import your seed phrase or private key to load balances and send transactions.
                </div>
                <button
                  onClick={() => {
                    setOnboardingStep('import');
                    setShowOnboarding(true);
                  }}
                  className="mt-3 wallet-button text-xs"
                >
                  Re-import Wallet
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="wallet-panel">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] wallet-muted">
                      <span>EVM Address</span>
                      <button
                        onClick={() => handleCopy(importedWallet?.evm?.address || '')}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                    <div className="mt-2 text-xs break-all text-slate-700">
                      {importedWallet?.evm?.address || 'Not available'}
                    </div>
                  </div>
                  <div className="wallet-panel">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] wallet-muted">
                      <span>Solana Address</span>
                      <button
                        onClick={() => handleCopy(importedWallet?.sol?.address || '')}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                    <div className="mt-2 text-xs break-all text-slate-700">
                      {importedWallet?.sol?.address || 'Not available'}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="wallet-panel">
                    <div className="text-xs uppercase tracking-[0.25em] wallet-muted">Ethereum</div>
                    <div className="mt-2 text-sm text-slate-900">
                      {importBalances?.eth.native?.toFixed(4) || '0'} ETH
                    </div>
                    <div className="text-xs wallet-muted mt-1">
                      USDT: {importBalances?.eth.usdt?.toFixed(2) || '0'} | USDC:{' '}
                      {importBalances?.eth.usdc?.toFixed(2) || '0'}
                    </div>
                  </div>
                  <div className="wallet-panel">
                    <div className="text-xs uppercase tracking-[0.25em] wallet-muted">BSC</div>
                    <div className="mt-2 text-sm text-slate-900">
                      {importBalances?.bsc.native?.toFixed(4) || '0'} BNB
                    </div>
                    <div className="text-xs wallet-muted mt-1">
                      USDT: {importBalances?.bsc.usdt?.toFixed(2) || '0'} | USDC:{' '}
                      {importBalances?.bsc.usdc?.toFixed(2) || '0'}
                    </div>
                  </div>
                  <div className="wallet-panel">
                    <div className="text-xs uppercase tracking-[0.25em] wallet-muted">Solana</div>
                    <div className="mt-2 text-sm text-slate-900">
                      {importBalances?.sol.native?.toFixed(4) || '0'} SOL
                    </div>
                    <div className="text-xs wallet-muted mt-1">
                      USDT: {importBalances?.sol.usdt?.toFixed(2) || '0'} | USDC:{' '}
                      {importBalances?.sol.usdc?.toFixed(2) || '0'}
                    </div>
                  </div>
                </div>

                {importError && (
                  <div className="mt-3 text-xs text-rose-500">{importError}</div>
                )}

                <div className="mt-6 wallet-panel">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Send from Imported Wallet</h3>
                    <Send className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex gap-2">
                      {chains.map((chain) => {
                        const isEvmChain = chain.id === 'eth' || chain.id === 'bsc';
                        const disabled = isEvmChain ? !importHasEvm : !importHasSol;
                        return (
                          <button
                            key={`import-${chain.id}`}
                            onClick={() => {
                              if (!disabled) setImportChain(chain.id as 'eth' | 'bsc' | 'sol');
                            }}
                            disabled={disabled}
                            className={`flex-1 rounded-xl border px-2 py-2 text-xs uppercase tracking-[0.25em] ${
                              importChain === chain.id
                                ? 'border-blue-500 bg-blue-600 text-white'
                                : 'border-slate-200 bg-white text-slate-500'
                            } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                          >
                            {chain.symbol}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      {importAssetOptions.map((asset) => (
                        <button
                          key={`import-asset-${asset}`}
                          onClick={() => setImportAsset(asset)}
                          className={`flex-1 rounded-xl border px-2 py-2 text-[10px] uppercase tracking-[0.25em] ${
                            importAsset === asset
                              ? 'border-indigo-500 bg-indigo-600 text-white'
                              : 'border-slate-200 bg-white text-slate-500'
                          }`}
                        >
                          {asset}
                        </button>
                      ))}
                    </div>
                    <input
                      value={importRecipient}
                      onChange={(e) => setImportRecipient(e.target.value)}
                      className="wallet-input w-full text-sm"
                      placeholder="Recipient address"
                    />
                    <input
                      value={importSendAmount}
                      onChange={(e) => setImportSendAmount(e.target.value)}
                      className="wallet-input w-full text-sm"
                      placeholder="Amount"
                    />
                    <button
                      onClick={handleSendImported}
                      disabled={importSending}
                    className="wallet-button text-sm disabled:opacity-50"
                    >
                      {importSending ? 'Sending...' : 'Send'}
                    </button>
                  </div>
                  {importTx && (
                    <div className="mt-3 text-xs wallet-muted">
                      Tx: {importTx.slice(0, 12)}...{' '}
                      <a
                        className="text-blue-600 hover:text-blue-500 underline"
                        href={getExplorerTxUrl(importChain, importTx)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        <div className="wallet-card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Wallet Assets</h2>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tokenList.map((token) => (
              <div key={token.symbol} className="wallet-panel">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-900">{token.symbol}</div>
                  <span className="text-xs wallet-muted">{token.chain}</span>
                </div>
                <div className="mt-2 text-lg text-slate-900">{token.symbol === 'ETH'
                  ? `$${(status?.vault_balances?.eth?.balance ?? 0).toFixed(2)}`
                  : token.symbol === 'BNB'
                    ? `$${(status?.vault_balances?.bsc?.balance ?? 0).toFixed(2)}`
                    : token.symbol === 'SOL'
                      ? `$${(status?.vault_balances?.sol?.balance ?? 0).toFixed(2)}`
                      : '$0.00'}</div>
                <div className="text-xs wallet-muted">{token.hint}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs wallet-muted">
            USDT and USDC balances are detected on scan and included in your vault totals.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="wallet-card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Wallet Vault (On-chain)</h2>
              <Terminal className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xs wallet-muted mb-4">
              Funds sent here stay in your personal vault until you push them into the Rogue Engine.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['eth', 'bsc', 'sol'].map((chain) => {
                const vaultEntry = status?.vault_balances?.[chain];
                const address = vaultEntry?.address || status?.addresses?.[chain]?.address || '-';
                const chainBalance = vaultEntry?.balance ?? 0;
                return (
                  <div key={chain} className="wallet-panel">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] wallet-muted">
                      <span>{chain.toUpperCase()}</span>
                      <button onClick={() => handleCopy(address)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-500">
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                    <div className="mt-2 text-xs break-all text-slate-700">{address}</div>
                    <div className="mt-3 text-sm text-slate-900">Vault: ${Number(chainBalance || 0).toLocaleString()}</div>
                  </div>
                );
              })}
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
                <h3 className="text-sm font-semibold text-slate-900">Vault Activity</h3>
                <ShieldCheck className="h-4 w-4 text-blue-500" />
              </div>
              <div className="mt-3 space-y-2 text-xs wallet-muted">
                {vaultActivity.length === 0 && <div className="wallet-muted">No vault activity yet.</div>}
                {vaultActivity.map((tx) => (
                  <div key={tx.id} className="flex flex-col sm:flex-row sm:justify-between border-b wallet-divider pb-2">
                    <div>
                      <div className="text-slate-900">
                        {tx.type === 'wallet_push' ? 'Pushed to Engine' : 'Vault Deposit'} ${Number(tx.meta?.grossAmount || tx.amount || 0).toFixed(2)}
                      </div>
                      <div className="text-xs wallet-muted">{tx.chain ? tx.chain.toUpperCase() : '-'}</div>
                    </div>
                    <div className="text-xs wallet-muted mt-1 sm:mt-0">
                      {tx.created_at ? new Date(tx.created_at * 1000).toLocaleString() : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="wallet-card">
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
              <div className="mt-2 text-xs wallet-muted">Fee: ${feeAmount.toFixed(2)} - Recipient receives: ${netAmount.toFixed(2)}</div>
              <div className="mt-1 text-xs wallet-muted">Max per transfer: ${transferLimit.toLocaleString()}</div>
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

      <Footer variant="light" />
    </div>
  );
};

export default WalletPage;
