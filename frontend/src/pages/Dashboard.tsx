import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { LocationAutocomplete } from '../components/ui/LocationAutocomplete';
import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import api from '../services/api';
import {
  TrendingUp, Car, Star, MapPin, Zap, User, Clock, ArrowRight, Eye, Phone,
  CreditCard, Search, Calendar, Navigation2, CheckCircle2
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CallModal } from '../components/ui/CallModal';
import { useCallContext } from '../context/CallContext';
import { RateDriverModal } from '../components/rides/RateDriverModal';

const FALLBACK_MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

const styles = {
  container: { display: 'flex', flexDirection: 'column' as const, gap: '32px', padding: '0' },
  kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' },
  card: {
    backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px',
    padding: '24px', display: 'flex', flexDirection: 'column' as const,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', position: 'relative' as const, overflow: 'hidden',
  },
  cardHeader: { padding: '24px', borderBottom: '1px solid var(--border-color)', fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-main)' },
  kpiTop: { display: 'flex', alignItems: 'center', gap: '16px', zIndex: 1 },
  iconWrapper: (bg: string, color: string) => ({ padding: '12px', borderRadius: '12px', backgroundColor: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }),
  kpiTitle: { fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-muted)', margin: 0 },
  kpiValue: { fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', margin: '4px 0 0 0' },
  kpiBottom: { marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 1 },
  bgIcon: (color: string) => ({ position: 'absolute' as const, top: '-10px', right: '-10px', color, opacity: 0.05, transform: 'scale(1.5)', zIndex: 0 }),
  buttonOutline: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px',
    backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '12px',
    fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
  },
  mapContainer: { borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--border-color)', position: 'relative' as const, backgroundColor: 'var(--card-hover)', height: '420px' },
  searchBoxContainer: {
    backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px',
    padding: '20px', display: 'flex', flexDirection: 'column' as const, gap: '16px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  },
  table: { width: '100%', borderCollapse: 'collapse' as const, textAlign: 'left' as const },
  th: { padding: '16px 24px', backgroundColor: 'var(--card-hover)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' as const, fontWeight: 600 },
  td: { padding: '16px 24px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-main)', fontSize: '0.875rem' },
};

interface Location { placeName: string; lng: number; lat: number; }

interface RideResult {
  id: string;
  from: string;
  to: string;
  driverName: string;
  driverRating: number;
  driverPicture?: string;
  departureTime: string;
  pricePerSeat: number;
  availableSeats: number;
  fromLat: number;
  fromLng: number;
}

interface MyRide {
  id: string;
  bookingId: string;
  from: string;
  to: string;
  departureTime: string;
  driverName: string;
  status: string;
  hasRated: boolean;
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [date, setDate] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RideResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const [mapboxToken, setMapboxToken] = useState<string>(FALLBACK_MAPBOX_TOKEN);
  const [isTokenFetched, setIsTokenFetched] = useState(false);
  const [viewState, setViewState] = useState({ longitude: 3.3792, latitude: 6.5244, zoom: 12 });
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);

  const [stats, setStats] = useState({ balance: 0, totalTrips: 0, rating: 5.0 });
  const [myRides, setMyRides] = useState<MyRide[]>([]);
  const [callState, setCallState] = useState({ isOpen: false, channel: '', otherName: '' });
  const { setCallId } = useCallContext();
  const [rateState, setRateState] = useState({ isOpen: false, bookingId: '', driverName: '' });
  const [bookingFilter, setBookingFilter] = useState<string | undefined>(undefined);
  const [searched, setSearched] = useState(false);
  const [popularRoutes, setPopularRoutes] = useState<{ origin: string; destination: string; trips: number; minPrice: number }[]>([]);

  const fetchMyRides = async (filter?: string) => {
    try {
      const params: Record<string, string> = {};
      if (filter) params.status = filter;
      const res = await api.get('/bookings/user/me', { params });
      const rides: MyRide[] = (res.data.bookings || []).map((b: any) => {
        const ride = b.ride || {};
        const driver = b.driver || {};
        return {
          id: b.ride?.id || b.rideId || b.id,
          bookingId: b.id,
          from: ride.from || b.from || '—',
          to: ride.to || b.to || '—',
          departureTime: ride.departure_time || b.departureTime || '',
          driverName: driver ? `${driver.first_name || ''} ${driver.last_name || ''}`.trim() || 'Driver' : 'Driver',
          status: b.status,
          hasRated: b.has_rated || false,
        };
      });
      setMyRides(rides);
    } catch (err) {
      console.error('Failed to load my rides', err);
    }
  };

  // Fetch config + stats + my rides
  useEffect(() => {
    const init = async () => {
      try {
        const [configRes, walletRes, ridesRes] = await Promise.all([
          api.get('/config').catch(() => null),
          api.get('/wallet/me').catch(() => null),
          api.get('/rides/search').catch(() => null),
        ]);
        if (configRes?.data?.MAPBOX_ACCESS_TOKEN) setMapboxToken(configRes.data.MAPBOX_ACCESS_TOKEN);
        if (walletRes) {
          setStats({
            balance: walletRes.data.balance || 0,
            totalTrips: walletRes.data.totalTrips || 0,
            rating: Number(walletRes.data.averageRating) || 5.0,
          });
        }
        fetchMyRides();

        // Populate initial rides on map
        const initialRides: RideResult[] = (ridesRes?.data?.rides || []).map((r: any) => ({
          id: r.id,
          from: r.from,
          to: r.to,
          driverName: r.driver ? `${r.driver.first_name} ${r.driver.last_name}` : 'Driver',
          driverRating: r.driver?.ratings || 5.0,
          driverPicture: r.driver?.profile_picture || null,
          departureTime: r.departure_time || r.departureTime,
          pricePerSeat: Number(r.price_per_seat || r.pricePerSeat || 0),
          availableSeats: Number(r.available_seats || r.availableSeats || 0),
          fromLat: Number(r.from_lat || r.fromLat || r.fromLocation?.lat || 0),
          fromLng: Number(r.from_lng || r.fromLng || r.fromLocation?.lng || 0),
        }));
        setResults(initialRides.filter(r => r.fromLat !== 0 && r.fromLng !== 0));
      } catch (err) {
        console.error('Dashboard init error', err);
      } finally {
        setIsTokenFetched(true);
      }
    };
    init();

    // Fetch popular routes independently
    (async () => {
      try {
        const popularRes = await api.get('/rides/popular');
        setPopularRoutes(popularRes.data.popularRoutes || []);
      } catch (_) { /* non-critical */ }
    })();

    // Request user geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { longitude, latitude } = pos.coords;
          setUserLocation({ lng: longitude, lat: latitude });
          setViewState({ longitude, latitude, zoom: 13 });
        },
        () => console.warn('Geolocation denied, using default Lagos')
      );
    }
  }, []);

  // When pickup changes, fly map to it
  useEffect(() => {
    if (pickup) setViewState(prev => ({ ...prev, longitude: pickup.lng, latitude: pickup.lat, zoom: 13 }));
  }, [pickup]);

  const handleSearch = async () => {
    if (!pickup) return;
    setIsSearching(true);
    setSearchError('');
    setResults([]);
    setSearched(true);
    try {
      const params: Record<string, any> = {
        origin: pickup.placeName,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupRadius: 15,
      };
      if (dropoff) {
        params.dest = dropoff.placeName;
        params.dropoffLat = dropoff.lat;
        params.dropoffLng = dropoff.lng;
        params.dropoffRadius = 15;
      }
      if (date) params.date = date;

      const res = await api.get('/rides/search', { params });
      const rides: RideResult[] = (res.data.rides || []).map((r: any) => ({
        id: r.id,
        from: r.from,
        to: r.to,
        driverName: r.driver ? `${r.driver.first_name} ${r.driver.last_name}` : 'Driver',
        driverRating: r.driver?.ratings || 5.0,
        driverPicture: r.driver?.profile_picture || null,
        departureTime: r.departure_time || r.departureTime,
        pricePerSeat: Number(r.price_per_seat || r.pricePerSeat || 0),
        availableSeats: Number(r.available_seats || r.availableSeats || 0),
        fromLat: Number(r.from_lat || r.fromLat || r.fromLocation?.lat || pickup.lat),
        fromLng: Number(r.from_lng || r.fromLng || r.fromLocation?.lng || pickup.lng),
      }));
      setResults(rides);
      if (rides.length === 0) setSearchError('No rides found for this route. Try broadening your search.');
      // Zoom out to show all markers
      if (rides.length > 0) setViewState(prev => ({ ...prev, zoom: 11 }));
    } catch (err: any) {
      setSearchError('Failed to search rides. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handlePopularRouteClick = async (origin: string, destination: string) => {
    setIsSearching(true);
    setSearchError('');
    setResults([]);
    setSearched(true);
    try {
      const res = await api.get('/rides/search', { params: { origin, dest: destination } });
      const rides: RideResult[] = (res.data.rides || []).map((r: any) => ({
        id: r.id,
        from: r.from,
        to: r.to,
        driverName: r.driver ? `${r.driver.first_name} ${r.driver.last_name}` : 'Driver',
        driverRating: r.driver?.ratings || 5.0,
        driverPicture: r.driver?.profile_picture || null,
        departureTime: r.departure_time || r.departureTime,
        pricePerSeat: Number(r.price_per_seat || r.pricePerSeat || 0),
        availableSeats: Number(r.available_seats || r.availableSeats || 0),
        fromLat: Number(r.from_lat || r.fromLat || r.fromLocation?.lat || 0),
        fromLng: Number(r.from_lng || r.fromLng || r.fromLocation?.lng || 0),
      }));
      setResults(rides);
      if (rides.length === 0) setSearchError(`No rides found for ${origin} → ${destination}. Try a different route.`);
      if (rides.length > 0) setViewState(prev => ({ ...prev, zoom: 11 }));
    } catch (err) {
      setSearchError('Failed to search popular route. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleViewDetails = (rideId: string) => {
    navigate(`/rider/ride/${rideId}`);
  };

  const statusColor = (s: string) => {
    if (s === 'pending') return { bg: '#FEF3C7', color: '#D97706' };
    if (s === 'confirmed' || s === 'active' || s === 'in_progress') return { bg: '#ECFDF5', color: '#059669' };
    if (s === 'completed') return { bg: '#EFF6FF', color: '#2563EB' };
    if (s === 'cancelled') return { bg: '#FEF2F2', color: '#DC2626' };
    return { bg: '#EEF2FF', color: '#4F46E5' };
  };

  const formatDate = (dt: string) => {
    if (!dt) return '—';
    try {
      return new Date(dt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dt; }
  };

  const formatTime = (dt: string) => {
    if (!dt) return '';
    try {
      return new Date(dt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <DashboardLayout>
      <div style={styles.container}>

        {/* KPI Grid */}
        <div style={styles.kpiGrid}>
          <div style={styles.card}>
            <div style={styles.bgIcon('#10B981')}><CreditCard size={120} /></div>
            <div style={styles.kpiTop}>
              <div style={styles.iconWrapper('rgba(16,185,129,0.1)', '#10B981')}><CreditCard size={24} /></div>
              <div>
                <p style={styles.kpiTitle}>Wallet Balance</p>
                <h3 style={styles.kpiValue}>₦{stats.balance.toLocaleString()}</h3>
              </div>
            </div>
            <div style={styles.kpiBottom}>
              <span style={{ color: '#64748B', fontSize: '0.75rem' }}>Ready to book rides</span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.bgIcon('#3B82F6')}><Car size={120} /></div>
            <div style={styles.kpiTop}>
              <div style={styles.iconWrapper('rgba(59,130,246,0.1)', '#3B82F6')}><Car size={24} /></div>
              <div>
                <p style={styles.kpiTitle}>Active Ride</p>
                <h3 style={{ ...styles.kpiValue, fontSize: '1.25rem' }}>
                  {myRides.find(r => r.status === 'confirmed' || r.status === 'active') ? 'In Progress' : 'No active ride'}
                </h3>
              </div>
            </div>
            <div style={styles.kpiBottom}>
              <span style={{ color: '#64748B', fontSize: '0.75rem' }}>Search below to start</span>
            </div>
          </div>

          <div style={styles.card}>
            <div style={styles.bgIcon('#8B5CF6')}><MapPin size={120} /></div>
            <div style={styles.kpiTop}>
              <div style={styles.iconWrapper('rgba(139,92,246,0.1)', '#8B5CF6')}><MapPin size={24} /></div>
              <div>
                <p style={styles.kpiTitle}>Total Trips</p>
                <h3 style={styles.kpiValue}>{stats.totalTrips}</h3>
              </div>
            </div>
            <div style={styles.kpiBottom}>
              <span style={{ color: '#64748B', fontSize: '0.75rem' }}>All completed rides</span>
            </div>
          </div>

          <div style={{ ...styles.card, border: '1px solid rgba(245,158,11,0.2)' }}>
            <div style={styles.bgIcon('#F59E0B')}><Star size={120} /></div>
            <div style={styles.kpiTop}>
              <div style={styles.iconWrapper('rgba(245,158,11,0.1)', '#F59E0B')}><Star size={24} /></div>
              <div>
                <p style={styles.kpiTitle}>Rider Rating</p>
                <h3 style={styles.kpiValue}>{stats.rating.toFixed(1)}<span style={{ fontSize: '1rem', color: '#64748B' }}>/5.0</span></h3>
              </div>
            </div>
            <div style={styles.kpiBottom}>
              <div style={{ display: 'flex', gap: '2px', color: '#F59E0B' }}>
                {Array.from({ length: Math.floor(stats.rating) }).map((_, i) => (
                  <Star key={i} size={14} fill="#F59E0B" />
                ))}
                {stats.rating % 1 !== 0 && <Star size={14} opacity={0.4} fill="#F59E0B" />}
              </div>
              <span style={{ color: '#F59E0B', fontSize: '0.75rem', fontWeight: 600 }}>Excellent</span>
            </div>
          </div>
        </div>

        {/* Quick VTU Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Buy Airtime', color: '#4F46E5', path: '/airtime' },
            { label: 'Buy Data', color: '#10B981', path: '/data' },
            { label: 'Pay Electricity', color: '#F59E0B', path: '/electricity' },
            { label: 'TV Subscriptions', color: '#EF4444', path: '/tv-subscriptions' },
          ].map(({ label, color, path }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={styles.buttonOutline}
              onMouseOver={e => e.currentTarget.style.background = '#F9FAFB'}
              onMouseOut={e => e.currentTarget.style.background = '#fff'}
            >
              <Zap size={18} color={color} /> {label}
            </button>
          ))}
        </div>

        {/* Popular Routes */}
        {popularRoutes.length > 0 && (
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '16px' }}>
              Popular Routes <span style={{ fontSize: '0.875rem', fontWeight: 400, color: '#6B7280' }}>— Most booked trips</span>
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              {popularRoutes.map((route, idx) => (
                <button
                  key={idx}
                  onClick={() => handlePopularRouteClick(route.origin, route.destination)}
                  style={{
                    backgroundColor: '#ffffff', border: '1px solid #E5E7EB', borderRadius: '14px',
                    padding: '18px 20px', cursor: 'pointer', textAlign: 'left' as const,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)', transition: 'all 0.2s',
                    display: 'flex', flexDirection: 'column' as const, gap: '10px',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = '#4F46E5'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(79,70,229,0.12)'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', fontWeight: 600, color: '#111827' }}>
                    <MapPin size={16} color="#4F46E5" /> {route.origin} <ArrowRight size={14} color="#9CA3AF" /> {route.destination}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem', color: '#6B7280' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Car size={14} color="#10B981" /> {route.trips} trip{route.trips !== 1 ? 's' : ''}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#059669' }}>
                      From ₦{Number(route.minPrice).toLocaleString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Book a Ride Search Box */}
        <div style={styles.searchBoxContainer}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}>Book a Ride</h2>
              {pickup && (
                <span className="text-xs text-gray-400">
                  {dropoff ? 'All filters active' : 'Add dropoff to narrow results'}
                </span>
              )}
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex bg-gray-100 p-1 rounded-lg">
               <button onClick={() => setViewMode('map')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>Map View</button>
               <button onClick={() => setViewMode('list')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>List View</button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-stretch w-full">
            <div className="flex-1 min-w-0">
              <LocationAutocomplete
                placeholder="Pickup location..."
                onLocationSelect={loc => { setPickup(loc); setResults([]); setSearchError(''); }}
              />
            </div>

            <div className="flex-1 min-w-0">
              <LocationAutocomplete
                placeholder="Dropoff destination..."
                onLocationSelect={loc => { setDropoff(loc); setResults([]); setSearchError(''); }}
              />
            </div>

            <div className="w-full md:w-auto relative flex-shrink-0">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 pointer-events-none">
                <Calendar size={16} />
              </div>
              <input
                type="date"
                value={date}
                onChange={e => { setDate(e.target.value); setResults([]); setSearchError(''); }}
                className="w-full md:w-[145px] pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-sm font-medium text-gray-700 cursor-pointer transition-all"
              />
            </div>

            <Button
              onClick={handleSearch}
              isLoading={isSearching}
              disabled={!pickup}
              className="w-full md:w-auto rounded-xl px-8 py-2.5 h-auto shadow-md flex-shrink-0"
              leftIcon={<Search size={18} />}
            >
              Search
            </Button>
          </div>

          {/* Search error */}
          {searchError && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-4 py-2.5">
              <MapPin size={14} className="flex-shrink-0" />
              {searchError}
            </div>
          )}

          {/* Content based on viewMode */}
          {viewMode === 'list' ? (
            /* Results list — shown below search box */
            results.length > 0 ? (
              <div className="flex flex-col gap-3 mt-1">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {results.length} ride{results.length !== 1 ? 's' : ''} found
                </p>
                {results.map(ride => (
                  <div
                    key={ride.id}
                    className="flex items-center justify-between gap-4 p-4 bg-gray-50 border border-gray-100 rounded-xl hover:border-indigo-200 hover:bg-indigo-50/40 transition-all cursor-pointer group"
                    onClick={() => handleViewDetails(ride.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {ride.driverPicture ? (
                        <img
                          src={ride.driverPicture}
                          alt={ride.driverName}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0 shadow-sm border-2 border-indigo-100"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm text-sm font-bold">
                          {ride.driverName?.[0] || <User size={16} />}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{ride.driverName}</p>
                        <p className="text-xs text-gray-500 truncate">{ride.from} → {ride.to}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Clock size={10} />{formatTime(ride.departureTime)}</span>
                        <span className="flex items-center gap-1 text-xs text-amber-500 font-semibold mt-0.5">
                          <Star size={10} fill="currentColor" />{ride.driverRating}
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-base font-black text-indigo-600">₦{ride.pricePerSeat.toLocaleString()}</p>
                        <p className="text-[10px] text-gray-400">{ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''} left</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-indigo-500 font-semibold group-hover:translate-x-1 transition-transform">
                        View <ArrowRight size={12} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 text-gray-500 border border-dashed border-gray-200 rounded-xl mt-4">
                {searched
                  ? 'No rides found. Try adjusting your search filters or check the map.'
                  : 'Enter your pickup location and search to find available rides near you.'}
              </div>
            )
          ) : (
            <div style={{ ...styles.mapContainer, marginTop: '8px' }}>
              {/* Map badge */}
              <div style={{
                position: 'absolute', top: '16px', left: '16px', zIndex: 10,
                backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
                padding: '8px 14px', borderRadius: '8px', border: '1px solid #E5E7EB',
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '0.8rem', fontWeight: 600, color: '#111827', boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              }}>
                <div style={{ width: '8px', height: '8px', backgroundColor: '#3B82F6', borderRadius: '50%', boxShadow: '0 0 0 3px rgba(59,130,246,0.25)' }} />
                Live Location
              </div>

              {isTokenFetched && mapboxToken ? (
                <Map
                  {...viewState}
                  onMove={evt => setViewState(evt.viewState)}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                  mapboxAccessToken={mapboxToken}
                  style={{ width: '100%', height: '100%' }}
                >
                  <NavigationControl position="bottom-right" />

                  {userLocation && (
                    <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
                      <div className="relative">
                        <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-lg flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                        <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-50" />
                      </div>
                    </Marker>
                  )}

                  {pickup && (
                    <Marker longitude={pickup.lng} latitude={pickup.lat} anchor="bottom">
                      <div className="flex flex-col items-center drop-shadow-xl">
                        <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow whitespace-nowrap mb-1">Pickup</div>
                        <MapPin size={30} className="text-indigo-600" fill="white" />
                      </div>
                    </Marker>
                  )}

                  {dropoff && (
                    <Marker longitude={dropoff.lng} latitude={dropoff.lat} anchor="bottom">
                      <div className="flex flex-col items-center drop-shadow-xl">
                        <div className="bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-md shadow whitespace-nowrap mb-1">Dropoff</div>
                        <MapPin size={30} className="text-purple-600" fill="white" />
                      </div>
                    </Marker>
                  )}

                  {results.map(ride => (
                    <Marker key={ride.id} longitude={ride.fromLng} latitude={ride.fromLat} anchor="bottom">
                      <div
                        className="relative flex flex-col items-center group cursor-pointer"
                        onClick={() => handleViewDetails(ride.id)}
                      >
                        <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none flex flex-col gap-1 shadow-lg z-50">
                          <span className="text-gray-300">{ride.from} → {ride.to}</span>
                          <span>{ride.driverName} · ₦{ride.pricePerSeat.toLocaleString()}</span>
                        </div>
                        <div className="w-11 h-11 rounded-full bg-white border-2 border-indigo-600 shadow-lg flex items-center justify-center animate-bounce overflow-hidden">
                          {ride.driverPicture ? (
                            <img src={ride.driverPicture} alt={ride.driverName} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center">
                              <User size={14} className="text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    </Marker>
                  ))}
                </Map>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400 text-sm">Loading map…</div>
              )}
            </div>
          )}
        </div>
        

        {/* My Rides */}
        <div style={{ ...styles.card, padding: 0 }}>
          <h3 style={styles.cardHeader}>My Rides</h3>
          <div style={{ padding: '12px 24px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderBottom: '1px solid #E5E7EB' }}>
            {[
              { label: 'All', value: undefined },
              { label: 'Upcoming', value: 'upcoming' },
              { label: 'In Progress', value: 'in_progress' },
              { label: 'Completed', value: 'completed' },
              { label: 'Cancelled', value: 'cancelled' },
            ].map(({ label, value }) => (
              <button key={label}
                onClick={() => { setBookingFilter(value); fetchMyRides(value); }}
                style={{
                  padding: '6px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  border: bookingFilter === value ? '1px solid #4F46E5' : '1px solid #E5E7EB',
                  backgroundColor: bookingFilter === value ? '#EEF2FF' : '#fff',
                  color: bookingFilter === value ? '#4F46E5' : '#6B7280',
                }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Route</th>
                  <th style={styles.th}>Date & Time</th>
                  <th style={styles.th}>Driver</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {myRides.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem' }}>
                      No rides yet — search above to book your first ride!
                    </td>
                  </tr>
                ) : myRides.map(r => {
                  const sc = statusColor(r.status);
                  return (
                    <tr key={r.id}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                          {r.from} <ArrowRight size={14} color="#64748B" /> {r.to}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ fontWeight: 500 }}>{formatDate(r.departureTime)}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{formatTime(r.departureTime)}</div>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                          <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'linear-gradient(135deg,#4F46E5,#7C3AED)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff', fontWeight: 700 }}>
                            {r.driverName[0]}
                          </div>
                          {r.driverName}
                        </div>
                      </td>
                      <td style={styles.td}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, textTransform: 'capitalize' }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => navigate(`/rider/ride/${r.id}`)}
                            style={{ background: '#F3F4F6', border: '1px solid #E5E7EB', padding: '6px', borderRadius: '6px', color: '#4B5563', cursor: 'pointer' }}
                            title="View"
                          >
                            <Eye size={15} />
                          </button>
                          {(r.status === 'confirmed' || r.status === 'active') && (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await api.post('/calls/initiate', { rideId: r.id });
                                  setCallId(res.data.call.id);
                                  setCallState({ isOpen: true, channel: res.data.call.channel, otherName: res.data.calleeName || r.driverName });
                                } catch (e: any) {
                                  alert(e.response?.data?.error || 'Failed to start call');
                                }
                              }}
                              style={{ background: '#EEF2FF', border: '1px solid #E0E7FF', padding: '6px', borderRadius: '6px', color: '#4F46E5', cursor: 'pointer' }}
                              title="Call Driver"
                            >
                              <Phone size={15} />
                            </button>
                          )}
                          {r.status === 'in_progress' && (
                            <button
                              onClick={async () => {
                                if (!window.confirm('Mark this booking as completed? This will notify the driver and hold payment for admin approval.')) return;
                                try {
                                  await api.post(`/bookings/${r.bookingId}/complete`);
                                  fetchMyRides(bookingFilter);
                                } catch (e: any) {
                                  alert(e.response?.data?.error || 'Failed to complete booking');
                                }
                              }}
                              style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '6px', borderRadius: '6px', color: '#059669', cursor: 'pointer' }}
                              title="Mark Completed"
                            >
                              <CheckCircle2 size={15} />
                            </button>
                          )}
                          {(r.status === 'pending' || r.status === 'confirmed') && (
                            <button
                              onClick={async () => {
                                if (!window.confirm('Cancel this booking?')) return;
                                try {
                                  await api.put(`/bookings/${r.bookingId}/cancel`, {});
                                  fetchMyRides(bookingFilter);
                                } catch (e) {
                                  console.error('Cancel failed', e);
                                }
                              }}
                              style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '6px', borderRadius: '6px', color: '#DC2626', cursor: 'pointer' }}
                              title="Cancel Booking"
                            >
                              X
                            </button>
                          )}
                          {r.status === 'completed' && !r.hasRated && (
                            <button
                              onClick={() => setRateState({ isOpen: true, bookingId: r.bookingId, driverName: r.driverName })}
                              style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', padding: '6px', borderRadius: '6px', color: '#D97706', cursor: 'pointer' }}
                              title="Rate Driver"
                            >
                              <Star size={15} />
                            </button>
                          )}
                          {r.status === 'completed' && r.hasRated && (
                            <span style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '6px 10px', borderRadius: '6px', color: '#059669', fontSize: '0.75rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={13} /> Rated
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      

      <CallModal
        isOpen={callState.isOpen}
        onClose={() => setCallState(prev => ({ ...prev, isOpen: false }))}
        channel={callState.channel}
        otherParticipantName={callState.otherName}
      />

      <RateDriverModal
        isOpen={rateState.isOpen}
        onClose={() => setRateState(prev => ({ ...prev, isOpen: false }))}
        bookingId={rateState.bookingId}
        driverName={rateState.driverName}
        onSuccess={() => { fetchMyRides(bookingFilter); }}
      />
    </div>
    </DashboardLayout>
  );
};
