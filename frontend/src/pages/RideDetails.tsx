import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { usePaystackPayment } from 'react-paystack';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft, Star, MapPin, Clock, Users, CreditCard, Car, Phone,
  CheckCircle2, AlertCircle, Loader2, Navigation2, User, MessageSquare,
  Wind, Music, PawPrint, Ban
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CallModal } from '../components/ui/CallModal';
import { useCallContext } from '../context/CallContext';

const FALLBACK_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';

interface RideDetails {
  id: string;
  from: string;
  to: string;
  from_lat: number;
  from_lng: number;
  to_lat: number;
  to_lng: number;
  departure_time: string;
  price_per_seat: number;
  available_seats: number;
  total_seats: number;
  description: string;
  status: string;
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_color?: string;
  amenities?: {
    ac?: boolean;
    music?: boolean;
    pets?: boolean;
    smoking?: boolean;
  };
  pickup_point?: string;
  dropoff_point?: string;
  driver: {
    first_name: string;
    last_name: string;
    ratings: number;
    profile_picture?: string;
  };
  vehicle?: {
    make?: string;
    model?: string;
    color?: string;
  };
}

export const RideDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [ride, setRide] = useState<RideDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapboxToken, setMapboxToken] = useState(FALLBACK_TOKEN);
  const [viewState, setViewState] = useState({ longitude: 3.3792, latitude: 6.5244, zoom: 10 });
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [isWalletBooking, setIsWalletBooking] = useState(false);
  const [isCardBooking, setIsCardBooking] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingDone, setBookingDone] = useState(false);
  const [callState, setCallState] = useState({ isOpen: false, channel: '', otherName: '' });
  const { setCallId } = useCallContext();
  const [startingChat, setStartingChat] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [hasActiveBooking, setHasActiveBooking] = useState(false);
  const [paystackConfig, setPaystackConfig] = useState<any>(null);
  const initializePayment = usePaystackPayment(paystackConfig || { publicKey: '' });
  const [seats, setSeats] = useState(1);

  const baseAmount = ride ? ride.price_per_seat * seats : 0;

  useEffect(() => {
    if (paystackConfig && initializePayment) {
      initializePayment({
        onSuccess: (response: any) => {
          handlePaystackSuccess(response.reference || paystackConfig.reference, paystackConfig.bookingId);
          setPaystackConfig(null);
        },
        onClose: () => {
          setIsCardBooking(false);
          setPaystackConfig(null);
          setBookingError('Payment was cancelled.');
        },
      });
    }
  }, [paystackConfig, initializePayment]);

  const fromLocation = ride && ride.from_lat != null && ride.from_lng != null ? { lat: ride.from_lat, lng: ride.from_lng } : null;
  const toLocation = ride && ride.to_lat != null && ride.to_lng != null ? { lat: ride.to_lat, lng: ride.to_lng } : null;
  const driverFullName = ride?.driver ? `${ride.driver.first_name || 'Driver'} ${ride.driver.last_name || ''}`.trim() : 'Driver';
  const ratingStars = Math.round(Number(ride?.driver?.ratings) || 5);
  const amenities = ride?.amenities || {};
  const isUpcoming = ride && ride.status === 'open';

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const configRes = await api.get('/config');
        if (configRes.data?.MAPBOX_ACCESS_TOKEN) setMapboxToken(configRes.data.MAPBOX_ACCESS_TOKEN);

        const rideRes = await api.get(`/rides/${id}`);

        const r: RideDetails = rideRes.data?.ride || rideRes.data;
        const driver = rideRes.data?.driver || null;
        const vehicle = rideRes.data?.vehicle || null;
        setHasActiveBooking(rideRes.data?.hasActiveBooking ?? false);
        if (!r || !r.id) {
          setError('Ride data not found');
          setLoading(false);
          return;
        }
        setRide({ ...r, driver, vehicle });

        const midLng = (Number(r.from_lng) + Number(r.to_lng)) / 2;
        const midLat = (Number(r.from_lat) + Number(r.to_lat)) / 2;
        if (r.from_lat && r.from_lng) setViewState({ longitude: midLng || 3.3792, latitude: midLat || 6.5244, zoom: 10 });

        try {
          const routeRes = await api.get('/location/route', {
            params: { fromLng: r.from_lng, fromLat: r.from_lat, toLng: r.to_lng, toLat: r.to_lat },
          });
          const coords = decodePolyline(routeRes.data.route.geometry);
          setRouteGeoJSON({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
          });
        } catch (e) {}
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load ride details.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const decodePolyline = (encoded: string): [number, number][] => {
    let index = 0, lat = 0, lng = 0;
    const coords: [number, number][] = [];
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lat += (result & 1) ? ~(result >> 1) : (result >> 1);
      shift = 0; result = 0;
      do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      lng += (result & 1) ? ~(result >> 1) : (result >> 1);
      coords.push([lng / 1e5, lat / 1e5]);
    }
    return coords;
  };

  const handlePaystackSuccess = async (reference: string, bookingId: string) => {
    try {
      await api.get(`/payments/verify/${reference}`);
      await api.post(`/bookings/${bookingId}/confirm-paystack`);
      setIsCardBooking(false);
      setBookingDone(true);
      setHasActiveBooking(true);
    } catch (err) {
      setIsCardBooking(false);
      setBookingError('Payment was successful, but we failed to confirm the booking. Please contact support.');
    }
  };

  const payWithPaystack = (email: string, reference: string, amount: number, bookingId: string) => {
    setPaystackConfig({
      reference,
      email,
      amount,
      publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
      bookingId,
      metadata: {
        bookingId,
        userId: user?.id,
      },
    });
  };

  const handleBook = async (paymentMethod: 'wallet' | 'paystack') => {
    if (!ride) return;
    if (paymentMethod === 'wallet') setIsWalletBooking(true);
    else setIsCardBooking(true);
    setBookingError('');
    try {
      const res = await api.post('/bookings', { rideId: ride.id, seats, paymentMethod });
      const bookingId = res.data.booking?.id || res.data.id;

      if (paymentMethod === 'wallet') {
        setIsWalletBooking(false);
        setBookingDone(true);
        setHasActiveBooking(true);
      } else if (paymentMethod === 'paystack') {
        payWithPaystack(
          res.data.email || 'user@example.com',
          res.data.reference,
          baseAmount * 100,
          bookingId
        );
      }
    } catch (err: any) {
      if (paymentMethod === 'wallet') setIsWalletBooking(false);
      else setIsCardBooking(false);
      setBookingError(err.response?.data?.error || 'Failed to book. Try again.');
    }
  };

  const handleCancelBooking = async () => {
    if (!ride) return;
    if (!window.confirm('Are you sure you want to cancel? Refund will be processed.')) return;
    setCancelLoading(true);
    try {
      await api.put(`/bookings/${ride.id}/cancel`, {});
      setBookingDone(false);
      setBookingError('');
      window.location.reload();
    } catch (err: any) {
      setBookingError(err.response?.data?.error || 'Failed to cancel booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleChatWithDriver = async () => {
    setStartingChat(true);
    try {
      const res = await api.post('/chat', { rideId: ride?.id });
      navigate(`/messages?select=${res.data.conversationId}`);
    } catch (err) {
      setBookingError('Failed to start chat. Try again.');
    } finally {
      setStartingChat(false);
    }
  };

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const formatTime = (dt: string) => new Date(dt).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64 gap-3 text-gray-500">
        <Loader2 size={22} className="animate-spin text-indigo-500" />
        <span className="text-sm font-medium">Loading ride details…</span>
      </div>
    </DashboardLayout>
  );

  if (error || !ride) return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <AlertCircle size={40} className="text-red-400" />
        <p className="text-gray-600">{error || 'Ride not found.'}</p>
        <Button onClick={() => navigate('/rider')} variant="outline">Back to Dashboard</Button>
      </div>
    </DashboardLayout>
  );

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <button
          onClick={() => navigate('/rider')}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors w-fit"
        >
          <ArrowLeft size={18} /> Back to search
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
              style={{
                background: ride.status === 'open' ? '#ECFDF5' : '#F3F4F6',
                color: ride.status === 'open' ? '#059669' : '#6B7280',
              }}>
              {ride.status}
            </span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">From</p>
              <p className="text-xl font-black text-gray-900">{ride.from}</p>
            </div>
            <div className="flex-1 flex items-center justify-center min-w-[60px]">
              <div className="flex items-center gap-1">
                <div className="h-px w-12 bg-indigo-200" />
                <Navigation2 size={18} className="text-indigo-500" />
                <div className="h-px w-12 bg-indigo-200" />
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1">To</p>
              <p className="text-xl font-black text-gray-900">{ride.to}</p>
            </div>
          </div>

          {/* Pickup/Dropoff Points */}
          {ride.pickup_point && (
            <div className="mt-3 text-sm text-gray-500">
              <span className="font-medium text-gray-700">Pickup points:</span> {ride.pickup_point}
            </div>
          )}
          {ride.dropoff_point && (
            <div className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">Dropoff points:</span> {ride.dropoff_point}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 text-sm text-gray-500">
            <Clock size={14} className="text-indigo-400" />
            {formatDate(ride.departure_time)} at {formatTime(ride.departure_time)}
          </div>
        </div>

        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #E5E7EB', height: '380px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F9FAFB' }}>
          {mapboxToken && (fromLocation || toLocation) ? (
            <Map
              {...viewState}
              onMove={evt => setViewState(evt.viewState)}
              mapStyle="mapbox://styles/mapbox/streets-v12"
              mapboxAccessToken={mapboxToken}
              style={{ width: '100%', height: '100%' }}
            >
              <NavigationControl position="bottom-right" />
              {routeGeoJSON && (
                <Source type="geojson" data={routeGeoJSON}>
                  <Layer id="route-line" type="line" paint={{ 'line-color': '#4F46E5', 'line-width': 4, 'line-opacity': 0.85 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
                </Source>
              )}
              {userLocation && (
                <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
                  <div className="relative">
                    <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
                    <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-40" />
                  </div>
                </Marker>
              )}
              {fromLocation && (
                <Marker longitude={fromLocation.lng} latitude={fromLocation.lat} anchor="bottom">
                  <div className="flex flex-col items-center">
                    <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow mb-0.5 whitespace-nowrap">Pickup</div>
                    <MapPin size={28} className="text-indigo-600" fill="white" />
                  </div>
                </Marker>
              )}
              {toLocation && (
                <Marker longitude={toLocation.lng} latitude={toLocation.lat} anchor="bottom">
                  <div className="flex flex-col items-center">
                    <div className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow mb-0.5 whitespace-nowrap">Dropoff</div>
                    <MapPin size={28} className="text-purple-600" fill="white" />
                  </div>
                </Marker>
              )}
            </Map>
          ) : (
            <div className="flex flex-col items-center gap-2 text-gray-400">
              <MapPin size={32} />
              <span className="text-sm font-medium">Route map unavailable</span>
              <span className="text-xs">{ride.from} → {ride.to}</span>
            </div>
          )}
        </div>

        {bookingError && (
          <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm flex items-center gap-2">
            <AlertCircle size={16} /> {bookingError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-5">Driver Details</h3>
            <div className="flex items-center gap-4 mb-5">
              {ride.driver?.profile_picture ? (
                <img src={ride.driver.profile_picture} alt={driverFullName} className="w-14 h-14 rounded-full object-cover flex-shrink-0 shadow-lg border-2 border-indigo-100" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                  {driverFullName[0]}
                </div>
              )}
              <div>
                <p className="text-lg font-black text-gray-900">{driverFullName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {Array.from({ length: ratingStars }).map((_, i) => (
                    <Star key={i} size={13} fill="#F59E0B" className="text-amber-500" />
                  ))}
                  {ratingStars < 5 && <Star size={13} className="text-gray-200" fill="#E5E7EB" />}
                  <span className="text-xs text-gray-500 ml-1 font-semibold">{Number(ride.driver?.ratings || 0).toFixed(1)}/5.0</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={async () => {
                  try {
                    const res = await api.post('/calls/initiate', { rideId: ride.id });
                    setCallId(res.data.call.id);
                    setCallState({ isOpen: true, channel: res.data.call.channel, otherName: res.data.calleeName || driverFullName });
                  } catch (e: any) {
                    alert(e.response?.data?.error || 'Failed to start call');
                  }
                }}
                className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 text-sm font-semibold hover:bg-indigo-100 transition-colors">
                <Phone size={15} /> Call Driver
              </button>
              <button onClick={handleChatWithDriver} disabled={startingChat}
                className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl border border-transparent bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                {startingChat ? <><Loader2 className="animate-spin" size={15} /> Starting Chat...</> : <><MessageSquare size={15} /> Chat with Driver</>}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-5">Ride Information</h3>
            <div className="space-y-4">
              {[
                { icon: <CreditCard size={16} className="text-green-500" />, label: 'Price per seat', value: `₦${ride.price_per_seat?.toLocaleString()}` },
                { icon: <Users size={16} className="text-blue-500" />, label: 'Available seats', value: `${ride.available_seats} of ${ride.total_seats}` },
                { icon: <Clock size={16} className="text-indigo-500" />, label: 'Departure', value: formatTime(ride.departure_time) },
                { icon: <Car size={16} className="text-purple-500" />, label: 'Date', value: formatDate(ride.departure_time) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 text-sm text-gray-500">{icon} {label}</div>
                  <span className="text-sm font-bold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {(ride.vehicle_make || ride.vehicle_model || ride.vehicle_color || amenities.ac !== undefined) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(ride.vehicle_make || ride.vehicle_model || ride.vehicle_color) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={14} color="#D97706" />
                  </span>
                  Vehicle Information
                </h3>
                <div className="space-y-3">
                  {ride.vehicle_make && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Make</span>
                      <span className="text-sm font-bold text-gray-900">{ride.vehicle_make}</span>
                    </div>
                  )}
                  {ride.vehicle_model && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Model</span>
                      <span className="text-sm font-bold text-gray-900">{ride.vehicle_model}</span>
                    </div>
                  )}
                  {ride.vehicle_color && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-500">Color</span>
                      <span className="text-sm font-bold text-gray-900">{ride.vehicle_color}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Wind size={14} color="#10B981" />
                </span>
                Amenities
              </h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'ac', label: 'AC', icon: <Wind size={16} /> },
                  { key: 'music', label: 'Music', icon: <Music size={16} /> },
                  { key: 'pets', label: 'Pets Allowed', icon: <PawPrint size={16} /> },
                  { key: 'smoking', label: 'Smoking', icon: <Ban size={16} /> },
                ].map(({ key, label, icon }) => (
                  <div key={key}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border ${
                      (amenities as any)[key]
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-gray-50 border-gray-100 text-gray-400'
                    }`}>
                    {icon} {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {hasActiveBooking && !bookingDone && (
          <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl text-center">
            <CheckCircle2 size={40} className="mx-auto text-blue-500 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Already Booked</h3>
            <p className="text-sm text-gray-600">You already have a booking on this ride.</p>
          </div>
        )}

        {isUpcoming && !bookingDone && !hasActiveBooking && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Book This Ride</h3>

            {/* Seat selector */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Number of Seats</label>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setSeats(Math.max(1, seats - 1))}
                  disabled={seats <= 1}
                  className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-bold text-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">−</button>
                <span className="w-12 text-center text-xl font-bold text-gray-900">{seats}</span>
                <button type="button" onClick={() => setSeats(Math.min(ride.available_seats, seats + 1))}
                  disabled={seats >= ride.available_seats}
                  className="w-10 h-10 rounded-xl border border-gray-200 bg-gray-50 text-gray-700 font-bold text-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">+</button>
                <span className="text-sm text-gray-400 ml-1">{ride.available_seats} available</span>
              </div>
            </div>

            {/* Price */}
            <div className="bg-gray-50 rounded-xl p-4 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">₦{ride.price_per_seat.toLocaleString()} × {seats} seat{seats > 1 ? 's' : ''}</span>
                <span className="font-bold text-indigo-600 text-lg">₦{baseAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={() => handleBook('wallet')} isLoading={isWalletBooking}
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg shadow-indigo-200"
                leftIcon={<CreditCard size={18} />}>
                Pay with Wallet (₦{baseAmount.toLocaleString()})
              </Button>
              <Button onClick={() => handleBook('paystack')} isLoading={isCardBooking} variant="outline"
                className="flex-1">
                Pay with Card (₦{baseAmount.toLocaleString()})
              </Button>
            </div>
          </div>
        )}

        {bookingDone && (
          <div className="bg-green-50 border border-green-100 p-6 rounded-2xl text-center">
            <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-1">Booking Confirmed!</h3>
            <p className="text-sm text-gray-600 mb-4">Your seat has been booked. You can contact your driver for more details.</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={async () => {
                  try {
                    const res = await api.post('/calls/initiate', { rideId: ride.id });
                    setCallId(res.data.call.id);
                    setCallState({ isOpen: true, channel: res.data.call.channel, otherName: res.data.calleeName || driverFullName });
                  } catch (e: any) {
                    alert(e.response?.data?.error || 'Failed to start call');
                  }
                }}>
                <Phone size={16} /> Call Driver
              </Button>
              {isUpcoming && (
                <Button onClick={handleCancelBooking} isLoading={cancelLoading} variant="outline" className="border-red-200 text-red-600">
                  Cancel Booking
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <CallModal isOpen={callState.isOpen} onClose={() => setCallState({ ...callState, isOpen: false })} channel={callState.channel} otherParticipantName={callState.otherName} />
    </DashboardLayout>
  );
};
