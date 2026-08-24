import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardContent } from '../components/ui/Card';
import {
  Users, TrendingUp, ShieldAlert, Car, Search, Check, X, Settings, Save,
  Calendar, DollarSign, BarChart3, BookOpen, MapPin, Clock, User, Phone, Mail,
  CreditCard, AlertCircle, XCircle, CheckCircle, ThumbsUp, ThumbsDown, Zap, ScrollText
} from 'lucide-react';
import BardetechSettings from '../components/admin/BardetechSettings';
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

type Accent = 'blue' | 'emerald' | 'purple' | 'amber' | 'orange' | 'indigo';

const ACCENTS: Record<Accent, { iconBg: string; glow: string; glowSoft: string; ring: string; tint: string }> = {
  blue:    { iconBg: 'linear-gradient(135deg,#2563EB,#60A5FA)', glow: 'rgba(37,99,235,.38)',  glowSoft: 'rgba(59,130,246,.22)', ring: 'rgba(37,99,235,.45)', tint: 'rgba(59,130,246,.06)' },
  emerald: { iconBg: 'linear-gradient(135deg,#059669,#34D399)', glow: 'rgba(5,150,105,.38)',   glowSoft: 'rgba(16,185,129,.20)', ring: 'rgba(5,150,105,.45)', tint: 'rgba(16,185,129,.06)' },
  purple:  { iconBg: 'linear-gradient(135deg,#7C3AED,#A78BFA)', glow: 'rgba(124,58,237,.38)',  glowSoft: 'rgba(139,92,246,.20)', ring: 'rgba(124,58,237,.45)', tint: 'rgba(139,92,246,.06)' },
  amber:   { iconBg: 'linear-gradient(135deg,#D97706,#FBBF24)', glow: 'rgba(217,119,6,.40)',   glowSoft: 'rgba(245,158,11,.22)', ring: 'rgba(217,119,6,.50)', tint: 'rgba(245,158,11,.07)' },
  orange:  { iconBg: 'linear-gradient(135deg,#EA580C,#FB923C)', glow: 'rgba(234,88,12,.38)',   glowSoft: 'rgba(249,115,22,.20)', ring: 'rgba(234,88,12,.48)', tint: 'rgba(249,115,22,.06)' },
  indigo:  { iconBg: 'linear-gradient(135deg,#4F46E5,#818CF8)', glow: 'rgba(79,70,229,.38)',   glowSoft: 'rgba(99,102,241,.20)', ring: 'rgba(79,70,229,.45)', tint: 'rgba(99,102,241,.06)' },
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: Accent;
  delay?: number;
}> = ({ icon, label, value, sub, accent = 'indigo', delay = 0 }) => {
  const a = ACCENTS[accent];
  return (
    <div
      className="tm-stat-card"
      style={{
        ['--tm-icon-bg' as any]: a.iconBg,
        ['--tm-glow' as any]: a.glow,
        ['--tm-glow-soft' as any]: a.glowSoft,
        ['--tm-ring' as any]: a.ring,
        ['--tm-tint' as any]: a.tint,
        animationDelay: `${delay}ms`,
      }}
    >
      <span className="tm-stat-blob" />
      <span className="tm-stat-shine" />
      <div className="flex items-start gap-3.5 relative">
        <div className="tm-stat-icon">{icon}</div>
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-gray-500 truncate">{label}</p>
          <h3 className="text-[26px] leading-tight font-black text-gray-900 mt-0.5 tabular-nums truncate">
            {value}
          </h3>
          {sub && <p className="text-xs mt-1 font-medium text-gray-400 truncate">{sub}</p>}
        </div>
      </div>
    </div>
  );
};

