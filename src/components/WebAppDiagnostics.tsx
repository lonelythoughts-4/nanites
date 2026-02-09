import React, { useState } from 'react';
import { api, API_BASE_URL } from '../lib/api';
import { getInitData, getTelegramId } from '../lib/telegram';
import { Copy } from 'lucide-react';

const WebAppDiagnostics = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.debugWebApp();
      setResult({
        apiBase: API_BASE_URL,
        initDataPresent: !!getInitData(),
        initDataLength: getInitData()?.length || 0,
        telegramId: getTelegramId() || null,
        server: data
      });
    } catch (err: any) {
      setError(err?.message || 'Failed to run diagnostics.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    } catch {
      // ignore
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">WebApp Diagnostics</h3>
          <p className="text-xs text-gray-500">
            Use this to verify Telegram initData and backend auth.
          </p>
        </div>
        <button
          onClick={runDiagnostics}
          disabled={loading}
          className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Checking...' : 'Run'}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-xs text-red-600">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Result</span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center text-xs text-blue-600 hover:text-blue-700"
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </button>
          </div>
          <pre className="text-xs bg-gray-50 border border-gray-200 rounded p-2 overflow-auto max-h-64">
{JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default WebAppDiagnostics;
