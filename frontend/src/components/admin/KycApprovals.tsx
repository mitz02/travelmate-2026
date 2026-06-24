import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { 
  Check, X, RefreshCw, Search, Eye, ArrowLeft,
  User, Phone, Mail, Camera, FileText, Loader, Banknote
} from 'lucide-react';

interface KycSubmission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  kyc_status: string;
  created_at: string;
}

interface KycDetail {
  id: string;
  user_id: string;
  id_type: string;
  id_number: string;
  id_front_url: string;
  id_back_url: string;
  selfie_url: string;
  kyc_status: string;
  admin_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: string;
  profile_picture: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

interface BankAccount {
  id: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  is_default: boolean;
}

type Props = { onRefresh?: () => void };

const DetachedBadge: React.FC<{ label: string; color: string }> = ({ label, color }) => (
  <span style={{
    display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
    fontSize: '0.75rem', fontWeight: 700, background: color, color: '#fff',
  }}>{label}</span>
);

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #F3F4F6', fontSize: '0.875rem' }}>
    <span style={{ color: '#6B7280', fontWeight: 500 }}>{label}</span>
    <span style={{ color: '#111827', fontWeight: 600, textAlign: 'right', maxWidth: '60%' }}>{value}</span>
  </div>
);

const DocCard: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  const isPdf = url.startsWith('data:application/pdf') || url.endsWith('.pdf');
  const [loadError, setLoadError] = useState(false);

  return (
    <div style={{ marginBottom: '16px' }}>
      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>{title}</p>
      {isPdf ? (
        <div style={{ height: '150px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          <FileText size={24} color="#6366F1" />
          <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>PDF document</span>
          <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.8rem', color: '#4F46E5', fontWeight: 600 }}>View PDF →</a>
        </div>
      ) : (
        <div style={{ height: '150px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
          {loadError ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '4px', color: '#9CA3AF' }}>
              <Camera size={20} />
              <span style={{ fontSize: '0.75rem' }}>Failed to load</span>
            </div>
          ) : (
            <img src={url} alt={title} style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
              onError={() => setLoadError(true)} onClick={() => window.open(url, '_blank')} />
          )}
        </div>
      )}
    </div>
  );
};

