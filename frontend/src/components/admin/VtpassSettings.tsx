import React, { useEffect, useState } from 'react';
import ServiceTable from './ServiceTable';
import api from '../../services/api';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import '../../styles/admin.css';

const SERVICE_CONFIG: Record<string, { title: string; icon: string; planLabel: string; bundleLabel: string; saveLabel: string; savedLabel: string }> = {
  data: {
    title: 'Data Services',
    icon: 'M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.906 14.142 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0',
    planLabel: 'Data Plan Pricing',
    bundleLabel: 'DATA BUNDLE',
    saveLabel: 'Save Data Plan',
    savedLabel: 'Saved Data Plans',
  },
  airtime: {
    title: 'Airtime Services',
    icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z',
    planLabel: 'Airtime Pricing',
    bundleLabel: 'AIRTIME BUNDLE',
    saveLabel: 'Save Airtime Plan',
    savedLabel: 'Saved Airtime Plans',
  },
  bill: {
    title: 'Electricity Services',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    planLabel: 'Electricity Pricing',
    bundleLabel: 'ELECTRICITY PROVIDER',
    saveLabel: 'Save Electricity Plan',
    savedLabel: 'Saved Electricity Plans',
  },
  tv: {
    title: 'TV Subscriptions',
    icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
    planLabel: 'TV Pricing',
    bundleLabel: 'TV PLAN',
    saveLabel: 'Save TV Plan',
    savedLabel: 'Saved TV Plans',
  },
};

