import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { CheckCircle2, AlertCircle, Zap, Gift, Tv, ShieldCheck, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useLocation } from 'react-router-dom';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface AirtimePlan {
  id: string;
  name: string;
  price: number;
  network: string;
  service?: string;
  variation_code?: string;
  cashbackType?: 'fixed' | 'percentage';
  cashbackValue?: number;
  cashback_type?: 'fixed' | 'percentage';
  cashback_value?: number;
}

interface TvPlan {
  id: string;
  name: string;
  price: number;
  service: string;
  variation_code: string;
  cashback_type?: 'fixed' | 'percentage';
  cashback_value?: number;
}

/* ─── Network config ────────────────────────────────────────────────────── */
const NETWORKS = [
  { id: 'mtn',     label: 'MTN',     color: '#FFC300', bg: '#FFF9E6' },
  { id: 'airtel',  label: 'Airtel',  color: '#E32526', bg: '#FEF2F2' },
  { id: 'glo',     label: 'Glo',     color: '#007B40', bg: '#F0FDF4' },
  { id: '9mobile', label: '9Mobile', color: '#007B5E', bg: '#ECFDF5' },
];

/* ─── TV Providers ───────────────────────────────────────────────────────── */
const TV_PROVIDERS = [
  { id: 'dstv',      label: 'DSTV',      color: '#0057A8', bg: '#EFF6FF', emoji: '📡' },
  { id: 'gotv',      label: 'GOtv',      color: '#E87722', bg: '#FFF7ED', emoji: '📺' },
  { id: 'startimes', label: 'StarTimes', color: '#D62020', bg: '#FEF2F2', emoji: '⭐' },
  { id: 'showmax',   label: 'Showmax',   color: '#6D28D9', bg: '#F5F3FF', emoji: '🎬' },
];

