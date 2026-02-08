import React, { useEffect, useState } from 'react';
import { Copy, Check, Share2, Users, DollarSign, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { api } from '../lib/api';

const Referrals = () => {
  const [copied, setCopied] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getReferrals()
      .then((data) => setReferralData(data))
      .catch((err) => toast.error(err?.message || 'Failed to load referrals.'))
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async () => {
    if (!referralData?.referral_link) return;
    try {
      await navigator.clipboard.writeText(referralData.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy referral link.');
    }
  };

  const handleShare = async () => {
    if (!referralData?.referral_link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join RougeRunner GENESYS',
          text: 'Start your automated trading journey with RougeRunner GENESYS!',
          url: referralData.referral_link
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      handleCopy();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const referralsList = referralData?.referrals_list || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Referral Program</h1>
          <p className="mt-2 text-gray-600">
            Earn a percentage of your referrals' profits by sharing your unique link
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Loading referral data...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Eye className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Clicks</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {referralData?.total_clicks ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Active Referrals</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {referralData?.total_referrals ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Earnings</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ${referralData?.total_earnings ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Share2 className="h-8 w-8 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Conversion Rate</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {referralData?.total_clicks
                        ? (
                            (referralData.total_referrals / referralData.total_clicks) *
                            100
                          ).toFixed(1)
                        : '0.0'}
                      %
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Your Referral Link</h2>
                  </div>
                  <div className="p-6">
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Referral Code
                      </label>
                      <div className="p-3 bg-gray-50 rounded-md border text-center">
                        <span className="text-lg font-mono font-semibold text-gray-900">
                          {referralData?.referral_code || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Share Link
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 p-3 bg-gray-50 rounded-md border text-sm font-mono break-all">
                          {referralData?.referral_link || '-'}
                        </div>
                        <button
                          onClick={handleCopy}
                          className="p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                          title="Copy link"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={handleShare}
                        className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Link
                      </button>
                      <button
                        onClick={handleCopy}
                        className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">Your Referrals</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Username
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Referred At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total Deposits
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Your Earnings
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {referralsList.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-6 py-6 text-center text-sm text-gray-500"
                            >
                              No referrals yet.
                            </td>
                          </tr>
                        )}
                        {referralsList.map((referral: any, index: number) => (
                          <tr key={`${referral.id}-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {(referral.username || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">
                                    @{referral.username || 'unknown'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(referral.referred_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              ${Number(referral.total_deposits || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                              ${Number(referral.bonus_earned || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div>
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">How It Works</h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">1</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Share Your Link</h3>
                          <p className="text-sm text-gray-600">
                            Send your referral link to friends and family
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">2</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">They Join & Deposit</h3>
                          <p className="text-sm text-gray-600">
                            When they make their first deposit, they become your referral
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-blue-600">3</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">Earn Commission</h3>
                          <p className="text-sm text-gray-600">
                            You earn a share of the profits they generate
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="text-sm font-medium text-green-900 mb-2">Pro Tips</h4>
                      <ul className="text-sm text-green-800 space-y-1">
                        <li>Share on social media for maximum reach</li>
                        <li>Explain the tier system to potential referrals</li>
                        <li>Higher deposits can generate higher earnings</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Referrals;
