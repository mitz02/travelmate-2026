import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { RefreshCw, Search, XCircle, ArrowRight } from 'lucide-react';

interface Ride {
  id: string;
  from: string;
  to: string;
  departure_time: string;
  price_per_seat: number;
  available_seats: number;
  total_seats: number;
  driver: { first_name: string; last_name: string; email: string } | null;
  status: string;
  created_at: string;
}

const RidesTable: React.FC = () => {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchRides = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const params = q ? `?search=${encodeURIComponent(q)}&limit=100` : '?limit=100';
      const res = await api.get(`/admin/rides${params}`);
      setRides(res.data.rides || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRides(debouncedSearch);
  }, [debouncedSearch, fetchRides]);

  const cancelRide = async (id: string) => {
    try {
      await api.post(`/admin/rides/${id}/cancel`, { reason: 'Admin cancelled' });
      fetchRides(debouncedSearch);
    } catch (e) {
      console.error(e);
    }
  };

  const statusStyle = (s: string) => {
    if (s === 'open') return 'bg-emerald-50 text-emerald-700';
    if (s === 'completed') return 'bg-blue-50 text-blue-700';
    if (s === 'cancelled') return 'bg-red-50 text-red-700';
    if (s === 'full') return 'bg-amber-50 text-amber-700';
    return 'bg-gray-50 text-gray-600';
  };

  return (
    <div className="animate-fade-in">
      {/* Search Bar */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by route, driver name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 transition-all"
          />
        </div>
        <button
          onClick={() => fetchRides(debouncedSearch)}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500 py-8 text-center">Loading rides...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 shadow-sm">
          <table className="min-w-full bg-white text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Departure</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Seats</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rides.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-sm text-gray-400">
                    {search ? 'No rides match your search.' : 'No rides found.'}
                  </td>
                </tr>
              ) : rides.map((r) => {
                const driver = Array.isArray(r.driver) ? (r.driver as any)[0] : r.driver;
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        {r.from || '—'} <ArrowRight size={12} className="text-gray-400" /> {r.to || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {driver ? `${driver.first_name} ${driver.last_name}` : 'N/A'}
                      {driver?.email && (
                        <span className="block text-xs text-gray-400">{driver.email}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {r.departure_time ? (
                        <>
                          <span className="block">{new Date(r.departure_time).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                          <span className="text-xs text-gray-400">{new Date(r.departure_time).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      ) : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-indigo-600">
                      {r.price_per_seat ? `₦${r.price_per_seat.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {r.available_seats != null && r.total_seats != null
                        ? `${r.total_seats - r.available_seats}/${r.total_seats}`
                        : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${statusStyle(r.status)}`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {r.status === 'open' && (
                        <button
                          onClick={() => cancelRide(r.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 rounded-lg transition-colors ml-auto"
                        >
                          <XCircle size={13} /> Cancel
                        </button>
                      )}
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

export default RidesTable;
