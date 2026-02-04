import React, { useState } from 'react';
    import { ArrowLeft, ArrowRight, Wallet, CheckCircle } from 'lucide-react';
    import Header from '../components/Header';
    import Footer from '../components/Footer';
    import QRCodeDisplay from '../components/QRCodeDisplay';
    import LoadingSpinner from '../components/LoadingSpinner';
    import api from '../services/api';

    const Deposit = () => {
      const [currentStep, setCurrentStep] = useState(1);
      const [amount, setAmount] = useState('');
      const [selectedChain, setSelectedChain] = useState('');
      const [depositAddress, setDepositAddress] = useState('');
      const [depositId, setDepositId] = useState('');
      const [isGenerating, setIsGenerating] = useState(false);
      const [isWaiting, setIsWaiting] = useState(false);

      const chains = [
        { id: 'eth', name: 'Ethereum', symbol: 'ETH', confirmations: '12 confirmations (2-5 minutes)', expectedTime: 300 },
        { id: 'bsc', name: 'Binance Smart Chain', symbol: 'BSC', confirmations: '5 confirmations (1-2 minutes)', expectedTime: 60 },
        { id: 'sol', name: 'Solana', symbol: 'SOL', confirmations: '30 confirmations (30 seconds)', expectedTime: 30 }
      ];

      const presetAmounts = [20, 50, 100, 500, 1000];

      const handleAmountSelect = (value: number) => {
        setAmount(value.toString());
      };

      const handleNext = async () => {
        if (currentStep === 1 && amount) {
          setCurrentStep(2);
        } else if (currentStep === 2 && selectedChain) {
          setCurrentStep(3);
        } else if (currentStep === 3) {
          setIsGenerating(true);
          try {
            // Request real deposit address from bot's depositService
            const resp = await api.requestDepositAddress(Number(amount), selectedChain);
            setDepositAddress(resp.address);
            setDepositId(resp.deposit_id || resp.depositId || '');
            setIsGenerating(false);
            setCurrentStep(4);
          } catch (err: any) {
            console.error('Deposit address request failed:', err);
            setIsGenerating(false);
            alert(err?.message || 'Failed to generate deposit address');
          }
        } else if (currentStep === 4) {
          setIsWaiting(true);
          setCurrentStep(5);

          // Start polling for confirmations using API helper
          if (!depositId) {
            console.warn('No depositId available for polling');
            setTimeout(() => { setIsWaiting(false); }, 3000);
            return;
          }

          try {
            const status = await api.checkDepositStatus(depositId);
            setIsWaiting(false);
            setCurrentStep(6);
          } catch (pollErr) {
            console.warn('Deposit polling error:', pollErr);
            setIsWaiting(false);
            alert('Timed out waiting for deposit confirmation. You can check deposit status in the dashboard.');
          }
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
            return amount && parseFloat(amount) >= 20;
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose Deposit Amount</h2>
                  <p className="text-gray-600">Select or enter the amount you want to deposit (minimum $20)</p>
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
                    min="20"
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {amount && parseFloat(amount) < 20 && (
                    <p className="mt-1 text-sm text-red-600">Minimum deposit is $20</p>
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
                        {chains.find(c => c.id === selectedChain)?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected confirmation:</span>
                      <span className="font-semibold">
                        {chains.find(c => c.id === selectedChain)?.confirmations}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> Make sure to send the exact amount to the address that will be generated. 
                    Only send {chains.find(c => c.id === selectedChain)?.symbol} to this address.
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
                    Send exactly ${amount} worth of {chains.find(c => c.id === selectedChain)?.symbol} to the address below
                  </p>
                </div>

                <QRCodeDisplay 
                  address={depositAddress}
                  amount={amount}
                  chain={selectedChain}
                />

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    After sending the funds, click "I sent the funds" below to start monitoring for confirmations.
                  </p>
                </div>
              </div>
            );

          case 5:
            return (
              <div className="space-y-6 text-center">
                <div>
                  <LoadingSpinner size="lg" className="mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Waiting for Confirmation</h2>
                  <p className="text-gray-600">
                    We're monitoring the blockchain for your transaction. This usually takes{' '}
                    {chains.find(c => c.id === selectedChain)?.confirmations}.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Confirmations:</span>
                      <span>0 / 1</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full w-0 animate-pulse" />
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Deposit Confirmed!</h2>
                  <p className="text-gray-600">
                    Your deposit of ${amount} has been successfully confirmed and added to your account.
                  </p>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-green-700">Amount Deposited:</span>
                      <span className="font-semibold text-green-900">${amount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-green-700">Transaction Hash:</span>
                      <span className="font-mono text-sm text-green-900">0x1234...5678</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Your balance and tier will update within 1-2 minutes. You can now return to your dashboard.
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
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4, 5, 6].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step <= currentStep
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {step < currentStep ? '✓' : step}
                    </div>
                    {step < 6 && (
                      <div className={`w-12 h-1 mx-2 ${
                        step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`} />
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

            {/* Step Content */}
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

              {/* Navigation Buttons */}
              {!isGenerating && currentStep < 6 && (
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                  <button
                    onClick={handleBack}
                    disabled={currentStep === 1}
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