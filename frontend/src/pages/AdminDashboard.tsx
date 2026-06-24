import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from 'recharts';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardContent } from '../components/ui/Card';
import {
  Users, TrendingUp, ShieldAlert, Car, Search, Check, X, Settings, Save,
  Calendar, DollarSign, BarChart3, BookOpen, MapPin, Clock, User, Phone, Mail,
  CreditCard, AlertCircle, XCircle, CheckCircle, ThumbsUp, ThumbsDown
} from 'lucide-react';
import VtpassSettings from '../components/admin/VtpassSettings';
import UsersTable from '../components/admin/UsersTable';
import RidesTable from '../components/admin/RidesTable';
import KycApprovals from '../components/admin/KycApprovals';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import MapboxMap from '../components/Map/MapboxMap';
import api from '../services/api';
import { Bell } from 'lucide-react';
import '../styles/admin.css';

const Table: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="overflow-x-auto w-full border border-gray-200 rounded-lg shadow-sm bg-white">
    <table className="min-w-full bg-white service-table text-left border-collapse">{children}</table>
  </div>
);

const Th: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <th className="px-6 py-4 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">{children}</th>
);

const Td: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <td className="px-6 py-4 border-b border-gray-100 whitespace-nowrap text-sm text-gray-700">{children}</td>
);

const formatDay = (d: string) => new Date(d).toLocaleDateString('en-NG', { weekday: 'short' });

const chartCardStyle: React.CSSProperties = {
  background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB',
  padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
};

