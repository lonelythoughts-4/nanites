import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, Clock, Wallet } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';

const MIN_AMOUNT = 20;
const FEE_PERCENT = 0.1;

const Withdraw = () => {
  const [amount, setAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawalId, setWithdrawalId] = useState('');
  const [withdrawalStatus, setWithdrawalStatus] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState(0);
  const [targetConfirmations, setTargetConfirmations] = useState(0);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chains = [
    { id: 'eth', name: 'Ethereum', symbol: 'ETH' },
    { id: 'bsc', name: 'Binance Smart Chain', symbol: 'BSC' },
    { id: 'sol', name: 'Solana', symbol: 'SOL' }
  ];

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const shouldStopPolling = (status?: string) => {
    if (!status) return false;
    return ['completed', 'failed', 'denied', 'rejected', 'refunded'].includes(status);
  };

  const checkStatus = async () => {
    if (!withdrawalId) return;
    try {
      const status = await api.getWithdrawalStatus(withdrawalId);
      setWithdrawalStatus(status.status || null);
      setConfirmations(status.confirmations || 0);
      setTargetConfirmations(status.target_confirmations || 0);
      setTxHash(status.tx_hash || null);

      if (shouldStopPolling(status.status)) {
        stopPolling();
        setIsPolling(false);
      }
    } catch (err) {
      console.error('Withdrawal status error:', err);
    }
  };

  useEffect(() => {
    api
      .getBalance()
      .then((data: any) => setBalance(data.total_balance ?? data.balance ?? null))
      .catch(() => setBalance(null));
  }, []);

  useEffect(() => {
    if (!isPolling || !withdrawalId) return;
    checkStatus();
    pollRef.current = setInterval(checkStatus, 15000);
    return () => stopPolling();
  }, [isPolling, withdrawalId]);

  const handleSubmit = async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount < MIN_AMOUNT) {
      toast.error(`Minimum withdrawal is $${MIN_AMOUNT}`);
      return;
    }
    if (!selectedChain) {
      toast.error('Please select a blockchain.');
      return;
    }
    if (!recipientAddress.trim()) {
      toast.error('Please enter a recipient address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.requestWithdrawal(
        numericAmount,
        selectedChain,
        recipientAddress.trim()
      );
      setWithdrawalId(response.withdrawal_id);
      setWithdrawalStatus(response.status || 'pending');
      setIsPolling(true);
      toast.success('Withdrawal request submitted.');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to submit withdrawal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const netAmount = amount ? Number(amount) * (1 - FEE_PERCENT) : 0;
  const feeAmount = amount ? Number(amount) * FEE_PERCENT : 0;
  const isFormValid =
    Number(amount) >= MIN_AMOUNT && !!selectedChain && !!recipientAddress.trim();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Withdraw Funds</h1>
          <p className="mt-2 text-gray-600">Request a withdrawal from your account balance</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Withdrawal Details</h2>
              {balance != null && (
                <div className="text-sm text-gray-600">
                  Available Balance:{' '}
                  <span className="font-semibold">
                    ${Number(balance).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={MIN_AMOUNT}
                placeholder={`Minimum $${MIN_AMOUNT}`}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {amount && Number(amount) < MIN_AMOUNT && (
                <p className="mt-1 text-sm text-red-600">
                  Minimum withdrawal is ${MIN_AMOUNT}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Blockchain Network
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {chains.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => setSelectedChain(chain.id)}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      selectedChain === chain.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{chain.name}</span>
                      <span className="text-xs font-medium text-gray-500">{chain.symbol}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Address
              </label>
              <input
                type="text"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                placeholder="Enter your wallet address"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Withdrawal Fee (10%)</span>
                <span>${feeAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 mt-2">
                <span>Estimated Net Amount</span>
                <span className="font-semibold text-gray-900">
                  ${netAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !isFormValid}
              className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Submit Withdrawal Request
                </>
              )}
            </button>
          </div>
        </div>

        {withdrawalId && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Withdrawal Status</h3>
              {isPolling ? (
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-4 w-4 mr-2" /> Updating...
                </div>
              ) : (
                <button
                  onClick={() => {
                    setIsPolling(true);
                    checkStatus();
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Check Status
                </button>
              )}
            </div>

            <div className="space-y-3 text-sm text-gray-700">
              <div className="flex justify-between">
                <span>Request ID</span>
                <span className="font-mono">{withdrawalId}</span>
              </div>
              <div className="flex justify-between">
                <span>Status</span>
                <span className="font-semibold">{withdrawalStatus || 'pending'}</span>
              </div>
              <div className="flex justify-between">
                <span>Confirmations</span>
                <span>
                  {confirmations} / {targetConfirmations || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Transaction Hash</span>
                <span className="font-mono">
                  {txHash ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}` : 'N/A'}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-start space-x-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-md p-3">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                Withdrawals require admin approval and processing time. You will receive a
                Telegram notification when status changes.
              </div>
            </div>
          </div>
        )}

        {withdrawalStatus === 'completed' && (
          <div className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
            <h4 className="text-lg font-semibold text-green-900">Withdrawal Completed</h4>
            <p className="text-sm text-green-700">
              Your funds have been sent to your wallet.
            </p>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Withdraw;
