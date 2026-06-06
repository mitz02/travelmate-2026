import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardContent } from '../components/ui/Card';
import { Users, TrendingUp, ShieldAlert, Car, Search, Check, X, Settings, Save } from 'lucide-react';
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

// Custom Table component to match our aesthetic
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

export const AdminDashboard: React.FC = () => {
  const location = useLocation();
  const getTabFromPath = () => {
    if (location.pathname === '/admin' || location.pathname === '/admin/') return 'overview';
    if (location.pathname.includes('/admin/rides')) return 'rides';
    if (location.pathname.includes('/admin/users')) return 'users';
    if (location.pathname.includes('/admin/kyc')) return 'kyc';
    if (location.pathname.includes('/admin/data-plans')) return 'data-plans';
    if (location.pathname.includes('/admin/airtime')) return 'airtime';
    if (location.pathname.includes('/admin/electricity')) return 'electricity';
    if (location.pathname.includes('/admin/tv-subscriptions')) return 'tv-subscriptions';
    if (location.pathname.includes('/admin/broadcast')) return 'broadcast';
    if (location.pathname.includes('/admin/settings')) return 'settings';
    return 'overview';
  };
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'kyc' | 'settings' | 'data-plans' | 'airtime' | 'electricity' | 'tv-subscriptions' | 'rides' | 'broadcast'>('overview');
  const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox');
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeRides: 0,
    pendingKyc: 0,
    totalPayouts: 0,
    estimatedRevenue: 0
  });
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    MAPBOX_ACCESS_TOKEN: '',
    VTPASS_API_KEY: '',
    VTPASS_SECRET_KEY: '',
    VTPASS_PUBLIC_KEY: '',
    PAYSTACK_SECRET_KEY: ''
  });
  const [savingKeys, setSavingKeys] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any | null>(null);
  const [bookingSearch, setBookingSearch] = useState('');
  const [debouncedBookingSearch, setDebouncedBookingSearch] = useState('');

  // Debounce booking search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedBookingSearch(bookingSearch), 350);
    return () => clearTimeout(timer);
  }, [bookingSearch]);

  const fetchBookings = useCallback(async (q?: string) => {
    setLoadingBookings(true);
    try {
      const params = q ? `?limit=30&search=${encodeURIComponent(q)}` : '?limit=30';
      const res = await api.get(`/admin/bookings${params}`);
      setBookings(res.data.bookings || []);
    } catch (e) {
      console.error('Failed to fetch admin bookings:', e);
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  useEffect(() => {
    setActiveTab(getTabFromPath() as any);
  }, [location.pathname]);

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (e) {
      console.error('Failed to fetch admin stats:', e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchBookings();
    
    // Fetch stored VTpass mode on mount
    api.get('/admin/env')
      .then(res => {
        setMode(res.data.env === 'live' ? 'live' : 'sandbox');
      })
      .catch(err => console.error('Failed to load VTpass env mode:', err));
  }, []);

  // Re-fetch bookings when debounced search changes
  useEffect(() => {
    fetchBookings(debouncedBookingSearch);
  }, [debouncedBookingSearch, fetchBookings]);

  const handleSaveKeys = () => {
    setSavingKeys(true);
    setSaveMessage('');
    setTimeout(() => {
      setSavingKeys(false);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    }, 1000);
  };

  return (
    <DashboardLayout isAdmin={true}>
      <div className="flex flex-col gap-6">
        {/* KPI Row */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              <Card glass padding="md" className="border-blue-200 bg-blue-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-100 text-blue-600 rounded-lg"><Users size={24} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Users</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.totalUsers}</h3>
                  </div>
                </div>
              </Card>
              <Card glass padding="md" className="border-emerald-200 bg-emerald-50/30">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><TrendingUp size={24} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Revenue (Fee)</p>
                    <h3 className="text-2xl font-bold text-gray-900">₦{stats.estimatedRevenue.toLocaleString()}</h3>
                  </div>
                </div>
              </Card>
              <Card glass padding="md" className="admin-gradient glassmorphism">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-lg"><Car size={24} /></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Active Rides</p>
                    <h3 className="text-2xl font-bold text-gray-900">{stats.activeRides}</h3>
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

            {/* Bookings Section */}
            <div className="mt-2 animate-fade-in">
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
                  <h3 className="text-lg font-bold text-gray-900">Recent Bookings</h3>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-none sm:w-64">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search passenger, route, ID..."
                        value={bookingSearch}
                        onChange={e => setBookingSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all"
                      />
                    </div>
                    <button 
                      onClick={() => fetchBookings(debouncedBookingSearch)} 
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors whitespace-nowrap px-3 py-2 bg-indigo-50 rounded-xl border border-indigo-100"
                    >
                      Refresh
                    </button>
                  </div>
                </div>
                {loadingBookings ? (
                  <p className="text-sm text-gray-500">Loading bookings...</p>
                ) : bookings.length === 0 ? (
                  <p className="text-sm text-gray-500">No bookings found in the database.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking ID</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Passenger</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Route</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seats</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Price</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider font-bold">Status</th>
                          <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {bookings.map((b) => (
                          <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-semibold text-gray-700 font-mono text-xs">{b.id.substring(0, 8)}...</td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-bold">
                              {b.passenger ? `${b.passenger.first_name} ${b.passenger.last_name}` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {b.ride ? `${b.ride.from} → ${b.ride.to}` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700">{b.seats_booked}</td>
                            <td className="px-6 py-4 text-sm text-indigo-600 font-black">₦{b.total_price.toLocaleString()}</td>
                            <td className="px-6 py-4 text-sm">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                                b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                                b.status === 'completed' ? 'bg-blue-50 text-blue-700' :
                                b.status === 'cancelled' ? 'bg-red-50 text-red-700' :
                                'bg-amber-50 text-amber-700'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setSelectedBooking(b)}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        {/* Main Content Area */}
        {activeTab !== 'overview' && (
          <Card className="flex-1">
            <CardContent className="p-6">
              {activeTab === 'users' && <UsersTable />}
              {activeTab === 'kyc' && <KycApprovals />}
              {activeTab === 'rides' && <RidesTable />}
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
                            <button
                              onClick={async () => {
                                try {
                                  await api.post('/admin/env', { env: 'sandbox' });
                                  setMode('sandbox');
                                } catch (e) { console.error(e); }
                              }}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'sandbox' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              Sandbox
                            </button>
                            <button
                              onClick={async () => {
                                try {
                                  await api.post('/admin/env', { env: 'live' });
                                  setMode('live');
                                } catch (e) { console.error(e); }
                              }}
                              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${mode === 'live' ? 'bg-emerald-500 text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                              Live
                            </button>
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

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[999] animate-fade-in" style={{ fontFamily: 'Inter, sans-serif' }}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-gray-100 shadow-2xl relative overflow-hidden">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-black text-gray-900 mb-6">Booking Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Booking ID</span>
                <span className="text-sm font-semibold text-gray-800 font-mono">{selectedBooking.id}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Status</span>
                <span className={`text-sm font-bold capitalize ${
                  selectedBooking.status === 'confirmed' ? 'text-emerald-600' :
                  selectedBooking.status === 'completed' ? 'text-blue-600' :
                  selectedBooking.status === 'cancelled' ? 'text-red-500' : 'text-amber-500'
                }`}>{selectedBooking.status}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Seats Booked</span>
                <span className="text-sm font-bold text-gray-800">{selectedBooking.seats_booked}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Price Paid</span>
                <span className="text-sm font-extrabold text-indigo-600 font-bold">₦{selectedBooking.total_price.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Payment Status</span>
                <span className="text-sm font-bold text-gray-800 capitalize">{selectedBooking.payment_status || 'completed'}</span>
              </div>
              
              <div className="pt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Passenger Information</h4>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm">
                  {selectedBooking.passenger ? (
                    <>
                      <p className="font-bold text-gray-800">{selectedBooking.passenger.first_name} {selectedBooking.passenger.last_name}</p>
                      <p className="text-xs text-gray-500">{selectedBooking.passenger.email}</p>
                    </>
                  ) : (
                    <p className="text-gray-500 italic">No passenger data</p>
                  )}
                </div>
              </div>

              <div className="pt-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ride Details</h4>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100 text-sm space-y-1">
                  {selectedBooking.ride ? (
                    <>
                      <p className="font-bold text-gray-800">{selectedBooking.ride.from} → {selectedBooking.ride.to}</p>
                      <p className="text-xs text-gray-500">Departure: {new Date(selectedBooking.ride.departure_time).toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Driver: {selectedBooking.ride.driver?.first_name} {selectedBooking.ride.driver?.last_name} ({selectedBooking.ride.driver?.email})</p>
                    </>
                  ) : (
                    <p className="text-gray-500 italic">No ride data</p>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setSelectedBooking(null)} className="w-full">
                Close details
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

interface ProfileShort {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

const AdminBroadcastForm: React.FC = () => {
  const [target, setTarget] = useState<'all' | 'drivers' | 'riders' | 'individual'>('all');
  const [users, setUsers] = useState<ProfileShort[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    if (target === 'individual') {
      const delayDebounce = setTimeout(() => {
        api.get(`/admin/users?search=${searchQuery}&limit=20`)
          .then(res => {
            setUsers(res.data.users || []);
          })
          .catch(err => console.error('Failed to load users for broadcast selection', err));
      }, 300);
      return () => clearTimeout(delayDebounce);
    }
  }, [target, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    if (target === 'individual' && !selectedUserId) {
      setMessage({ type: 'error', text: 'Please select a recipient user.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const payload = {
        target,
        userId: target === 'individual' ? selectedUserId : undefined,
        title: title.trim(),
        body: body.trim()
      };
      const res = await api.post('/admin/broadcast-notification', payload);
      setMessage({ type: 'success', text: res.data.message || 'Notification broadcasted successfully!' });
      setTitle('');
      setBody('');
      setSelectedUserId('');
      setSearchQuery('');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.response?.data?.error || 'Failed to send notification.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-2xl p-6 shadow-sm animate-fade-in" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="mb-6 flex items-center gap-3">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
          <Bell size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Broadcast System Message</h3>
          <p className="text-sm text-gray-500">Send persistent system notifications and device push messages.</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl border mb-6 text-sm font-medium flex items-center gap-2 ${
          message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          {message.type === 'success' ? <Check size={18} /> : <X size={18} />}
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recipient Target</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              { id: 'all', label: 'All Users' },
              { id: 'drivers', label: 'Drivers Only' },
              { id: 'riders', label: 'Riders Only' },
              { id: 'individual', label: 'Individual' }
            ] as const).map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTarget(t.id)}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                  target === t.id
                    ? 'bg-indigo-600 border-transparent text-white shadow-md shadow-indigo-100'
                    : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {target === 'individual' && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Search User (Name / Email)</label>
              <input
                type="text"
                placeholder="Type name or email to search..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedUserId(''); }}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Select User</label>
              <select
                value={selectedUserId}
                onChange={e => setSelectedUserId(e.target.value)}
                required
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all"
              >
                <option value="" disabled>Choose a user...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.email}) - {u.role}
                  </option>
                ))}
              </select>
            </div>
            {searchQuery && users.length === 0 && (
              <p className="text-xs text-amber-600">No matching users found.</p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Message Title</label>
          <input
            type="text"
            required
            placeholder="System Update, Service Warning, etc."
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Message Body</label>
          <textarea
            required
            rows={4}
            placeholder="Type your message details here..."
            value={body}
            onChange={e => setBody(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all resize-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading || !title.trim() || !body.trim()}
          className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
};

