import React, { useState, useEffect } from 'react';
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
    import Header from '../components/Header';
    import Footer from '../components/Footer';
    import TierBadge from '../components/TierBadge';
    import LoadingSpinner from '../components/LoadingSpinner';
    import { getUserProfile, getUserBalance, getUserTransactions, getUserReferrals } from '../services/api';

    const Dashboard = () => {
      const [loading, setLoading] = useState(true);
      const [refreshing, setRefreshing] = useState(false);
      const [copied, setCopied] = useState(false);
      const [userData, setUserData] = useState(null);
      const [error, setError] = useState(null);

      useEffect(() => {
        loadUserData();
      }, []);

      const loadUserData = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const [profile, balance, transactions, referrals] = await Promise.all([
            getUserProfile(),
            getUserBalance(),
            getUserTransactions(10),
            getUserReferrals()
          ]);
          
          setUserData({
            user: profile.user,
            tier_info: balance.tier_info,
            cycle_info: balance.cycle_info,
            balance_summary: balance.balance_summary,
            referral_summary: referrals,
            recent_transactions: transactions.transactions || []
          });
        } catch (err) {
          console.error('Failed to load user data:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };

      const handleRefresh = async () => {
        setRefreshing(true);
        await loadUserData();
        setRefreshing(false);
      };

      const handleCopyReferral = async () => {
        if (!userData?.referral_summary?.referral_link) return;
        try {
          await navigator.clipboard.writeText(userData.referral_summary.referral_link);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      };

      const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
      };

      const getTransactionIcon = (type: string) => {
        switch (type) {
          case 'deposit':
            return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
          case 'withdrawal':
            return <ArrowUpRight className="h-4 w-4 text-red-600" />;
          case 'profit':
            return <TrendingUp className="h-4 w-4 text-blue-600" />;
          default:
            return <Wallet className="h-4 w-4 text-gray-600" />;
        }
      };

      const getStatusColor = (status: string) => {
        switch (status) {
          case 'confirmed':
            return 'text-green-600 bg-green-100';
          case 'pending':
            return 'text-yellow-600 bg-yellow-100';
          case 'failed':
            return 'text-red-600 bg-red-100';
          default:
            return 'text-gray-600 bg-gray-100';
        }
      };

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

      if (error) {
        return (
          <div className="min-h-screen bg-gray-50">
            <Header />
            <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
              <div className="text-center py-12">
                <div className="text-red-600 mb-4">
                  <p className="text-lg font-medium">Failed to load dashboard</p>
                  <p className="text-sm">{error}</p>
                </div>
                <button
                  onClick={loadUserData}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  Try Again
                </button>
              </div>
            </main>
          </div>
        );
      }

      if (!userData) {
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
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    Welcome back, {userData.user.first_name}
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
                    <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Account Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Wallet className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Current Balance</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${userData.balance_summary.total_balance.toLocaleString()}
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
                    <p className="text-sm font-medium text-gray-500">Total Profits</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${userData.balance_summary.total_profits.toLocaleString()}
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
                      {userData.referral_summary.total_referrals}
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
                      {userData.cycle_info.days_remaining}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Active Cycle Status */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Active Cycle Status</h2>
                  </div>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">
                          Cycle #{userData.cycle_info.cycle_number}
                        </h3>
                        <p className="text-gray-600">
                          {formatDate(userData.cycle_info.start_date)} - {formatDate(userData.cycle_info.end_date)}
                        </p>
                      </div>
                      <TierBadge tier={userData.user.tier} />
                    </div>

                    <div className="mb-6">
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Progress</span>
                        <span>{userData.cycle_info.days_elapsed} / 14 days</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${(userData.cycle_info.days_elapsed / 14) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600 font-medium">Expected Profit</p>
                        <p className="text-xl font-bold text-blue-900">
                          ${userData.cycle_info.expected_profit.toLocaleString()}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 font-medium">Balance at End</p>
                        <p className="text-xl font-bold text-green-900">
                          ${userData.cycle_info.expected_balance_at_end.toLocaleString()}
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

              {/* Tier & Referral Info */}
              <div className="space-y-6">
                {/* Tier Info */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Tier Information</h2>
                  </div>
                  <div className="p-6">
                    <div className="text-center mb-4">
                      <TierBadge tier={userData.user.tier} className="text-lg px-4 py-2" />
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Deposit Range:</span>
                        <span className="font-medium">
                          ${userData.tier_info.deposit_range.min.toLocaleString()} - ${userData.tier_info.deposit_range.max.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">14-Day Return:</span>
                        <span className="font-medium text-green-600">
                          {userData.tier_info.return_percent}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Multiplier:</span>
                        <span className="font-medium">
                          {userData.tier_info.multiplier}x
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Referral Code */}
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
                          {userData.referral_summary.referral_link}
                        </div>
                        <button
                          onClick={handleCopyReferral}
                          className="p-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          title="Copy referral link"
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Clicks</p>
                        <p className="font-semibold">{userData.referral_summary.total_clicks}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Earnings</p>
                        <p className="font-semibold text-green-600">
                          ${userData.referral_summary.total_earnings}
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

            {/* Recent Transactions */}
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
                          Asset
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
                      {userData.recent_transactions.map((transaction) => (
                        <tr key={transaction.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getTransactionIcon(transaction.type)}
                              <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                                {transaction.type}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ${transaction.amount.toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {transaction.asset || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(transaction.status)}`}>
                              {transaction.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(transaction.date)}
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