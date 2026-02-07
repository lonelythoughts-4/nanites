import React, { useState, useEffect } from 'react';
import { Play, Pause, TrendingUp, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const Trading = () => {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradingStatus, setTradingStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTradingStatus();
  }, []);

  const loadTradingStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const status = await api.getTradingStatus();
      setTradingStatus(status);
    } catch (err) {
      console.error('Failed to load trading status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trading status');
    } finally {
      setLoading(false);
    }
  };

  const handleStartTrading = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await api.startTrading();
      await loadTradingStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start trading');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopTrading = async () => {
    try {
      setIsSubmitting(true);
      setError(null);
      await api.stopTrading();
      await loadTradingStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop trading');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 px-4 flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Trading Control</h1>
          <p className="mt-2 text-gray-600">Manage your 14-day trading cycles</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Trading Status Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Cycle Status</h2>
            <div className={`px-4 py-2 rounded-full text-sm font-medium ${
              tradingStatus?.is_trading 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {tradingStatus?.is_trading ? '🟢 Active' : '🔴 Paused'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Days Elapsed</p>
              <p className="text-2xl font-bold text-gray-900">{tradingStatus?.days_elapsed || 0}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Days Remaining</p>
              <p className="text-2xl font-bold text-blue-600">{tradingStatus?.days_remaining || 14}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Accumulated Profit</p>
              <p className="text-2xl font-bold text-green-600">${(tradingStatus?.accumulated_profit || 0).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Current Balance</p>
              <p className="text-2xl font-bold text-gray-900">${(tradingStatus?.current_balance || 0).toFixed(2)}</p>
            </div>
          </div>

          {tradingStatus?.cycle_started && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-900">
                <strong>Tier {tradingStatus?.tier}:</strong> Daily profit rate based on your tier
              </p>
            </div>
          )}

          {!tradingStatus?.can_start && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-yellow-900">
                ⚠️ Minimum balance of $20 required to start trading
              </p>
            </div>
          )}

          <div className="flex gap-4">
            {!tradingStatus?.is_trading ? (
              <button
                onClick={handleStartTrading}
                disabled={isSubmitting || !tradingStatus?.can_start}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                <Play className="h-5 w-5" />
                {tradingStatus?.cycle_started ? 'Resume Trading' : 'Start Trading'}
              </button>
            ) : (
              <button
                onClick={handleStopTrading}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                <Pause className="h-5 w-5" />
                Pause Trading
              </button>
            )}
          </div>
        </div>

        {/* Cycle Details */}
        {tradingStatus?.cycle_started && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Cycle Details
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Starting Balance</p>
                <p className="text-lg font-semibold text-gray-900">${(tradingStatus?.starting_balance || 0).toFixed(2)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Profit Progress</p>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-4">
                  <div 
                    className="bg-green-500 h-4 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (tradingStatus?.days_elapsed / 14) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  {tradingStatus?.days_elapsed}/14 days completed
                </p>
              </div>

              {tradingStatus?.is_trading && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-green-900">
                    ✅ Your trading bot is actively generating profits. Check back regularly to track your earnings!
                  </p>
                </div>
              )}

              {!tradingStatus?.is_trading && tradingStatus?.cycle_started && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-900">
                    ⏸️ Trading is currently paused. Your cycle will resume from day {tradingStatus?.days_elapsed}/14 when you restart.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!tradingStatus?.cycle_started && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">How Trading Works</h3>
            <ul className="space-y-2 text-blue-900">
              <li>✅ 14-day trading cycles with daily profit generation</li>
              <li>✅ Profits accumulate based on your tier level</li>
              <li>✅ Pause anytime and resume from where you left off</li>
              <li>✅ Minimum $20 balance required to start</li>
              <li>✅ Complete cycle = unlock withdrawal</li>
            </ul>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Trading;
