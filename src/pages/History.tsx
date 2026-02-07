import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const History = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdrawal'>('all');

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const data = await api.getUserTransactions(100);
      setTransactions(data?.transactions || []);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.type === filter;
  });

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { bg: string; text: string; icon: string }> = {
      confirmed: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
      approved: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳' },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🔄' },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅' },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' },
      rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌' }
    };
    const mapping = statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: '❓' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${mapping.bg} ${mapping.text}`}>
        {mapping.icon} {status}
      </span>
    );
  };

  const getTransactionIcon = (type: string) => {
    if (type === 'deposit') return <ArrowDownLeft className="h-5 w-5 text-green-600" />;
    if (type === 'withdrawal') return <ArrowUpRight className="h-5 w-5 text-red-600" />;
    return <div className="h-5 w-5" />;
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
      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Transaction History</h1>
          <p className="mt-2 text-gray-600">View all your deposits, withdrawals, and transactions</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { value: 'all', label: 'All Transactions' },
            { value: 'deposit', label: '💰 Deposits' },
            { value: 'withdrawal', label: '📤 Withdrawals' }
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === option.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No transactions found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Chain</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTransactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(tx.type)}
                          <span className="capitalize font-medium text-gray-900">{tx.type}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-gray-900">
                          ${(tx.amount || 0).toFixed(2)}
                        </span>
                        {tx.fee && (
                          <div className="text-xs text-gray-600">
                            Fee: ${(tx.fee || 0).toFixed(2)}
                          </div>
                        )}
                        {tx.net_amount && (
                          <div className="text-xs text-gray-600">
                            Net: ${(tx.net_amount || 0).toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm font-medium">
                          {tx.chain?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(tx.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(tx.created_at).toLocaleDateString()}
                        <div className="text-xs text-gray-500">
                          {new Date(tx.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        {filteredTransactions.length > 0 && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-2">Total Transactions</p>
              <p className="text-3xl font-bold text-gray-900">{filteredTransactions.length}</p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-2">Total Deposited</p>
              <p className="text-3xl font-bold text-green-600">
                ${filteredTransactions
                  .filter(tx => tx.type === 'deposit')
                  .reduce((sum, tx) => sum + (tx.amount || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6">
              <p className="text-sm text-gray-600 mb-2">Total Withdrawn</p>
              <p className="text-3xl font-bold text-red-600">
                ${filteredTransactions
                  .filter(tx => tx.type === 'withdrawal')
                  .reduce((sum, tx) => sum + (tx.amount || 0), 0)
                  .toFixed(2)}
              </p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default History;
