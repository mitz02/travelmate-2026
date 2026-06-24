import React, { useState, useEffect, useCallback } from 'react';
import { X, Wallet, CheckCircle, Banknote, Loader } from 'lucide-react';
import { Button } from '../ui/Button';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'form' | 'confirm' | 'success' | 'error';

interface Bank {
  code: string;
  name: string;
}

interface SavedBank {
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  recipient_code: string | null;
}

export const WithdrawModal: React.FC<WithdrawModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState(0);
  const [step, setStep] = useState<Step>('form');
  const [message, setMessage] = useState('');

  const [banks, setBanks] = useState<Bank[]>([]);
  const [savedBank, setSavedBank] = useState<SavedBank | null>(null);
  const [useSavedBank, setUseSavedBank] = useState(false);
  const [selectedBank, setSelectedBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setStep('form');
    setError('');
    setMessage('');
    setUseSavedBank(false);
    setSelectedBank('');
    setAccountNumber('');
    setAccountName('');
    setAmount('');
    fetchBalance();
    fetchBanks();
    fetchSavedBank();
  }, [isOpen]);

  const fetchBalance = async () => {
    try {
      const res = await api.get('/wallet/me');
      setBalance(res.data.balance || 0);
    } catch { }
  };

  const fetchBanks = async () => {
    try {
      const res = await api.get('/wallet/banks');
      setBanks(res.data.banks || []);
    } catch { }
  };

  const fetchSavedBank = async () => {
    try {
      const res = await api.get('/wallet/bank-account');
      if (res.data.account) {
        setSavedBank(res.data.account);
      }
    } catch { }
  };

  const useSaved = () => {
    if (!savedBank) return;
    setUseSavedBank(true);
    setSelectedBank(savedBank.bank_code);
    setAccountNumber(savedBank.account_number);
    setAccountName(savedBank.account_name);
  };

  const resolveAccount = useCallback(async () => {
    if (!selectedBank || accountNumber.length !== 10) return;
    setIsResolving(true);
    setError('');
    try {
      const res = await api.post('/wallet/resolve-account', { bankCode: selectedBank, accountNumber });
      setAccountName(res.data.account_name || '');
    } catch (err: any) {
      setAccountName('');
      setError(err.response?.data?.error || 'Could not verify account');
    } finally {
      setIsResolving(false);
    }
  }, [selectedBank, accountNumber]);

  useEffect(() => {
    if (useSavedBank) return;
    if (accountNumber.length === 10 && selectedBank) {
      const timer = setTimeout(resolveAccount, 500);
      return () => clearTimeout(timer);
    }
    setAccountName('');
  }, [accountNumber, selectedBank, resolveAccount, useSavedBank]);

  const handleSubmit = async () => {
    setError('');
    const numAmount = parseFloat(amount);
    if (!selectedBank) { setError('Select a bank'); return; }
    if (accountNumber.length !== 10) { setError('Enter a valid 10-digit account number'); return; }
    if (!accountName) { setError('Account name not verified'); return; }
    if (isNaN(numAmount) || numAmount < 100) { setError('Minimum withdrawal is ₦100'); return; }
    if (numAmount > balance) { setError('Insufficient balance'); return; }

    setIsLoading(true);
    try {
      const bankName = banks.find(b => b.code === selectedBank)?.name || '';
      await api.post('/wallet/withdraw', {
        amount: numAmount,
        bankCode: selectedBank,
        bankName,
        accountNumber,
        accountName,
      });
      setStep('success');
      setMessage('Withdrawal initiated. Funds will be sent to your bank account.');
      setTimeout(() => { onSuccess(); onClose(); }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Withdrawal failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Banknote size={20} className="text-primary" />
            Withdraw Funds
          </h3>
          <button onClick={() => { if (!isLoading) onClose(); }} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {step === 'success' ? (
            <div className="text-center py-6">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
              <h4 className="text-lg font-bold text-gray-900 mb-2">Withdrawal Initiated!</h4>
              <p className="text-sm text-gray-600">{message}</p>
            </div>
          ) : (
            <>
              <div className="mb-6 p-4 bg-indigo-50 rounded-xl flex items-center justify-between">
                <span className="text-sm font-medium text-indigo-700">Available Balance</span>
                <span className="text-lg font-bold text-indigo-900">₦{balance.toLocaleString()}</span>
              </div>

              <div className="space-y-4">
                {savedBank && !useSavedBank && (
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <p className="text-sm font-medium text-indigo-800 mb-2">Saved bank account</p>
                    <p className="text-sm text-indigo-700">{savedBank.bank_name} - {savedBank.account_number}</p>
                    <p className="text-xs text-indigo-500 mb-3">{savedBank.account_name}</p>
                    <button
                      onClick={useSaved}
                      className="text-sm font-semibold text-indigo-700 hover:text-indigo-900 underline"
                    >
                      Use this account
                    </button>
                  </div>
                )}

                {!useSavedBank && !savedBank && (
                  <p className="text-sm text-gray-500 mb-2">No saved bank account found. Enter your bank details below.</p>
                )}

                {useSavedBank ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-emerald-800">Withdrawing to</p>
                      <button
                        onClick={() => { setUseSavedBank(false); setSelectedBank(''); setAccountNumber(''); setAccountName(''); }}
                        className="text-xs text-emerald-600 underline"
                      >
                        Change
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-emerald-900">{savedBank?.bank_name}</p>
                    <p className="text-sm text-emerald-800">{savedBank?.account_number} - {savedBank?.account_name}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Bank</label>
                      <select
                        value={selectedBank}
                        onChange={e => { setSelectedBank(e.target.value); setAccountName(''); }}
                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all bg-white"
                      >
                        <option value="">-- Select a bank --</option>
                        {banks.map(b => (
                          <option key={b.code} value={b.code}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Account Number</label>
                      <input
                        type="text"
                        maxLength={10}
                        value={accountNumber}
                        onChange={e => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="0123456789"
                        className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                      />
                    </div>

                    {isResolving && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader size={14} className="animate-spin" /> Verifying account...
                      </div>
                    )}

                    {accountName && !isResolving && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm font-medium text-emerald-800">
                        {accountName}
                      </div>
                    )}
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount (₦)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                    min={100}
                    className="w-full p-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  />
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}

                <Button
                  onClick={handleSubmit}
                  isLoading={isLoading}
                  disabled={!selectedBank || accountNumber.length !== 10 || !accountName || !amount || isResolving}
                  className="w-full py-3.5 text-base rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Withdraw to Bank
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
