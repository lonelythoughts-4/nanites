import React, { useState } from 'react';
    import Header from '../components/Header';
    import Footer from '../components/Footer';
    import { ArrowLeft, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
    import LoadingSpinner from '../components/LoadingSpinner';

    const Withdraw = () => {
      const [currentStep, setCurrentStep] = useState(1);
      const [amount, setAmount] = useState('');
      const [selectedChain, setSelectedChain] = useState('');
      const [recipientAddress, setRecipientAddress] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [withdrawalId, setWithdrawalId] = useState('');
      const [withdrawalStatus, setWithdrawalStatus] = useState('');
      const [balance] = useState(5000); // Mock balance
      const [approvalError, setApprovalError] = useState('');

      const chains = [
        { id: 'eth', name: 'Ethereum', symbol: 'ETH', expectedTime: '2-5 hours' },
        { id: 'bsc', name: 'Binance Smart Chain', symbol: 'BSC', expectedTime: '30 minutes' },
        { id: 'sol', name: 'Solana', symbol: 'SOL', expectedTime: '15 minutes' }
      ];

      const WITHDRAWAL_MIN = 20;
      const WITHDRAWAL_FEE_PERCENT = 0.10; // 10%

      const handleAmountSelect = (value: number) => {
        setAmount(value.toString());
      };

      const calculateFee = (amt: number) => {
        return amt * WITHDRAWAL_FEE_PERCENT;
      };

      const calculateNetAmount = (amt: number) => {
        return amt - calculateFee(amt);
      };

      const isValidAddress = (address: string, chain: string): boolean => {
        const patterns: Record<string, RegExp> = {
          eth: /^0x[a-fA-F0-9]{40}$/,
          bsc: /^0x[a-fA-F0-9]{40}$/,
          sol: /^[1-9A-HJ-NP-Z]{43,44}$/
        };
        return patterns[chain]?.test(address) || false;
      };

      const handleNext = async () => {
        if (currentStep === 1 && amount) {
          const numAmount = parseFloat(amount);
          if (numAmount < WITHDRAWAL_MIN) {
            setApprovalError(`Minimum withdrawal is $${WITHDRAWAL_MIN}`);
            return;
          }
          if (numAmount > balance) {
            setApprovalError('Insufficient balance');
            return;
          }
          setApprovalError('');
          setCurrentStep(2);
        } else if (currentStep === 2 && selectedChain) {
          setCurrentStep(3);
        } else if (currentStep === 3 && recipientAddress) {
          if (!isValidAddress(recipientAddress, selectedChain)) {
            setApprovalError('Invalid address format');
            return;
          }
          setCurrentStep(4);
        } else if (currentStep === 4) {
          // Submit withdrawal request
          setIsSubmitting(true);
          setApprovalError('');
          try {
            // Use API service to request withdrawal so backend withdrawService logic runs
            const apiModule = await import('../services/api');
            const data = await apiModule.default.requestWithdrawal(Number(amount), selectedChain, recipientAddress);

            const id = data.withdrawal_id || data.withdrawalId || data.id || '';
            setWithdrawalId(id);
            setWithdrawalStatus(data.status || 'pending_approval');
            setCurrentStep(5);

            // Start polling for status
            pollWithdrawalStatus(id);
          } catch (error) {
            setApprovalError(error instanceof Error ? error.message : 'Failed to submit withdrawal');
            setIsSubmitting(false);
          }
        }
      };

      const pollWithdrawalStatus = async (wdId: string) => {
        const interval = setInterval(async () => {
          try {
            const apiModule = await import('../services/api');
            const data = await apiModule.default.getWithdrawalStatus(wdId);
            if (!data) return;

            setWithdrawalStatus(data.status);

            if (['completed', 'failed', 'rejected'].includes(data.status)) {
              clearInterval(interval);
              setCurrentStep(data.status === 'completed' ? 6 : 7);
              setIsSubmitting(false);
            }
          } catch (error) {
            console.error('Poll error:', error);
          }
        }, 5000);
      };

      const handleBack = () => {
        if (currentStep > 1) {
          setCurrentStep(currentStep - 1);
        }
      };

      const canProceed = () => {
        switch (currentStep) {
          case 1:
            return amount && parseFloat(amount) >= WITHDRAWAL_MIN && parseFloat(amount) <= balance;
          case 2:
            return selectedChain;
          case 3:
            return recipientAddress && isValidAddress(recipientAddress, selectedChain);
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Withdrawal Amount</h2>
                  <p className="text-gray-600">Select or enter the amount you want to withdraw (minimum $20)</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    Available balance: <strong>${balance.toFixed(2)}</strong>
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {[50, 100, 500, 1000, 2500].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleAmountSelect(Math.min(preset, balance))}
                      disabled={preset > balance}
                      className={`p-4 rounded-lg border-2 transition-colors ${
                        amount === Math.min(preset, balance).toString()
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : preset > balance
                          ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
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
                    min={WITHDRAWAL_MIN}
                    max={balance}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  {amount && (
                    <div className="mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Gross Amount:</span>
                        <span className="font-semibold">${parseFloat(amount).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Platform Fee (10%):</span>
                        <span className="font-semibold text-red-600">-${calculateFee(parseFloat(amount)).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm border-t pt-2">
                        <span className="text-gray-900 font-medium">Net Amount:</span>
                        <span className="font-bold text-green-600">${calculateNetAmount(parseFloat(amount)).toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {approvalError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{approvalError}</p>
                  </div>
                )}
              </div>
            );

          case 2:
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Blockchain</h2>
                  <p className="text-gray-600">Choose the network for your withdrawal</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        Expected time: {chain.expectedTime}
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
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Recipient Address</h2>
                  <p className="text-gray-600">Enter the {chains.find(c => c.id === selectedChain)?.name} address to receive your withdrawal</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {chains.find(c => c.id === selectedChain)?.symbol} Address
                  </label>
                  <textarea
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    placeholder={`Enter your ${chains.find(c => c.id === selectedChain)?.symbol} address`}
                    rows={4}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  />
                  {recipientAddress && isValidAddress(recipientAddress, selectedChain) && (
                    <p className="mt-2 text-sm text-green-600">✓ Valid address format</p>
                  )}
                  {recipientAddress && !isValidAddress(recipientAddress, selectedChain) && (
                    <p className="mt-2 text-sm text-red-600">✗ Invalid address format</p>
                  )}
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>⚠️ Warning:</strong> Double-check the address before proceeding. Withdrawals to incorrect addresses cannot be recovered.
                  </p>
                </div>

                {approvalError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{approvalError}</p>
                  </div>
                )}
              </div>
            );

          case 4:
            return (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Confirm Withdrawal</h2>
                  <p className="text-gray-600">Review your withdrawal details before submitting</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Gross Amount:</span>
                    <span className="font-semibold">${parseFloat(amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Platform Fee (10%):</span>
                    <span className="font-semibold text-red-600">-${calculateFee(parseFloat(amount)).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-4 flex justify-between">
                    <span className="text-gray-900 font-bold">Net Amount:</span>
                    <span className="font-bold text-green-600">${calculateNetAmount(parseFloat(amount)).toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Blockchain:</span>
                      <span className="font-semibold">{chains.find(c => c.id === selectedChain)?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">To Address:</span>
                      <span className="font-semibold text-sm truncate">{recipientAddress}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Your withdrawal request will be submitted for admin approval. You'll receive a notification once it's processed.
                  </p>
                </div>

                {approvalError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">{approvalError}</p>
                  </div>
                )}
              </div>
            );

          case 5:
            return (
              <div className="space-y-6 text-center">
                <div>
                  <LoadingSpinner size="lg" className="mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Withdrawal Submitted</h2>
                  <p className="text-gray-600">
                    Your withdrawal request has been submitted and is awaiting admin approval.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="text-left space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Withdrawal ID:</span>
                      <span className="font-mono text-xs">{withdrawalId}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-semibold">${calculateNetAmount(parseFloat(amount)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-semibold text-orange-600">Pending Approval</span>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-500">
                  We'll notify you as soon as an admin approves or denies your request. This usually takes a few minutes.
                </p>
              </div>
            );

          case 6:
            return (
              <div className="space-y-6 text-center">
                <div>
                  <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Withdrawal Complete!</h2>
                  <p className="text-gray-600">
                    Your withdrawal has been approved and processed to the blockchain.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 text-left space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Amount Sent:</span>
                    <span className="font-semibold">${calculateNetAmount(parseFloat(amount)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Blockchain:</span>
                    <span className="font-semibold">{chains.find(c => c.id === selectedChain)?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Recipient:</span>
                    <span className="font-mono text-xs truncate">{recipientAddress}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Check your wallet for the funds. Transaction may take {chains.find(c => c.id === selectedChain)?.expectedTime} to appear.
                </p>
              </div>
            );

          case 7:
            return (
              <div className="space-y-6 text-center">
                <div>
                  <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Withdrawal {withdrawalStatus === 'rejected' ? 'Rejected' : 'Failed'}</h2>
                  <p className="text-gray-600">
                    Your withdrawal request was not approved. Your balance has been refunded.
                  </p>
                </div>

                <button
                  onClick={() => setCurrentStep(1)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                >
                  Submit New Withdrawal Request
                </button>
              </div>
            );

          default:
            return null;
        }
      };

      return (
        <div className="min-h-screen bg-gray-50">
          <Header />

          <main className="max-w-2xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Withdraw Funds</h1>
              <p className="mt-2 text-gray-600">
                Withdraw your balance anytime. Admin approval required.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-8">
              {/* Progress indicator */}
              {currentStep < 5 && (
                <div className="mb-8 flex justify-between">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className={`flex-1 ${step < 4 ? 'mr-4' : ''}`}>
                      <div className={`h-2 rounded-full transition-colors ${step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'}`} />
                    </div>
                  ))}
                </div>
              )}

              {renderStepContent()}

              {/* Navigation buttons */}
              {currentStep < 5 && currentStep < 7 && (
                <div className="mt-8 flex justify-between gap-4">
                  <button
                    onClick={handleBack}
                    disabled={currentStep === 1}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                      currentStep === 1
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                    }`}
                  >
                    <ArrowLeft size={20} /> Back
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={!canProceed() || isSubmitting}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
                      canProceed() && !isSubmitting
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <LoadingSpinner size="sm" /> Submitting...
                      </>
                    ) : (
                      <>
                        {currentStep === 4 ? 'Submit' : 'Next'} <ArrowRight size={20} />
                      </>
                    )}
                  </button>
                </div>
              )}

              {(currentStep === 6 || currentStep === 7) && (
                <div className="mt-8 flex justify-center gap-4">
                  <button
                    onClick={() => window.location.href = '/dashboard'}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                  >
                    Back to Dashboard
                  </button>
                </div>
              )}
            </div>
          </main>

          <Footer />
        </div>
      );
    };

    export default Withdraw;