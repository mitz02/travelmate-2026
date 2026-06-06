import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import MapboxMap from '../components/Map/MapboxMap';
import {
  TrendingUp, Car, Star, MapPin, Plus, Wifi, WifiOff, Clock, Eye, 
  XCircle, ArrowRight, Calendar, Users, DollarSign, CheckCircle2, Bell, CreditCard, ChevronUp, X, Phone, Zap
} from 'lucide-react';
import { CreateRideModal } from '../components/rides/CreateRideModal';
import { CallModal } from '../components/ui/CallModal';
import { useLocation, useNavigate } from 'react-router-dom';
import { DriverRoutes } from './DriverRoutes';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

/* ------------------------------------------------------------------ */
/*  Driver Dashboard Component with Pure Inline Premium Styles        */
/* ------------------------------------------------------------------ */

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, gap: '32px' },
  kpiGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px'
  },
  card: {
    backgroundColor: '#ffffff',
    border: '1px solid #E5E7EB', borderRadius: '16px',
    padding: '24px', display: 'flex', flexDirection: 'column' as const,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
    position: 'relative' as const, overflow: 'hidden'
  },
  cardHeader: {
    padding: '24px', borderBottom: '1px solid #E5E7EB',
    fontSize: '1.25rem', fontWeight: 600, margin: 0, color: '#111827'
  },
  cardBodyNoPadding: { padding: 0 },
  kpiTop: { display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 },
  iconWrapper: (bg: string, color: string) => ({
    padding: '12px', borderRadius: '12px', backgroundColor: bg, color: color,
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }),
  kpiTitle: { fontSize: '0.875rem', fontWeight: 500, color: '#6B7280', margin: 0 },
  kpiValue: { fontSize: '1.75rem', fontWeight: 800, color: '#111827', margin: '4px 0 0 0' },
  kpiBottom: {
    marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E5E7EB',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1
  },
  bgIcon: (color: string) => ({
    position: 'absolute' as const, top: '-10px', right: '-10px', color: color,
    opacity: 0.05, transform: 'scale(1.5)', zIndex: 0
  }),
  mapContainer: {
    borderRadius: '16px', overflow: 'hidden', border: '1px solid #E5E7EB',
    position: 'relative' as const, backgroundColor: '#F9FAFB'
  },
  mapBadge: {
    position: 'absolute' as const, top: '16px', left: '16px', zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
    padding: '8px 16px', borderRadius: '8px', border: '1px solid #E5E7EB',
    display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: 600, color: '#111827',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  },
  pulseDot: {
    width: '8px', height: '8px', backgroundColor: '#10B981', borderRadius: '50%',
    boxShadow: '0 0 10px #10B981', animation: 'pulse 2s infinite'
  },
  buttonPrimary: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
    backgroundColor: '#4F46E5', color: '#fff', border: 'none', borderRadius: '12px',
    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)', transition: 'transform 0.2s'
  },
  buttonOutline: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
    backgroundColor: '#fff', color: '#374151', 
    border: '1px solid #E5E7EB', borderRadius: '12px',
    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, textAlign: 'left' as const },
  th: {
    padding: '16px 24px', backgroundColor: '#F9FAFB',
    borderBottom: '1px solid #E5E7EB', color: '#6B7280',
    fontSize: '0.75rem', textTransform: 'uppercase' as const, fontWeight: 600
  },
  td: {
    padding: '16px 24px', borderBottom: '1px solid #E5E7EB',
    color: '#111827', fontSize: '0.875rem'
  }
};

interface MyRoute {
  id: string;
  from: string;
  to: string;
  date: string;
  time: string;
  price: string;
  seats: string;
  status: string;
}

interface ActivityItem {
  id: string;
  kind: string;
  text: string;
  time: string;
  icon: string;
  color: string;
}

