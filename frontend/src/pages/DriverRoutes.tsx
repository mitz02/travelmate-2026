import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { MapPin, Plus, Clock, Search, Trash2, Users, CheckCircle, Pencil } from 'lucide-react';
import api from '../services/api';
import { EditRideModal } from '../components/rides/EditRideModal';

const styles = {
  container: { width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column' as const, gap: '24px' },
  headerArea: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: '16px' },
  header: { fontSize: '1.5rem', fontWeight: 700, color: '#111827', margin: 0 },
  subtext: { color: '#6B7280', margin: '4px 0 0 0', fontSize: '0.95rem' },
  buttonPrimary: {
    padding: '12px 24px', backgroundColor: '#4F46E5', color: '#fff', border: 'none', 
    borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)', transition: 'transform 0.2s',
    display: 'flex', alignItems: 'center', gap: '8px'
  },
  searchContainer: {
    display: 'flex', alignItems: 'center', backgroundColor: '#fff', border: '1px solid #E5E7EB',
    borderRadius: '12px', padding: '10px 16px', width: '300px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  searchInput: {
    border: 'none', outline: 'none', width: '100%', marginLeft: '8px', fontSize: '0.95rem',
    color: '#111827', backgroundColor: 'transparent'
  },
  routesGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' },
  routeCard: {
    backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', position: 'relative' as const,
    transition: 'transform 0.2s, box-shadow 0.2s'
  },
  cardHeader: {
    padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#F9FAFB'
  },
  badgeOpen: { backgroundColor: '#ECFDF5', color: '#059669', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' as const },
  badgeCompleted: { backgroundColor: '#EFF6FF', color: '#2563EB', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' as const },
  badgeCancelled: { backgroundColor: '#FEF2F2', color: '#EF4444', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' as const },
  cardBody: { padding: '24px' },
  routeLocations: { display: 'flex', flexDirection: 'column' as const, gap: '16px', position: 'relative' as const },
  routeTimeline: { position: 'absolute' as const, left: '11px', top: '24px', bottom: '24px', width: '2px', backgroundColor: '#E5E7EB', zIndex: 0 },
  locationRow: { display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' as const, zIndex: 1 },
  locationIcon: (color: string, bg: string) => ({
    width: '24px', height: '24px', borderRadius: '50%', backgroundColor: bg, color: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    border: '2px solid #fff'
  }),
  locationText: { fontSize: '1rem', fontWeight: 600, color: '#111827', margin: 0 },
  locationSub: { fontSize: '0.8rem', color: '#6B7280', margin: 0 },
  cardFooter: {
    padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff'
  },
  stat: { display: 'flex', alignItems: 'center', gap: '6px', color: '#6B7280', fontSize: '0.875rem', fontWeight: 500 }
};

export const DriverRoutes: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRide, setEditingRide] = useState<any | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'completed' | 'cancelled'>('all');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRoutes = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rides/driver/me');
      setRoutes(res.data.rides || []);
    } catch (err) {
      console.error('Failed to fetch routes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleCancelRide = async (rideId: string) => {
    if (!window.confirm('Are you sure you want to cancel this ride? All booked riders will be refunded.')) return;
    setCancellingId(rideId);
    try {
      await api.delete(`/rides/${rideId}`);
      showToast('Ride cancelled successfully.', 'success');
      fetchRoutes();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to cancel ride.', 'error');
    } finally {
      setCancellingId(null);
    }
  };

  const handleCompleteRide = async (rideId: string) => {
    if (!window.confirm('Mark this ride as completed?')) return;
    try {
      await api.post(`/rides/${rideId}/complete`);
      showToast('Ride completed successfully!', 'success');
      fetchRoutes();
    } catch (err: any) {
      showToast(err.response?.data?.error || 'Failed to complete ride.', 'error');
    }
  };

  const filteredRoutes = routes
    .filter(r => statusFilter === 'all' || r.status === statusFilter)
    .filter(r => 
      r.from.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.to.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const formatDate = (isoStr: string) => {
    return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const formatTime = (isoStr: string) => {
    return new Date(isoStr).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getBadgeStyle = (status: string) => {
    if (status === 'open') return styles.badgeOpen;
    if (status === 'completed') return styles.badgeCompleted;
    return styles.badgeCancelled;
  };

  const counts = {
    all: routes.length,
    open: routes.filter(r => r.status === 'open').length,
    completed: routes.filter(r => r.status === 'completed').length,
    cancelled: routes.filter(r => r.status === 'cancelled').length,
  };

  const filterBtnStyle = (active: boolean) => ({
    padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
    border: active ? '1px solid #4F46E5' : '1px solid #E5E7EB',
    backgroundColor: active ? '#EEF2FF' : '#fff',
    color: active ? '#4F46E5' : '#6B7280',
    transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '6px'
  });

  return (
    <DashboardLayout>
      <div style={styles.container}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: '24px', right: '24px', zIndex: 200, padding: '14px 24px',
            borderRadius: '12px', fontSize: '0.95rem', fontWeight: 500, maxWidth: '400px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            backgroundColor: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            color: toast.type === 'success' ? '#065F46' : '#991B1B',
            border: `1px solid ${toast.type === 'success' ? '#A7F3D0' : '#FECACA'}`
          }}>
            {toast.msg}
          </div>
        )}
        
        <div style={styles.headerArea}>
          <div>
            <h1 style={styles.header}>My Routes</h1>
            <p style={styles.subtext}>Manage your upcoming and past trips.</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div style={styles.searchContainer}>
              <Search size={18} color="#9CA3AF" />
              <input 
                type="text" 
                placeholder="Search routes..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                style={styles.searchInput} 
              />
            </div>
            <button 
              onClick={() => navigate('/driver/create-ride')}
              style={styles.buttonPrimary} 
              onMouseOver={e=>e.currentTarget.style.transform='translateY(-2px)'} 
              onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}
            >
              <Plus size={18} /> Add Route
            </button>
          </div>
        </div>

        {/* Status Filters */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['all', 'open', 'completed', 'cancelled'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} style={filterBtnStyle(statusFilter === f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)} <span style={{ opacity: 0.6 }}>({counts[f]})</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '64px', textAlign: 'center', color: '#6B7280' }}>Loading your routes...</div>
        ) : (
          <div style={styles.routesGrid}>
            {filteredRoutes.map(route => (
              <div 
                key={route.id} 
                style={styles.routeCard}
                onMouseOver={e=>e.currentTarget.style.transform='translateY(-4px)'} 
                onMouseOut={e=>e.currentTarget.style.transform='translateY(0)'}
              >
                <div style={styles.cardHeader}>
                  <span style={getBadgeStyle(route.status)}>
                    {route.status}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {route.status === 'open' && (
                      <>
                        <button 
                          onClick={() => setEditingRide(route)}
                          title="Edit ride"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3B82F6', padding: '4px' }}
                        >
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleCancelRide(route.id)}
                          disabled={cancellingId === route.id}
                          title="Cancel ride"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: '4px', opacity: cancellingId === route.id ? 0.5 : 1 }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {route.status === 'in_progress' && (
                      <>
                        <button 
                          onClick={() => handleCompleteRide(route.id)}
                          title="Mark as completed"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#10B981', padding: '4px' }}
                        >
                          <CheckCircle size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                
                <div style={styles.cardBody}>
                  <div style={styles.routeLocations}>
                    <div style={styles.routeTimeline}></div>
                    <div style={styles.locationRow}>
                      <div style={styles.locationIcon('#4F46E5', '#EEF2FF')}><div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4F46E5' }}></div></div>
                      <div>
                        <p style={styles.locationText}>{route.from}</p>
                        <p style={styles.locationSub}>Pickup Location</p>
                      </div>
                    </div>
                    <div style={styles.locationRow}>
                      <div style={styles.locationIcon('#10B981', '#ECFDF5')}><MapPin size={12} strokeWidth={3} /></div>
                      <div>
                        <p style={styles.locationText}>{route.to}</p>
                        <p style={styles.locationSub}>Dropoff Location</p>
                      </div>
                    </div>
                  </div>
                  {(route.vehicle_make || route.vehicle_model || route.vehicle_color) && (
                    <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#F9FAFB', borderRadius: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                      {route.vehicle_make && <span><strong>Make:</strong> {route.vehicle_make}</span>}
                      {route.vehicle_model && <span><strong>Model:</strong> {route.vehicle_model}</span>}
                      {route.vehicle_color && <span><strong>Color:</strong> {route.vehicle_color}</span>}
                    </div>
                  )}
                  {route.pickup_point && (
                    <div style={{ marginTop: '8px', fontSize: '0.85rem', color: '#6B7280' }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>Pickup points:</span> {route.pickup_point}
                    </div>
                  )}
                  {route.dropoff_point && (
                    <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>
                      <span style={{ fontWeight: 600, color: '#374151' }}>Dropoff points:</span> {route.dropoff_point}
                    </div>
                  )}
                </div>

                <div style={styles.cardFooter}>
                  <div style={styles.stat}>
                    <Clock size={16} /> {formatDate(route.departure_time)}, {formatTime(route.departure_time)}
                  </div>
                  <div style={styles.stat}>
                    <Users size={16} /> {route.total_seats - route.available_seats}/{route.total_seats}
                  </div>
                </div>
                
                <div style={{ padding: '0 24px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>₦{route.price_per_seat?.toLocaleString()}</span>
                  <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 500 }}>per seat</span>
                </div>
              </div>
            ))}

            {filteredRoutes.length === 0 && (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '64px', backgroundColor: '#fff', borderRadius: '16px', border: '1px dashed #D1D5DB' }}>
                <MapPin size={48} color="#9CA3AF" style={{ margin: '0 auto 16px' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827', margin: '0 0 8px 0' }}>No routes found</h3>
                <p style={{ color: '#6B7280', margin: 0 }}>
                  {searchTerm ? 'Try adjusting your search terms.' : 'Create your first route to start accepting riders!'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {editingRide && (
        <EditRideModal 
          ride={editingRide}
          onClose={() => setEditingRide(null)} 
          onSuccess={() => {
            setEditingRide(null);
            fetchRoutes();
            showToast('Route updated successfully!', 'success');
          }} 
        />
      )}
    </DashboardLayout>
  );
};
