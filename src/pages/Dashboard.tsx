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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {errors.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
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

        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome back, {userFirstName}
              </h1>
              <p className="mt-2 text-gray-600">
                Track your trading performance and manage your account
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Wallet className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Balance</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${totalBalance.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Frozen Profit</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${frozenProfit.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Referrals</p>
                <p className="text-2xl font-bold text-gray-900">
                  {referralCount}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Cycle Days Left</p>
                <p className="text-2xl font-bold text-gray-900">
                  {daysRemaining}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Trading Cycle Status
                </h2>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Day {cycleDay} of {TOTAL_CYCLE_DAYS}
                    </h3>
                    <p className="text-gray-600">
                      {formatDate(cycleInfo?.cycle_start)} -{' '}
                      {formatDate(cycleInfo?.cycle_end)}
                    </p>
                  </div>
                  <TierBadge tier={tierKey} />
                </div>

                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Progress</span>
                    <span>{Math.round(cycleProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(0, cycleProgress))}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-blue-600 font-medium">Available Balance</p>
                    <p className="text-xl font-bold text-blue-900">
                      ${availableBalance.toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <p className="text-sm text-green-600 font-medium">Total Balance</p>
                    <p className="text-xl font-bold text-green-900">
                      ${totalBalance.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex space-x-4">
                  <Link
                    to="/deposit"
                    className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Make Deposit
                  </Link>
                  <Link
                    to="/withdraw"
                    className="flex-1 bg-gray-100 text-gray-700 text-center py-2 px-4 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Request Withdrawal
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Tier Information</h2>
              </div>
              <div className="p-6">
                <div className="text-center mb-4">
                  <TierBadge tier={tierKey} className="text-lg px-4 py-2" />
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deposit Range:</span>
                    <span className="font-medium">{tierRange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">14-Day Return:</span>
                    <span className="font-medium text-green-600">
                      {tierInfo?.return_percent ?? '-'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Daily Return:</span>
                    <span className="font-medium">
                      {tierInfo?.daily_profit_percent ?? '-'}%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Referral Program</h2>
              </div>
              <div className="p-6">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Referral Link
                  </label>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 p-2 bg-gray-50 rounded-md border text-xs font-mono break-all">
                      {referralLink}
                    </div>
                    <button
                      onClick={handleCopyReferral}
                      className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      title="Copy referral link"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Clicks</p>
                    <p className="font-semibold">{referrals?.total_clicks ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Earnings</p>
                    <p className="font-semibold text-green-600">
                      ${referrals?.total_earnings ?? 0}
                    </p>
                  </div>
                </div>
                <Link
                  to="/referrals"
                  className="mt-4 block w-full bg-purple-600 text-white text-center py-2 px-4 rounded-md hover:bg-purple-700 transition-colors"
                >
                  View Details
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
                <Link
                  to="/transactions"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  View All
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chain
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentTransactions.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-6 text-center text-sm text-gray-500"
                      >
                        No transactions yet.
                      </td>
                    </tr>
                  )}
                  {recentTransactions.map((transaction: any, idx: number) => (
                    <tr key={`${transaction.type}-${transaction.created_at}-${idx}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getTransactionIcon(transaction.type)}
                          <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                            {transaction.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${Number(transaction.amount || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {(transaction.chain || '-').toUpperCase()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            transaction.status
                          )}`}
                        >
                          {transaction.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
