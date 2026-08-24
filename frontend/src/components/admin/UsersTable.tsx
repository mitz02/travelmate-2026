import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import {
  Search, RefreshCw, UserX, UserCheck, Trash2, Filter, Wallet,
  X, CheckCircle, AlertCircle, Eye, Edit3, UserPlus, Shield, Car,
  BookOpen, Calendar, Mail, Phone, ArrowLeft, Save, CreditCard, Check, Clock, User, MoreVertical
} from 'lucide-react';

interface UserWallet {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  account_status: string;
  kyc_status?: string;
  balance: number;
  held_amount: number;
  total_earnings: number;
  total_withdrawn: number;
  wallet_status: string;
  created_at: string;
  rides_count?: number;
  bookings_count?: number;
  kyc_documents?: any[];
}

type Props = { onRefresh?: () => void };

const fc = (n: number) => '₦' + Number(n || 0).toLocaleString();

/* ───────────────────────────────────────────────────────────
   1. USER DETAILS PAGE (Full Page View)
─────────────────────────────────────────────────────────── */
const UserDetailPage: React.FC<{
  userId: string;
  onBack: () => void;
  onEdit: (u: UserWallet) => void;
  onRefresh: () => void;
}> = ({ userId, onBack, onEdit, onRefresh }) => {
  const [user, setUser] = useState<UserWallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'overview' | 'wallet'>('overview');
  const [walletTab, setWalletTab] = useState<'credit' | 'debit' | 'history'>('credit');
  
  // Wallet action state
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  const fetchUserDetails = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users/${userId}`);
      setUser(res.data.user || null);
    } catch (e) {
      console.error('Failed to load user details:', e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const fetchTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await api.get(`/admin/wallets/${userId}/transactions`);
      setTransactions(res.data.transactions || []);
    } catch (e) {
      console.error('Failed to load transactions:', e);
    } finally {
      setTxLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUserDetails();
  }, [fetchUserDetails]);

  useEffect(() => {
    if (tab === 'wallet' && walletTab === 'history') {
      fetchTransactions();
    }
  }, [tab, walletTab, fetchTransactions]);

  const handleWalletSubmit = async (type: 'credit' | 'debit') => {
    if (!amount || Number(amount) <= 0) {
      setError('Please enter a valid amount'); return;
    }
    setActionLoading(true); setMsg(''); setError('');
    try {
      await api.post(`/admin/wallets/${userId}/${type}`, {
        amount: Number(amount),
        reason
      });
      setMsg(`Successfully ${type === 'credit' ? 'credited' : 'debited'} ${fc(Number(amount))}`);
      setAmount(''); setReason('');
      fetchUserDetails();
      if (walletTab === 'history') fetchTransactions();
      onRefresh();
    } catch (e: any) {
      setError(e.response?.data?.error || `Failed to ${type} wallet`);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleStatus = async (newStatus: string) => {
    try {
      await api.put(`/admin/users/${userId}/status`, { status: newStatus });
      fetchUserDetails();
      onRefresh();
    } catch (e) {
      console.error('Failed to update status:', e);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-gray-500 bg-white rounded-2xl border border-gray-200 shadow-sm animate-fade-in">
        Loading user profile details...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-200 shadow-sm">
        <p className="text-gray-600 font-bold mb-4">User account not found.</p>
        <button onClick={onBack} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
          ← Back to Users
        </button>
      </div>
    );
  }

  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User Account';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Bar with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-bold text-xs flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back to Users
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{fullName}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold capitalize ${
                user.account_status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>{user.account_status || 'active'}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{user.email || user.phone || 'No contact email'}</p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button onClick={() => onEdit(user)}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-100 transition-all">
            <Edit3 size={15} /> Edit Profile
          </button>

          {user.account_status !== 'suspended' ? (
            <button onClick={() => toggleStatus('suspended')}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl border border-amber-100 transition-all">
              <UserX size={15} /> Suspend Account
            </button>
          ) : (
            <button onClick={() => toggleStatus('active')}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-100 transition-all">
              <UserCheck size={15} /> Activate Account
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: User Profile Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
          <div className="text-center pb-5 border-b border-gray-100">
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white font-black text-2xl flex items-center justify-center shadow-lg mb-3">
              {(user.first_name?.[0] || 'U').toUpperCase()}
            </div>
            <h3 className="font-bold text-gray-900 text-lg">{fullName}</h3>
            <p className="text-xs text-indigo-600 font-extrabold uppercase mt-1 tracking-wider">{user.role}</p>
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 font-semibold flex items-center gap-2"><Mail size={14} /> Email</span>
              <span className="font-bold text-gray-900">{user.email || 'Not provided'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 font-semibold flex items-center gap-2"><Phone size={14} /> Phone</span>
              <span className="font-bold text-gray-900">{user.phone || 'Not provided'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 font-semibold flex items-center gap-2"><Shield size={14} /> KYC Status</span>
              <span className={`font-bold capitalize px-2 py-0.5 rounded-md ${
                user.kyc_status === 'verified' ? 'bg-emerald-100 text-emerald-800' :
                user.kyc_status === 'pending' ? 'bg-amber-100 text-amber-800' : 'bg-gray-200 text-gray-700'
              }`}>{user.kyc_status || 'none'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
              <span className="text-gray-500 font-semibold flex items-center gap-2"><Calendar size={14} /> Joined</span>
              <span className="font-bold text-gray-900">
                {user.created_at ? new Date(user.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Financial & Activity Dashboard */}
        <div className="lg:col-span-2 space-y-6">
          {/* Financial Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-indigo-100 shadow-sm bg-gradient-to-br from-indigo-50/40 to-white">
              <p className="text-xs font-extrabold uppercase text-indigo-500 tracking-wider">Wallet Balance</p>
              <h3 className="text-2xl font-black text-indigo-950 mt-1">{fc(Number(user.balance))}</h3>
              <p className="text-xs text-gray-500 mt-1">Available for transactions</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm bg-gradient-to-br from-amber-50/40 to-white">
              <p className="text-xs font-extrabold uppercase text-amber-500 tracking-wider">Held in Escrow</p>
              <h3 className="text-2xl font-black text-amber-950 mt-1">{fc(Number(user.held_amount))}</h3>
              <p className="text-xs text-gray-500 mt-1">Pending trip completions</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Total Earnings</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{fc(Number(user.total_earnings))}</h3>
              <p className="text-xs text-emerald-600 font-bold mt-1">Cumulative trip payout</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
              <p className="text-xs font-extrabold uppercase text-gray-400 tracking-wider">Total Withdrawn</p>
              <h3 className="text-2xl font-black text-gray-900 mt-1">{fc(Number(user.total_withdrawn))}</h3>
              <p className="text-xs text-gray-500 mt-1">Disbursed to bank account</p>
            </div>
          </div>

          {/* Wallet Actions & History Tabbed Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Wallet className="text-indigo-600" size={18} /> Wallet Management & Operations
              </h4>
              <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                {(['credit', 'debit', 'history'] as const).map(t => (
                  <button key={t} onClick={() => { setWalletTab(t); setMsg(''); setError(''); }}
                    className={`px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-lg transition-all ${
                      walletTab === t ? 'bg-white text-indigo-600 shadow-xs' : 'text-gray-500 hover:text-gray-900'
                    }`}>
                    {t === 'credit' ? 'Credit' : t === 'debit' ? 'Debit' : 'History'}
                  </button>
                ))}
              </div>
            </div>

            {msg && (
              <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                <CheckCircle size={16} /> {msg}
              </div>
            )}
            {error && (
              <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            {(walletTab === 'credit' || walletTab === 'debit') && (
              <div className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount (₦) *</label>
                  <input type="number" min="1" placeholder="e.g. 5000" value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reason / Note</label>
                  <input type="text" placeholder="Reason for transaction..." value={reason}
                    onChange={e => setReason(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
                </div>
                <button onClick={() => handleWalletSubmit(walletTab)} disabled={actionLoading}
                  className={`px-6 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all shadow-md ${
                    walletTab === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  } disabled:opacity-50`}>
                  {actionLoading ? 'Processing...' : walletTab === 'credit' ? `Credit ${fc(Number(amount || 0))}` : `Debit ${fc(Number(amount || 0))}`}
                </button>
              </div>
            )}

            {walletTab === 'history' && (
              <div>
                {txLoading ? (
                  <p className="text-xs text-gray-400 text-center py-8">Loading transactions...</p>
                ) : transactions.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-8">No transaction history recorded.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 border-b border-gray-100 text-gray-400 uppercase font-bold text-[10px]">
                        <tr>
                          <th className="p-3">Type</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {transactions.map((tx: any) => (
                          <tr key={tx.id}>
                            <td className="p-3 capitalize font-semibold text-gray-700">{tx.type?.replace(/_/g, ' ')}</td>
                            <td className={`p-3 font-extrabold ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                              {fc(Number(tx.amount))}
                            </td>
                            <td className="p-3 text-gray-400 text-[11px]">{new Date(tx.created_at).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────
   2. USER EDIT PAGE (Full Page View)
─────────────────────────────────────────────────────────── */
const UserEditPage: React.FC<{
  user: UserWallet;
  onBack: () => void;
  onSuccess: () => void;
}> = ({ user, onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: user.first_name || '',
    lastName: user.last_name || '',
    email: user.email || '',
    phone: user.phone || '',
    role: user.role || 'rider',
    accountStatus: user.account_status || 'active',
    kycStatus: user.kyc_status || 'none',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setLoading(true);
    try {
      await api.put(`/admin/users/${user.user_id || user.id}`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        accountStatus: formData.accountStatus,
        kycStatus: formData.kycStatus,
      });

      setSuccess('User profile updated successfully!');
      setTimeout(() => {
        onSuccess();
        onBack();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-bold text-xs flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back to Users
          </button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit User Profile</h2>
            <p className="text-xs text-gray-500 mt-0.5">Modify personal details, system roles, and account permissions.</p>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
            <input type="text" required value={formData.firstName}
              onChange={e => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Last Name *</label>
            <input type="text" required value={formData.lastName}
              onChange={e => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
            <input type="email" value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
            <input type="text" value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Platform Role</label>
            <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500">
              <option value="rider">Rider</option>
              <option value="driver">Driver</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Account Status</label>
            <select value={formData.accountStatus} onChange={e => setFormData({ ...formData, accountStatus: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500">
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">KYC Verification Status</label>
            <select value={formData.kycStatus} onChange={e => setFormData({ ...formData, kycStatus: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:border-indigo-500">
              <option value="none">Unverified (None)</option>
              <option value="pending font-bold">Pending Review</option>
              <option value="verified font-bold">Verified (Approved)</option>
              <option value="rejected font-bold">Rejected</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button type="button" onClick={onBack} className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all disabled:opacity-50">
            <Save size={15} /> {loading ? 'Saving Profile...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────
   3. ONBOARD USER PAGE (Full Page View)
─────────────────────────────────────────────────────────── */
const OnboardUserPage: React.FC<{
  onBack: () => void;
  onSuccess: () => void;
}> = ({ onBack, onSuccess }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'rider',
    password: '',
    initialBalance: '',
    accountStatus: 'active',
    kycStatus: 'none',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!formData.firstName || !formData.lastName) {
      setError('First name and last name are required'); return;
    }
    if (!formData.email && !formData.phone) {
      setError('Either Email or Phone number is required'); return;
    }

    setLoading(true);
    try {
      await api.post('/admin/users', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        role: formData.role,
        password: formData.password || undefined,
        initialBalance: formData.initialBalance ? Number(formData.initialBalance) : 0,
        accountStatus: formData.accountStatus,
        kycStatus: formData.kycStatus,
      });

      setSuccess('User account onboarded successfully!');
      setTimeout(() => {
        onSuccess();
        onBack();
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to onboard user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors font-bold text-xs flex items-center gap-1.5">
            <ArrowLeft size={16} /> Back to Users
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 hidden sm:flex items-center justify-center font-bold">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Onboard New User</h2>
              <p className="text-xs text-gray-500 mt-0.5">Manually add a rider, driver, or admin to the platform.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Onboard Form */}
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-2">
              <CheckCircle size={16} /> {success}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">First Name *</label>
              <input type="text" required placeholder="John" value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Last Name *</label>
              <input type="text" required placeholder="Doe" value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
              <input type="email" placeholder="user@example.com" value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Phone Number</label>
              <input type="text" placeholder="+234..." value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">User Role</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold">
                <option value="rider">Rider</option>
                <option value="driver">Driver</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Account Status</label>
              <select value={formData.accountStatus} onChange={e => setFormData({ ...formData, accountStatus: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold">
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Password</label>
              <input type="password" placeholder="Default: TravelMate123!" value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Initial Wallet Balance (₦)</label>
              <input type="number" min="0" placeholder="0" value={formData.initialBalance}
                onChange={e => setFormData({ ...formData, initialBalance: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">KYC Verification Status</label>
            <select value={formData.kycStatus} onChange={e => setFormData({ ...formData, kycStatus: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500 font-semibold">
              <option value="none">Unverified (None)</option>
              <option value="pending">Pending Review</option>
              <option value="verified">Verified (Approved)</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button type="button" onClick={onBack} className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all disabled:opacity-50">
              <UserPlus size={15} /> {loading ? 'Creating User...' : 'Onboard User'}
            </button>
          </div>
        </form>
    </div>
  );
};

/* ───────────────────────────────────────────────────────────
   4. MAIN USERS TABLE & PAGE ROUTER
─────────────────────────────────────────────────────────── */
const UsersTable: React.FC<Props> = ({ onRefresh }) => {
  const [users, setUsers] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);

  // Page view state: 'list' | 'details' | 'edit' | 'onboard'
  const [viewMode, setViewMode] = useState<'list' | 'details' | 'edit' | 'onboard'>('list');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWallet | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async (q?: string, role?: string, status?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (role) params.set('role', role);
      params.set('limit', '200');
      const res = await api.get(`/admin/wallets?${params.toString()}`);
      let list = res.data.wallets || [];
      if (status) {
        list = list.filter((u: any) => u.account_status === status);
      }
      setUsers(list);
    } catch (e) {
      console.error('Failed to fetch users:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(debouncedSearch, roleFilter, statusFilter);
  }, [debouncedSearch, roleFilter, statusFilter, fetchUsers]);

  const toggleStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/admin/users/${id}/status`, { status: newStatus });
      fetchUsers(debouncedSearch, roleFilter, statusFilter);
      onRefresh?.();
    } catch (e) { console.error('Status toggle error:', e); }
  };

  const handleDeleteUser = async (u: UserWallet) => {
    const id = u.user_id || u.id;
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email || u.phone || 'this user';
    if (!window.confirm(`Permanently delete ${name}? Their wallet and profile will be removed. This cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers(prev => prev.filter(x => (x.user_id || x.id) !== id));
      onRefresh?.();
    } catch (e: any) {
      console.error('Delete user error:', e);
      alert(e.response?.data?.error || 'Failed to delete user');
    } finally {
      setDeletingId(null);
      setMenuOpenId(null);
    }
  };

  const handleOpenDetails = (u: UserWallet) => {
    setSelectedUserId(u.user_id || u.id);
    setSelectedUser(u);
    setViewMode('details');
  };

  const handleOpenEdit = (u: UserWallet) => {
    setSelectedUserId(u.user_id || u.id);
    setSelectedUser(u);
    setViewMode('edit');
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedUserId(null);
    setSelectedUser(null);
  };

  // Render Full Page: User Details Page
  if (viewMode === 'details' && selectedUserId) {
    return (
      <UserDetailPage
        userId={selectedUserId}
        onBack={handleBackToList}
        onEdit={(u) => { setSelectedUser(u); setViewMode('edit'); }}
        onRefresh={() => fetchUsers(debouncedSearch, roleFilter, statusFilter)}
      />
    );
  }

  // Render Full Page: User Edit Page
  if (viewMode === 'edit' && selectedUser) {
    return (
      <UserEditPage
        user={selectedUser}
        onBack={handleBackToList}
        onSuccess={() => fetchUsers(debouncedSearch, roleFilter, statusFilter)}
      />
    );
  }

  // Render Full Page: Onboard User
  if (viewMode === 'onboard') {
    return (
      <OnboardUserPage
        onBack={handleBackToList}
        onSuccess={() => fetchUsers(debouncedSearch, roleFilter, statusFilter)}
      />
    );
  }

  // Render Main Users Table Page
  return (
    <div className="space-y-5 animate-fade-in">
      {/* Top Action Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Search by name, email, or phone..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 shadow-sm transition-all" />
        </div>

        {/* Filters & Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            {[{ label: 'All', value: undefined }, { label: 'Drivers', value: 'driver' }, { label: 'Riders', value: 'rider' }, { label: 'Admins', value: 'admin' }].map(({ label, value }) => (
              <button key={label} onClick={() => setRoleFilter(value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${roleFilter === value ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}>{label}</button>
            ))}
          </div>

          {/* Account Status Filter */}
          <select value={statusFilter || ''} onChange={e => setStatusFilter(e.target.value || undefined)} title="Filter by account status"
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 outline-none focus:border-indigo-500 cursor-pointer shadow-sm">
            <option value="">Any Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>

          {/* Onboard Button */}
          <button onClick={() => setViewMode('onboard')}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all">
            <UserPlus size={15} /> Onboard User
          </button>

          {/* Refresh Button */}
          <button onClick={() => fetchUsers(debouncedSearch, roleFilter, statusFilter)}
            className="p-2.5 text-gray-500 hover:text-gray-900 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-all" title="Refresh list">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="py-16 text-center text-sm text-gray-400 font-medium bg-white rounded-2xl border border-gray-200">
          Loading platform users...
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 shadow-sm bg-white">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-xs font-bold text-gray-500 uppercase tracking-wider">
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Wallet Balance</th>
                <th className="px-5 py-4">KYC Status</th>
                <th className="px-5 py-4">Account Status</th>
                <th className="px-5 py-4">Joined</th>
                <th className="px-5 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-sm text-gray-400">
                    {search ? 'No users matched your search terms.' : 'No users found on the system.'}
                  </td>
                </tr>
              ) : users.map((u) => {
                const rowId = u.user_id || u.id;
                return (
                <tr key={u.id || u.user_id} className="hover:bg-gray-50/60 transition-colors">
                  {/* User Profile */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                        {(u.first_name?.[0] || u.email?.[0] || 'U').toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm leading-tight">
                          {u.first_name || u.last_name ? `${u.first_name || ''} ${u.last_name || ''}`.trim() : 'Unnamed User'}
                        </p>
                        <p className="text-xs text-gray-400">{u.email || u.phone || '-'}</p>
                      </div>
                    </div>
                  </td>

                  {/* Role */}
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold capitalize ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                      u.role === 'driver' ? 'bg-blue-100 text-blue-800' :
                      'bg-emerald-100 text-emerald-800'
                    }`}>{u.role}</span>
                  </td>

                  {/* Wallet */}
                  <td className="px-5 py-3.5">
                    <p className="font-extrabold text-gray-900">{fc(Number(u.balance))}</p>
                    {Number(u.held_amount) > 0 && (
                      <p className="text-[10px] text-amber-600 font-semibold">{fc(Number(u.held_amount))} held</p>
                    )}
                  </td>

                  {/* KYC Status */}
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold capitalize ${
                      u.kyc_status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      u.kyc_status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                      'bg-gray-100 text-gray-500'
                    }`}>{u.kyc_status || 'none'}</span>
                  </td>

                  {/* Account Status */}
                  <td className="px-5 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold capitalize ${
                      u.account_status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-red-100 text-red-800'
                    }`}>{u.account_status || 'active'}</span>
                  </td>

                  {/* Joined */}
                  <td className="px-5 py-3.5 text-xs text-gray-400 font-medium">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* View Details Page */}
                      <button onClick={() => handleOpenDetails(u)} title="View User Details Page"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-colors">
                        <Eye size={14} /> View
                      </button>

                      {/* Edit Page */}
                      <button onClick={() => handleOpenEdit(u)} title="Edit User Profile Page"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 rounded-lg transition-colors">
                        <Edit3 size={14} /> Edit
                      </button>

                      {/* Suspend / Activate */}
                      {u.account_status !== 'suspended' ? (
                        <button onClick={() => toggleStatus(u.user_id || u.id, 'suspended')} title="Suspend User Account"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-lg transition-colors">
                          <UserX size={14} /> Suspend
                        </button>
                      ) : (
                        <button onClick={() => toggleStatus(u.user_id || u.id, 'active')} title="Activate User Account"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg transition-colors">
                          <UserCheck size={14} /> Activate
                        </button>
                      )}

                      {/* More Actions (3 dots) */}
                      <div className="relative">
                        <button onClick={() => setMenuOpenId(menuOpenId === rowId ? null : rowId)} title="More actions"
                          className={`p-1.5 rounded-lg transition-colors ${menuOpenId === rowId ? 'text-gray-700 bg-gray-100' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}>
                          <MoreVertical size={16} />
                        </button>

                        {menuOpenId === rowId && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setMenuOpenId(null)} />
                            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-xl py-1.5 z-40 animate-fade-in">
                              <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Danger Zone</div>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={deletingId === rowId}
                                className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 text-left">
                                {deletingId === rowId ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                {deletingId === rowId ? 'Deleting...' : 'Delete User'}
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UsersTable;
