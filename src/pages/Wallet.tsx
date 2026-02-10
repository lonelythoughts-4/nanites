import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Copy, RefreshCw, Send, ShieldCheck, Terminal, UserCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { api } from '../lib/api';
import { getTelegramDisplayName } from '../lib/telegram';

type WalletStatus = {
  enabled: boolean;
  transfer_fee_percent: number;
  transfer_limit: number;
  available_balance: number;
  bot_balance?: number;
  vault_balance?: number;
  wallet_alias?: string | null;
  vault_balances?: Record<
    string,
    { balance: number; address: string; last_balance_usd?: number }
  >;
  addresses: Record<string, { address: string; chain: string }>;
  is_admin?: boolean;
};

const MIN_PUSH = 20;
const DEPOSIT_FEE_PERCENT = 0.1;

const Wallet = () => {
  const [status, setStatus] = useState<WalletStatus | null>(null);
  const [transfers, setTransfers] = useState<any[]>([]);
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
  const [aliasStep, setAliasStep] = useState<'intro' | 'alias' | 'done'>('done');
  const [aliasInput, setAliasInput] = useState('');
  const [aliasSaving, setAliasSaving] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [typedText, setTypedText] = useState('');
  const [pushAmount, setPushAmount] = useState('');
  const [pushChain, setPushChain] = useState('eth');
  const [pushing, setPushing] = useState(false);

  const displayName = getTelegramDisplayName() || 'Runner';

  const chains = [
    { id: 'eth', name: 'Ethereum', symbol: 'ETH' },
    { id: 'bsc', name: 'Binance Smart Chain', symbol: 'BSC' },
    { id: 'sol', name: 'Solana', symbol: 'SOL' }
  ];

  const loadAll = async () => {
    const [statusRes, transferRes] = await Promise.allSettled([
      api.getWalletStatus(),
      api.getWalletTransfers(20)
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
    if (loading) return;
    if (status && !status.wallet_alias) {
      setShowOnboarding(true);
      setAliasStep('intro');
    } else if (status?.wallet_alias) {
      setShowOnboarding(false);
      setAliasStep('done');
    }
  }, [loading, status?.wallet_alias]);

  useEffect(() => {
    if (!showOnboarding || aliasStep !== 'alias') return;
    const fullText = `What would you like to be called, ${displayName}?`;
    let index = 0;
    setTypedText('');
    const timer = setInterval(() => {
      index += 1;
      setTypedText(fullText.slice(0, index));
      if (index >= fullText.length) {
        clearInterval(timer);
      }
    }, 28);
    return () => clearInterval(timer);
  }, [showOnboarding, aliasStep, displayName]);

  const feePercent = status?.transfer_fee_percent ?? 5;
  const transferLimit = status?.transfer_limit ?? 1000;
  const botBalance = status?.bot_balance ?? status?.available_balance ?? 0;
  const vaultBalance = status?.vault_balance ?? 0;
  const enabled = status?.enabled !== false;
  const isAdmin = !!status?.is_admin;

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
        wallet_transfer_limit: Number(adminLimit)
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
    setAliasSaving(true);
    try {
      const res: any = await api.setWalletAlias(clean);
      setStatus(prev => (prev ? { ...prev, wallet_alias: res.alias } : prev));
      setShowOnboarding(false);
      setAliasStep('done');
      toast.success('Rogue ID locked in');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to set Rogue ID');
    } finally {
      setAliasSaving(false);
    }
  };

  const aliasDisplay = status?.wallet_alias || '';

  return (
    <div className="min-h-screen app-shell text-slate-100">
      <Header />

      {showOnboarding && (
        <div className="matrix-screen">
          <div className="matrix-rain" />
          <div className="matrix-content">
            {aliasStep === 'intro' && (
              <div className="matrix-card">
                <div className="matrix-badge">ROGUE WALLET MATRIX</div>
                <h2 className="matrix-title">Welcome, {displayName}</h2>
                <p className="matrix-sub">
                  You are entering a private ledger. Set your Rogue ID to unlock internal
                  transfers.
                </p>
                <button
                  className="matrix-button"
                  onClick={() => setAliasStep('alias')}
                >
                  Enter Rogue ID
                </button>
              </div>
            )}
            {aliasStep === 'alias' && (
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
                <button
                  className="matrix-button"
                  onClick={handleAliasSave}
                  disabled={aliasSaving}
                >
                  {aliasSaving ? 'Saving...' : 'Lock Rogue ID'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Rogue Wallet</h1>
            <p className="text-slate-400 text-sm">
              On-chain vault + internal transfers, fully synced with Rogue Engine.
            </p>
            {aliasDisplay && (
              <div className="mt-2 text-xs uppercase tracking-[0.3em] text-emerald-200">
                Rogue ID: {aliasDisplay}
              </div>
            )}
          </div>
          <button
            onClick={loadAll}
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-amber-200 hover:border-amber-300"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>

        {!enabled && (
          <div className="mb-6 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-amber-200 text-sm">
            Wallet feature is currently disabled by admin.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Bot Balance</div>
            <div className="text-2xl font-bold text-slate-100 mt-2">
              ${botBalance.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Vault Balance</div>
            <div className="text-2xl font-bold text-emerald-200 mt-2">
              ${vaultBalance.toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Transfer Fee</div>
            <div className="text-2xl font-bold text-amber-200 mt-2">
              {feePercent}%
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow">
            <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Limit</div>
            <div className="text-2xl font-bold text-slate-100 mt-2">
              ${transferLimit.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">Wallet Vault (On-chain)</h2>
              <Terminal className="h-4 w-4 text-emerald-300" />
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Funds sent here stay in your personal vault until you push them into the Rogue Engine.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['eth', 'bsc', 'sol'].map((chain) => {
                const vaultEntry = status?.vault_balances?.[chain];
                const address = vaultEntry?.address || status?.addresses?.[chain]?.address || '-';
                const chainBalance = vaultEntry?.balance ?? 0;
                return (
                  <div key={chain} className="rounded-xl border border-slate-800/60 bg-black/40 p-3">
                    <div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-slate-400">
                      <span>{chain.toUpperCase()}</span>
                      <button
                        onClick={() => handleCopy(address)}
                        className="inline-flex items-center gap-1 text-amber-200 hover:text-amber-100"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                    <div className="mt-2 text-xs break-all text-slate-200">{address}</div>
                    <div className="mt-3 text-sm text-emerald-200">
                      Vault: ${Number(chainBalance || 0).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                onClick={handleScan}
                disabled={!enabled || scanning}
                className="inline-flex items-center justify-center rounded-xl border border-emerald-400/30 bg-black/40 py-2 px-4 text-xs uppercase tracking-[0.3em] text-emerald-200 hover:border-emerald-300 disabled:opacity-50"
              >
                {scanning ? 'Scanning...' : 'Scan Vault'}
              </button>
              {scanResults.length > 0 && (
                <div className="text-xs text-slate-400 space-y-1">
                  {scanResults.map((r, idx) => (
                    <div key={`${r.chain}-${idx}`}>
                      {r.chain.toUpperCase()}: {r.status}{' '}
                      {r.credited ? `+$${r.credited}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-2xl border border-amber-400/30 bg-black/40 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-amber-200">Push to Rogue Engine</h3>
                <ArrowUpRight className="h-4 w-4 text-amber-200" />
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Move vault funds into your bot balance to trade. 10% engine fee applies.
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={pushAmount}
                  onChange={(e) => setPushAmount(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                  placeholder={`Amount (min $${MIN_PUSH})`}
                />
                <div className="flex gap-2">
                  {chains.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => setPushChain(chain.id)}
                      className={`flex-1 rounded-xl border px-2 py-2 text-xs uppercase tracking-[0.25em] ${
                        pushChain === chain.id
                          ? 'border-amber-400 text-amber-200 bg-black/60'
                          : 'border-slate-700 text-slate-400 bg-black/30'
                      }`}
                    >
                      {chain.symbol}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handlePush}
                  disabled={!enabled || pushing}
                  className="rounded-xl bg-amber-500/90 text-black py-2 text-sm font-semibold uppercase tracking-widest hover:bg-amber-400 disabled:opacity-50"
                >
                  {pushing ? 'Moving...' : 'Push'}
                </button>
              </div>
              <div className="mt-2 text-xs text-slate-400">
                Fee: ${pushFee.toFixed(2)} · Net to bot: ${pushNet.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">Send to Rogue ID</h2>
              <Send className="h-4 w-4 text-amber-200" />
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-[0.25em] text-slate-400 mb-2">
                  Recipient Rogue ID
                </label>
                <input
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                  placeholder="Rogue ID"
                  disabled={!enabled || sending}
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.25em] text-slate-400 mb-2">
                  Amount
                </label>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                  placeholder="0.00"
                  disabled={!enabled || sending}
                />
                <div className="mt-2 text-xs text-slate-400">
                  Fee: ${feeAmount.toFixed(2)} · Recipient receives: ${netAmount.toFixed(2)}
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={!enabled || sending}
                className="w-full rounded-xl bg-amber-500/90 text-black py-2 text-sm font-semibold uppercase tracking-widest hover:bg-amber-400 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
              <div className="rounded-xl border border-slate-800/60 bg-black/40 p-3 text-xs text-slate-400">
                Transfers lock for two cycles before withdrawal. Tier upgrades/downgrades apply instantly.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-100">Transfer History</h2>
          </div>
          <div className="space-y-3 text-sm text-slate-300">
            {transfers.length === 0 && (
              <div className="text-slate-500 text-sm">No transfers yet.</div>
            )}
            {transfers.map((tx) => {
              const isOut = tx.type === 'wallet_transfer_out';
              const counterpart = isOut
                ? tx.meta?.to_alias || tx.meta?.to || 'â€”'
                : tx.meta?.from_alias || tx.meta?.from || 'â€”';
              return (
                <div key={tx.id} className="flex flex-col sm:flex-row sm:justify-between border-b border-slate-800/60 pb-2">
                  <div>
                    <div className="text-slate-100">
                      {isOut ? 'Sent' : 'Received'} ${Number(tx.amount || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {isOut ? `To: ${counterpart}` : `From: ${counterpart}`}
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-1 sm:mt-0">
                    {tx.created_at ? new Date(tx.created_at * 1000).toLocaleString() : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isAdmin && (
          <div className="bg-white rounded-2xl p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-100">Admin Wallet Settings</h2>
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={adminEnabled}
                  onChange={(e) => setAdminEnabled(e.target.checked)}
                />
                Wallet enabled
              </label>
              <div>
                <label className="block text-xs uppercase tracking-[0.25em] text-slate-400 mb-2">
                  Fee %
                </label>
                <input
                  value={adminFee}
                  onChange={(e) => setAdminFee(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.25em] text-slate-400 mb-2">
                  Transfer Limit
                </label>
                <input
                  value={adminLimit}
                  onChange={(e) => setAdminLimit(e.target.value)}
                  className="w-full rounded-xl bg-black/40 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={savingAdmin}
              className="mt-4 rounded-xl bg-amber-500/90 text-black py-2 px-6 text-sm font-semibold uppercase tracking-widest hover:bg-amber-400 disabled:opacity-50"
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

export default Wallet;
