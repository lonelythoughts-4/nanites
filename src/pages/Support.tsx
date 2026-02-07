import React, { useState } from 'react';
import { ChevronDown, Send, AlertCircle } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../services/api';

const Support = () => {
  const [activeTab, setActiveTab] = useState<'faq' | 'contact'>('faq');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const faqData = [
    {
      category: 'Deposits',
      items: [
        {
          question: 'What is the minimum deposit?',
          answer: 'The minimum deposit is $20. You can deposit up to $999,999 depending on your tier.'
        },
        {
          question: 'How long do deposits take to confirm?',
          answer: 'Deposits confirm on-chain and are automatically swept to our system. ETH takes 2-5 minutes, BSC takes 1-2 minutes, and Solana takes about 30 seconds.'
        },
        {
          question: 'What chains do you support?',
          answer: 'We support Ethereum (ETH), Binance Smart Chain (BSC), and Solana (SOL). We do NOT support TRON.'
        }
      ]
    },
    {
      category: 'Withdrawals',
      items: [
        {
          question: 'What is the minimum withdrawal?',
          answer: 'The minimum withdrawal is $20. There is no maximum limit.'
        },
        {
          question: 'What is the withdrawal fee?',
          answer: 'RougeRunner charges a 10% platform fee on all withdrawals. This covers blockchain gas costs and operational expenses.'
        },
        {
          question: 'How long do withdrawals take?',
          answer: 'Withdrawals require admin approval (usually within a few minutes) and then process on-chain. Total time is typically 5-30 minutes.'
        },
        {
          question: 'Can I cancel a withdrawal?',
          answer: 'Yes, you can cancel a withdrawal before it is approved by an admin. Once approved, it cannot be cancelled.'
        }
      ]
    },
    {
      category: 'Trading',
      items: [
        {
          question: 'What is a trading cycle?',
          answer: 'A trading cycle is a 14-day period where your account generates daily profits based on your tier level. You can pause and resume cycles anytime.'
        },
        {
          question: 'How are profits calculated?',
          answer: 'Daily profit = Your Balance × (Tier Daily Rate). Bronze earns 0.5%/day, Silver 0.7%, Gold 1.0%, Platinum 1.2%, and Diamond 1.5%.'
        },
        {
          question: 'What happens when a cycle completes?',
          answer: 'Your cycle completes after 14 days. Accumulated profits are locked and added to your frozen balance. You can start a new cycle anytime.'
        },
        {
          question: 'Can I withdraw during a cycle?',
          answer: 'Yes, you can withdraw anytime. Your frozen profits will be available to withdraw.'
        }
      ]
    },
    {
      category: 'Tiers & Bonuses',
      items: [
        {
          question: 'How do I advance tiers?',
          answer: 'Your tier is based on your total balance: Bronze ($0+), Silver ($500+), Gold ($2,000+), Platinum ($10,000+), Diamond ($50,000+).'
        },
        {
          question: 'Do I earn more in higher tiers?',
          answer: 'Yes! Higher tiers earn higher daily profit rates. Diamond tier earns 3x more daily profit than Bronze tier.'
        },
        {
          question: 'What is the referral bonus?',
          answer: 'When someone you refer makes a deposit, you earn 6% of their deposits as a one-time bonus. You also earn from their referrals (multi-level).'
        }
      ]
    },
    {
      category: 'Account',
      items: [
        {
          question: 'How do I link my Telegram account?',
          answer: 'Your account automatically links when you start the Telegram bot (/start command). Your Telegram ID becomes your account ID.'
        },
        {
          question: 'Can I have multiple accounts?',
          answer: 'Each Telegram account is separate. You can only have one account per Telegram user.'
        },
        {
          question: 'How do I contact support?',
          answer: 'Use the Contact Support tab to submit a ticket. Our team typically responds within 24 hours.'
        }
      ]
    }
  ];

  const handleSubmitSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      setSubmitMessage({ type: 'error', text: 'Please fill in all fields' });
      return;
    }

    try {
      setIsSubmitting(true);
      // Use central API service (handles proxy/CORS)
      try {
        await api.submitSupportMessage(category, subject, message);
        setSubmitMessage({ type: 'success', text: '✅ Support ticket submitted! Our team will respond shortly.' });
        setSubject('');
        setMessage('');
        setCategory('general');
      } catch (e) {
        throw e;
      }
    } catch (err) {
      setSubmitMessage({ type: 'error', text: 'Failed to submit ticket. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Support & Help</h1>
          <p className="mt-2 text-gray-600">Find answers or contact our team</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('faq')}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'faq'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
            }`}
          >
            ❓ FAQ
          </button>
          <button
            onClick={() => setActiveTab('contact')}
            className={`px-6 py-3 font-medium rounded-lg transition-colors ${
              activeTab === 'contact'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:border-gray-400'
            }`}
          >
            💬 Contact Support
          </button>
        </div>

        {/* FAQ Section */}
        {activeTab === 'faq' && (
          <div className="space-y-4">
            {faqData.map((category, idx) => (
              <div key={idx} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-900 bg-gray-50 px-6 py-4">
                  {category.category}
                </h3>
                <div className="divide-y divide-gray-200">
                  {category.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="border-t border-gray-200 first:border-t-0">
                      <button
                        onClick={() => setExpandedFaq(expandedFaq === `${idx}-${itemIdx}` ? null : `${idx}-${itemIdx}`)}
                        className="w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                      >
                        <p className="font-medium text-gray-900">{item.question}</p>
                        <ChevronDown 
                          className={`h-5 w-5 text-gray-600 transition-transform ${
                            expandedFaq === `${idx}-${itemIdx}` ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {expandedFaq === `${idx}-${itemIdx}` && (
                        <div className="px-6 py-4 bg-gray-50 text-gray-700">
                          {item.answer}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Contact Support Section */}
        {activeTab === 'contact' && (
          <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Contact Our Support Team</h2>

            {submitMessage && (
              <div className={`mb-6 p-4 rounded-lg border ${
                submitMessage.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              } flex items-center gap-3`}>
                <AlertCircle className="h-5 w-5" />
                {submitMessage.text}
              </div>
            )}

            <form onSubmit={handleSubmitSupport} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="general">General Inquiry</option>
                  <option value="deposit">Deposit Issue</option>
                  <option value="withdrawal">Withdrawal Issue</option>
                  <option value="trading">Trading Question</option>
                  <option value="account">Account Issue</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief description of your issue"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Detailed description of your issue"
                  rows={6}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                <Send className="h-5 w-5" />
                {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
              </button>
            </form>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Response Time:</strong> Our support team typically responds within 24 hours. 
                You'll receive a notification when your ticket is answered.
              </p>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Support;