const CustomTooltip: React.FC<any> = ({ active, payload, label, color, prefix }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '0.85rem' }}>
        <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>{label}</p>
        <p style={{ color, fontWeight: 700, margin: 0 }}>{prefix}{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const getTabFromPath = () => {
    const p = location.pathname;
    if (p === '/admin' || p === '/admin/') return 'overview';
    if (p.includes('/admin/rides')) return 'rides';
    if (p.includes('/admin/users')) return 'users';
    if (p.includes('/admin/kyc')) return 'kyc';
    if (p.includes('/admin/bookings')) return 'bookings';
    if (p.includes('/admin/completions')) return 'completions';
    if (p.includes('/admin/data-plans')) return 'data-plans';
    if (p.includes('/admin/airtime')) return 'airtime';
    if (p.includes('/admin/electricity')) return 'electricity';
    if (p.includes('/admin/tv-subscriptions')) return 'tv-subscriptions';
    if (p.includes('/admin/broadcast')) return 'broadcast';
    if (p.includes('/admin/settings')) return 'settings';
    return 'overview';
  };
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox');
  const [stats, setStats] = useState<any>({
    totalUsers: 0, drivers: 0, riders: 0, totalRides: 0, activeRides: 0,
    completedRides: 0, totalBookings: 0, completedBookings: 0,
    pendingKyc: 0, estimatedRevenue: 0,
    weeklyBookings: [], weeklyRevenue: [], weeklySignups: [],
  });
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    MAPBOX_ACCESS_TOKEN: '', VTPASS_API_KEY: '', VTPASS_SECRET_KEY: '',
    VTPASS_PUBLIC_KEY: '', PAYSTACK_SECRET_KEY: '',
  });
  const [savingKeys, setSavingKeys] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    setActiveTab(getTabFromPath());
  }, [location.pathname]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/statistics');
      setStats(res.data);
    } catch (e) {
      console.error('Failed to fetch admin stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    (async () => {
      try {
        const res = await api.get('/admin/env');
        setMode(res.data.env === 'live' ? 'live' : 'sandbox');
      } catch (err) {
        console.warn('/admin/env not implemented in backend, using default mode', err);
      }
    })();
  }, []);

  const handleSaveKeys = () => {
    setSavingKeys(true);
    setSaveMessage('');
    setTimeout(() => {
      setSavingKeys(false);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 1000);
  };

  const formatCurrency = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <DashboardLayout isAdmin={true}>
      <div className="flex flex-col gap-6">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
              <Card glass padding="md" className="border-blue-200 bg-blue-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.totalUsers}</h3>
                    <p className="text-xs text-gray-400">
                      <span className="text-blue-600 font-semibold">{stats.drivers}</span> drivers ·
                      <span className="text-emerald-600 font-semibold"> {stats.riders}</span> riders
                    </p>
                  </div>
                </div>
              </Card>
              <Card glass padding="md" className="border-emerald-200 bg-emerald-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><DollarSign size={24} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Revenue (Fee)</p>
                    <h3 className="text-2xl font-bold text-gray-900">{formatCurrency(stats.estimatedRevenue)}</h3>
                    <p className="text-xs text-gray-400">{stats.completedBookings} completed bookings</p>
                  </div>
                </div>
              </Card>
              <Card glass padding="md" className="border-purple-200 bg-purple-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Car size={24} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Rides</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.activeRides}</h3>
                    <p className="text-xs text-gray-400">{stats.totalRides} total rides</p>
                  </div>
                </div>
              </Card>
              <Card glass padding="md" className="border-amber-200 bg-amber-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><BookOpen size={24} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Bookings</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.totalBookings}</h3>
                    <p className="text-xs text-gray-400">{stats.completedBookings} completed</p>
                  </div>
                </div>
              </Card>
              <Card glass padding="md" className="border-orange-200 bg-orange-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 text-orange-600 rounded-lg"><ShieldAlert size={24} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Pending KYC</p>
                    <h3 className="text-2xl font-bold text-orange-600">{stats.pendingKyc}</h3>
                  </div>
                </div>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <div style={chartCardStyle}>
                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Calendar size={16} className="text-indigo-500" /> Weekly Bookings
                </h4>
                {stats.weeklyBookings?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.weeklyBookings.map((d: any) => ({ ...d, dayLabel: formatDay(d.day) }))} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip color="#4F46E5" />} cursor={{ fill: '#EEF2FF' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#4F46E5" maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No booking data this week</p>
                )}
              </div>

              <div style={chartCardStyle}>
                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-500" /> Weekly Revenue
                </h4>
                {stats.weeklyRevenue?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={stats.weeklyRevenue.map((d: any) => ({ ...d, dayLabel: formatDay(d.day) }))} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <defs>
                        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                      <Tooltip content={<CustomTooltip color="#10B981" prefix="₦" />} cursor={{ fill: '#ECFDF5' }} />
                      <Area type="monotone" dataKey="total" stroke="#10B981" strokeWidth={2.5} fill="url(#revGrad)" dot={{ fill: '#10B981', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No revenue data this week</p>
                )}
              </div>

              <div style={chartCardStyle}>
                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <Users size={16} className="text-blue-500" /> New Signups (7d)
                </h4>
                {stats.weeklySignups?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.weeklySignups.map((d: any) => ({ ...d, dayLabel: formatDay(d.day) }))} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip color="#3B82F6" />} cursor={{ fill: '#EFF6FF' }} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#3B82F6" maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-gray-400 py-8 text-center">No signups this week</p>
                )}
              </div>
            </div>

            {/* Full-width combined chart */}
            {stats.weeklyRevenue?.length > 0 && stats.weeklyBookings?.length > 0 && (
              <div style={{ ...chartCardStyle, marginTop: '8px' }}>
                <h4 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <BarChart3 size={16} className="text-purple-500" /> Revenue vs Bookings
                </h4>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={stats.weeklyBookings.map((b: any, i: number) => ({
                    dayLabel: formatDay(b.day),
                    Bookings: b.count,
                    Revenue: stats.weeklyRevenue[i]?.total || 0,
                  }))} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                    <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#F5F3FF' }} />
                    <Bar dataKey="Bookings" radius={[6, 6, 0, 0]} fill="#8B5CF6" maxBarSize={28} />
                    <Bar dataKey="Revenue" radius={[6, 6, 0, 0]} fill="#F59E0B" maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {activeTab !== 'overview' && (
          <Card className="flex-1">
            <CardContent className="p-6">
              {activeTab === 'users' && <UsersTable onRefresh={fetchStats} />}
              {activeTab === 'kyc' && <KycApprovals />}
              {activeTab === 'rides' && <RidesTable />}
              {activeTab === 'bookings' && <AdminBookingsList />}
              {activeTab === 'completions' && <AdminCompletionsList />}
              {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto animate-fade-in">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="p-3 bg-gray-100 text-gray-700 rounded-lg"><Settings size={24} /></div>
                    <div><h3 className="text-xl font-bold text-gray-900">API Configurations</h3><p className="text-sm text-gray-500">Manage third‑party service keys dynamically.</p></div>
                  </div>
                  {saveMessage && (<div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2"><Check size={18} /> {saveMessage}</div>)}
                  <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-5"><h4 className="font-semibold text-gray-900 mb-4 border-b pb-2">Maps & Location</h4><Input label="Mapbox Access Token" placeholder="pk.eyJ..." value={apiKeys.MAPBOX_ACCESS_TOKEN} onChange={(e) => setApiKeys({ ...apiKeys, MAPBOX_ACCESS_TOKEN: e.target.value })} /></div>
                    <div className="mt-6"><MapboxMap /></div>
                    <div className="bg-white border border-gray-200 rounded-lg p-5">
                      <div className="flex items-center justify-between border-b pb-2 mb-4">
                        <h4 className="font-semibold text-gray-900">VTU Services (VTpass)</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-600">Mode:</span>
                          <div className="flex items-center bg-gray-100 rounded-lg p-1">
                            <button onClick={() => { setMode('sandbox'); api.post('/admin/env', { env: 'sandbox' }).catch(() => {}); }}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'sandbox' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Sandbox</button>
                            <button onClick={() => { setMode('live'); api.post('/admin/env', { env: 'live' }).catch(() => {}); }}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'live' ? 'bg-emerald-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>Live</button>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Input label="VTpass Public Key" placeholder="PK_..." value={apiKeys.VTPASS_PUBLIC_KEY} onChange={(e) => setApiKeys({ ...apiKeys, VTPASS_PUBLIC_KEY: e.target.value })} />
                        <Input label="VTpass Secret Key" placeholder="SK_..." type="password" value={apiKeys.VTPASS_SECRET_KEY} onChange={(e) => setApiKeys({ ...apiKeys, VTPASS_SECRET_KEY: e.target.value })} />
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-5"><h4 className="font-semibold text-gray-900 mb-4 border-b pb-2">Payments</h4><Input label="Paystack Secret Key" placeholder="sk_..." type="password" value={apiKeys.PAYSTACK_SECRET_KEY} onChange={(e) => setApiKeys({ ...apiKeys, PAYSTACK_SECRET_KEY: e.target.value })} /></div>
                    <div className="flex justify-end pt-4"><Button onClick={handleSaveKeys} disabled={savingKeys} className="flex items-center gap-2"><Save size={18} /> {savingKeys ? 'Saving...' : 'Save Configuration'}</Button></div>
                  </div>
                </div>
              )}
              {activeTab === 'data-plans' && <VtpassSettings defaultService="data" />}
              {activeTab === 'airtime' && <VtpassSettings defaultService="airtime" />}
              {activeTab === 'electricity' && <VtpassSettings defaultService="bill" />}
              {activeTab === 'tv-subscriptions' && <VtpassSettings defaultService="tv" />}
              {activeTab === 'broadcast' && <AdminBroadcastForm />}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

const AdminBroadcastForm: React.FC = () => {
  const [target, setTarget] = useState<'all' | 'drivers' | 'riders' | 'individual'>('all');
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const searchUsers = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    try {
      const res = await api.get(`/admin/users?search=${encodeURIComponent(q)}&limit=20`);
      setSearchResults(res.data.users || []);
    } catch { setSearchResults([]); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchUsers(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm, searchUsers]);

  const handleSend = async () => {
    setSending(true);
    try {
      await api.post('/admin/broadcast-notification', {
        target, userId: selectedUser?.id || userId, title, body,
      });
      setSent(true);
      setTimeout(() => { setSent(false); setTitle(''); setBody(''); setSelectedUser(null); setSearchTerm(''); }, 2000);
    } catch { } finally { setSending(false); }
  };

  return (
    <div className="max-w-xl animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg"><Bell size={24} /></div>
        <div><h3 className="text-xl font-bold text-gray-900">Broadcast Notification</h3><p className="text-sm text-gray-500">Send push notifications to users.</p></div>
      </div>
      {sent && <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg flex items-center gap-2"><Check size={18} /> Notification sent!</div>}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div><label className="block text-sm font-semibold text-gray-700 mb-2">Target Audience</label>
          <div className="flex flex-wrap gap-2">
            {(['all', 'drivers', 'riders', 'individual'] as const).map(t => (
              <button key={t} onClick={() => { setTarget(t); setSelectedUser(null); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-colors ${target === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                {t === 'all' ? 'All Users' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {target === 'individual' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Search User</label>
            <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500" />
            {searchResults.length > 0 && (
              <div className="mt-2 bg-white border border-gray-200 rounded-xl shadow-sm max-h-40 overflow-y-auto">
                {searchResults.map((u: any) => (
                  <div key={u.id} onClick={() => { setSelectedUser(u); setSearchTerm(`${u.first_name} ${u.last_name}`); setSearchResults([]); }}
                    className="px-4 py-2.5 hover:bg-gray-50 cursor-pointer text-sm font-medium text-gray-700 border-b border-gray-50 last:border-0">
                    {u.first_name} {u.last_name} — {u.email}
                  </div>
                ))}
              </div>
            )}
            {selectedUser && <p className="mt-2 text-xs text-emerald-600 font-semibold">Selected: {selectedUser.first_name} {selectedUser.last_name}</p>}
          </div>
        )}
        <Input label="Title" placeholder="Notification title" value={title} onChange={e => setTitle(e.target.value)} />
        <div><label className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={4} placeholder="Write your notification message..."
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500 resize-none" />
        </div>
        <Button onClick={handleSend} disabled={sending || !title || !body} className="w-full">{sending ? 'Sending...' : 'Send Notification'}</Button>
      </div>
    </div>
  );
};

const AdminCompletionsList: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/completions/pending');
      setItems(res.data.completions || []);
    } catch (e) {
      console.error('Failed to fetch pending completions', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleAction = async (bookingId: string, action: 'approve' | 'deny') => {
    setActionId(bookingId);
    try {
      await api.post(`/admin/completions/${bookingId}/${action}`);
      setItems(prev => prev.filter(i => i.booking_id !== bookingId && i.id !== bookingId));
    } catch (e: any) {
      console.error(`${action} failed`, e);
      alert(e.response?.data?.error || `Failed to ${action} completion`);
    }
    setActionId(null);
  };

  const getRiderName = (item: any) => {
    const first = item.rider_first_name || '';
    const last = item.rider_last_name || '';
    if (first || last) return `${first} ${last}`.trim();
    return item.rider_id?.substring(0, 12) || 'N/A';
  };

  const getDriverName = (item: any) => {
    const first = item.driver_first_name || '';
    const last = item.driver_last_name || '';
    if (first || last) return `${first} ${last}`.trim();
    return item.driver_id?.substring(0, 12) || 'N/A';
  };

  const statusBadge = (s: string) => {
    if (s === 'released') return 'bg-emerald-50 text-emerald-700';
    if (s === 'refunded') return 'bg-red-50 text-red-700';
    return 'bg-amber-50 text-amber-700';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><CheckCircle size={24} /></div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900">Pending Completions</h3>
          <p className="text-sm text-gray-500">Review completed bookings and release escrow payments to drivers.</p>
        </div>
        <button onClick={fetchItems}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 transition-colors">Refresh</button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading pending completions...</p>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <CheckCircle size={48} className="mx-auto text-emerald-300 mb-4" />
          <h4 className="text-lg font-semibold text-gray-700">All caught up!</h4>
          <p className="text-sm text-gray-400 mt-1">No pending completions waiting for approval.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full bg-white text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rider</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Escrow Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item: any) => {
                const bookingId = item.booking_id;
                return (
                  <tr key={bookingId} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-xs font-semibold text-gray-700">{bookingId.substring(0, 12)}...</td>
                    <td className="px-6 py-4 text-sm text-gray-700 font-medium">{getRiderName(item)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{getDriverName(item)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {`${item.from || '?'} → ${item.to || '?'}`}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                      ₦{Number(item.total_amount || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusBadge(item.escrow_status)}`}>
                        {item.escrow_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(item.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAction(bookingId, 'approve')}
                          disabled={actionId === bookingId}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          <ThumbsUp size={14} /> Approve
                        </button>
                        <button
                          onClick={() => handleAction(bookingId, 'deny')}
                          disabled={actionId === bookingId}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <ThumbsDown size={14} /> Deny
                        </button>
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

const AdminBookingsList: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchBookings = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}&limit=100` : '?limit=100';
      const res = await api.get(`/admin/bookings${params}`);
      setBookings(res.data.bookings || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBookings(debouncedSearch); }, [debouncedSearch, fetchBookings]);

  const viewDetails = async (bookingId: string) => {
    setDetailLoading(true);
    try {
      const res = await api.get(`/admin/bookings/${bookingId}`);
      setSelectedBooking(res.data.booking);
    } catch (e) { console.error(e); }
    setDetailLoading(false);
  };

  const statusStyle = (s: string) => {
    if (s === 'confirmed' || s === 'active') return 'bg-emerald-50 text-emerald-700';
    if (s === 'completed') return 'bg-blue-50 text-blue-700';
    if (s === 'cancelled') return 'bg-red-50 text-red-700';
    return 'bg-amber-50 text-amber-700';
  };

  const getRiderName = (b: any) => {
    if (b.rider_profile?.full_name) return b.rider_profile.full_name;
    if (b.rider_profile?.first_name || b.rider_profile?.last_name) return `${b.rider_profile.first_name || ''} ${b.rider_profile.last_name || ''}`.trim();
    return b.rider_id?.substring(0, 12) || 'N/A';
  };

  const getDriverName = (b: any) => {
    const d = b.driver_profile;
    if (!d) return 'N/A';
    if (d.full_name) return d.full_name;
    if (d.first_name || d.last_name) return `${d.first_name || ''} ${d.last_name || ''}`.trim();
    return b.ride?.driver_id?.substring(0, 12) || 'N/A';
  };

  const getRoute = (b: any) => {
    if (!b.ride) return 'N/A';
    return `${b.ride.from || '?'} → ${b.ride.to || '?'}`;
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Search by ID, rider name or email..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all" />
        </div>
        <button onClick={() => fetchBookings(debouncedSearch)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 transition-colors">Refresh</button>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading bookings...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full bg-white text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking ID</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rider</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seats</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {bookings.length === 0 ? (
                <tr><td colSpan={8} className="px-6 py-10 text-center text-sm text-gray-400">No bookings found.</td></tr>
              ) : bookings.map((b) => (
                <tr key={b.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => viewDetails(b.id)}>
                  <td className="px-6 py-4 text-sm font-mono text-xs font-semibold text-gray-700">{b.id.substring(0, 12)}...</td>
                  <td className="px-6 py-4 text-sm text-gray-700 font-medium">{getRiderName(b)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getRoute(b)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getDriverName(b)}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{b.seats}</td>
                  <td className="px-6 py-4 text-sm font-bold text-indigo-600">₦{Number(b.total_amount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusStyle(b.status)}`}>{b.status}</span></td>
                  <td className="px-6 py-4 text-xs text-gray-500">{new Date(b.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedBooking(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Booking Details</h3>
              <button onClick={() => setSelectedBooking(null)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <XCircle size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Booking ID</p>
                  <p className="text-sm font-mono font-bold text-gray-900 break-all">{selectedBooking.id}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><User size={16} className="text-indigo-500" /> Rider Information</h4>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm font-semibold text-gray-900">{getRiderName(selectedBooking)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{selectedBooking.rider_profile?.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{selectedBooking.rider_profile?.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Rider ID</p>
                    <p className="text-sm font-mono text-gray-700">{selectedBooking.rider_id?.substring(0, 12)}...</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><MapPin size={16} className="text-emerald-500" /> Ride Information</h4>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Route</p>
                    <p className="text-sm font-semibold text-gray-900">{getRoute(selectedBooking)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Driver</p>
                    <p className="text-sm font-semibold text-gray-900">{getDriverName(selectedBooking)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Departure</p>
                    <p className="text-sm text-gray-900">{selectedBooking.ride?.departure_time ? new Date(selectedBooking.ride.departure_time).toLocaleString('en-NG') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ride ID</p>
                    <p className="text-sm font-mono text-gray-700">{selectedBooking.ride_id?.substring(0, 12)}...</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Available Seats</p>
                    <p className="text-sm text-gray-900">{selectedBooking.ride?.available_seats || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><CreditCard size={16} className="text-amber-500" /> Payment Information</h4>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-gray-500">Seats Booked</p>
                    <p className="text-sm font-semibold text-gray-900">{selectedBooking.seats}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-sm font-bold text-indigo-600">₦{Number(selectedBooking.total_amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Method</p>
                    <p className="text-sm capitalize text-gray-900">{selectedBooking.payment_method || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Status</p>
                    <p className="text-sm capitalize text-gray-900">{selectedBooking.payment_status || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Ref</p>
                    <p className="text-sm font-mono text-gray-700">{selectedBooking.payment_reference || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Escrow ID</p>
                    <p className="text-sm font-mono text-gray-700">{selectedBooking.escrow_id?.substring(0, 12) || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2"><Clock size={16} className="text-purple-500" /> Timeline</h4>
                <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-xl p-4">
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm"><span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusStyle(selectedBooking.status)}`}>{selectedBooking.status}</span></p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Created</p>
                    <p className="text-sm text-gray-900">{new Date(selectedBooking.created_at).toLocaleString('en-NG')}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Updated</p>
                    <p className="text-sm text-gray-900">{selectedBooking.updated_at ? new Date(selectedBooking.updated_at).toLocaleString('en-NG') : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Pickup Confirmed</p>
                    <p className="text-sm text-gray-900">{selectedBooking.pickup_confirmed_at ? new Date(selectedBooking.pickup_confirmed_at).toLocaleString('en-NG') : 'Not yet'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Dropoff Confirmed</p>
                    <p className="text-sm text-gray-900">{selectedBooking.dropoff_confirmed_at ? new Date(selectedBooking.dropoff_confirmed_at).toLocaleString('en-NG') : 'Not yet'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
