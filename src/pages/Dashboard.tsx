import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Copy,
  Check
} from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import TierBadge from '../components/TierBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import WebAppDiagnostics from '../components/WebAppDiagnostics';
import { api } from '../lib/api';

const TOTAL_CYCLE_DAYS = 14;

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dashboard, setDashboard] = useState<any>(null);
  const [referrals, setReferrals] = useState<any>(null);
  const [tierInfo, setTierInfo] = useState<any>(null);
  const [cycleInfo, setCycleInfo] = useState<any>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [continuing, setContinuing] = useState(false);
  const [showContinueModal, setShowContinueModal] = useState(false);

  const fetchAll = async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    setRefreshing(!showSpinner);
    try {
      const [dashRes, referralRes, tierRes, cycleRes] = await Promise.allSettled([
        api.getDashboard(),
        api.getReferrals(),
        api.getTier(),
        api.getCycle()
      ]);

      const errorList: string[] = [];
      if (dashRes.status === 'fulfilled') setDashboard(dashRes.value);
      else errorList.push(`Dashboard: ${dashRes.reason?.message || 'failed'}`);
      if (referralRes.status === 'fulfilled') setReferrals(referralRes.value);
      else errorList.push(`Referrals: ${referralRes.reason?.message || 'failed'}`);
      if (tierRes.status === 'fulfilled') setTierInfo(tierRes.value);
      else errorList.push(`Tier: ${tierRes.reason?.message || 'failed'}`);
      if (cycleRes.status === 'fulfilled') setCycleInfo(cycleRes.value);
      else errorList.push(`Cycle: ${cycleRes.reason?.message || 'failed'}`);

      if (errorList.length > 0) {
        setErrors(errorList);
        toast.error('Some dashboard data failed to load.');
      } else {
        setErrors([]);
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load dashboard.');
      setErrors([err?.message || 'Failed to load dashboard.']);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAll(true);
  }, []);

  const handleRefresh = async () => {
    await fetchAll(false);
  };

  const handleContinueCycle = async () => {
    setContinuing(true);
    try {
      await api.continueCycle();
      toast.success('Cycle continued. A new 14-day cycle has started.');
      setShowContinueModal(false);
      await fetchAll(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to continue cycle.');
    } finally {
      setContinuing(false);
    }
  };

  const handleCopyReferral = async () => {
    const link = referrals?.referral_link || '';
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy referral link.');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-4 w-4 text-red-600" />;
      default:
        return <Wallet className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'approved':
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
      case 'pending_approval':
      case 'processing':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
      case 'denied':
      case 'rejected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const userFirstName =
    dashboard?.user?.first_name ||
    dashboard?.user?.username ||
    'Trader';
  const tierKey = dashboard?.user?.tier ? `TIER_${dashboard.user.tier}` : 'TIER_1';
  const totalBalance = Number(dashboard?.balance?.total || 0);
  const frozenProfit = Number(dashboard?.balance?.frozen || 0);
  const availableBalance = Number(dashboard?.balance?.available || 0);
  const referralCount =
    referrals?.total_referrals ?? dashboard?.stats?.referral_count ?? 0;

  const cycleDay = cycleInfo?.cycle_day ?? dashboard?.cycle?.day ?? 0;
  const daysRemaining =
    cycleInfo?.days_remaining ?? Math.max(0, TOTAL_CYCLE_DAYS - cycleDay);
  const cycleProgress =
    cycleInfo?.days_remaining != null
      ? ((TOTAL_CYCLE_DAYS - daysRemaining) / TOTAL_CYCLE_DAYS) * 100
      : dashboard?.cycle?.progress ?? 0;
  const canContinue = !!cycleInfo?.can_continue;
  const cycleProfit = Number(
    cycleInfo?.profit_earned ??
      (cycleInfo?.frozen_profit ?? frozenProfit) ??
      0
  );
  const projectedBalance = Number.isFinite(availableBalance + cycleProfit)
    ? availableBalance + cycleProfit
    : totalBalance;

  const recentTransactions = dashboard?.recent_transactions || [];
  const referralLink = referrals?.referral_link || '-';
  const tierRange = (() => {
    if (tierInfo?.min_deposit == null || tierInfo?.max_deposit == null) return '-';
    const minLabel = `$${Number(tierInfo.min_deposit).toLocaleString()}`;
    const maxValue = Number(tierInfo.max_deposit);
    const maxLabel = Number.isFinite(maxValue)
      ? `$${maxValue.toLocaleString()}`
      : 'No max';
    return `${minLabel} - ${maxLabel}`;
  })();

  if (loading) {
    return (
      <div className="min-h-screen dashboard-shell">
        <Header variant="dark" />
        <main className="dashboard-frame">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-shell">
      <Header variant="dark" />

      <main className="dashboard-frame">
        {errors.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="dashboard-alert">
              <div className="font-semibold mb-1">Some data failed to load</div>
              <ul className="list-disc list-inside">
                {errors.map((err, idx) => (
                  <li key={`${err}-${idx}`}>{err}</li>
                ))}
              </ul>
            </div>
            <WebAppDiagnostics />
          </div>
        )}

        <div className="dashboard-hero">
          <div>
            <div className="dashboard-kicker">Account Overview</div>
            <h1 className="dashboard-title">Welcome back, {userFirstName}</h1>
            <p className="dashboard-subtitle">
              Professional overview of your cycle, balances, and recent activity.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="dashboard-refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <section className="dashboard-kpis">
          <div className="dashboard-card">
            <div className="dashboard-card-title">
              <Wallet className="h-4 w-4" />
              <span>Total Balance</span>
            </div>
            <div className="dashboard-card-value">${totalBalance.toLocaleString()}</div>
            <div className="dashboard-card-sub">All balances combined</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-title">
              <TrendingUp className="h-4 w-4" />
              <span>Frozen Profit</span>
            </div>
            <div className="dashboard-card-value">${frozenProfit.toLocaleString()}</div>
            <div className="dashboard-card-sub">Locked until cycle completes</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-title">
              <Users className="h-4 w-4" />
              <span>Referrals</span>
            </div>
            <div className="dashboard-card-value">{referralCount}</div>
            <div className="dashboard-card-sub">Active referrals</div>
          </div>
          <div className="dashboard-card">
            <div className="dashboard-card-title">
              <Clock className="h-4 w-4" />
              <span>Cycle Days Left</span>
            </div>
            <div className="dashboard-card-value">{daysRemaining}</div>
            <div className="dashboard-card-sub">Day {cycleDay} of {TOTAL_CYCLE_DAYS}</div>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="dashboard-card dashboard-card-large">
            <div className="dashboard-card-header">
              <div>
                <div className="dashboard-label">Trading Cycle Status</div>
                <h2 className="dashboard-section-title">
                  Day {cycleDay} of {TOTAL_CYCLE_DAYS}
                </h2>
                <p className="dashboard-muted">
                  {formatDate(cycleInfo?.cycle_start)} - {formatDate(cycleInfo?.cycle_end)}
                </p>
              </div>
              <TierBadge tier={tierKey} />
            </div>

            {canContinue && (
              <div className="dashboard-callout">
                <div>
                  Cycle complete. Profit ready: ${cycleProfit.toLocaleString()}
                </div>
                <div className="dashboard-callout-actions">
                  <button
                    onClick={() => setShowContinueModal(true)}
                    disabled={continuing}
                    className="dashboard-primary-btn"
                  >
                    {continuing ? 'Continuing...' : 'Continue Cycle'}
                  </button>
                  <Link to="/withdraw" className="dashboard-secondary-btn">
                    Withdraw Profit
                  </Link>
                </div>
              </div>
            )}

            <div className="dashboard-progress">
              <div className="dashboard-progress-meta">
                <span>Progress</span>
                <span>{Math.round(cycleProgress)}%</span>
              </div>
              <div className="dashboard-progress-bar">
                <span style={{ width: `${Math.min(100, Math.max(0, cycleProgress))}%` }} />
              </div>
            </div>

            <div className="dashboard-balance-grid">
              <div>
                <span>Available Balance</span>
                <strong>${availableBalance.toLocaleString()}</strong>
              </div>
              <div>
                <span>Total Balance</span>
                <strong>${totalBalance.toLocaleString()}</strong>
              </div>
            </div>

            <div className="dashboard-actions">
              <Link to="/deposit" className="dashboard-primary-btn">
                Make Deposit
              </Link>
              <Link to="/withdraw" className="dashboard-secondary-btn">
                Request Withdrawal
              </Link>
            </div>
          </div>

          <div className="dashboard-side">
            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h2 className="dashboard-section-title">Tier Information</h2>
              </div>
              <div className="dashboard-tier">
                <TierBadge tier={tierKey} className="text-lg px-4 py-2" />
                <div>
                  <div className="dashboard-row">
                    <span>Deposit Range</span>
                    <strong>{tierRange}</strong>
                  </div>
                  <div className="dashboard-row">
                    <span>14-Day Return</span>
                    <strong>{tierInfo?.return_percent ?? '-'}%</strong>
                  </div>
                  <div className="dashboard-row">
                    <span>Daily Return</span>
                    <strong>{tierInfo?.daily_profit_percent ?? '-'}%</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card-header">
                <h2 className="dashboard-section-title">Referral Program</h2>
              </div>
              <div className="dashboard-referral">
                <label>Your Referral Link</label>
                <div className="dashboard-referral-link">
                  <div>{referralLink}</div>
                  <button onClick={handleCopyReferral} className="dashboard-copy-btn">
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
                <div className="dashboard-referral-stats">
                  <div>
                    <span>Total Clicks</span>
                    <strong>{referrals?.total_clicks ?? 0}</strong>
                  </div>
                  <div>
                    <span>Earnings</span>
                    <strong>${referrals?.total_earnings ?? 0}</strong>
                  </div>
                </div>
                <Link to="/referrals" className="dashboard-primary-btn">
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-card dashboard-table">
          <div className="dashboard-card-header">
            <h2 className="dashboard-section-title">Recent Transactions</h2>
            <Link to="/transactions" className="dashboard-link">
              View All
            </Link>
          </div>
          <div className="dashboard-table-body">
            <div className="dashboard-table-row dashboard-table-head">
              <span>Type</span>
              <span>Amount</span>
              <span>Chain</span>
              <span>Status</span>
              <span>Date</span>
            </div>
            {recentTransactions.length === 0 && (
              <div className="dashboard-table-empty">No transactions yet.</div>
            )}
            {recentTransactions.map((transaction: any, idx: number) => (
              <div key={`${transaction.type}-${transaction.created_at}-${idx}`} className="dashboard-table-row">
                <span className="dashboard-table-type">
                  {getTransactionIcon(transaction.type)}
                  {transaction.type}
                </span>
                <span>${Number(transaction.amount || 0).toLocaleString()}</span>
                <span>{(transaction.chain || '-').toUpperCase()}</span>
                <span className={`dashboard-status ${getStatusColor(transaction.status)}`}>
                  {transaction.status || 'pending'}
                </span>
                <span>{formatDate(transaction.created_at)}</span>
              </div>
            ))}
          </div>
        </section>

        {showContinueModal && canContinue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <button
              aria-label="Close"
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowContinueModal(false)}
            />
            <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">
                Continue Cycle?
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                Your cycle is complete. Continuing will compound your profits
                into your balance and start a new 14‑day cycle.
              </p>

              <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <div className="flex justify-between">
                  <span>Available Balance</span>
                  <span className="font-medium">
                    ${availableBalance.toLocaleString()}
                  </span>
                </div>
                <div className="mt-2 flex justify-between">
                  <span>Profit to Compound</span>
                  <span className="font-medium text-green-700">
                    ${cycleProfit.toLocaleString()}
                  </span>
                </div>
                <div className="mt-3 flex justify-between border-t border-gray-200 pt-3">
                  <span>Projected New Balance</span>
                  <span className="font-semibold text-gray-900">
                    ${projectedBalance.toLocaleString()}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-xs text-gray-500">
                Tier updates are applied automatically based on your new balance.
              </p>

              <div className="mt-5 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowContinueModal(false)}
                  className="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleContinueCycle}
                  disabled={continuing}
                  className="flex-1 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {continuing ? 'Continuing...' : 'Confirm & Continue'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer variant="dark" />
    </div>
  );
};

export default Dashboard;
