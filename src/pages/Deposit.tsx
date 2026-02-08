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
  const [confirmations, setConfirmations] = useState(0);
  const [targetConfirmations, setTargetConfirmations] = useState(1);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [receivedAmount, setReceivedAmount] = useState<number | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const chains = [
    { id: 'eth', name: 'Ethereum', symbol: 'ETH', confirmations: '2-5 minutes' },
    { id: 'bsc', name: 'Binance Smart Chain', symbol: 'BSC', confirmations: '1 minute' },
    { id: 'sol', name: 'Solana', symbol: 'SOL', confirmations: '30 seconds' }
  ];

  const presetAmounts = [20, 50, 100, 500, 1000];

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

      if (status.status === 'confirmed') {
        stopPolling();
        setIsWaiting(false);
        setCurrentStep(6);
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
        setCurrentStep(4);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to request deposit address.');
      } finally {
        setIsGenerating(false);
      }
      return;
    }
    if (currentStep === 4) {
      setIsWaiting(true);
      setCurrentStep(5);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return amount && parseFloat(amount) >= MIN_AMOUNT;
      case 2:
        return selectedChain;
      case 3:
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
            <div>
              <LoadingSpinner size="lg" className="mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Waiting for Confirmation
              </h2>
              <p className="text-gray-600">
                We're monitoring the blockchain for your transaction.
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-6">
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

            <p className="text-sm text-gray-500">
              This page will automatically update when your deposit is confirmed.
            </p>
          </div>
        );

      case 6:
        return (
          <div className="space-y-6 text-center">
            <div>
              <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Deposit Confirmed!
              </h2>
              <p className="text-gray-600">
                Your deposit of ${amount} has been successfully confirmed and added
                to your account.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-green-700">Amount Deposited:</span>
                  <span className="font-semibold text-green-900">
                    ${receivedAmount ?? amount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-green-700">Transaction Hash:</span>
                  <span className="font-mono text-sm text-green-900">
                    {txHash ? `${txHash.slice(0, 8)}...${txHash.slice(-6)}` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600">
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
                disabled={!canProceed() || isWaiting}
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
