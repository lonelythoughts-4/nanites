import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Archive } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const Notifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await api.getUserNotifications(100);
      setNotifications(data?.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notif.read;
    if (filter === 'read') return notif.read;
    return true;
  });

  const markAsRead = async (id: string) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const deleteNotification = async (id: string) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const archiveNotification = async (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, archived: true } : n
    ));
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      deposit: '💰',
      withdrawal: '📤',
      profit: '📈',
      tier: '🏆',
      alert: '⚠️',
      system: '🔔',
      referral: '👥',
      trade: '📊'
    };
    return iconMap[type] || '📬';
  };

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
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-2 text-gray-600">Stay updated with your account activity</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-3 mb-6 flex-wrap">
          {[
            { value: 'all', label: 'All' },
            { value: 'unread', label: `Unread (${notifications.filter(n => !n.read).length})` },
            { value: 'read', label: 'Read' }
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

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No notifications</p>
              <p className="text-sm text-gray-500">
                {filter === 'unread' 
                  ? 'You\'re all caught up!' 
                  : 'You don\'t have any notifications yet'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif, idx) => (
              <div
                key={notif.id || idx}
                className={`rounded-lg shadow-md p-4 transition-all ${
                  notif.read
                    ? 'bg-white opacity-75'
                    : 'bg-blue-50 border-l-4 border-blue-600'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="text-2xl mt-1 flex-shrink-0">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 text-base">
                        {notif.title}
                      </h3>
                      <p className="text-gray-700 mt-1 break-words">
                        {notif.message}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(notif.created_at).toLocaleDateString()} at{' '}
                        {new Date(notif.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!notif.read && (
                      <button
                        onClick={() => markAsRead(notif.id)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => archiveNotification(notif.id)}
                      className="p-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                      title="Archive"
                    >
                      <Archive className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => deleteNotification(notif.id)}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
