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
    <div className="min-h-screen bg-amber-50">
      <Header />

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Referral Program</h1>
          <p className="mt-2 text-slate-600">
            Earn a percentage of your referrals' profits by sharing your unique link
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-amber-100 p-8 text-center text-slate-500">
            Loading referral data...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-amber-100 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Eye className="h-8 w-8 text-amber-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Total Clicks</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {referralData?.total_clicks ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-amber-100 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-amber-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Active Referrals</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {referralData?.total_referrals ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-amber-100 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DollarSign className="h-8 w-8 text-amber-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Total Earnings</p>
                    <p className="text-2xl font-bold text-amber-700">
                      ${referralData?.total_earnings ?? 0}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-amber-100 shadow-sm p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Share2 className="h-8 w-8 text-amber-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-slate-500">Conversion Rate</p>
                    <p className="text-2xl font-bold text-slate-900">
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
                <div className="bg-white rounded-lg border border-amber-100 shadow-sm">
                  <div className="px-6 py-4 border-b border-amber-100">
                    <h2 className="text-lg font-semibold text-slate-900">Your Referral Link</h2>
                  </div>
                  <div className="p-6">
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Referral Code
                      </label>
                      <div className="p-3 bg-amber-50 rounded-md border border-amber-200 text-center">
                        <span className="text-lg font-mono font-semibold text-slate-900">
                          {referralData?.referral_code || '-'}
                        </span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Share Link
                      </label>
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 p-3 bg-amber-50 rounded-md border border-amber-200 text-sm font-mono break-all text-slate-700">
                          {referralData?.referral_link || '-'}
                        </div>
                        <button
                          onClick={handleCopy}
                          className="p-3 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                          title="Copy link"
                        >
                          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={handleShare}
                        className="flex items-center justify-center px-4 py-2 bg-amber-500 text-white rounded-md hover:bg-amber-600 transition-colors"
                      >
                        <Share2 className="h-4 w-4 mr-2" />
                        Share Link
                      </button>
                      <button
                        onClick={handleCopy}
                        className="flex items-center justify-center px-4 py-2 bg-white text-amber-700 border border-amber-300 rounded-md hover:bg-amber-50 transition-colors"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-8 bg-white rounded-lg border border-amber-100 shadow-sm">
                  <div className="px-6 py-4 border-b border-amber-100">
                    <h2 className="text-lg font-semibold text-slate-900">Your Referrals</h2>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-amber-100">
                      <thead className="bg-amber-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                            Username
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                            Referred At
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                            Total Deposits
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                            Your Earnings
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-amber-100">
                        {referralsList.length === 0 && (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-6 py-6 text-center text-sm text-slate-500"
                            >
                              No referrals yet.
                            </td>
                          </tr>
                        )}
                        {referralsList.map((referral: any, index: number) => (
                          <tr key={`${referral.id}-${index}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="h-8 w-8 bg-amber-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-amber-700">
                                    {(referral.username || 'U').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-slate-900">
                                    @{referral.username || 'unknown'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                              {formatDate(referral.referred_at)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                              ${Number(referral.total_deposits || 0).toLocaleString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-amber-700">
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
                <div className="bg-white rounded-lg border border-amber-100 shadow-sm">
                  <div className="px-6 py-4 border-b border-amber-100">
                    <h2 className="text-lg font-semibold text-slate-900">How It Works</h2>
                  </div>
                  <div className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-amber-700">1</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-900">Share Your Link</h3>
                          <p className="text-sm text-slate-600">
                            Send your referral link to friends and family
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-amber-700">2</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-900">They Join & Deposit</h3>
                          <p className="text-sm text-slate-600">
                            When they make their first deposit, they become your referral
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-amber-700">3</span>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-slate-900">Earn Commission</h3>
                          <p className="text-sm text-slate-600">
                            You earn a share of the profits they generate
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <h4 className="text-sm font-medium text-amber-900 mb-2">Pro Tips</h4>
                      <ul className="text-sm text-amber-800 space-y-1">
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
