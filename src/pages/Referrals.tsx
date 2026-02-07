import React, { useState, useEffect } from 'react';
import { Copy, Check, Share2, Users, DollarSign, Eye, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import * as api from '../services/api';

const Referrals = () => {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [referralData, setReferralData] = useState<any>(null);

  useEffect(() => {
    const loadReferralData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getReferralData();
        setReferralData(data);
      } catch (err) {
        console.error('Failed to load referral data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load referral data');
        // Fallback to mock data if API fails
        setReferralData({
          referral_code: 'r_unknown',
          referral_link: 't.me/rogueezbot?start=ref_unknown',
          total_clicks: 0,
          total_referrals: 0,
          total_earnings: 0,
          referrals_list: []
        });
      } finally {
        setLoading(false);
      }
    };
    loadReferralData();
  }, []);

  const handleCopy = async () => {
    if (!referralData?.referral_link) return;
    await navigator.clipboard.writeText(referralData.referral_link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (!referralData?.referral_link) return;
    if (navigator.share) {
      await navigator.share({
        title: 'Join RougeRunner GENESYS',
        text: 'Start trading with our bot!',
        url: referralData.referral_link,
      });
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !referralData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto py-6 px-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-red-700">{error || 'Failed to load referral data'}</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Referral Program</h1>
          <p className="mt-2 text-gray-600">Earn 6% of your referrals' profits</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-blue-600 mr-4" />
              <div>
                <p className="text-sm text-gray-500">Total Clicks</p>
                <p className="text-2xl font-bold">{referralData.total_clicks}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600 mr-4" />
              <div>
                <p className="text-sm text-gray-500">Active Referrals</p>
                <p className="text-2xl font-bold">{referralData.total_referrals}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-purple-600 mr-4" />
              <div>
                <p className="text-sm text-gray-500">Total Earnings</p>
                <p className="text-2xl font-bold">${(referralData.total_earnings || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Share2 className="h-8 w-8 text-orange-600 mr-4" />
              <div>
                <p className="text-sm text-gray-500">Conversion Rate</p>
                <p className="text-2xl font-bold">
                  {referralData.total_clicks > 0 
                    ? ((referralData.total_referrals / referralData.total_clicks) * 100).toFixed(1)
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Your Referral Link</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Referral Code</label>
                  <div className="p-3 bg-gray-50 rounded border text-center font-mono">
                    {referralData.referral_code}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Share Link</label>
                  <div className="flex gap-2">
                    <input type="text" value={referralData.referral_link} readOnly className="flex-1 p-2 border rounded bg-gray-50 text-sm" />
                    <button onClick={handleCopy} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <button onClick={handleShare} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center justify-center gap-2">
                    <Share2 className="h-4 w-4" /> Share
                  </button>
                  <button onClick={handleCopy} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
                    Copy Link
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b">
                <h2 className="text-lg font-semibold">Your Referrals ({referralData.referrals_list?.length || 0})</h2>
              </div>
              {referralData.referrals_list && referralData.referrals_list.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Username</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Referred</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Deposits</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">Earnings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {referralData.referrals_list.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm">@{r.username}</td>
                          <td className="px-6 py-4 text-sm">{new Date(r.referred_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm">${(r.total_deposits || 0).toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm font-medium text-green-600">${(r.earnings || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6 text-center text-gray-500">No referrals yet. Share your link to get started!</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 h-fit">
            <h2 className="text-lg font-semibold mb-4">How It Works</h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">1</div>
                <div>
                  <h3 className="font-medium text-gray-900">Share Your Link</h3>
                  <p className="text-sm text-gray-600">Send to friends and family</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">2</div>
                <div>
                  <h3 className="font-medium text-gray-900">They Join & Deposit</h3>
                  <p className="text-sm text-gray-600">They become your referral</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-blue-600">3</div>
                <div>
                  <h3 className="font-medium text-gray-900">Earn 6% Commission</h3>
                  <p className="text-sm text-gray-600">From all their profits</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Referrals;