const iconMap: Record<string, React.ReactNode> = {
  users: <Users size={16} />,
  check: <CheckCircle2 size={16} />,
  'credit-card': <CreditCard size={16} />,
  'trending-up': <TrendingUp size={16} />,
  bell: <Bell size={16} />,
  x: <XCircle size={16} />,
};

const relativeTime = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr${hrs > 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
};

export const DriverDashboard: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [callState, setCallState] = useState({ isOpen: false, channel: '', otherName: '' });
  
  const [activeTab, setActiveTab] = useState<'overview' | 'routes' | 'earnings'>('overview');
  const [stats, setStats] = useState({ balance: 0, totalTrips: 0, rating: 5.0 });
  const [myRoutes, setMyRoutes] = useState<MyRoute[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [walletRes, activityRes, ridesRes] = await Promise.all([
          api.get('/wallet/balance'),
          api.get('/user/activity'),
          api.get('/rides/driver')
        ]);
        
        setStats({
          balance: walletRes.data.totalBalance || 0,
          totalTrips: activityRes.data.completedBookings || 0,
          rating: activityRes.data.averageRating || 5.0
        });

        const routes: MyRoute[] = (ridesRes.data.rides || []).map((r: any) => ({
          id: r.id,
          from: r.from,
          to: r.to,
          date: new Date(r.departure_time).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }),
          time: new Date(r.departure_time).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' }),
          price: `₦${r.price_per_seat}`,
          seats: `${r.total_seats - r.available_seats}/${r.total_seats}`,
          status: r.status.charAt(0).toUpperCase() + r.status.slice(1)
        }));
        
        setMyRoutes(routes);
      } catch (err) {
        console.error('Failed to load driver dashboard data', err);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchDashboardData();

    // Fetch real activity feed
    const fetchFeed = async () => {
      try {
        const res = await api.get('/user/activity-feed?limit=8');
        setActivityFeed(res.data.feed || []);
      } catch (err) {
        console.error('Failed to load activity feed', err);
      } finally {
        setLoadingFeed(false);
      }
    };
    fetchFeed();
  }, [showCreateModal]);

  if (location.pathname.includes('/driver/routes')) {
    return <DriverRoutes />;
  }

  return (
    <DashboardLayout isAdmin={false}>
      <div style={styles.container}>
        
        {user?.kycStatus === 'pending' && (
          <div style={{ backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px', color: '#92400E', fontSize: '0.95rem', fontWeight: 500 }}>
            <Clock size={24} color="#D97706" />
            Your verification documents are currently under review. You cannot create routes or go online until your account is fully verified.
          </div>
        )}

        {/* KPI Grid */}
        <div style={styles.kpiGrid}>
          <div style={styles.card}>
            <div style={styles.bgIcon('#10B981')}><DollarSign size={120} /></div>
            <div style={styles.kpiTop}>
              <div style={styles.iconWrapper('rgba(16, 185, 129, 0.1)', '#10B981')}><CreditCard size={24} /></div>
              <div>
                <p style={styles.kpiTitle}>Total Earnings</p>
                <h3 style={styles.kpiValue}>₦{stats.balance.toLocaleString()}</h3>
              </div>
            </div>
            <div style={styles.kpiBottom}>
              <span style={{ color: '#64748B', fontSize: '0.75rem' }}>Available for withdrawal</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10B981', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '20px' }}>
                <TrendingUp size={12} /> +12%
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.bgIcon('#3B82F6')}><Car size={120} /></div>
            <div style={styles.kpiTop}>
              <div style={styles.iconWrapper('rgba(59, 130, 246, 0.1)', '#3B82F6')}><Car size={24} /></div>
              <div>
                <p style={styles.kpiTitle}>Active Route</p>
                <h3 style={{ ...styles.kpiValue, fontSize: '1.25rem' }}>
                  {myRoutes.find(r => r.status === 'Open') ? myRoutes.find(r => r.status === 'Open')?.from + ' to ' + myRoutes.find(r => r.status === 'Open')?.to : 'No active route'}
                </h3>
              </div>
            </div>
            <div style={styles.kpiBottom}>
              <span style={{ color: '#64748B', fontSize: '0.75rem' }}>
                {myRoutes.find(r => r.status === 'Open') ? myRoutes.find(r => r.status === 'Open')?.time : 'Create a route to start earning'}
              </span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.bgIcon('#8B5CF6')}><Users size={120} /></div>
            <div style={styles.kpiTop}>
              <div style={styles.iconWrapper('rgba(139, 92, 246, 0.1)', '#8B5CF6')}><Users size={24} /></div>
              <div>
                <p style={styles.kpiTitle}>Total Trips</p>
                <h3 style={styles.kpiValue}>{stats.totalTrips}</h3>
              </div>
            </div>
            <div style={styles.kpiBottom}>
              <span style={{ color: '#64748B', fontSize: '0.75rem' }}>Completed passenger rides</span>
            </div>
          </div>

          <div style={{ ...styles.card, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
            <div style={styles.bgIcon('#F59E0B')}><Star size={120} /></div>
            <div style={styles.kpiTop}>
              <div style={styles.iconWrapper('rgba(245, 158, 11, 0.1)', '#F59E0B')}><Star size={24} /></div>
              <div>
                <p style={styles.kpiTitle}>Driver Rating</p>
                <h3 style={styles.kpiValue}>{stats.rating.toFixed(1)}<span style={{ fontSize: '1rem', color: '#64748B' }}>/5.0</span></h3>
              </div>
            </div>
            <div style={styles.kpiBottom}>
              <div style={{ display: 'flex', gap: '2px', color: '#F59E0B' }}>
                {Array.from({ length: Math.floor(stats.rating) }).map((_, i) => <Star key={i} size={14} fill="#F59E0B" />)}
                {stats.rating % 1 !== 0 && <Star size={14} opacity={0.4} fill="#F59E0B" />}
              </div>
              <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600 }}>Top Rated</span>
            </div>
          </div>
        </div>

        {/* Quick Actions for VTU */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <button onClick={() => window.location.href='/airtime'} style={styles.buttonOutline} onMouseOver={e=>e.currentTarget.style.background='#F9FAFB'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>
            <Zap size={18} color="#4F46E5" /> Buy Airtime
          </button>
          <button onClick={() => window.location.href='/data'} style={styles.buttonOutline} onMouseOver={e=>e.currentTarget.style.background='#F9FAFB'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>
            <Zap size={18} color="#10B981" /> Buy Data
          </button>
          <button onClick={() => window.location.href='/electricity'} style={styles.buttonOutline} onMouseOver={e=>e.currentTarget.style.background='#F9FAFB'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>
            <Zap size={18} color="#F59E0B" /> Pay Electricity
          </button>
          <button onClick={() => window.location.href='/tv-subscriptions'} style={styles.buttonOutline} onMouseOver={e=>e.currentTarget.style.background='#F9FAFB'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>
            <Zap size={18} color="#EF4444" /> TV Subscriptions
          </button>
        </div>

        {/* Map */}
        <div style={styles.mapContainer}>
          <div style={styles.mapBadge}>
            <div style={styles.pulseDot}></div> Live Location
          </div>
          <MapboxMap />
        </div>

        {/* Actions Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            <button 
              onClick={() => setShowCreateModal(true)} 
              disabled={user?.kycStatus === 'pending'}
              style={{...styles.buttonPrimary, opacity: user?.kycStatus === 'pending' ? 0.5 : 1, cursor: user?.kycStatus === 'pending' ? 'not-allowed' : 'pointer'}} 
            >
              <Plus size={18} /> Create New Ride
            </button>
            <button onClick={() => navigate('/driver/routes')} style={styles.buttonOutline} onMouseOver={e=>e.currentTarget.style.background='#F9FAFB'} onMouseOut={e=>e.currentTarget.style.background='#fff'}>
              <Clock size={18} /> View History
            </button>
          </div>
          <button 
            onClick={() => setIsOnline(!isOnline)}
            disabled={user?.kycStatus === 'pending'}
            style={{
              ...styles.buttonPrimary,
              backgroundColor: isOnline && user?.kycStatus !== 'pending' ? '#10B981' : '#fff',
              color: isOnline && user?.kycStatus !== 'pending' ? '#fff' : '#374151',
              border: isOnline && user?.kycStatus !== 'pending' ? 'none' : '1px solid #E5E7EB',
              boxShadow: isOnline && user?.kycStatus !== 'pending' ? '0 4px 14px rgba(16, 185, 129, 0.4)' : '0 1px 2px rgba(0,0,0,0.05)',
              opacity: user?.kycStatus === 'pending' ? 0.5 : 1,
              cursor: user?.kycStatus === 'pending' ? 'not-allowed' : 'pointer'
            }}
          >
            {isOnline ? <Wifi size={18} /> : <WifiOff size={18} />}
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>

        {/* Grids for Table & Feed */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
          
          <div style={{ ...styles.card, padding: 0, gridColumn: 'span 2' }}>
            <h3 style={styles.cardHeader}>Upcoming Rides</h3>
            <div style={{ overflowX: 'auto' }}>
              {activeTab === 'overview' ? (
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Route</th>
                      <th style={styles.th}>Date & Time</th>
                      <th style={styles.th}>Price</th>
                      <th style={styles.th}>Seats Booked</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myRoutes.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>No routes created yet.</td>
                      </tr>
                    ) : myRoutes.slice(0, 5).map(r => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #E5E7EB' }}>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                            {r.from} <ArrowRight size={14} color="#64748B"/> {r.to}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <div style={{ fontWeight: 500 }}>{r.date}</div>
                          <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{r.time}</div>
                        </td>
                        <td style={styles.td}><span style={{ fontWeight: 700, color: '#10B981' }}>{r.price}</span></td>
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Users size={14} color="#64748B"/> {r.seats}
                          </div>
                        </td>
                        <td style={styles.td}>
                          <span style={{
                            background: r.status === 'Open' ? '#ECFDF5' : r.status === 'Completed' ? '#EFF6FF' : r.status === 'Full' ? '#FEF2F2' : '#EEF2FF',
                            color: r.status === 'Open' ? '#059669' : r.status === 'Completed' ? '#2563EB' : r.status === 'Full' ? '#DC2626' : '#4F46E5',
                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600
                          }}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : activeTab === 'routes' ? (
                <DriverRoutes />
              ) : (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF' }}>Earnings chart goes here</div>
              )}
            </div>
          </div>

          <div style={{ ...styles.card, padding: 0 }}>
            <div style={{ ...styles.cardHeader, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Recent Activity <span style={{ background: 'rgba(79,70,229,0.1)', color: '#4F46E5', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px' }}>Live</span>
            </div>
            <div>
              {loadingFeed ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem' }}>Loading activity...</div>
              ) : activityFeed.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem' }}>No recent activity yet. Create rides to see bookings here.</div>
              ) : (
                activityFeed.map(a => (
                  <div key={a.id} style={{ display: 'flex', gap: '16px', padding: '20px', borderBottom: '1px solid #E5E7EB' }}>
                    <div style={{ background: `${a.color}15`, color: a.color, padding: '10px', borderRadius: '12px', height: 'fit-content' }}>
                      {iconMap[a.icon] || <Bell size={16} />}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 4px 0', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}>{a.text}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#6B7280' }}>{relativeTime(a.time)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Create Ride Modal */}
      {showCreateModal && (
        <CreateRideModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // Optional: refresh dashboard data if implemented
          }}
        />
      )}

      {/* Call Modal */}
      <CallModal 
        isOpen={callState.isOpen}
        onClose={() => setCallState(prev => ({ ...prev, isOpen: false }))}
        channel={callState.channel}
        otherParticipantName={callState.otherName}
      />
    </DashboardLayout>
  );
};
