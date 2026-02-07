import React, { useState, useEffect } from 'react';
import { TrendingUp, Zap, Target, Award, DollarSign, BarChart3 } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const Stats = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'trading' | 'account' | 'network'>('trading');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [profileData, transactionData] = await Promise.all([
        api.getUserProfile(),
        api.getUserTransactions(1000)
      ]);

      setProfile(profileData);

      // Calculate statistics
      const transactions = transactionData?.transactions || [];
      const deposits = transactions.filter(t => t.type === 'deposit');
      const withdrawals = transactions.filter(t => t.type === 'withdrawal');
      const totalDeposited = deposits.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalWithdrawn = withdrawals.reduce((sum, t) => sum + (t.amount || 0), 0);
      const totalFees = transactions.reduce((sum, t) => sum + (t.fee || 0), 0);
      const confirmedDeposits = deposits.filter(t => t.status === 'confirmed' || t.status === 'approved').length;
      const approvedWithdrawals = withdrawals.filter(t => t.status === 'approved' || t.status === 'completed').length;

      setStats({
        totalDeposited,
        totalWithdrawn,
        totalFees,
        netEarnings: totalDeposited - totalWithdrawn - totalFees,
        totalTransactions: transactions.length,
        confirmedDeposits,
        approvedWithdrawals,
        failedTransactions: transactions.filter(t => t.status === 'failed' || t.status === 'rejected').length,
        deposits,
        withdrawals,
        profitPercentage: totalDeposited > 0 ? ((profileData.balance - totalDeposited) / totalDeposited * 100).toFixed(2) : 0
      });
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, subtext, color }: any) => (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4" style={{ borderColor: color }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-2">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
        </div>
        <Icon className="h-8 w-8" style={{ color }} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-5xl mx-auto py-6 px-4 flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Statistics & Analytics</h1>
          <p className="mt-2 text-gray-600">Monitor your trading performance and account activity</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-3 mb-8 border-b border-gray-200">
          {[
            { id: 'trading', label: '📊 Trading Stats', icon: TrendingUp },
            { id: 'account', label: '💰 Account Stats', icon: DollarSign },
            { id: 'network', label: '👥 Network Stats', icon: Award }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Trading Stats */}
        {activeTab === 'trading' && stats && (
          <div className="space-y-6">
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                icon={TrendingUp}
                label="Current Balance"
                value={`$${(profile?.balance || 0).toFixed(2)}`}
                color="#10B981"
              />
              <StatCard
                icon={DollarSign}
                label="Total Profit"
                value={`$${(stats.netEarnings || 0).toFixed(2)}`}
                subtext={stats.profitPercentage > 0 ? `+${stats.profitPercentage}%` : `${stats.profitPercentage}%`}
                color="#3B82F6"
              />
              <StatCard
                icon={Zap}
                label="Trading Status"
                value={profile?.in_cycle ? 'ACTIVE' : 'PAUSED'}
                color={profile?.in_cycle ? '#F59E0B' : '#6B7280'}
              />
              <StatCard
                icon={Target}
                label="Cycle Day"
                value={profile?.cycle_day || 0}
                subtext="/14 days"
                color="#8B5CF6"
              />
              <StatCard
                icon={Award}
                label="Tier Level"
                value={profile?.tier_level || 'Bronze'}
                subtext={`Min: $${profile?.tier_min_deposit || 0}`}
                color="#EC4899"
              />
              <StatCard
                icon={BarChart3}
                label="Fees Paid"
                value={`$${(stats.totalFees || 0).toFixed(2)}`}
                color="#EF4444"
              />
            </div>

            {/* Detailed Trading Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Trading Performance</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-1">Win Rate</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {stats.totalTransactions > 0 ? (((stats.confirmedDeposits + stats.approvedWithdrawals) / stats.totalTransactions) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-1">ROI</p>
                  <p className="text-2xl font-bold text-green-600">{stats.profitPercentage}%</p>
                </div>
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-1">Cycles Completed</p>
                  <p className="text-2xl font-bold text-yellow-600">{profile?.cycles_completed || 0}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                  <p className="text-sm text-gray-700 mb-1">Avg Trade Size</p>
                  <p className="text-2xl font-bold text-purple-600">
                    ${stats.totalDeposited > 0 && stats.confirmedDeposits > 0 ? (stats.totalDeposited / stats.confirmedDeposits).toFixed(0) : 0}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Stats */}
        {activeTab === 'account' && stats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                icon={DollarSign}
                label="Total Deposited"
                value={`$${stats.totalDeposited.toFixed(2)}`}
                subtext={`${stats.confirmedDeposits} confirmed deposits`}
                color="#10B981"
              />
              <StatCard
                icon={DollarSign}
                label="Total Withdrawn"
                value={`$${stats.totalWithdrawn.toFixed(2)}`}
                subtext={`${stats.approvedWithdrawals} approved withdrawals`}
                color="#EF4444"
              />
            </div>

            {/* Transaction Summary */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Transaction Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">Total Transactions</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalTransactions}</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">Successful</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.confirmedDeposits + stats.approvedWithdrawals}
                  </p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">Failed</p>
                  <p className="text-3xl font-bold text-red-600">{stats.failedTransactions}</p>
                </div>
                <div className="border rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-2">Success Rate</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {stats.totalTransactions > 0 ? (((stats.confirmedDeposits + stats.approvedWithdrawals) / stats.totalTransactions) * 100).toFixed(0) : 0}%
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction Breakdown */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-700">Deposits</span>
                  <span className="font-semibold text-gray-900">{stats.deposits.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-700">Withdrawals</span>
                  <span className="font-semibold text-gray-900">{stats.withdrawals.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-700">Avg Transaction</span>
                  <span className="font-semibold text-gray-900">
                    ${stats.totalTransactions > 0 ? ((stats.totalDeposited + stats.totalWithdrawn) / (2 * stats.totalTransactions)).toFixed(2) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Total Fees</span>
                  <span className="font-semibold text-gray-900">${stats.totalFees.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Network Stats */}
        {activeTab === 'network' && profile && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                icon={Award}
                label="Referral Count"
                value={profile?.referral_count || 0}
                subtext="Active referrals"
                color="#8B5CF6"
              />
              <StatCard
                icon={Award}
                label="Referral Earnings"
                value={`$${(profile?.referral_earnings || 0).toFixed(2)}`}
                subtext={`${profile?.referral_commission || 5}% per referral`}
                color="#F59E0B"
              />
            </div>

            {/* Referral Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Your Referral Code</h3>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-600 mb-2">Share this code with friends</p>
                <div className="flex items-center gap-2">
                  <code className="text-lg font-mono font-bold text-gray-900">
                    {profile?.referral_code || 'No code'}
                  </code>
                </div>
              </div>

              {/* Referral Benefits */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="font-medium text-blue-900 mb-2">💰 Referral Benefits</p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Earn {profile?.referral_commission || 5}% commission on each referral's first deposit</li>
                  <li>• Unlimited referrals - no cap on earnings</li>
                  <li>• Commissions paid instantly to your balance</li>
                  <li>• Track performance on the Referrals page</li>
                </ul>
              </div>
            </div>

            {/* Network Performance */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Network Performance</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-700">Total Referrals</span>
                  <span className="font-semibold text-gray-900">{profile?.total_referrals || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-700">Active Referrals</span>
                  <span className="font-semibold text-gray-900">{profile?.referral_count || 0}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-700">Avg Referral Value</span>
                  <span className="font-semibold text-gray-900">
                    ${profile?.referral_count && profile?.referral_count > 0 ? (profile.referral_earnings / profile.referral_count).toFixed(2) : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-700">Conversion Rate</span>
                  <span className="font-semibold text-gray-900">
                    {profile?.total_referrals && profile?.total_referrals > 0
                      ? ((profile.referral_count / profile.total_referrals) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Stats;
