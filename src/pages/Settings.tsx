import React, { useState, useEffect } from 'react';
import { Settings, Bell, Globe, Lock, LogOut, Copy, Check } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [settings, setSettings] = useState({
    notifications: true,
    email_alerts: false,
    marketing_emails: false,
    language: 'en',
    theme: 'light',
    two_factor_enabled: false
  });
  const [copied, setCopied] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await api.getUserProfile();
      setProfile(data);
      // Load settings from localStorage if available
      const savedSettings = localStorage.getItem('user_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings({
      ...settings,
      [key]: value
    });
    setSaveStatus('saving');
  };

  const saveSettings = async () => {
    try {
      localStorage.setItem('user_settings', JSON.stringify(settings));
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    localStorage.removeItem('telegram_id');
    localStorage.removeItem('user_settings');
    window.location.href = '/';
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
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account preferences and security</p>
        </div>

        <div className="space-y-6">
          {/* Account Information */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Lock className="h-6 w-6" />
              Account Information
            </h2>

            <div className="space-y-4">
              {profile && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Telegram ID</label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={profile.telegram_id || 'N/A'}
                        readOnly
                        className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700"
                      />
                      <button
                        onClick={() => copyToClipboard(profile.telegram_id)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        {copied ? (
                          <Check className="h-5 w-5 text-green-600" />
                        ) : (
                          <Copy className="h-5 w-5 text-gray-600" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Account Created</label>
                    <p className="mt-2 text-gray-700">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {profile.last_login && (
                    <div>
                      <label className="text-sm font-medium text-gray-700">Last Login</label>
                      <p className="mt-2 text-gray-700">
                        {new Date(profile.last_login).toLocaleDateString()} at{' '}
                        {new Date(profile.last_login).toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Notification Settings
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Push Notifications</p>
                  <p className="text-sm text-gray-600">Receive notifications in Telegram</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200">
                <div>
                  <p className="font-medium text-gray-900">Email Alerts</p>
                  <p className="text-sm text-gray-600">Critical account alerts via email</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.email_alerts}
                  onChange={(e) => handleSettingChange('email_alerts', e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer"
                  disabled
                />
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">Marketing Emails</p>
                  <p className="text-sm text-gray-600">Updates about new features and promotions</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.marketing_emails}
                  onChange={(e) => handleSettingChange('marketing_emails', e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Preferences */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Globe className="h-6 w-6" />
              Preferences
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => handleSettingChange('language', e.target.value)}
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  className="mt-2 w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Lock className="h-6 w-6" />
              Security
            </h2>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900">
                ⚠️ Two-factor authentication is managed through Telegram. Your account is secured by your Telegram login.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="font-medium text-gray-900 mb-2">Account Security</p>
                <p className="text-sm text-gray-600 mb-4">
                  Your account is secured via Telegram authentication. Keep your Telegram account secure.
                </p>
                <a
                  href="https://telegram.org/blog/sessions-and-notifications"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Learn more about Telegram security →
                </a>
              </div>
            </div>
          </div>

          {/* Save & Logout */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex gap-3">
              <button
                onClick={saveSettings}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  saveStatus === 'saved'
                    ? 'bg-green-600 text-white'
                    : saveStatus === 'saving'
                    ? 'bg-blue-600 text-white opacity-75'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {saveStatus === 'saved' ? '✓ Saved' : saveStatus === 'saving' ? 'Saving...' : 'Save Settings'}
              </button>

              <button
                onClick={handleLogout}
                className="px-6 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SettingsPage;
