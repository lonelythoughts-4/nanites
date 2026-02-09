import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Wallet, CheckCircle } from 'lucide-react';
import { toast } from 'react-toastify';
import Header from '../components/Header';
import Footer from '../components/Footer';
import QRCodeDisplay from '../components/QRCodeDisplay';
import LoadingSpinner from '../components/LoadingSpinner';
import { api } from '../lib/api';

const MIN_AMOUNT = 20;

const Deposit = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [amount, setAmount] = useState('');
  const [selectedChain, setSelectedChain] = useState('');
  const [depositAddress, setDepositAddress] = useState('');
  const [depositId, setDepositId] = useState('');
  const [qrData, setQrData] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  const [sentClicked, setSentClicked] = useState(false);
  const [waitStartedAt, setWaitStartedAt] = useState<number | null>(null);
  const [waitElapsedSec, setWaitElapsedSec] = useState(0);
  const [lastCheckedAt, setLastCheckedAt] = useState<number | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [manualChecking, setManualChecking] = useState(false);
  const [confirmations, setConfirmations] = useState(0);
  const [targetConfirmations, setTargetConfirmations] = useState(1);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<number | null>(null);
  const [belowMinimum, setBelowMinimum] = useState<any>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chains = [
    { id: 'eth', name: 'Ethereum', symbol: 'ETH', confirmations: '2-5 minutes' },
    { id: 'bsc', name: 'Binance Smart Chain', symbol: 'BSC', confirmations: '1 minute' },
    { id: 'sol', name: 'Solana', symbol: 'SOL', confirmations: '30 seconds' }
  ];

  const presetAmounts = [20, 50, 100, 500, 1000];

  const getExplorerTxUrl = (chain: string, hash: string) => {
    if (!hash) return '';
    const safeHash = encodeURIComponent(hash);
    switch (chain) {
      case 'eth':
        return `https://etherscan.io/tx/${safeHash}`;
      case 'bsc':
        return `https://bscscan.com/tx/${safeHash}`;
      case 'sol':
        return `https://solscan.io/tx/${safeHash}`;
      default:
        return '';
    }
  };

  const getExplorerAddressUrl = (chain: string, address: string) => {
    if (!address) return '';
    const safeAddress = encodeURIComponent(address);
    switch (chain) {
      case 'eth':
        return `https://etherscan.io/address/${safeAddress}`;
      case 'bsc':
        return `https://bscscan.com/address/${safeAddress}`;
      case 'sol':
        return `https://solscan.io/account/${safeAddress}`;
      default:
        return '';
    }
  };

  const formatTxHash = (hash: string) => {
    if (!hash) return '';
    if (hash.length <= 18) return hash;
    return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  };

  const supportChatUrl =
    import.meta.env.VITE_SUPPORT_CHAT_URL ||
    `https://t.me/${import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'rogueezbot'}`;

  const handleCopyAddress = async (address: string) => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      toast.success('Address copied.');
    } catch (err) {
      toast.error('Failed to copy address.');
    }
  };

  const handleAmountSelect = (value: number) => {
    setAmount(value.toString());
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const checkStatus = async () => {
    if (!depositId) return;
    try {
      const status = await api.getDepositStatus(depositId);
      setConfirmations(status.confirmations || 0);
      setTargetConfirmations(status.target_confirmations || targetConfirmations || 1);
      setTxHash(status.tx_hash || null);
      setReceivedAmount(status.received_amount || null);
      setLastCheckedAt(Date.now());
      setPollCount((prev) => prev + 1);

      if (status.status === 'confirmed') {
        stopPolling();
        setIsWaiting(false);
        setBelowMinimum(null);
        setCurrentStep(6);
      } else if (status.status === 'below_minimum') {
        setBelowMinimum(status);
      } else {
        setBelowMinimum(null);
      }
    } catch (err: any) {
      console.error('Deposit status error:', err);
    }
  };

  useEffect(() => {
    if (currentStep !== 5 || !depositId) return;
    checkStatus();
    pollRef.current = setInterval(checkStatus, 10000);
    return () => stopPolling();
  }, [currentStep, depositId]);

  useEffect(() => {
    if (currentStep !== 5) return;
    const start = waitStartedAt ?? Date.now();
    if (!waitStartedAt) setWaitStartedAt(start);
    setWaitElapsedSec(Math.floor((Date.now() - start) / 1000));
    const interval = setInterval(() => {
      setWaitElapsedSec(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [currentStep, waitStartedAt]);

  const handleNext = async () => {
    if (currentStep === 1 && amount) {
      setCurrentStep(2);
      return;
    }
    if (currentStep === 2 && selectedChain) {
      setCurrentStep(3);
      return;
    }
    if (currentStep === 3) {
      setIsGenerating(true);
      try {
        const response = await api.requestDeposit(Number(amount), selectedChain);
        if (!response.address || !response.deposit_id) {
          throw new Error('Deposit address could not be created.');
        }
        setDepositId(response.deposit_id);
        setDepositAddress(response.address);
        setQrData(response.qr_data || '');
        setTargetConfirmations(response.expected_confirmations || 1);
        setSentClicked(false);
        setWaitStartedAt(null);
        setWaitElapsedSec(0);
        setLastCheckedAt(null);
        setPollCount(0);
        setCurrentStep(4);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to request deposit address.');
      } finally {
        setIsGenerating(false);
      }
      return;
    }
    if (currentStep === 4) {
      if (sentClicked) return;
      setSentClicked(true);
      setIsWaiting(true);
      setCurrentStep(5);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 4) {
        setSentClicked(false);
      }
      setCurrentStep(currentStep - 1);
    }
  };

  const handleManualCheck = async () => {
    if (manualChecking) return;
    setManualChecking(true);
    try {
      await checkStatus();
    } finally {
      setManualChecking(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return amount && parseFloat(amount) >= MIN_AMOUNT;
      case 2:
        return selectedChain;
      case 3:
      case 4:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Choose Deposit Amount
              </h2>
              <p className="text-gray-600">
                Select or enter the amount you want to deposit (minimum ${MIN_AMOUNT})
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {presetAmounts.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleAmountSelect(preset)}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    amount === preset.toString()
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg font-semibold">${preset}</div>
                </button>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Amount (USD)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                min={MIN_AMOUNT}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              {amount && parseFloat(amount) < MIN_AMOUNT && (
                <p className="mt-1 text-sm text-red-600">
                  Minimum deposit is ${MIN_AMOUNT}
                </p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Blockchain</h2>
              <p className="text-gray-600">Select the blockchain network for your deposit</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => setSelectedChain(chain.id)}
                  className={`p-6 rounded-lg border-2 text-left transition-colors ${
                    selectedChain === chain.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{chain.name}</h3>
                    <span className="text-sm font-medium text-gray-500">{chain.symbol}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Expected confirmation: {chain.confirmations}
                  </p>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Details</h2>
              <p className="text-gray-600">Review your deposit information before proceeding</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-semibold">${amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Blockchain:</span>
                  <span className="font-semibold">
                    {chains.find((c) => c.id === selectedChain)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected confirmation:</span>
                  <span className="font-semibold">
                    {chains.find((c) => c.id === selectedChain)?.confirmations}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Make sure to send the exact amount to the
                address that will be generated. Only send{' '}
                {chains.find((c) => c.id === selectedChain)?.symbol} to this address.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Send Your Deposit</h2>
              <p className="text-gray-600">
                Send exactly ${amount} worth of{' '}
                {chains.find((c) => c.id === selectedChain)?.symbol} to the address
                below
              </p>
            </div>

            <QRCodeDisplay address={depositAddress} amount={amount} chain={selectedChain} qrData={qrData} />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                After sending the funds, click "I sent the funds" below to start
                monitoring for confirmations.
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 text-center">
            <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-sky-50 to-white p-6 shadow-[0_0_0_1px_rgba(59,130,246,0.15),0_10px_30px_rgba(59,130,246,0.18)]">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Waiting for Confirmation
              </h2>
              <p className="text-sm text-blue-800">
                We are scanning the chain in real time. Once the network confirms
                your deposit, this screen will update automatically.
              </p>
              <div className="mt-3 text-xs text-blue-700">
                {lastCheckedAt ? (
                  <span>
                    Last check: {Math.max(0, Math.floor((Date.now() - lastCheckedAt) / 1000))}s ago •{' '}
                  </span>
                ) : null}
                Elapsed: {Math.floor(waitElapsedSec / 60)}m {waitElapsedSec % 60}s
              </div>
            </div>

            {txHash && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <p className="text-sm text-blue-800 font-semibold">Transaction detected</p>
                {getExplorerTxUrl(selectedChain, txHash) ? (
                  <a
                    href={getExplorerTxUrl(selectedChain, txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center text-xs font-mono text-blue-900 underline break-all"
                    title={txHash}
                  >
                    {formatTxHash(txHash)} (View on explorer)
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-blue-900 font-mono break-all">
                    {txHash}
                  </p>
                )}
              </div>
            )}

            {!txHash && waitElapsedSec >= 60 && (
              <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-slate-50 to-white p-5 text-left shadow-[0_0_0_1px_rgba(99,102,241,0.18),0_10px_30px_rgba(99,102,241,0.15)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-indigo-900 font-semibold tracking-wide uppercase">
                      No Transaction Detected Yet
                    </p>
                    <p className="mt-1 text-xs text-indigo-700">
                      If you already sent funds, it can take a few minutes to appear on-chain.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-indigo-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-indigo-50">
                    Pending
                  </span>
                </div>
                <div className="mt-4 text-xs text-indigo-800 space-y-2">
                  <div>1. Confirm you sent on {selectedChain.toUpperCase()} only.</div>
                  <div>2. Double-check the address below.</div>
                  <div>3. Wait for network confirmation (may take several minutes).</div>
                </div>
                <div className="mt-4 text-xs text-indigo-700">
                  Need help?{' '}
                  <a
                    href={supportChatUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold underline"
                  >
                    Contact support
                  </a>
                  .
                </div>
                {depositAddress && (
                  <div className="mt-4 rounded-xl border border-indigo-200 bg-white/80 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold text-indigo-900">
                        Deposit Address (same address)
                      </div>
                      {getExplorerAddressUrl(selectedChain, depositAddress) ? (
                        <a
                          href={getExplorerAddressUrl(selectedChain, depositAddress)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] font-semibold text-indigo-700 underline"
                        >
                          View on explorer
                        </a>
                      ) : null}
                    </div>
                    <div className="mt-2 font-mono text-xs text-indigo-900 break-all">
                      {depositAddress}
                    </div>
                    <div className="mt-3 flex">
                      <button
                        onClick={() => handleCopyAddress(depositAddress)}
                        className="rounded-md bg-indigo-700 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-800"
                      >
                        Copy Address
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {belowMinimum && (
              <div className="rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 via-yellow-50 to-white p-5 text-left shadow-[0_0_0_1px_rgba(245,158,11,0.2),0_10px_30px_rgba(245,158,11,0.15)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-amber-900 font-semibold tracking-wide uppercase">
                      Deposit Below Minimum
                    </p>
                    <p className="mt-1 text-xs text-amber-700">
                      The network detected funds, but the amount is below your tier minimum.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-900 px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-amber-50">
                    Action Required
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <div className="rounded-lg bg-white/70 border border-amber-200 p-3">
                    <div className="text-amber-700">Received</div>
                    <div className="mt-1 text-sm font-semibold text-amber-900">
                      ${Number(belowMinimum.received_amount || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/70 border border-amber-200 p-3">
                    <div className="text-amber-700">Minimum</div>
                    <div className="mt-1 text-sm font-semibold text-amber-900">
                      ${Number(belowMinimum.required_minimum || 0).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/70 border border-amber-200 p-3">
                    <div className="text-amber-700">Shortfall</div>
                    <div className="mt-1 text-sm font-semibold text-amber-900">
                      ${Number(belowMinimum.shortfall || 0).toFixed(2)}
                    </div>
                  </div>
                </div>

                {belowMinimum.address && (
                  <div className="mt-4 rounded-xl border border-amber-300 bg-amber-100/60 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] font-semibold text-amber-900">
                        Send the remaining amount to the SAME address
                      </div>
                      <span className="rounded-full bg-amber-800 px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-amber-50">
                        Same Address
                      </span>
                    </div>
                    <div className="mt-2 font-mono text-xs text-amber-900 break-all">
                      {belowMinimum.address}
                    </div>
                    <div className="mt-3 flex">
                      <button
                        onClick={() => handleCopyAddress(String(belowMinimum.address || ''))}
                        className="rounded-md bg-amber-700 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-800"
                      >
                        Copy Address
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-blue-200 bg-white/80 p-6 text-left shadow-[0_0_0_1px_rgba(59,130,246,0.12)]">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Confirmations:</span>
                  <span>
                    {confirmations} / {targetConfirmations}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        100,
                        (confirmations / Math.max(1, targetConfirmations)) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={handleManualCheck}
                disabled={manualChecking}
                className="rounded-md border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50 disabled:opacity-60"
              >
                {manualChecking ? 'Checking...' : 'Refresh Status'}
              </button>
              <p className="text-xs text-blue-700">
                This page will automatically update when your deposit is confirmed.
              </p>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 text-center">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-green-50 to-white p-6 shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_10px_30px_rgba(16,185,129,0.2)]">
              <CheckCircle className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Deposit Confirmed!
              </h2>
              <p className="text-sm text-emerald-800">
                Your deposit of ${amount} has been verified and credited to your account.
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-white/80 p-6 text-left shadow-[0_0_0_1px_rgba(16,185,129,0.12)]">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-emerald-700">Amount Deposited:</span>
                  <span className="font-semibold text-emerald-900">
                    ${receivedAmount ?? amount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Transaction Hash:</span>
                  {txHash ? (
                    getExplorerTxUrl(selectedChain, txHash) ? (
                      <a
                        href={getExplorerTxUrl(selectedChain, txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-sm text-emerald-900 underline"
                        title={txHash}
                      >
                        {formatTxHash(txHash)}
                      </a>
                    ) : (
                      <span className="font-mono text-sm text-emerald-900">
                        {formatTxHash(txHash)}
                      </span>
                    )
                  ) : (
                    <span className="font-mono text-sm text-emerald-900">N/A</span>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-emerald-700">
              Your balance and tier will update shortly. You can now return to your
              dashboard.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="max-w-3xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? 'OK' : step}
                </div>
                {step < 6 && (
                  <div
                    className={`w-12 h-1 mx-2 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>Amount</span>
            <span>Chain</span>
            <span>Confirm</span>
            <span>Send</span>
            <span>Wait</span>
            <span>Done</span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {isGenerating ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Generating Deposit Address
              </h2>
              <p className="text-gray-600">
                Please wait while we create a secure deposit address for you...
              </p>
            </div>
          ) : (
            renderStepContent()
          )}

          {!isGenerating && currentStep < 6 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleBack}
                disabled={currentStep === 1 || currentStep === 5}
                className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </button>

              <button
                onClick={handleNext}
                disabled={!canProceed() || isWaiting || (currentStep === 4 && sentClicked)}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {currentStep === 4 ? 'I sent the funds' : 'Next'}
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          )}

          {currentStep === 6 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <a
                href="/"
                className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Return to Dashboard
              </a>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Deposit;
