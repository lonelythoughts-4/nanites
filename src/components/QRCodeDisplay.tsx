import React from 'react';
    import { Copy, Check } from 'lucide-react';
    import { useState } from 'react';

    interface QRCodeDisplayProps {
      address: string;
      amount?: string;
      chain: string;
      qrData?: string;
    }

    const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({ address, amount, chain, qrData }) => {
      const [copied, setCopied] = useState(false);

      const handleCopy = async () => {
        try {
          await navigator.clipboard.writeText(address);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      };

      const qrPayload = qrData || address;
      // Generate QR code URL using a public service
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrPayload)}`;

      return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="text-center">
            <div className="mb-4">
              <img
                src={qrCodeUrl}
                alt="Deposit Address QR Code"
                className="mx-auto rounded-lg border border-gray-200"
                width={200}
                height={200}
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {chain.toUpperCase()} Deposit Address
                </label>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 p-3 bg-gray-50 rounded-md border text-sm font-mono break-all">
                    {address}
                  </div>
                  <button
                    onClick={handleCopy}
                    className="p-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {amount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Send
                  </label>
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200 text-center">
                    <span className="text-lg font-semibold text-blue-900">${amount}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-yellow-50 rounded-md border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Important:</strong> Only send {chain.toUpperCase()} to this address. 
                Sending other cryptocurrencies may result in permanent loss.
              </p>
            </div>
          </div>
        </div>
      );
    };

    export default QRCodeDisplay;