const KycApprovals: React.FC<Props> = ({ onRefresh }) => {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Detail view state
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<KycDetail | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [detailError, setDetailError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSubmissions = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : '';
      const res = await api.get(`/kyc/admin/pending${params}`);
      setSubmissions(res.data.submissions || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchSubmissions(debouncedSearch); }, [debouncedSearch, fetchSubmissions]);

  const openDetail = async (id: string) => {
    setViewingId(id);
    setDetailLoading(true);
    setDetailError('');
    try {
      const res = await api.get(`/kyc/admin/${id}`);
      setDetail(res.data.submission);
      setBankAccounts(res.data.bankAccounts || []);
      setAdminNotes(res.data.submission.admin_notes || '');
      setRejectReason(res.data.submission.rejection_reason || '');
    } catch (e: any) {
      setDetailError(e.response?.data?.error || 'Failed to load KYC details');
    } finally { setDetailLoading(false); }
  };

  const closeDetail = () => {
    setViewingId(null);
    setDetail(null);
    setBankAccounts([]);
    setAdminNotes('');
    setRejectReason('');
    setDetailError('');
  };

  const handleApprove = async () => {
    if (!viewingId) return;
    setActionLoading('approve');
    try {
      await api.post(`/kyc/admin/approve/${viewingId}`, { notes: adminNotes || undefined });
      closeDetail();
      await fetchSubmissions(debouncedSearch);
      onRefresh?.();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleReject = async () => {
    if (!viewingId) return;
    if (!rejectReason.trim()) { setDetailError('Please provide a rejection reason.'); return; }
    setActionLoading('reject');
    try {
      await api.post(`/kyc/admin/reject/${viewingId}`, { reason: rejectReason });
      closeDetail();
      await fetchSubmissions(debouncedSearch);
      onRefresh?.();
    } catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  const handleQuickApprove = async (id: string) => {
    setActionLoading(id);
    try { await api.post(`/kyc/admin/approve/${id}`, {}); await fetchSubmissions(debouncedSearch); onRefresh?.(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };
  const handleQuickReject = async (id: string) => {
    setActionLoading(id);
    try { await api.post(`/kyc/admin/reject/${id}`, { reason: 'Not sufficient documentation' }); await fetchSubmissions(debouncedSearch); onRefresh?.(); }
    catch (e) { console.error(e); }
    finally { setActionLoading(null); }
  };

  // ── Detail View ──
  if (viewingId) {
    return (
      <div className="animate-fade-in">
        <button onClick={closeDetail} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: '#4F46E5', fontWeight: 600, fontSize: '0.9rem', marginBottom: '20px', padding: '8px 12px', borderRadius: '8px' }}
          onMouseOver={e => (e.currentTarget.style.background = '#EEF2FF')}
          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}>
          <ArrowLeft size={16} /> Back to Pending List
        </button>

        {detailLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '80px 0' }}>
            <Loader size={32} className="animate-spin text-indigo-500" />
          </div>
        ) : detailError ? (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
            <p style={{ color: '#991B1B', marginBottom: '16px' }}>{detailError}</p>
            <button onClick={closeDetail} style={{ padding: '8px 20px', borderRadius: '8px', border: '1px solid #D1D5DB', background: '#fff', cursor: 'pointer' }}>Close</button>
          </div>
        ) : detail ? (
          <>
            {/* Header */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '28px 32px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {detail.profile_picture ? (
                  <img src={detail.profile_picture} alt="" style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: '3px solid #EEF2FF' }} />
                ) : (
                  <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '1.2rem' }}>
                    {detail.first_name?.[0]}{detail.last_name?.[0]}
                  </div>
                )}
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#111827' }}>{detail.first_name} {detail.last_name}</h2>
                  <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={13} /> {detail.email}</span>
                    {detail.phone && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={13} /> {detail.phone}</span>}
                    <DetachedBadge label={detail.role} color={detail.role === 'driver' ? '#8B5CF6' : '#3B82F6'} />
                    <DetachedBadge label={detail.kyc_status} color={detail.kyc_status === 'pending' ? '#F59E0B' : detail.kyc_status === 'verified' ? '#10B981' : '#EF4444'} />
                  </p>
                </div>
              </div>
            </div>

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              {/* Left Column */}
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', borderBottom: '1px solid #E5E7EB', paddingBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> User Information
                </h3>
                <InfoRow label="Full Name" value={`${detail.first_name} ${detail.last_name}`} />
                <InfoRow label="Email" value={detail.email} />
                <InfoRow label="Phone" value={detail.phone || '—'} />
                <InfoRow label="Role" value={detail.role} />
                <InfoRow label="Date of Birth" value={detail.date_of_birth || '—'} />
                <InfoRow label="Gender" value={detail.gender || '—'} />

                <h3 style={{ ...sectionTitleStyle, marginTop: '28px' }}><Banknote size={14} /> Bank Account</h3>
                {bankAccounts.length === 0 ? (
                  <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>No bank account on file.</p>
                ) : bankAccounts.map(b => (
                  <div key={b.id} style={{ background: '#F9FAFB', borderRadius: '10px', padding: '12px', border: '1px solid #E5E7EB', marginBottom: '8px' }}>
                    <InfoRow label="Bank" value={b.bank_name} />
                    <InfoRow label="Account Name" value={b.account_name} />
                    <InfoRow label="Account Number" value={b.account_number} />
                    {b.is_default && <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600, marginTop: '4px', display: 'inline-block' }}>Default account</span>}
                  </div>
                ))}

                <h3 style={{ ...sectionTitleStyle, marginTop: '28px' }}><FileText size={14} /> ID Details</h3>
                <InfoRow label="ID Type" value={detail.id_type} />
                <InfoRow label="ID Number" value={detail.id_number} />
                <InfoRow label="Submitted" value={new Date(detail.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} />
              </div>

              {/* Right Column - Documents */}
              <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
                <h3 style={sectionTitleStyle}><Camera size={14} /> Submitted Documents</h3>
                <DocCard url={detail.id_front_url} title="ID Document (Front)" />
                {detail.id_back_url && <DocCard url={detail.id_back_url} title="ID Document (Back)" />}
                <DocCard url={detail.selfie_url} title="Selfie / Face Image" />
              </div>
            </div>

            {/* Decision Section */}
            <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB', padding: '24px', marginTop: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>Decision</h3>
              {detailError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#991B1B', fontSize: '0.875rem', marginBottom: '16px' }}>{detailError}</div>}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Admin Notes <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional, saved on approval)</span></label>
                <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)}
                  placeholder="Add internal notes about this KYC review..."
                  rows={2}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #D1D5DB', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Rejection Reason <span style={{ color: '#DC2626' }}>*</span></label>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  placeholder="Explain why the KYC is being rejected..."
                  rows={2}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid #D1D5DB', fontSize: '0.9rem', outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleApprove} disabled={actionLoading === 'approve'}
                  style={{ flex: 1, padding: '12px 24px', borderRadius: '12px', border: 'none', background: actionLoading === 'approve' ? '#9CA3AF' : 'linear-gradient(135deg,#10B981,#059669)', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: actionLoading === 'approve' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                  {actionLoading === 'approve' ? <><Loader size={16} className="animate-spin" /> Processing...</> : <><Check size={18} /> Approve KYC</>}
                </button>
                <button onClick={handleReject} disabled={actionLoading === 'reject'}
                  style={{ flex: 1, padding: '12px 24px', borderRadius: '12px', border: 'none', background: actionLoading === 'reject' ? '#9CA3AF' : 'linear-gradient(135deg,#EF4444,#DC2626)', color: '#fff', fontSize: '0.95rem', fontWeight: 700, cursor: actionLoading === 'reject' ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.2s' }}>
                  {actionLoading === 'reject' ? <><Loader size={16} className="animate-spin" /> Processing...</> : <><X size={18} /> Reject KYC</>}
                </button>
              </div>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  // ── List View ──
  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input type="text" placeholder="Search applicant by name or email..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all" />
        </div>
        <button onClick={() => fetchSubmissions(debouncedSearch)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading KYC submissions...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full bg-white text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Applicant</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {submissions.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                  {search ? 'No KYC submissions match your search.' : 'No pending KYC submissions.'}
                </td></tr>
              ) : submissions.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {s.first_name?.[0]}{s.last_name?.[0]}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{s.first_name} {s.last_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{s.email}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 capitalize">{s.kyc_status}</span>
                  </td>
                  <td className="px-6 py-4 text-xs text-gray-500">
                    {new Date(s.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openDetail(s.id)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-lg transition-colors">
                        <Eye size={13} /> Review
                      </button>
                      <button onClick={() => handleQuickApprove(s.id)} disabled={actionLoading === s.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg transition-colors disabled:opacity-50">
                        <Check size={13} /> Approve
                      </button>
                      <button onClick={() => handleQuickReject(s.id)} disabled={actionLoading === s.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors disabled:opacity-50">
                        <X size={13} /> Reject
                      </button>
                    </div>
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

const sectionTitleStyle: React.CSSProperties = {
  fontSize: '0.85rem', fontWeight: 700, color: '#6B7280',
  textTransform: 'uppercase', letterSpacing: '0.05em',
  marginBottom: '14px', borderBottom: '1px solid #E5E7EB', paddingBottom: '8px',
  display: 'flex', alignItems: 'center', gap: '6px',
};

export default KycApprovals;
