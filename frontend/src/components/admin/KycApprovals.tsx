import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { Check, X, RefreshCw, Search } from 'lucide-react';

interface KycSubmission {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  kyc_status: string;
  kyc_data: any;
  created_at: string;
}

type Props = {
  onRefresh?: () => void;
};

const KycApprovals: React.FC<Props> = ({ onRefresh }) => {
  const [submissions, setSubmissions] = useState<KycSubmission[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchSubmissions = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}` : '';
      const res = await api.get(`/admin/kyc${params}`);
      setSubmissions(res.data.submissions || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSubmissions(debouncedSearch);
  }, [debouncedSearch, fetchSubmissions]);

  const handleResolve = async (id: string, action: 'approve' | 'reject') => {
    setActionLoading(id);
    try {
      const payload: any = { action };
      if (action === 'reject') payload.reason = 'Not sufficient documentation';
      await api.post(`/admin/kyc/${id}/resolve`, payload);
      await fetchSubmissions(debouncedSearch);
      onRefresh && onRefresh();
    } catch (e) {
      console.error(e);
    }
    setActionLoading(null);
  };

  return (
    <div className="animate-fade-in">
      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search applicant by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all"
          />
        </div>
        <button
          onClick={() => fetchSubmissions(debouncedSearch)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all"
        >
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
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-400">
                    {search ? 'No KYC submissions match your search.' : 'No pending KYC submissions.'}
                  </td>
                </tr>
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
                      <button
                        onClick={() => handleResolve(s.id, 'approve')}
                        disabled={actionLoading === s.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        onClick={() => handleResolve(s.id, 'reject')}
                        disabled={actionLoading === s.id}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors disabled:opacity-50"
                      >
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

export default KycApprovals;
