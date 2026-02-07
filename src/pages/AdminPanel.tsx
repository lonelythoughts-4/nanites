import React, { useState, useEffect } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const AdminPanel = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('withdrawals');
  const [pendingWithdrawals, setPendingWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Check if user is admin
      const profile = await api.getUserProfile();
      const adminStatus = profile?.is_admin === true || localStorage.getItem('isAdmin') === 'true';
      setIsAdmin(adminStatus);
    } catch (err) {
      console.error('Failed to check admin status:', err);
    } finally {
      setLoading(false);
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

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-12 px-4">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <Lock className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
            <p className="text-gray-600">You do not have permission to access the admin panel.</p>
            <p className="text-sm text-gray-500 mt-4">If you believe this is an error, please contact support.</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-2 text-gray-600">Manage platform operations and withdrawals</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto border-b border-gray-200">
          {[
            { id: 'withdrawals', label: '📤 Pending Withdrawals' },
            { id: 'users', label: '👥 User Management' },
            { id: 'sweeps', label: '💰 Sweep Addresses' },
            { id: 'settings', label: '⚙️ Settings' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Pending Withdrawals Tab */}
        {activeTab === 'withdrawals' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Withdrawals</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-900 text-sm">
                <strong>Note:</strong> Withdrawal approvals and denials are managed through the Telegram bot. 
                This panel will show pending requests once integrated.
              </p>
            </div>

            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No pending withdrawals at this time</p>
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-900 text-sm">
                <strong>Note:</strong> User management (ban, delete, fund) is handled through the Telegram bot admin commands. 
                This is for visibility only.
              </p>
            </div>

            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">User management interface coming soon</p>
            </div>
          </div>
        )}

        {/* Sweep Addresses Tab */}
        {activeTab === 'sweeps' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sweep Addresses</h2>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-900 text-sm">
                <strong>Note:</strong> Address sweeping and private key management is handled through the Telegram bot 
                for security purposes. This is a read-only view.
              </p>
            </div>

            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Sweep management available in Telegram bot</p>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Settings</h2>
            
            <div className="space-y-6">
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Auto-Withdrawals</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Enable or disable automatic withdrawal processing without admin approval
                </p>
                <button className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed">
                  Manage in Telegram Bot
                </button>
              </div>

              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Referral Settings</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Adjust referral bonus percentages
                </p>
                <button className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed">
                  Manage in Telegram Bot
                </button>
              </div>

              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Maintenance Mode</h3>
                <p className="text-gray-600 text-sm mb-4">
                  Put the system in maintenance mode
                </p>
                <button className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg cursor-not-allowed">
                  Manage in Telegram Bot
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-yellow-900 text-sm">
            <strong>⚠️ Security Note:</strong> Most critical admin functions are intentionally handled only through 
            the Telegram bot for enhanced security. This panel is for monitoring and read-only operations.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AdminPanel;
