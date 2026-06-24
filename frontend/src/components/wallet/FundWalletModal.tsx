import React, { useState, useEffect } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { X, Wallet, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface FundWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export const FundWalletModal: React.FC<FundWalletModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [amount, setAmount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Paystack config state
  const [paystackConfig, setPaystackConfig] = useState<any>(null);
  const { user } = useAuth();

  const initializePayment = usePaystackPayment(paystackConfig || { publicKey: '' });

  useEffect(() => {
    if (paystackConfig && initializePayment) {
      initializePayment({
        onSuccess: async (reference: any) => {
          try {
            const verifyRes = await api.post('/wallet/verify-payment', { reference: reference.reference || paystackConfig.reference });
            setSuccess('Payment successful! Your wallet has been credited.');
            setTimeout(() => {
              onSuccess(verifyRes.data.amount);
              setSuccess('');
              setAmount('');
              setPaystackConfig(null);
              onClose();
            }, 2000);
          } catch (err) {
            console.error('Verification failed', err);
            setError('Payment was successful but verification failed. Please contact support.');
          }
        },
        onClose: () => {
          setIsLoading(false);
          setPaystackConfig(null);
        }
      });
    }
  }, [paystackConfig]);

  const handleFund = async () => {
    setError('');
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < 100) {
      setError('Please enter a valid amount (minimum ₦100)');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Initialize deposit on our backend
      const depositRes = await api.post('/wallet/fund', { amount: numAmount, paymentMethod: 'card' });
      const transactionId = depositRes.data.id;

      // 2. Set config to trigger Paystack hook in useEffect
      setPaystackConfig({
        reference: transactionId,
        email: user?.email || 'user@example.com',
        amount: numAmount * 100, // Paystack uses kobo
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
      });

    } catch (err: any) {
      console.error('Failed to initialize deposit', err);
      setError(err.response?.data?.error || 'Failed to initialize deposit');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Wallet size={20} className="text-primary" />
            Fund Wallet
          </h3>
          <button onClick={() => {
            if (!isLoading) onClose();
          }} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Success!</h4>
              <p className="text-sm text-gray-600">{success}</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount (₦)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">₦</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>

              <Button
                onClick={handleFund}
                isLoading={isLoading}
                className="w-full py-3.5 text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Continue to Payment
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