const CustomTooltip: React.FC<any> = ({ active, payload, label, color, prefix }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '0.85rem' }}>
        <p style={{ fontWeight: 600, color: '#374151', margin: '0 0 4px' }}>{label}</p>
        <p style={{ color: color || '#4F46E5', fontWeight: 700, margin: 0 }}>{prefix}{payload[0].value.toLocaleString()}</p>
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
    if (p.includes('/admin/analytics')) return 'overview';
    if (p.includes('/admin/rides')) return 'rides';
    if (p.includes('/admin/users')) return 'users';
    if (p.includes('/admin/kyc')) return 'kyc';
    if (p.includes('/admin/bookings')) return 'bookings';
    if (p.includes('/admin/completions')) return 'completions';
    if (p.includes('/admin/transactions')) return 'transactions';
    if (p.includes('/admin/audit-logs')) return 'audit-logs';
    if (p.includes('/admin/data-plans')) return 'data-plans';
    if (p.includes('/admin/airtime')) return 'airtime';
    if (p.includes('/admin/electricity')) return 'electricity';
    if (p.includes('/admin/tv-subscriptions')) return 'tv-subscriptions';
    if (p.includes('/admin/broadcast')) return 'broadcast';
    if (p.includes('/admin/settings')) return 'settings';
    return 'overview';
  };
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [stats, setStats] = useState<any>({
    totalUsers: 0, drivers: 0, riders: 0, totalRides: 0, activeRides: 0,
    completedRides: 0, totalBookings: 0, completedBookings: 0,
    pendingKyc: 0, estimatedRevenue: 0,
    weeklyBookings: [], weeklyRevenue: [], weeklySignups: [],
  });

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
  }, []);

  const formatCurrency = (n: number) => `₦${n.toLocaleString()}`;

  return (
    <DashboardLayout isAdmin={true}>
      <div className="flex flex-col gap-4 sm:gap-6 tm-admin">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 animate-fade-in">
              <StatCard
                accent="blue"
                icon={<Users size={22} />}
                label="Total Users"
                value={stats.totalUsers}
                delay={0}
                sub={<><span className="text-blue-600 font-bold">{stats.drivers}</span> drivers · <span className="text-emerald-600 font-bold">{stats.riders}</span> riders</>}
              />
              <StatCard
                accent="emerald"
                icon={<DollarSign size={22} />}
                label="Revenue (Fee)"
                value={formatCurrency(stats.estimatedRevenue)}
                delay={70}
                sub={<>{stats.completedBookings} completed bookings</>}
              />
              <StatCard
                accent="purple"
                icon={<Car size={22} />}
                label="Active Rides"
                value={stats.activeRides}
                delay={140}
                sub={<>{stats.totalRides} total rides</>}
              />
              <StatCard
                accent="amber"
                icon={<BookOpen size={22} />}
                label="Bookings"
                value={stats.totalBookings}
                delay={210}
                sub={<>{stats.completedBookings} completed</>}
              />
              <StatCard
                accent="orange"
                icon={<ShieldAlert size={22} />}
                label="Pending KYC"
                value={stats.pendingKyc}
                delay={280}
                sub={Number(stats.pendingKyc) > 0 ? <span className="text-orange-600 font-bold">Needs review →</span> : 'All caught up'}
              />
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

            {/* Executive Analytics & Intelligence Component */}
            <div className="mt-4">
              <AdminAnalyticsView />
            </div>
          </>
        )}

        {activeTab !== 'overview' && (
          <Card className="flex-1" padding="none">
            <CardContent className="p-2.5 sm:p-6">
              {activeTab === 'users' && <UsersTable onRefresh={fetchStats} />}
              {activeTab === 'kyc' && <KycApprovals />}
              {activeTab === 'rides' && <RidesTable />}
              {activeTab === 'bookings' && <AdminBookingsList />}
              {activeTab === 'completions' && <AdminCompletionsList />}
              {activeTab === 'transactions' && <AdminTransactionsList />}
              {activeTab === 'audit-logs' && <AdminAuditLogsView />}
              {activeTab === 'settings' && <AdminSettingsView />}
              {activeTab === 'data-plans' && <BardetechSettings defaultService="data" />}
              {activeTab === 'airtime' && <BardetechSettings defaultService="airtime" />}
              {activeTab === 'electricity' && <BardetechSettings defaultService="bill" />}
              {activeTab === 'tv-subscriptions' && <BardetechSettings defaultService="tv" />}
              {activeTab === 'broadcast' && <AdminBroadcastForm />}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

type ApiKeyMeta = { configured: boolean; masked: string; source: 'custom' | 'env' | 'none' };

const API_KEY_FIELDS: Array<{ name: string; label: string; placeholder: string; secret?: boolean; multiline?: boolean; section: string; help: string }> = [
  { name: 'MAPBOX_ACCESS_TOKEN', label: 'Mapbox Access Token', placeholder: 'pk.eyJ...', section: 'Maps & Location', help: 'Public token used for maps across the app and served to the frontend via /api/config.' },
  { name: 'BARDETECH_API_KEY', label: 'Bardetech API Key', placeholder: 'e.g., 0a965160cd...', secret: true, section: 'VTU Services (Bardetech)', help: 'Used for airtime, data, TV subscriptions and electricity payments.' },
  { name: 'PAYSTACK_SECRET_KEY', label: 'Paystack Secret Key', placeholder: 'sk_...', secret: true, section: 'Payments', help: 'Used for wallet funding, transfers and payment verification.' },
  { name: 'DOJAH_APP_ID', label: 'Dojah App ID', placeholder: 'e.g. 66d8ab12c3...', section: 'KYC Verification (Dojah)', help: 'App ID from your Dojah dashboard — paired with the secret key for NIN, BVN and driver\u2019s license verification.' },
  { name: 'DOJAH_SECRET_KEY', label: 'Dojah Secret Key', placeholder: 'test_sk_... / prod_sk_...', secret: true, section: 'KYC Verification (Dojah)', help: 'Dojah API secret key used for identity verification requests.' },
  { name: 'DOJAH_BASE_URL', label: 'Dojah Base URL', placeholder: 'https://sandbox.dojah.io', section: 'KYC Verification (Dojah)', help: 'Sandbox: https://sandbox.dojah.io — Production: https://api.dojah.io' },
  { name: 'AGORA_APP_ID', label: 'Agora App ID', placeholder: '32-character hex app ID', section: 'In-Call Audio/Video (Agora)', help: 'Powers ride chat calls. From console.agora.io → Project details.' },
  { name: 'AGORA_APP_CERTIFICATE', label: 'Agora App Certificate', placeholder: '32-character hex certificate', secret: true, section: 'In-Call Audio/Video (Agora)', help: 'Used to sign call tokens. Enable it in Agora console → Security.' },
  { name: 'TWILIO_ACCOUNT_SID', label: 'Twilio Account SID', placeholder: 'AC... / SK...', section: 'SMS (Twilio)', help: 'Used for SMS notifications and OTP delivery.' },
  { name: 'TWILIO_AUTH_TOKEN', label: 'Twilio Auth Token', placeholder: '32-character hex token', secret: true, section: 'SMS (Twilio)', help: 'Auth token paired with the account SID above.' },
  { name: 'FLW_CLIENT_ID', label: 'Flutterwave Client ID', placeholder: 'OAuth client ID', section: 'Withdrawals (Flutterwave)', help: 'v4 OAuth credentials used for bank transfers / driver withdrawals.' },
  { name: 'FLW_SECRET_KEY', label: 'Flutterwave Client Secret', placeholder: 'client secret', secret: true, section: 'Withdrawals (Flutterwave)', help: 'Paired with the client ID to mint API tokens.' },
  { name: 'FLW_ENCRYPTION_KEY', label: 'Flutterwave Encryption Key', placeholder: 'encryption key', secret: true, section: 'Withdrawals (Flutterwave)', help: 'Encrypts transfer payloads sent to Flutterwave.' },
  { name: 'FIREBASE_PROJECT_ID', label: 'Firebase Project ID', placeholder: 'e.g. travelmate-abc123', section: 'Push & Phone OTP (Firebase)', help: 'Project ID from your Firebase service account JSON.' },
  { name: 'FIREBASE_CLIENT_EMAIL', label: 'Firebase Client Email', placeholder: 'firebase-adminsdk-...@....iam.gserviceaccount.com', section: 'Push & Phone OTP (Firebase)', help: 'Service account email used to sign push notifications.' },
  { name: 'FIREBASE_PRIVATE_KEY', label: 'Firebase Private Key', placeholder: '-----BEGIN PRIVATE KEY-----...', secret: true, multiline: true, section: 'Push & Phone OTP (Firebase)', help: 'Full PEM private key from the service account JSON (keep the \\n sequences).' },
];

const SourceBadge: React.FC<{ meta?: ApiKeyMeta }> = ({ meta }) => {
  if (!meta) return null;
  if (!meta.configured) return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-600 border border-amber-200">Not set</span>;
  if (meta.source === 'custom') return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Custom</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-gray-500 border border-gray-200">From .env</span>;
};

const AdminSettingsView: React.FC = () => {
  const [meta, setMeta] = useState<Record<string, ApiKeyMeta>>({});
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const loadKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/settings/api-keys');
      setMeta(res.data.keys || {});
    } catch (e) {
      console.error('Failed to load API settings:', e);
      setFeedback({ ok: false, text: 'Could not load current API settings.' });
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleSave = async () => {
    const payload: Record<string, string> = {};
    for (const f of API_KEY_FIELDS) {
      const v = (values[f.name] || '').trim();
      if (v !== '') payload[f.name] = v;
    }
    if (Object.keys(payload).length === 0) {
      setFeedback({ ok: false, text: 'Enter at least one new key to save. Leave a field blank to keep its current value.' });
      return;
    }
    setSaving(true); setFeedback(null); setFieldErrors({});
    try {
      const res = await api.post('/admin/settings/api-keys', payload);
      setMeta(res.data.keys || {});
      setValues({});
      setFeedback({ ok: true, text: 'Configuration saved and applied immediately — no restart needed.' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (e: any) {
      const msg: string = e?.response?.data?.error || 'Failed to save configuration.';
      const names = API_KEY_FIELDS.map(f => f.name).join('|');
      const m = msg.match(new RegExp(`^(${names}):\\s*(.+)$`));
      if (m) setFieldErrors({ [m[1]]: m[2] });
      setFeedback({ ok: false, text: m ? m[2] : msg });
    }
    setSaving(false);
  };

  const sections = [...new Set(API_KEY_FIELDS.map(f => f.section))];

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <div className="p-3 bg-gray-100 text-gray-700 rounded-lg"><Settings size={24} /></div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">API Configurations</h3>
          <p className="text-sm text-gray-500">Manage third-party service keys. Changes take effect immediately.</p>
        </div>
      </div>

      {feedback && (
        <div className={`mb-6 p-3 rounded-lg flex items-center gap-2 ${feedback.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {feedback.ok ? <CheckCircle size={18} /> : <AlertCircle size={18} />} {feedback.text}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading configuration…</p>
      ) : (
        <div className="space-y-6">
          {sections.map(section => (
            <div key={section} className="bg-white border border-gray-200 rounded-lg p-5">
              <h4 className="font-semibold text-gray-900 mb-4 border-b pb-2">{section}</h4>
              <div className="space-y-4">
                {API_KEY_FIELDS.filter(f => f.section === section).map(f => {
                  const currentMasked = meta[f.name]?.configured ? meta[f.name].masked : '';
                  const placeholder = currentMasked || f.placeholder;
                  return (
                  <div key={f.name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <SourceBadge meta={meta[f.name]} />
                    </div>
                    {f.multiline ? (
                      <label className="block">
                        <span className="block text-sm font-medium text-gray-700 mb-1">{f.label}</span>
                        <textarea
                          rows={5}
                          autoComplete="off"
                          spellCheck={false}
                          placeholder={placeholder}
                          value={values[f.name] ?? ''}
                          onChange={(e) => {
                            setValues({ ...values, [f.name]: e.target.value });
                            if (fieldErrors[f.name]) setFieldErrors({ ...fieldErrors, [f.name]: '' });
                          }}
                          className={`w-full rounded-lg border px-3 py-2 text-sm font-mono bg-white text-gray-900 focus:outline-none focus:ring-2 ${fieldErrors[f.name] ? 'border-red-400 focus:ring-red-200' : 'border-gray-300 focus:ring-indigo-200 focus:border-indigo-500'}`}
                        />
                        {fieldErrors[f.name] && <p className="text-xs text-red-600 mt-1">{fieldErrors[f.name]}</p>}
                      </label>
                    ) : (
                      <Input
                        label={f.label}
                        type={f.secret ? 'password' : 'text'}
                        autoComplete="off"
                        placeholder={placeholder}
                        value={values[f.name] ?? ''}
                        error={fieldErrors[f.name]}
                        onChange={(e) => {
                          setValues({ ...values, [f.name]: e.target.value });
                          if (fieldErrors[f.name]) setFieldErrors({ ...fieldErrors, [f.name]: '' });
                        }}
                      />
                    )}
                    <p className="text-xs text-gray-400 mt-1">{currentMasked && <span className="font-mono">Current: {currentMasked} — </span>}{f.help}</p>
                  </div>
                  );
                })}
                {section === 'Maps & Location' && (
                  <div className="pt-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Preview</p>
                    <MapboxMap />
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-gray-400 max-w-sm">Leave a field blank to keep its current value. Saved keys are stored in the database and never returned in full.</p>
            <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2"><Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}</Button>
          </div>
        </div>
      )}
    </div>
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

const AdminTransactionsList: React.FC = () => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchTransactions = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}&limit=200` : '?limit=200';
      const res = await api.get(`/admin/transactions${params}`);
      setTransactions(res.data.transactions || []);
    } catch (e) { console.error('Failed to fetch transactions:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchTransactions(debouncedSearch); }, [debouncedSearch, fetchTransactions]);

  const getUserName = (t: any) => {
    if (t.first_name || t.last_name) return `${t.first_name || ''} ${t.last_name || ''}`.trim();
    return t.user_id?.substring(0, 12) || 'Unknown';
  };

  const isCredit = (type: string) =>
    ['deposit', 'refund', 'transfer_in', 'escrow_release'].includes(type);

  const statusStyle = (s: string) => {
    if (s === 'completed') return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    if (s === 'pending') return 'bg-amber-50 text-amber-700 border border-amber-200';
    if (s === 'failed') return 'bg-red-50 text-red-700 border border-red-200';
    return 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Search by reference, user, or type..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all" />
        </div>
        <button onClick={() => fetchTransactions(debouncedSearch)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 transition-colors">Refresh</button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading transactions...</p>
      ) : transactions.length === 0 ? (
        <div className="py-16 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
          <CreditCard size={48} className="mx-auto text-gray-300 mb-4" />
          <h4 className="text-lg font-semibold text-gray-700">No transactions found</h4>
          <p className="text-sm text-gray-400 mt-1">Wallet payments and transfers will appear here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full bg-white text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {transactions.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(t.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <span className="block text-[10px] text-gray-400">{new Date(t.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-gray-700 font-medium">{getUserName(t)}</td>
                  <td className="px-6 py-3.5">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold capitalize border bg-indigo-50 text-indigo-700 border-indigo-200">
                      {String(t.type || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className={`px-6 py-3.5 text-sm font-extrabold ${isCredit(t.type) ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isCredit(t.type) ? '+' : '-'}₦{Number(t.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusStyle(t.status)}`}>{t.status || 'pending'}</span>
                  </td>
                  <td className="px-6 py-3.5 text-xs font-mono text-gray-500" title={t.reference}>
                    {t.reference ? t.reference.substring(0, 18) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const AdminAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchLogs = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}&limit=300` : '?limit=300';
      const res = await api.get(`/admin/audit-logs${params}`);
      setLogs(res.data.logs || []);
    } catch (e) { console.error('Failed to fetch audit logs:', e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLogs(debouncedSearch); }, [debouncedSearch, fetchLogs]);

  const actionBadge = (action: string) => {
    if (action.endsWith('.deleted')) return 'bg-red-50 text-red-700 border-red-200';
    if (action.endsWith('.created')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('suspended')) return 'bg-amber-50 text-amber-700 border-amber-200';
    if (action.includes('credited')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (action.includes('debited')) return 'bg-orange-50 text-orange-700 border-orange-200';
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  const getActor = (l: any) => {
    if (l.first_name || l.last_name) return `${l.first_name || ''} ${l.last_name || ''}`.trim();
    return l.user_id?.substring(0, 12) || 'System';
  };

  const formatDetails = (l: any) => {
    const vals = l.new_values || l.old_values;
    if (!vals) return '—';
    const entries = Object.entries(vals).filter(([, v]) => v !== null && v !== undefined && v !== '');
    if (entries.length === 0) return '—';
    return entries.map(([k, v]) => `${k}: ${String(v).substring(0, 40)}`).join(' · ');
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Search by action, admin name, or entity..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all" />
        </div>
        <button onClick={() => fetchLogs(debouncedSearch)}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 transition-colors">Refresh</button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading audit logs...</p>
      ) : logs.length === 0 ? (
        <div className="py-16 bg-white rounded-xl border border-gray-200 shadow-sm text-center">
          <ScrollText size={48} className="mx-auto text-gray-300 mb-4" />
          <h4 className="text-lg font-semibold text-gray-700">No audit activity yet</h4>
          <p className="text-sm text-gray-400 mt-1">Admin actions (user changes, wallet credits/debits, deletions) are recorded here.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full bg-white text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Performed By</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entity</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-gray-50/50 transition-colors align-top">
                  <td className="px-6 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(l.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    <span className="block text-[10px] text-gray-400">{new Date(l.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                  </td>
                  <td className="px-6 py-3.5">
                    <p className="text-sm text-gray-700 font-semibold leading-tight">{getActor(l)}</p>
                    {l.actor_role && <p className="text-[10px] text-gray-400 capitalize font-medium">{l.actor_role}</p>}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${actionBadge(l.action)}`}>
                      {String(l.action || '').replace(/[._]/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-gray-600">
                    <span className="capitalize font-bold">{l.entity_type || '—'}</span>
                    {l.entity_id && <span className="block font-mono text-[10px] text-gray-400 mt-0.5">{String(l.entity_id).substring(0, 14)}…</span>}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-gray-500 max-w-xs truncate" title={formatDetails(l)}>
                    {formatDetails(l)}
                  </td>
                  <td className="px-6 py-3.5 text-xs font-mono text-gray-400">{l.ip_address || '—'}</td>
                </tr>
              ))}
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

const COLORS_PIE = ['#00E676', '#0052D4', '#F59E0B', '#EF4444', '#8B5CF6'];

const AdminAnalyticsView: React.FC = () => {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = useCallback(async (p: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/analytics/overview?period=${p}`);
      setData(res.data);
    } catch (e) {
      console.error('Failed to fetch analytics overview:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(period);
  }, [period, fetchAnalytics]);

  if (loading && !data) {
    return <div className="py-16 text-center text-sm text-gray-500 font-medium">Loading executive analytics & intelligence...</div>;
  }

  const financials = data?.financials || { grossVolume: 0, platformNetRevenue: 0, avgBookingValue: 0, escrowInHold: 0 };
  const bookings = data?.bookings || { total: 0, completed: 0, active: 0, cancelled: 0, completionRate: 0, totalSeatsBooked: 0 };
  const statusDist = data?.statusDistribution || [];
  const topRoutes = data?.topRoutes || [];
  const monthlyTrends = data?.monthlyTrends || [];
  const vtuAnalytics = data?.vtuAnalytics || [];

  const statusPieData = statusDist.map((item: any) => ({
    name: item.status ? item.status.charAt(0).toUpperCase() + item.status.slice(1) : 'Other',
    value: Number(item.count || 0),
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" size={24} /> Executive Analytics & Intelligence
          </h3>
          <p className="text-sm text-gray-500 mt-1">Real-time performance metrics, financial volume, and corridor leaderboards.</p>
        </div>
        <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
          {(['7d', '30d', '90d', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                period === p
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : p === '90d' ? '90 Days' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          accent="indigo"
          icon={<DollarSign size={22} />}
          label="Gross Booking Volume"
          value={`₦${Number(financials.grossVolume).toLocaleString()}`}
          delay={0}
          sub={<span className="text-indigo-600 font-bold">Avg ₦{Number(financials.avgBookingValue).toLocaleString()} / booking</span>}
        />
        <StatCard
          accent="emerald"
          icon={<TrendingUp size={22} />}
          label="Platform Net Revenue (10%)"
          value={`₦${Number(financials.platformNetRevenue).toLocaleString()}`}
          delay={80}
          sub="Estimated commission fees"
        />
        <StatCard
          accent="blue"
          icon={<CheckCircle size={22} />}
          label="Completion Rate"
          value={`${bookings.completionRate}%`}
          delay={160}
          sub={<span className="text-blue-600 font-bold">{bookings.completed} completed of {bookings.total}</span>}
        />
        <StatCard
          accent="amber"
          icon={<CreditCard size={22} />}
          label="Escrow In Hold"
          value={`₦${Number(financials.escrowInHold).toLocaleString()}`}
          delay={240}
          sub={<>{bookings.active} active trips in progress</>}
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue & Growth Curve */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" /> Financial Growth & Booking Trends
            </h4>
            <span className="text-xs text-gray-400 font-medium">Monthly Aggregates</span>
          </div>
          {monthlyTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrends} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="revenueGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip content={<CustomTooltip color="#4F46E5" prefix="₦" />} />
                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" strokeWidth={3} fill="url(#revenueGlow)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-16 text-center text-sm text-gray-400">No monthly financial data available yet.</div>
          )}
        </div>

        {/* Booking Status Donut Chart */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
          <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen size={18} className="text-emerald-600" /> Booking Status Breakdown
          </h4>
          {statusPieData.length > 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PIE[index % COLORS_PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-16 text-center text-sm text-gray-400">No booking status distribution data.</div>
          )}
        </div>
      </div>

      {/* Top Corridors & VTU Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Interstate Corridors */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <MapPin size={18} className="text-indigo-600" /> Top Interstate Travel Corridors
          </h4>
          {topRoutes.length > 0 ? (
            <div className="space-y-3">
              {topRoutes.map((route: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      #{idx + 1}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">{route.from_city} ➔ {route.to_city}</p>
                      <p className="text-xs text-gray-500">{route.booking_count} bookings · {route.seats_booked} seats sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-emerald-600">₦{Number(route.total_revenue).toLocaleString()}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Gross Volume</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">No route performance metrics for selected timeframe.</div>
          )}
        </div>

        {/* Utility & VTU Analytics */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <h4 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Zap size={18} className="text-amber-500" /> VTU Utility & Services Breakdown
          </h4>
          {vtuAnalytics.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={vtuAnalytics.map((v: any) => ({ name: v.service_type?.toUpperCase() || 'VTU', count: v.count, total: v.total_amount }))} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip />
                <Bar dataKey="total" name="Total Revenue (₦)" radius={[6, 6, 0, 0]} fill="#F59E0B" maxBarSize={38} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="py-12 text-center text-sm text-gray-400">No VTU utility purchase data available.</div>
          )}
        </div>
      </div>
    </div>
  );
};