/* ─── Styles ─────────────────────────────────────────────────────────────── */
const S = {
  page: {
    width: '100%', margin: '0 auto',
    display: 'flex', flexDirection: 'column' as const, gap: '24px',
  },
  pageTitle: { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 },
  pageSub: { color: '#6B7280', margin: '4px 0 0 0', fontSize: '0.95rem' },

  card: {
    background: '#fff', border: '1px solid #E5E7EB',
    borderRadius: '20px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
    overflow: 'hidden',
  },
  cardInner: { padding: '28px' },

  netRow: { display: 'flex', gap: '10px', flexWrap: 'wrap' as const, marginBottom: '22px' },
  netPill: (active: boolean, color: string, bg: string) => ({
    padding: '8px 18px', borderRadius: '50px', fontSize: '0.82rem', fontWeight: 700,
    cursor: 'pointer', transition: 'all 0.2s',
    border: active ? `2px solid ${color}` : '2px solid #E5E7EB',
    background: active ? bg : '#F9FAFB',
    color: active ? color : '#6B7280',
    boxShadow: active ? `0 2px 10px ${color}33` : 'none',
  }),

  tvProviderCard: (active: boolean, color: string, bg: string) => ({
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px',
    padding: '16px 20px', borderRadius: '16px', cursor: 'pointer', transition: 'all 0.2s',
    border: active ? `2px solid ${color}` : '2px solid #E5E7EB',
    background: active ? bg : '#F9FAFB',
    boxShadow: active ? `0 4px 16px ${color}33` : '0 1px 4px rgba(0,0,0,0.04)',
    flex: '1', minWidth: '80px',
  }),
  tvProviderEmoji: { fontSize: '1.6rem', lineHeight: 1 },
  tvProviderLabel: (active: boolean, color: string) => ({
    fontSize: '0.75rem', fontWeight: 700,
    color: active ? color : '#6B7280',
  }),

  inputLabel: { display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' as const, marginBottom: '8px' },
  inputBox: {
    width: '100%', padding: '13px 16px', border: '1.5px solid #E5E7EB',
    borderRadius: '12px', fontSize: '0.95rem', color: '#111827',
    background: '#FAFAFA', boxSizing: 'border-box' as const,
    outline: 'none', transition: 'border 0.2s',
  },

  sectionLabel: {
    fontSize: '0.88rem', fontWeight: 600, color: '#374151',
    margin: '20px 0 12px', display: 'flex', alignItems: 'center', gap: '6px',
  },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' },
  planCard: (selected: boolean) => ({
    borderRadius: '16px', padding: '16px 12px', cursor: 'pointer',
    border: selected ? '2px solid #6366F1' : '1.5px solid #E5E7EB',
    background: selected ? 'linear-gradient(135deg, #EEF2FF 0%, #F5F3FF 100%)' : '#F9FAFB',
    boxShadow: selected ? '0 4px 16px rgba(99,102,241,0.18)' : '0 1px 4px rgba(0,0,0,0.04)',
    transition: 'all 0.2s',
    textAlign: 'center' as const,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px',
  }),
  planAmount: (selected: boolean) => ({ fontSize: '1.05rem', fontWeight: 800, color: selected ? '#4F46E5' : '#111827' }),
  planName: (selected: boolean) => ({ fontSize: '0.72rem', fontWeight: 600, color: selected ? '#6366F1' : '#6B7280', lineHeight: 1.3 }),
  cashbackBadge: (selected: boolean) => ({
    fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '50px',
    background: selected ? '#6366F1' : '#E0E7FF',
    color: selected ? '#fff' : '#4F46E5',
    display: 'flex', alignItems: 'center', gap: '3px',
  }),
  noCashback: { fontSize: '0.7rem', color: '#9CA3AF' },

  skeletonGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' },
  skeleton: {
    borderRadius: '16px', height: '88px',
    background: 'linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  },

  customRow: {
    display: 'flex', gap: '10px', alignItems: 'center',
    background: '#F9FAFB', border: '1.5px solid #E5E7EB',
    borderRadius: '14px', padding: '6px 6px 6px 16px', marginBottom: '20px',
  },
  customInput: { flex: 1, border: 'none', background: 'transparent', fontSize: '1rem', color: '#111827', outline: 'none', padding: '8px 0' },
  payBtn: (disabled: boolean) => ({
    padding: '11px 28px', borderRadius: '10px', border: 'none',
    background: disabled ? '#C7D2FE' : 'linear-gradient(135deg, #6366F1, #4F46E5)',
    color: '#fff', fontWeight: 700, fontSize: '0.95rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 4px 14px rgba(79,70,229,0.35)',
    transition: 'all 0.2s', whiteSpace: 'nowrap' as const,
  }),

  verifyRow: {
    display: 'flex', gap: '10px', alignItems: 'flex-end', marginBottom: '16px',
  },
  verifyBtn: (disabled: boolean, loading: boolean) => ({
    padding: '13px 20px', borderRadius: '12px', border: 'none', whiteSpace: 'nowrap' as const,
    background: disabled || loading ? '#E0E7FF' : 'linear-gradient(135deg, #6366F1, #4F46E5)',
    color: disabled || loading ? '#6366F1' : '#fff', fontWeight: 700, fontSize: '0.88rem',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px',
    boxShadow: disabled || loading ? 'none' : '0 4px 14px rgba(79,70,229,0.3)',
  }),
  verifiedBanner: {
    display: 'flex', alignItems: 'center', gap: '10px',
    background: '#ECFDF5', border: '1px solid #A7F3D0',
    borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
    color: '#065F46', fontSize: '0.88rem', fontWeight: 600,
  },

  alertSuccess: { background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', padding: '12px 16px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' },
  alertError: { background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: '12px 16px', borderRadius: '12px', display: 'flex', gap: '10px', alignItems: 'flex-start' },

  comingSoon: { textAlign: 'center' as const, color: '#9CA3AF', padding: '48px 0', fontSize: '1rem' },
  formBase: { display: 'flex', flexDirection: 'column' as const, gap: '20px', maxWidth: '420px', margin: '0 auto' },
  btnPrimary: { padding: '13px 24px', background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(79,70,229,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' },
};

export const VTUDashboard: React.FC = () => {
  const location = useLocation();
  const activeTab: 'airtime' | 'data' | 'tv' | 'electricity' = (() => {
    if (location.pathname.includes('/data')) return 'data';
    if (location.pathname.includes('/tv-subscriptions')) return 'tv';
    if (location.pathname.includes('/electricity')) return 'electricity';
    return 'airtime';
  })();

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  /* ── Airtime ── */
  const [network, setNetwork] = useState('mtn');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [airtimePlans, setAirtimePlans] = useState<AirtimePlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  /* ── Data ── */
  const [dataNetwork, setDataNetwork] = useState('mtn');
  const [dataPhone, setDataPhone] = useState('');
  const [dataAmount, setDataAmount] = useState('');
  const [dataPlanId, setDataPlanId] = useState<string | null>(null);
  const [dataPlans, setDataPlans] = useState<AirtimePlan[]>([]);
  const [dataPlansLoading, setDataPlansLoading] = useState(false);

  /* ── TV ── */
  const [tvProvider, setTvProvider] = useState('dstv');
  const [smartcard, setSmartcard] = useState('');
  const [tvPhone, setTvPhone] = useState('');
  const [tvPlans, setTvPlans] = useState<TvPlan[]>([]);
  const [tvPlansLoading, setTvPlansLoading] = useState(false);
  const [selectedTvPlan, setSelectedTvPlan] = useState<TvPlan | null>(null);
  const [tvVerifying, setTvVerifying] = useState(false);
  const [tvCustomerName, setTvCustomerName] = useState('');
  const [tvVerifyError, setTvVerifyError] = useState('');
  const [subscriptionType, setSubscriptionType] = useState<'renew' | 'change'>('renew');

  /* ── Electricity ── */
  const [elecNetwork, setElecNetwork] = useState('mtn');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [meterType, setMeterType] = useState('');
  const [meterNumber, setMeterNumber] = useState('');
  const [elecPhone, setElecPhone] = useState('');
  const [elecAmount, setElecAmount] = useState('');
  const [electricityPlans, setElectricityPlans] = useState<AirtimePlan[]>([]);
  const [elecPlansLoading, setElecPlansLoading] = useState(false);
  const [elecPlanId, setElecPlanId] = useState<string | null>(null);
  const [providers, setProviders] = useState<{id: string; name: string}[]>([]);
  const [meterTypes, setMeterTypes] = useState<{id: string; name: string}[]>([]);

  // Fetch plans per tab
  useEffect(() => {
    if (activeTab === 'airtime') {
      setPlansLoading(true);
      api.get('/bills/data-plans?type=airtime')
        .then(res => setAirtimePlans((res.data?.plans || []).sort((a: AirtimePlan, b: AirtimePlan) => a.price - b.price)))
        .catch(err => console.error('Failed to fetch airtime plans', err))
        .finally(() => setPlansLoading(false));
    }
    if (activeTab === 'data') {
      setDataPlansLoading(true);
      api.get('/bills/saved-plans/data')
        .then(res => {
          const plans: AirtimePlan[] = (res.data?.plans || [])
            .map((p: any) => ({ ...p, network: (p.service || '').split('-')[0] }))
            .sort((a: AirtimePlan, b: AirtimePlan) => a.price - b.price);
          setDataPlans(plans);
        })
        .catch(err => console.error('Failed to fetch data plans', err))
        .finally(() => setDataPlansLoading(false));
    }
    if (activeTab === 'tv') {
      setTvPlansLoading(true);
      api.get('/bills/saved-plans/tv')
        .then(res => setTvPlans(res.data?.plans || []))
        .catch(err => console.error('Failed to fetch TV plans', err))
        .finally(() => setTvPlansLoading(false));
    }
    if (activeTab === 'electricity') {
      setElecPlansLoading(true);
      api.get('/bills/data-plans?type=electricity')
        .then(res => setElectricityPlans((res.data?.plans || []).sort((a: AirtimePlan, b: AirtimePlan) => a.price - b.price)))
        .catch(err => console.error('Failed to fetch electricity plans', err))
        .finally(() => setElecPlansLoading(false));
    }
  }, [activeTab]);

  // Fetch electricity providers once
  useEffect(() => {
    api.get('/bills/providers')
      .then(res => {
        if (res.data?.providers) setProviders(res.data.providers);
        if (res.data?.meterTypes) setMeterTypes(res.data.meterTypes);
      })
      .catch(err => console.error('Failed to fetch electricity providers', err));
  }, []);

  // Insert shimmer keyframes once
  useEffect(() => {
    const id = 'vtu-shimmer';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.innerHTML = `@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`;
      document.head.appendChild(style);
    }
  }, []);

  // Reset TV state when provider changes
  useEffect(() => {
    setSelectedTvPlan(null);
    setSmartcard('');
    setTvCustomerName('');
    setTvVerifyError('');
  }, [tvProvider]);

  const formatCashback = (plan: AirtimePlan | TvPlan) => {
    const val = (plan as TvPlan).cashback_value ?? (plan as AirtimePlan).cashbackValue ?? 0;
    const type = (plan as TvPlan).cashback_type ?? (plan as AirtimePlan).cashbackType;
    if (!val || val === 0) return null;
    return type === 'percentage' ? `${val}% Cashback` : `₦${val} Cashback`;
  };

  /* ── Filtered TV plans for selected provider ── */
  const filteredTvPlans = tvPlans.filter(p =>
    (p.service || '').toLowerCase().includes(tvProvider.toLowerCase())
  );

  /* ── Handlers ── */
  const handleAirtimePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !phone) return;
    setLoading(true); setSuccessMsg(''); setErrorMsg('');
    try {
      await api.post('/bills/airtime', { network, phone, amount: parseFloat(amount) });
      setSuccessMsg(`✅ ₦${amount} airtime sent to ${phone} successfully!`);
      setPhone(''); setAmount(''); setSelectedPlanId(null);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || 'Airtime purchase failed.');
    } finally { setLoading(false); }
  };

  const handleDataPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dataPhone || !dataPlanId) return;
    setLoading(true); setSuccessMsg(''); setErrorMsg('');
    const plan = dataPlans.find(p => p.id === dataPlanId);
    if (!plan) { setErrorMsg('Please select a data plan.'); setLoading(false); return; }
    try {
      await api.post('/bills/data', {
        network: dataNetwork,
        phone: dataPhone,
        variationCode: plan.variation_code || plan.id,
        amount: plan.price,
      });
      setSuccessMsg(`✅ Data bundle purchased for ${dataPhone} successfully!`);
      setDataPhone(''); setDataAmount(''); setDataPlanId(null);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || 'Data purchase failed.');
    } finally { setLoading(false); }
  };

  const handleTvVerify = async () => {
    if (!smartcard || !tvProvider) return;
    setTvVerifying(true); setTvCustomerName(''); setTvVerifyError('');
    try {
      const res = await api.post('/bills/verify-meter', {
        serviceId: tvProvider,
        billersCode: smartcard,
        type: 'smartcard',
      });
      setTvCustomerName(res.data?.Customer_Name || res.data?.customerName || res.data?.name || 'Customer verified');
    } catch (err: any) {
      setTvVerifyError(err?.response?.data?.error || 'Could not verify smartcard. Please check the number.');
    } finally { setTvVerifying(false); }
  };

  const handleTvPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTvPlan || !smartcard || !tvPhone) return;
    setLoading(true); setSuccessMsg(''); setErrorMsg('');
    try {
      await api.post('/bills/electricity', {
        serviceId: tvProvider,
        variationCode: selectedTvPlan.variation_code,
        billersCode: smartcard,
        amount: selectedTvPlan.price,
        phone: tvPhone,
        subscriptionType,
      });
      setSuccessMsg(`✅ ${TV_PROVIDERS.find(p => p.id === tvProvider)?.label} subscription renewed successfully!`);
      setSmartcard(''); setTvPhone(''); setSelectedTvPlan(null); setTvCustomerName('');
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || 'TV subscription failed.');
    } finally { setLoading(false); }
  };

  const handleElecPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setSuccessMsg(''); setErrorMsg('');
    try {
      await api.post('/bills/electricity', {
        serviceId: selectedProvider,
        billersCode: meterNumber,
        amount: parseFloat(elecAmount),
        phone: elecPhone,
        subscriptionType: 'prepaid',
      });
      setSuccessMsg(`✅ ₦${elecAmount} electricity token purchased for meter ${meterNumber}`);
      setElecPhone(''); setElecAmount(''); setMeterNumber(''); setElecPlanId(null);
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.error || 'Electricity payment failed.');
    } finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      <div style={S.page}>
        <div>
          <h1 style={S.pageTitle}>Services &amp; Bills</h1>
          <p style={S.pageSub}>Top up airtime, buy data, subscribe to TV, or pay utility bills.</p>
        </div>

        {successMsg && (
          <div style={S.alertSuccess}>
            <CheckCircle2 size={20} />
            <p style={{ margin: 0 }}>{successMsg}</p>
          </div>
        )}
        {errorMsg && (
          <div style={S.alertError}>
            <AlertCircle size={20} />
            <p style={{ margin: 0 }}>{errorMsg}</p>
          </div>
        )}

        <div style={S.card}>
          <div style={S.cardInner}>

            {/* ─── AIRTIME ─────────────────────────────────────────────── */}
            {activeTab === 'airtime' && (
              <>
                <div style={S.netRow}>
                  {NETWORKS.map(n => (
                    <button key={n.id} type="button" onClick={() => setNetwork(n.id)} style={S.netPill(network === n.id, n.color, n.bg)}>{n.label}</button>
                  ))}
                </div>
                <form onSubmit={handleAirtimePurchase}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={S.inputLabel}>Phone Number</label>
                    <input type="tel" placeholder="e.g. 08012345678" value={phone} onChange={e => setPhone(e.target.value)} required style={S.inputBox} />
                  </div>
                  <div style={S.sectionLabel}>
                    <Zap size={15} color="#6366F1" />
                    Top up Airtime
                  </div>
                  {plansLoading ? (
                    <div style={S.skeletonGrid}>
                      {[1,2,3,4,5,6].map(i => <div key={i} style={S.skeleton} />)}
                    </div>
                  ) : airtimePlans.length > 0 ? (
                    <div style={S.grid}>
                      {airtimePlans.map(plan => {
                        const cb = formatCashback(plan);
                        const selected = selectedPlanId === plan.id;
                        return (
                          <div key={plan.id} style={S.planCard(selected)} onClick={() => { setSelectedPlanId(plan.id); setAmount(plan.price.toString()); }}>
                            <span style={S.planAmount(selected)}>₦{plan.price.toLocaleString()}</span>
                            {cb ? (
                              <span style={S.cashbackBadge(selected)}><Gift size={9} />{cb}</span>
                            ) : (
                              <span style={S.noCashback}>No cashback</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: '#9CA3AF', fontSize: '0.88rem', marginBottom: '16px' }}>No preset amounts configured. Use the custom field below.</p>
                  )}
                  <div style={S.customRow}>
                    <span style={{ color: '#9CA3AF', fontWeight: 700, fontSize: '1rem' }}>₦</span>
                    <input type="number" min="50" max="50000" placeholder="50 – 50,000" value={amount} onChange={e => { setAmount(e.target.value); setSelectedPlanId(null); }} style={S.customInput} />
                    <button type="submit" disabled={loading || !phone || !amount} style={S.payBtn(loading || !phone || !amount)}>{loading ? 'Sending…' : 'Pay'}</button>
                  </div>
                </form>
              </>
            )}

            {/* ─── DATA ─────────────────────────────────────────────────── */}
            {activeTab === 'data' && (
              <>
                <div style={S.netRow}>
                  {NETWORKS.map(n => (
                    <button key={n.id} type="button" onClick={() => { setDataNetwork(n.id); setDataPlanId(null); setDataAmount(''); }} style={S.netPill(dataNetwork === n.id, n.color, n.bg)}>{n.label}</button>
                  ))}
                </div>
                <form onSubmit={handleDataPurchase}>
                  <div style={{ marginBottom: '20px' }}>
                    <label style={S.inputLabel}>Phone Number</label>
                    <input type="tel" placeholder="e.g. 08012345678" value={dataPhone} onChange={e => setDataPhone(e.target.value)} required style={S.inputBox} />
                  </div>
                  <div style={S.sectionLabel}>
                    <Zap size={15} color="#6366F1" />
                    Select Data Plan
                  </div>
                  {dataPlansLoading ? (
                    <div style={S.skeletonGrid}>
                      {[1,2,3,4,5,6].map(i => <div key={i} style={S.skeleton} />)}
                    </div>
                  ) : dataPlans.filter(p => p.network === dataNetwork).length > 0 ? (
                    <div style={S.grid}>
                      {dataPlans.filter(p => p.network === dataNetwork).map(plan => {
                        const cb = formatCashback(plan);
                        const selected = dataPlanId === plan.id;
                        return (
                          <div key={plan.id} style={S.planCard(selected)} onClick={() => { setDataPlanId(plan.id); setDataAmount(plan.price.toString()); }}>
                            <span style={S.planAmount(selected)}>₦{plan.price.toLocaleString()}</span>
                            <span style={S.planName(selected)}>{plan.name}</span>
                            {cb ? (
                              <span style={S.cashbackBadge(selected)}><Gift size={9} />{cb}</span>
                            ) : (
                              <span style={S.noCashback}>No cashback</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p style={{ color: '#9CA3AF', fontSize: '0.88rem', marginBottom: '16px' }}>No data plans configured for this network.</p>
                  )}
                  <div style={S.customRow}>
                    <span style={{ color: '#9CA3AF', fontWeight: 700, fontSize: '1rem' }}>₦</span>
                    <input type="number" min="50" placeholder="Custom amount" value={dataAmount} onChange={e => { setDataAmount(e.target.value); setDataPlanId(null); }} style={S.customInput} />
                    <button type="submit" disabled={loading || !dataPhone || (!dataPlanId && !dataAmount)} style={S.payBtn(loading || !dataPhone || (!dataPlanId && !dataAmount))}>{loading ? 'Processing…' : 'Pay'}</button>
                  </div>
                </form>
              </>
            )}

            {/* ─── TV SUBSCRIPTIONS ─────────────────────────────────────── */}
            {activeTab === 'tv' && (
              <>
                {/* Provider selector */}
                <div style={{ marginBottom: '24px' }}>
                  <div style={S.sectionLabel}>
                    <Tv size={15} color="#6366F1" />
                    Select TV Provider
                  </div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
                    {TV_PROVIDERS.map(prov => (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setTvProvider(prov.id)}
                        style={S.tvProviderCard(tvProvider === prov.id, prov.color, prov.bg)}
                      >
                        <span style={S.tvProviderEmoji}>{prov.emoji}</span>
                        <span style={S.tvProviderLabel(tvProvider === prov.id, prov.color)}>{prov.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Smartcard / Decoder number */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={S.inputLabel}>
                    {tvProvider === 'startimes' ? 'Smartcard Number' : 'IUC / Smartcard Number'}
                  </label>
                  <div style={S.verifyRow}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder={tvProvider === 'startimes' ? 'e.g. 1234567890' : 'e.g. 7042812345'}
                        value={smartcard}
                        onChange={e => { setSmartcard(e.target.value); setTvCustomerName(''); setTvVerifyError(''); }}
                        style={S.inputBox}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleTvVerify}
                      disabled={!smartcard || tvVerifying}
                      style={S.verifyBtn(!smartcard, tvVerifying)}
                    >
                      {tvVerifying ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={14} />}
                      {tvVerifying ? 'Verifying…' : 'Verify'}
                    </button>
                  </div>
                  {tvVerifyError && (
                    <p style={{ color: '#DC2626', fontSize: '0.8rem', marginTop: '6px', marginBottom: 0 }}>{tvVerifyError}</p>
                  )}
                  {tvCustomerName && !tvVerifyError && (
                    <div style={S.verifiedBanner}>
                      <CheckCircle2 size={16} color="#059669" />
                      Customer: <strong>{tvCustomerName}</strong>
                    </div>
                  )}
                </div>

                {/* Subscription type */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={S.inputLabel}>Subscription Type</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {(['renew', 'change'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => { setSubscriptionType(type); setSelectedTvPlan(null); }}
                        style={{
                          padding: '8px 20px', borderRadius: '50px', fontSize: '0.82rem', fontWeight: 700,
                          cursor: 'pointer', transition: 'all 0.2s', border: 'none',
                          background: subscriptionType === type ? 'linear-gradient(135deg, #6366F1, #4F46E5)' : '#F3F4F6',
                          color: subscriptionType === type ? '#fff' : '#6B7280',
                          boxShadow: subscriptionType === type ? '0 4px 14px rgba(99,102,241,0.3)' : 'none',
                        }}
                      >
                        {type === 'renew' ? '🔄 Renew' : '🔀 Change Plan'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plans grid */}
                <div style={S.sectionLabel}>
                  <Zap size={15} color="#6366F1" />
                  {filteredTvPlans.length > 0
                    ? `${filteredTvPlans.length} plan${filteredTvPlans.length !== 1 ? 's' : ''} available`
                    : 'Available Plans'}
                </div>

                {tvPlansLoading ? (
                  <div style={S.skeletonGrid}>
                    {[1,2,3,4,5,6].map(i => <div key={i} style={S.skeleton} />)}
                  </div>
                ) : filteredTvPlans.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                    {filteredTvPlans.map(plan => {
                      const cb = formatCashback(plan);
                      const selected = selectedTvPlan?.id === plan.id;
                      const prov = TV_PROVIDERS.find(p => p.id === tvProvider);
                      return (
                        <div
                          key={plan.id}
                          style={{
                            ...S.planCard(selected),
                            padding: '18px 14px',
                            borderColor: selected ? (prov?.color || '#6366F1') : '#E5E7EB',
                            background: selected
                              ? `linear-gradient(135deg, ${prov?.bg || '#EEF2FF'} 0%, #F5F3FF 100%)`
                              : '#F9FAFB',
                            boxShadow: selected ? `0 4px 16px ${prov?.color || '#6366F1'}33` : '0 1px 4px rgba(0,0,0,0.04)',
                          }}
                          onClick={() => setSelectedTvPlan(plan)}
                        >
                          <span style={{ ...S.planAmount(selected), color: selected ? (prov?.color || '#4F46E5') : '#111827' }}>
                            ₦{plan.price.toLocaleString()}
                          </span>
                          <span style={{ ...S.planName(selected), color: selected ? (prov?.color || '#6366F1') : '#374151', fontSize: '0.78rem', maxWidth: '100%' }}>
                            {plan.name}
                          </span>
                          {cb ? (
                            <span style={{ ...S.cashbackBadge(selected), background: selected ? (prov?.color || '#6366F1') : '#E0E7FF', color: selected ? '#fff' : '#4F46E5' }}>
                              <Gift size={9} />{cb}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF' }}>
                    <Tv size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                      No plans configured for {TV_PROVIDERS.find(p => p.id === tvProvider)?.label} yet.
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '0.82rem' }}>Ask your admin to add plans via the admin panel.</p>
                  </div>
                )}

                {/* Payment form */}
                {selectedTvPlan && (
                  <form onSubmit={handleTvPurchase} style={{ marginTop: '8px' }}>
                    <div style={{
                      background: 'linear-gradient(135deg, #EEF2FF, #F5F3FF)',
                      border: '1.5px solid #C7D2FE', borderRadius: '16px',
                      padding: '16px 20px', marginBottom: '20px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: '#6366F1', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Selected Plan</p>
                        <p style={{ margin: '4px 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#111827' }}>{selectedTvPlan.name}</p>
                      </div>
                      <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#4F46E5' }}>₦{selectedTvPlan.price.toLocaleString()}</span>
                    </div>

                    <div style={{ marginBottom: '20px' }}>
                      <label style={S.inputLabel}>Phone Number (for confirmation)</label>
                      <input
                        type="tel"
                        placeholder="e.g. 08012345678"
                        value={tvPhone}
                        onChange={e => setTvPhone(e.target.value)}
                        required
                        style={S.inputBox}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !smartcard || !tvPhone}
                      style={{
                        ...S.payBtn(loading || !smartcard || !tvPhone),
                        width: '100%', padding: '14px', borderRadius: '14px', fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                      }}
                    >
                      {loading
                        ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
                        : `Pay ₦${selectedTvPlan.price.toLocaleString()}`}
                    </button>
                  </form>
                )}
              </>
            )}

            {/* ─── ELECTRICITY ──────────────────────────────────────────── */}
            {activeTab === 'electricity' && (
              <>
                <div style={S.sectionLabel}>
                  <Zap size={15} color="#6366F1" />
                  Select Electricity Plan
                </div>
                {elecPlansLoading ? (
                  <div style={S.skeletonGrid}>
                    {[1,2,3,4,5,6].map(i => <div key={i} style={S.skeleton} />)}
                  </div>
                ) : electricityPlans.length > 0 ? (
                  <div style={S.grid}>
                    {electricityPlans.map(plan => {
                      const cb = formatCashback(plan);
                      const selected = elecPlanId === plan.id;
                      return (
                        <div key={plan.id} style={S.planCard(selected)} onClick={() => { setElecPlanId(plan.id); setElecAmount(plan.price.toString()); }}>
                          <span style={S.planAmount(selected)}>₦{plan.price.toLocaleString()}</span>
                          {cb ? (
                            <span style={S.cashbackBadge(selected)}><Gift size={9} />{cb}</span>
                          ) : (
                            <span style={S.noCashback}>No cashback</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ color: '#9CA3AF', fontSize: '0.88rem', marginBottom: '16px' }}>No preset electricity amounts configured. Use the custom field below.</p>
                )}

                <form onSubmit={handleElecPurchase} style={S.formBase}>
                  <div>
                    <label style={S.inputLabel}>Select Provider</label>
                    <select style={S.inputBox} value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} required>
                      <option value="" disabled>Select Provider...</option>
                      {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.inputLabel}>Meter Type</label>
                    <select style={S.inputBox} value={meterType} onChange={e => setMeterType(e.target.value)} required>
                      <option value="" disabled>Select Meter Type...</option>
                      {meterTypes.length > 0
                        ? meterTypes.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                        : <>
                            <option value="prepaid">Prepaid</option>
                            <option value="postpaid">Postpaid</option>
                          </>
                      }
                    </select>
                  </div>
                  <div>
                    <label style={S.inputLabel}>Meter Number</label>
                    <input type="text" placeholder="e.g. 10123456789" value={meterNumber} onChange={e => setMeterNumber(e.target.value)} required style={S.inputBox} />
                  </div>
                  <div>
                    <label style={S.inputLabel}>Phone Number</label>
                    <input type="tel" placeholder="e.g. 08012345678" value={elecPhone} onChange={e => setElecPhone(e.target.value)} required style={S.inputBox} />
                  </div>
                  <div>
                    <label style={S.inputLabel}>Amount (₦)</label>
                    <input type="number" min="50" placeholder="e.g. 1000" value={elecAmount} onChange={e => { setElecAmount(e.target.value); setElecPlanId(null); }} style={S.inputBox} />
                  </div>
                  <button type="submit" disabled={loading} style={S.btnPrimary}>{loading ? 'Processing...' : 'Pay Bill'}</button>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </DashboardLayout>
  );
};