interface VtpassSettingsProps { defaultService?: string; }
const VtpassSettings: React.FC<VtpassSettingsProps> = ({ defaultService }) => {
  const [service] = useState<string>(defaultService ?? 'data');
  const [plans, setPlans] = useState<any[]>([]);
  const [network, setNetwork] = useState<string>('mtn');
  const [selectedBundle, setSelectedBundle] = useState<string>('');
  const [volume, setVolume] = useState('');
  const [planType, setPlanType] = useState('Monthly');
  const [validity, setValidity] = useState('');
  const [apiPrice, setApiPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'sandbox' | 'live'>(
    import.meta.env.REACT_APP_VTPASS_MODE?.toLowerCase() === 'live' ? 'live' : 'sandbox'
  );
  const [cashbackType, setCashbackType] = useState<'fixed' | 'percentage'>('fixed');
  const [cashbackValue, setCashbackValue] = useState('');

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [filterMode, setFilterMode] = useState<'all' | 'sandbox' | 'live'>('all');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const [apiType, setApiType] = useState<string>('vtpass');

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const serviceIdMap: Record<string, string> = {
        data: `${network.toLowerCase()}-data`,
        airtime: `${network.toLowerCase()}-airtime`,
        bill: 'electricity',
        tv: network.toLowerCase(),
      };
      const serviceId = serviceIdMap[service] || service;
      // Fetch available plans from our backend (which handles Bardetech vs VTpass)
      const res = await api.get(`/admin/vtpass/plans?service=${serviceId}&apiType=${apiType}`);
      setPlans(res.data || []);
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data;
      console.warn(`/admin/vtpass/plans error (${status}):`, data || e);
      if (status === 401) showToast('Session expired. Please log in again.', 'error');
      else if (status === 403) showToast('Admin access required.', 'error');
      else showToast('Failed to fetch available plans.', 'error');
      setPlans([]);
    }
    setLoading(false);
  };

  const fetchSavedPlans = async () => {
    setLoading(true);
    try {
      const serviceIdMap: Record<string, string> = {
        data: `${network.toLowerCase()}-data`,
        airtime: 'airtime',
        bill: 'electricity',
        tv: network.toLowerCase(),
      };
      const serviceId = serviceIdMap[service] || service;
      const res = await api.get(`/admin/vtpass/plans?service=${serviceId}&apiType=all&savedOnly=true`);
      setSavedPlans(res.data || []);
    } catch (e) {
      console.warn('/admin/vtpass/plans not implemented in backend, using empty fallback', e);
      setSavedPlans([]);
      showToast('Failed to fetch saved plans.', 'error');
    }
    setLoading(false);
  };

  const fetchElectricityMode = async () => {
    try {
      const res = await api.get('/admin/vtpass/electricity/mode');
      if (res.data?.mode) setMode(res.data.mode);
    } catch (e) {
      console.warn('/admin/vtpass/electricity/mode not implemented in backend', e);
    }
  };

  const saveElectricityMode = async (newMode: 'sandbox' | 'live') => {
    try {
      setMode(newMode);
      await api.post('/admin/vtpass/electricity/mode', { mode: newMode });
      showToast('Electricity mode updated successfully!');
    } catch (e) {
      console.warn('/admin/vtpass/electricity/mode not implemented in backend', e);
      showToast('Failed to update electricity mode.', 'error');
    }
  };

  useEffect(() => {
    setSelectedBundle('');
    setApiPrice('');
    setValidity('');
    setVolume('');
    if (service === 'bill' || service === 'airtime') {
      setNetwork(service === 'bill' ? 'electricity' : 'airtime');
      setApiType('vtpass');
      if (activeTab === 'list') {
        fetchSavedPlans();
      }
    } else if (service === 'tv') {
      setNetwork('dstv');
      setApiType('vtpass');
      if (activeTab === 'create') fetchPlans();
      else fetchSavedPlans();
    } else {
      setNetwork('mtn');
      if (activeTab === 'create') {
        fetchPlans();
      } else {
        fetchSavedPlans();
      }
    }
  }, [service, activeTab, apiType]);

  useEffect(() => {
    setSelectedBundle('');
    setApiPrice('');
    if (activeTab === 'create' && service !== 'bill' && service !== 'airtime') {
      fetchPlans();
    } else if (activeTab === 'list') {
      fetchSavedPlans();
    }
  }, [network]);

  // Ensure plans are fetched when switching to list tab
  useEffect(() => {
    if (activeTab === 'list') {
      fetchSavedPlans();
    }
  }, [activeTab, service]);

  const handleBundleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    setSelectedBundle(code);
    
    const plan = plans.find(p => p.variation_code === code);
    if (plan) {
      setApiPrice(plan.variation_amount || plan.price || '');
      
      const name = plan.name || '';
      
      // Use explicit validity if available, else extract from name
      if (plan.validity) {
        setValidity(plan.validity);
      } else {
        const validityMatch = name.match(/(\d+\s*(days|day|month|months|week|weeks|hrs|hours))/i);
        setValidity(validityMatch ? validityMatch[1] : '');
      }
      
      // Use explicit volume if available, else extract from name
      if (plan.volume) {
        setVolume(plan.volume);
      } else {
        const volumeMatch = name.match(/(\d+\s*(MB|GB|TB))/i);
        setVolume(volumeMatch ? volumeMatch[1] : '');
      }
    }
  };

  const handleSavePlan = async () => {
    if (service !== 'bill' && service !== 'airtime' && !selectedBundle) {
      showToast('Please select a bundle.', 'error');
      return;
    }
    if ((service === 'bill' || service === 'airtime') && !sellingPrice) {
      showToast('Please enter a price.', 'error');
      return;
    }
    const finalSellingPrice = sellingPrice ? parseFloat(sellingPrice) : parseFloat(apiPrice);
    setSaving(true);
    try {
      if (service === 'bill' || service === 'airtime') {
        const serviceType = service === 'bill' ? 'electricity' : 'airtime';
        const labelName = service === 'bill' ? 'Electricity' : 'Airtime';
        await api.post('/admin/vtpass/plans', {
          service: serviceType,
          name: `₦${sellingPrice} ${labelName} Plan`,
          variationCode: `${serviceType}_${sellingPrice}`,
          price: parseFloat(sellingPrice),
          apiPrice: parseFloat(sellingPrice),
          network: serviceType,
          mode: 'live',
          apiType: 'vtpass',
          cashbackType,
          cashbackValue: cashbackValue ? parseFloat(cashbackValue) : 0,
        });
      } else {
        const plan = plans.find(p => p.variation_code === selectedBundle);
        await api.post('/admin/vtpass/plans', {
          service: service === 'tv' ? network.toLowerCase() : `${network.toLowerCase()}-${service}`,
          name: plan?.name || `${network.toUpperCase()} ${volume} ${validity}`,
          variationCode: selectedBundle,
          price: finalSellingPrice,
          apiPrice: parseFloat(apiPrice),
          volume,
          validity,
          planType,
          network: network.toUpperCase(),
          mode,
          apiType,
          cashbackType,
          cashbackValue: cashbackValue ? parseFloat(cashbackValue) : 0,
        });
      }
      if (activeTab === 'list') fetchSavedPlans();
      setActiveTab('list');
      // Small delay to ensure tab switch triggers re-fetch
      setTimeout(() => fetchSavedPlans(), 300);
      showToast(`${service === 'bill' ? 'Electricity' : service === 'airtime' ? 'Airtime' : service === 'tv' ? 'TV Plan' : 'Plan'} saved successfully!`);
    } catch (e) {
      console.warn('/admin/vtpass/plans not implemented in backend', e);
      showToast('Failed to save plan.', 'error');
    }
    setSaving(false);
  };

  const handlePlanUpdate = async (id: string, updates: Record<string, any>) => {
    try {
      await api.patch(`/admin/vtpass/plan/${id}`, updates);
      setSavedPlans(prev => prev.map(p => (p.id === id ? { ...p, ...updates } : p)));
      showToast('Plan updated successfully!');
    } catch (e) {
      console.warn('/admin/vtpass/plan not implemented in backend', e);
      showToast('Failed to update plan.', 'error');
    }
  };

  const handlePlanDelete = async (id: string) => {
    try {
      await api.delete(`/admin/vtpass/plans/${id}`);
      setSavedPlans(prev => prev.filter(p => p.id !== id));
      showToast('Plan deleted successfully!');
    } catch (e) {
      console.warn('/admin/vtpass/plans not implemented in backend', e);
      showToast('Failed to delete plan.', 'error');
    }
  };

  const handleBulkUpdate = async (ids: string[], updates: Record<string, any>) => {
    try {
      await api.patch('/admin/vtpass/plans/bulk', { ids, updates });
      setSavedPlans(prev => prev.map(p => ids.includes(p.id) ? { ...p, ...updates } : p));
      showToast(`Cashback applied to ${ids.length} plan(s) successfully!`);
    } catch (e) {
      console.warn('/admin/vtpass/plans/bulk not implemented in backend', e);
      showToast('Failed to apply bulk cashback.', 'error');
    }
  };

  const [filterApiType, setFilterApiType] = useState<'all' | 'vtpass' | 'bardetech'>('all');
  
  const filteredPlans = savedPlans.filter(p => {
    const matchMode = filterMode === 'all' || p.mode === filterMode;
    const matchApi = filterApiType === 'all' || p.apiType === filterApiType;
    return matchMode && matchApi;
  });

  return (
    <div className="vtpass-settings bg-white p-8 rounded-xl w-full h-full text-gray-900 relative">
      {toastMessage && (
        <div className={`absolute top-4 right-4 px-4 py-2 rounded shadow text-sm font-medium z-50 ${toastMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {toastMessage.text}
        </div>
      )}

      <div className="flex items-center gap-2 mb-6 border-b pb-4">
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={(SERVICE_CONFIG[service] || SERVICE_CONFIG.data).icon}></path></svg>
        <h2 className="text-xl font-bold text-gray-800">{(SERVICE_CONFIG[service] || SERVICE_CONFIG.data).title}</h2>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'create' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'}`}
          onClick={() => setActiveTab('create')}
        >
          Add {(SERVICE_CONFIG[service] || SERVICE_CONFIG.data).title.replace(' Services', '')} Plan
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'list' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-800'}`}
          onClick={() => setActiveTab('list')}
        >
          View {(SERVICE_CONFIG[service] || SERVICE_CONFIG.data).savedLabel.replace('Saved ', '')}
        </button>
      </div>

      {activeTab === 'create' ? (
        <>
          <h3 className="text-lg font-semibold mb-6 text-gray-700">{(SERVICE_CONFIG[service] || SERVICE_CONFIG.data).planLabel}</h3>

          <form className="w-full" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* API Type */}
            {service !== 'bill' && service !== 'airtime' && service !== 'tv' && (
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                  API TYPE
                </label>
                <select 
                  value={apiType} 
                  onChange={(e) => setApiType(e.target.value)} 
                  className="w-full bg-white border border-slate-200 text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all px-3 py-2.5"
                >
                  <option value="vtpass">VTpass</option>
                  <option value="bardetech">Bardetech</option>
                </select>
              </div>
            )}

            {/* Mode Toggle */}
            {service !== 'bill' && service !== 'airtime' && (
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"></path></svg>
                MODE
              </label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => service === 'bill' ? saveElectricityMode('sandbox') : setMode('sandbox')}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: '12px',
                    border: mode === 'sandbox' ? '2px solid #F59E0B' : '2px solid #E2E8F0',
                    background: mode === 'sandbox' ? '#FFFBEB' : '#fff',
                    color: mode === 'sandbox' ? '#B45309' : '#64748B',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: mode === 'sandbox' ? '#F59E0B' : '#CBD5E1',
                    display: 'inline-block'
                  }} />
                  Sandbox
                </button>
                <button
                  type="button"
                  onClick={() => service === 'bill' ? saveElectricityMode('live') : setMode('live')}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: '12px',
                    border: mode === 'live' ? '2px solid #10B981' : '2px solid #E2E8F0',
                    background: mode === 'live' ? '#ECFDF5' : '#fff',
                    color: mode === 'live' ? '#065F46' : '#64748B',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: mode === 'live' ? '#10B981' : '#CBD5E1',
                    display: 'inline-block'
                  }}
                  />
                  Live
                </button>
              </div>
              {mode === 'live' && (
                <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  Live mode will use real VTpass API and affect actual transactions.
                </p>
              )}
            </div>
            )}

            {service === 'bill' || service === 'airtime' ? (
              <>
                <div>
                  <Input 
                    type="number"
                    label={`${service === 'bill' ? 'ELECTRICITY' : 'AIRTIME'} PRICE (NGN)`}
                    placeholder={service === 'bill' ? "e.g., 2000" : "e.g., 100"}
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    leftIcon={<span className="font-bold text-slate-400">₦</span>}
                  />
                </div>
                <div className="flex gap-4 w-full">
                  <div className="flex-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                      CASHBACK TYPE (OPTIONAL)
                    </label>
                    <select 
                      value={cashbackType}
                      onChange={(e) => setCashbackType(e.target.value as 'fixed' | 'percentage')}
                      className="w-full bg-white border border-slate-200 text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all px-3 py-2.5"
                    >
                      <option value="fixed">Fixed Amount (₦)</option>
                      <option value="percentage">Percentage (%)</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <Input 
                      type="number"
                      label="CASHBACK VALUE"
                      placeholder="e.g., 5"
                      value={cashbackValue}
                      onChange={(e) => setCashbackValue(e.target.value)}
                      leftIcon={<span className="font-bold text-slate-400">{cashbackType === 'fixed' ? '₦' : '%'}</span>}
                    />
                  </div>
                </div>
                <div style={{ paddingTop: '16px' }}>
                  <Button variant="primary" type="button" onClick={handleSavePlan} isLoading={saving} disabled={saving || !sellingPrice}>
                    {(SERVICE_CONFIG[service] || SERVICE_CONFIG.data).saveLabel}
                  </Button>
                </div>
              </>
            ) : (
              <>

            {/* Network */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"></path></svg>
                {service === 'bill' ? 'PROVIDER' : 'NETWORK'}
              </label>
              <select 
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="w-full bg-white border border-slate-200 text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all px-3 py-2.5"
              >
                {service === 'bill' ? (
                  <>
                    <option value="ikeja-electric">Ikeja Electric (IKEDC)</option>
                    <option value="eko-electric">Eko Electric (EKEDC)</option>
                    <option value="kano-electric">Kano Electric (KEDCO)</option>
                    <option value="phed">Port Harcourt Electric (PHED)</option>
                    <option value="jos-electric">Jos Electric (JED)</option>
                    <option value="ibadan-electric">Ibadan Electric (IBEDC)</option>
                    <option value="kaduna-electric">Kaduna Electric (KAEDCO)</option>
                    <option value="abuja-electric">Abuja Electric (AEDC)</option>
                    <option value="enugu-electric">Enugu Electric (EEDC)</option>
                    <option value="benin-electric">Benin Electric (BEDC)</option>
                    <option value="aba-electric">Aba Electric (ABA)</option>
                    <option value="yola-electric">Yola Electric (YEDC)</option>
                  </>
                ) : service === 'tv' ? (
                  <>
                    <option value="dstv">DSTV</option>
                    <option value="gotv">GOtv</option>
                    <option value="startimes">Startimes</option>
                    <option value="showmax">Showmax</option>
                  </>
                ) : (
                  <>
                    <option value="mtn">MTN</option>
                    <option value="airtel">Airtel</option>
                    <option value="glo">Glo</option>
                    <option value="etisalat">9Mobile</option>
                  </>
                )}
              </select>
            </div>

            {/* Bundle */}
            <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
                  {(SERVICE_CONFIG[service] || SERVICE_CONFIG.data).bundleLabel}
                </label>
                <select 
                  value={selectedBundle}
                  onChange={handleBundleChange}
                  className="w-full bg-white border border-slate-200 text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all px-3 py-2.5"
                >
                  <option value="">Select a bundle</option>
                  {plans.map((p, idx) => <option key={`${p.variation_code}-${idx}`} value={p.variation_code}>{p.name}</option>)}
                </select>
              </div>

            {/* Conditional Data Fields */}
            {service === 'data' && (
              <>
                {/* Data Volume */}
                <div>
                  <Input 
                    label="DATA VOLUME" 
                    placeholder="e.g., 1GB, 2GB, 5GB" 
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>}
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"></path></svg>
                    TYPE (DAILY, WEEKLY, MONTHLY)
                  </label>
                  <select 
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value)}
                    className="w-full bg-white border border-slate-200 text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all px-3 py-2.5"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                {/* Validity */}
                <div>
                  <Input 
                    label="VALIDITY" 
                    placeholder="e.g., 30 days" 
                    value={validity}
                    onChange={(e) => setValidity(e.target.value)}
                    leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>}
                  />
                </div>
              </>
            )}

            {/* API Price */}
            <div>
              <Input 
                type="number"
                label="API PRICE (NGN)" 
                value={apiPrice}
                readOnly
                leftIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>}
              />
            </div>

            {/* Selling Price / Convenience Fee */}
            <div>
              <Input 
                type="number"
                label={service === 'bill' ? "CONVENIENCE FEE (NGN)" : "YOUR SELLING PRICE (NGN)"}
                placeholder={service === 'bill' ? "e.g., 100" : service === 'tv' ? "Leave empty to use API Price" : "e.g., 980"}
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                leftIcon={<span className="font-bold text-slate-400">₦</span>}
              />
            </div>

            <div className="flex gap-4 w-full">
              <div className="flex-1">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase mb-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  CASHBACK TYPE (OPTIONAL)
                </label>
                <select 
                  value={cashbackType}
                  onChange={(e) => setCashbackType(e.target.value as 'fixed' | 'percentage')}
                  className="w-full bg-white border border-slate-200 text-sm text-slate-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all px-3 py-2.5"
                >
                  <option value="fixed">Fixed Amount (₦)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
              <div className="flex-1">
                <Input 
                  type="number"
                  label="CASHBACK VALUE"
                  placeholder="e.g., 5"
                  value={cashbackValue}
                  onChange={(e) => setCashbackValue(e.target.value)}
                  leftIcon={<span className="font-bold text-slate-400">{cashbackType === 'fixed' ? '₦' : '%'}</span>}
                />
              </div>
            </div>

              <div style={{ paddingTop: '16px' }}>
                <Button variant="primary" type="button" onClick={handleSavePlan} isLoading={saving} disabled={saving || !selectedBundle}>
                  {(SERVICE_CONFIG[service] || SERVICE_CONFIG.data).saveLabel}
                </Button>
              </div>
              </>
            )}
          </form>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold mb-4 text-gray-700">{(SERVICE_CONFIG[service] || SERVICE_CONFIG.data).savedLabel}</h3>
          {service !== 'bill' && service !== 'airtime' && (
            <div className="flex items-center gap-4 mb-4">
              <label className="text-sm font-medium">Filter by Mode:</label>
              <select value={filterMode} onChange={e => setFilterMode(e.target.value as any)} className="border rounded px-2 py-1">
                <option value="all">All</option>
                <option value="sandbox">Sandbox</option>
                <option value="live">Live</option>
              </select>

              <label className="text-sm font-medium ml-4">API Type:</label>
              <select value={filterApiType} onChange={e => setFilterApiType(e.target.value as any)} className="border rounded px-2 py-1">
                <option value="all">All APIs</option>
                <option value="vtpass">VTpass</option>
                {service !== 'tv' && <option value="bardetech">Bardetech</option>}
              </select>

              <label className="text-sm font-medium ml-4">Network:</label>
              <select 
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                className="border rounded px-2 py-1"
              >
                {service === 'tv' ? (
                  <>
                    <option value="dstv">DSTV</option>
                    <option value="gotv">GOtv</option>
                    <option value="startimes">Startimes</option>
                    <option value="showmax">Showmax</option>
                  </>
                ) : (
                  <>
                    <option value="mtn">MTN</option>
                    <option value="airtel">Airtel</option>
                    <option value="glo">Glo</option>
                    <option value="etisalat">9Mobile</option>
                  </>
                )}
              </select>
            </div>
          )}
          <ServiceTable
            plans={filteredPlans}
            loading={loading}
            onPlanUpdate={handlePlanUpdate}
            onBulkUpdate={handleBulkUpdate}
            onPlanDelete={handlePlanDelete}
          />
        </>
      )}
    </div>
  );
};

export default VtpassSettings;
