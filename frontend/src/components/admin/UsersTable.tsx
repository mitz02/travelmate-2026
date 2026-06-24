import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Search, RefreshCw, UserX, UserCheck, Trash2, Filter, Wallet, ArrowUpRight, ArrowDownLeft, X, Clock, CheckCircle, AlertCircle, MoreVertical, User } from 'lucide-react';

interface UserWallet {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: string;
  account_status: string;
  balance: number;
  held_amount: number;
  total_earnings: number;
  total_withdrawn: number;
  wallet_status: string;
  created_at: string;
}

type Props = { onRefresh?: () => void };

const fc = (n: number) => '₦' + Number(n).toLocaleString();

const UserSidebar: React.FC<{
  user: UserWallet | null;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}> = ({ user, open, onClose, onDone }) => {
  const [tab, setTab] = useState<'credit' | 'debit' | 'transactions'>('credit');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txLoading, setTxLoading] = useState(false);

  useEffect(() => {
    if (open && user && tab === 'transactions') {
      setTxLoading(true);
      api.get(`/admin/wallets/${user.user_id}/transactions`)
        .then(r => setTransactions(r.data.transactions || []))
        .catch(() => setError('Failed to load transactions'))
        .finally(() => setTxLoading(false));
    }
  }, [open, user, tab]);

  useEffect(() => {
    if (!open) { setMsg(''); setError(''); setAmount(''); setReason(''); }
  }, [open]);

  if (!user || !open) return null;

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) { setError('Enter a valid amount'); return; }
    setLoading(true); setMsg(''); setError('');
    try {
      const ep = tab === 'credit' ? 'credit' : 'debit';
      const res = await api.post(`/admin/wallets/${user.user_id}/${ep}`, { amount: Number(amount), reason });
      setMsg(`${tab === 'credit' ? 'Credited' : 'Debited'} ${fc(Number(amount))} successfully`);
      setAmount('');
      setReason('');
      if (tab === 'transactions') {
        const txRes = await api.get(`/admin/wallets/${user.user_id}/transactions`);
        setTransactions(txRes.data.transactions || []);
      }
      onDone();
    } catch (e: any) {
      setError(e.response?.data?.error || `Failed to ${tab} wallet`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
        zIndex: 999,
      }} onClick={onClose} />
      <div style={{
        position: 'fixed', top: 0, right: 0, height: '100vh',
        width: '460px', maxWidth: '96vw',
        background: '#fff', borderLeft: '1px solid #E5E7EB',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.1)',
        display: 'flex', flexDirection: 'column',
        zIndex: 1000,
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #E5E7EB', flexShrink: 0,
        }}>
          <div className="flex items-center gap-3">
          <div style={{
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <User size={18} color="#fff" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-base">
              {user.first_name || user.last_name ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Unnamed User'}
            </h3>
            <p className="text-xs text-gray-400">{user.email || user.phone || ''}</p>
          </div>
        </div>
        <button onClick={onClose} style={{
          width: '32px', height: '32px', borderRadius: '50%', border: 'none',
          background: '#F3F4F6', color: '#6B7280', cursor: 'pointer', fontSize: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
        }}
          onMouseOver={e => { e.currentTarget.style.background = '#E5E7EB'; e.currentTarget.style.color = '#111827'; }}
          onMouseOut={e => { e.currentTarget.style.background = '#F3F4F6'; e.currentTarget.style.color = '#6B7280'; }}>
          <X size={18} />
        </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* Balance Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Balance</p>
            <p className="text-xl font-black text-gray-900">{fc(Number(user.balance))}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4">
            <p className="text-xs text-amber-500 font-semibold uppercase mb-1">Held in Escrow</p>
            <p className="text-xl font-black text-amber-600">{fc(Number(user.held_amount))}</p>
          </div>
          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-xs text-indigo-500 font-semibold uppercase mb-1">Total Earnings</p>
            <p className="text-xl font-black text-indigo-600">{fc(Number(user.total_earnings))}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-xs text-purple-500 font-semibold uppercase mb-1">Withdrawn</p>
            <p className="text-xl font-black text-purple-600">{fc(Number(user.total_withdrawn))}</p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex gap-2 mb-5">
          {(['credit', 'debit', 'transactions'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setMsg(''); setError(''); }}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-colors ${
                tab === t
                  ? t === 'credit' ? 'bg-green-600 text-white border-green-600' :
                    t === 'debit' ? 'bg-red-600 text-white border-red-600' :
                    'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}>
              {t === 'credit' ? 'Credit' : t === 'debit' ? 'Debit' : 'History'}
            </button>
          ))}
        </div>

        {msg && (
          <div className="p-3 mb-4 bg-green-50 border border-green-100 text-green-700 text-sm rounded-lg flex items-center gap-2">
            <CheckCircle size={16} /> {msg}
          </div>
        )}
        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {tab === 'transactions' ? (
          <div>
            {txLoading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading transactions...</p>
            ) : transactions.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No transactions yet</p>
            ) : (
              <div style={{ maxHeight: 'calc(100vh - 460px)', overflowY: 'auto' }}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-2 text-[11px] font-semibold text-gray-400 uppercase">Type</th>
                      <th className="pb-2 text-[11px] font-semibold text-gray-400 uppercase">Amount</th>
                      <th className="pb-2 text-[11px] font-semibold text-gray-400 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx: any) => (
                      <tr key={tx.id} className="border-b border-gray-50">
                        <td className="py-2.5 text-xs capitalize text-gray-700">{tx.type.replace(/_/g, ' ')}</td>
                        <td className={`py-2.5 text-xs font-bold ${
                          tx.type === 'admin_credit' || tx.type === 'refund' || tx.type === 'booking_earnings'
                            ? 'text-green-600' : tx.type === 'admin_debit' || tx.type === 'booking_payment'
                            ? 'text-red-600' : 'text-gray-700'
                        }`}>
                          {tx.type === 'admin_credit' || tx.type === 'refund' || tx.type === 'booking_earnings' ? '+' :
                           tx.type === 'admin_debit' || tx.type === 'booking_payment' ? '-' : ''}{fc(Number(tx.amount))}
                        </td>
                        <td className="py-2.5 text-[11px] text-gray-400">{new Date(tx.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (₦)</label>
              <input type="number" min={0} placeholder="0"
                value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-colors" />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">Reason</label>
              <input type="text" placeholder="Optional reason..."
                value={reason} onChange={e => setReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-colors" />
            </div>
            <button onClick={handleSubmit} disabled={loading}
              className={`w-full py-3 rounded-xl text-sm font-bold text-white transition-colors ${
                tab === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50`}>
              {loading ? 'Processing...' : tab === 'credit' ? `Credit ${fc(Number(amount || 0))}` : `Debit ${fc(Number(amount || 0))}`}
            </button>
          </div>
        )}
        </div>
      </div>
    </>
  );
};

const UsersTable: React.FC<Props> = ({ onRefresh }) => {
  const [users, setUsers] = useState<UserWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>(undefined);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sidebarUser, setSidebarUser] = useState<UserWallet | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchUsers = useCallback(async (q?: string, role?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set('search', q);
      if (role) params.set('role', role);
      params.set('limit', '100');
      const res = await api.get(`/admin/wallets?${params.toString()}`);
      setUsers(res.data.wallets || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers(debouncedSearch, roleFilter);
  }, [debouncedSearch, roleFilter, fetchUsers]);

  const toggleStatus = async (id: string, newStatus: string) => {
    try {
      await api.put(`/admin/users/${id}/status`, { status: newStatus });
      fetchUsers(debouncedSearch, roleFilter);
      onRefresh?.();
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;
    setDeleting(id);
    try {
      await api.delete(`/admin/users/${id}`);
      fetchUsers(debouncedSearch, roleFilter);
      onRefresh?.();
    } catch (e) { console.error(e); }
    setDeleting(null);
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all" />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          {[{ label: 'All', value: undefined }, { label: 'Drivers', value: 'driver' }, { label: 'Riders', value: 'rider' }, { label: 'Admins', value: 'admin' }].map(({ label, value }) => (
            <button key={label} onClick={() => setRoleFilter(value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${roleFilter === value ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{label}</button>
          ))}
        </div>
        <button onClick={() => fetchUsers(debouncedSearch, roleFilter)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading users...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full bg-white text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Balance</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Held</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">{search ? 'No users match your search.' : 'No users found.'}</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">{u.first_name} {u.last_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                      u.role === 'admin' ? 'bg-purple-50 text-purple-700' :
                      u.role === 'driver' ? 'bg-blue-50 text-blue-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>{u.role}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{fc(Number(u.balance))}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-amber-600">{fc(Number(u.held_amount))}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                      u.account_status === 'active' ? 'bg-emerald-50 text-emerald-700' :
                      u.account_status === 'suspended' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>{u.account_status || 'active'}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {u.created_at ? new Date(u.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {u.account_status !== 'suspended' && (
                        <button onClick={() => toggleStatus(u.id, 'suspended')} title="Suspend user"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors">
                          <UserX size={13} /> Suspend
                        </button>
                      )}
                      {u.account_status !== 'active' && (
                        <button onClick={() => toggleStatus(u.id, 'active')} title="Activate user"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg transition-colors">
                          <UserCheck size={13} /> Activate
                        </button>
                      )}
                      <button onClick={() => handleDelete(u.id)} disabled={deleting === u.id} title="Delete user"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-red-50 hover:text-red-600 border border-gray-200 rounded-lg transition-colors disabled:opacity-50">
                        <Trash2 size={13} /> Delete
                      </button>
                      <button onClick={() => setSidebarUser(u)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-700">
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

        <UserSidebar user={sidebarUser} open={!!sidebarUser} onClose={() => setSidebarUser(null)} onDone={() => fetchUsers(debouncedSearch, roleFilter)} />
    </div>
  );
};

export default UsersTable;
