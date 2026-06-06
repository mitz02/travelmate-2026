import React, { useState, useEffect } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import Map, { Marker, NavigationControl, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import api from '../services/api';
import {
  ArrowLeft, Star, MapPin, Clock, Users, CreditCard, Car, Phone,
  CheckCircle2, AlertCircle, Loader2, Navigation2, User, MessageSquare,
  Wind, Music, PawPrint
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { CallModal } from '../components/ui/CallModal';

const FALLBACK_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface RideDetails {
  id: string;
  from: string;
  to: string;
  fromLocation: { lat: number; lng: number };
  toLocation: { lat: number; lng: number };
  departureTime: string;
  pricePerSeat: number;
  availableSeats: number;
  totalSeats: number;
  bookedSeats: number;
  description: string;
  status: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
  amenities?: {
    ac?: boolean;
    music?: boolean;
    petAllowed?: boolean;
  };
  driver: {
    first_name: string;
    last_name: string;
    ratings: number;
    profile_picture?: string;
  };
}

export const RideDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [ride, setRide] = useState<RideDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [mapboxToken, setMapboxToken] = useState(FALLBACK_TOKEN);
  const [viewState, setViewState] = useState({ longitude: 3.3792, latitude: 6.5244, zoom: 10 });
  const [routeGeoJSON, setRouteGeoJSON] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [bookingDone, setBookingDone] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [callState, setCallState] = useState({ isOpen: false, channel: '', otherName: '' });
  const [startingChat, setStartingChat] = useState(false);

  const handleChatWithDriver = async () => {
    if (!ride) return;
    setStartingChat(true);
    try {
      const res = await api.post('/chat', { rideId: ride.id });
      const convId = res.data.conversationId;
      navigate(`/messages?select=${convId}`);
    } catch (err) {
      console.error('Failed to start chat:', err);
      alert('Unable to start chat. Make sure you are not the driver of this ride.');
    } finally {
      setStartingChat(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setUserLocation({ lng: pos.coords.longitude, lat: pos.coords.latitude });
      });
    }

    const fetchAll = async () => {
      try {
        const [configRes, rideRes, walletRes] = await Promise.all([
          api.get('/config'),
          api.get(`/rides/${id}`),
          api.get('/wallet/balance'),
        ]);
        if (configRes.data?.MAPBOX_ACCESS_TOKEN) setMapboxToken(configRes.data.MAPBOX_ACCESS_TOKEN);
        if (walletRes.data?.totalBalance !== undefined) setWalletBalance(walletRes.data.totalBalance);

        const r: RideDetails = rideRes.data;
        setRide(r);

        // Centre map between pickup & dropoff
        const midLng = (r.fromLocation.lng + r.toLocation.lng) / 2;
        const midLat = (r.fromLocation.lat + r.toLocation.lat) / 2;
        setViewState({ longitude: midLng, latitude: midLat, zoom: 10 });

        // Fetch route polyline
        try {
          const routeRes = await api.get('/location/route', {
            params: {
              fromLng: r.fromLocation.lng,
              fromLat: r.fromLocation.lat,
              toLng: r.toLocation.lng,
              toLat: r.toLocation.lat,
            },
          });
          // Decode polyline into GeoJSON
          const coords = decodePolyline(routeRes.data.route.geometry);
          setRouteGeoJSON({
            type: 'Feature',
            geometry: { type: 'LineString', coordinates: coords },
          });
        } catch (e) {
          // Route line optional — silently ignore
        }
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to load ride details.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  // Simple polyline decoder (Google-format)
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
      await api.post(`/payment/verify/${reference}`); // Use the existing endpoint in payment.ts
      setBookingDone(true);
    } catch (err) {
      setBookingError('Payment was successful, but we failed to confirm the booking. Please contact support.');
    } finally {
      setIsBooking(false);
    }
  };

  const initializePaystack = usePaystackPayment({
    reference: '', // Will be overridden
    email: '',
    amount: 0,
    publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
  });

  const handleBook = async (paymentMethod: 'wallet' | 'paystack') => {
    if (!ride) return;
    setIsBooking(true);
    setBookingError('');
    try {
      const res = await api.post('/bookings', { rideId: ride.id, seatsBooked: 1, paymentMethod });
      
      if (paymentMethod === 'wallet') {
        // Instant success
        setBookingDone(true);
        setIsBooking(false);
      } else if (paymentMethod === 'paystack') {
        // Initialize Paystack popup
        const config = {
          reference: res.data.reference,
          email: res.data.email || 'user@example.com',
          amount: ride.pricePerSeat * 100, // Paystack uses kobo
          publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
        };
        
        initializePaystack({
          config,
          onSuccess: (response: any) => handlePaystackSuccess(response.reference, res.data.id),
          onClose: () => {
            setIsBooking(false);
            setBookingError('Payment was cancelled.');
          }
        });
      }
    } catch (err: any) {
      setIsBooking(false);
      setBookingError(err.response?.data?.error || 'Failed to book. Try again.');
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

  const driverFullName = `${ride.driver?.first_name || 'Driver'} ${ride.driver?.last_name || ''}`.trim();
  const ratingStars = Math.round(ride.driver?.ratings || 5);

  return (
    <DashboardLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Back */}
        <button
          onClick={() => navigate('/rider')}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-indigo-600 transition-colors w-fit"
        >
          <ArrowLeft size={18} /> Back to search
        </button>

        {/* Route Header */}
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
          <div className="flex items-center gap-2 mt-4 text-sm text-gray-500">
            <Clock size={14} className="text-indigo-400" />
            {formatDate(ride.departureTime)} at {formatTime(ride.departureTime)}
          </div>
        </div>

        {/* Map */}
        <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid #E5E7EB', height: '380px', position: 'relative' }}>
          <Map
            {...viewState}
            onMove={evt => setViewState(evt.viewState)}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={mapboxToken}
            style={{ width: '100%', height: '100%' }}
          >
            <NavigationControl position="bottom-right" />

            {/* Route line */}
            {routeGeoJSON && (
              <Source type="geojson" data={routeGeoJSON}>
                <Layer
                  id="route-line"
                  type="line"
                  paint={{ 'line-color': '#4F46E5', 'line-width': 4, 'line-opacity': 0.85 }}
                  layout={{ 'line-cap': 'round', 'line-join': 'round' }}
                />
              </Source>
            )}

            {/* User current location */}
            {userLocation && (
              <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
                <div className="relative">
                  <div className="w-5 h-5 rounded-full bg-blue-500 border-2 border-white shadow-lg" />
                  <div className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-40" />
                </div>
              </Marker>
            )}

            {/* Pickup marker */}
            <Marker longitude={ride.fromLocation.lng} latitude={ride.fromLocation.lat} anchor="bottom">
              <div className="flex flex-col items-center">
                <div className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow mb-0.5 whitespace-nowrap">Pickup</div>
                <MapPin size={28} className="text-indigo-600" fill="white" />
              </div>
            </Marker>

            {/* Dropoff marker */}
            <Marker longitude={ride.toLocation.lng} latitude={ride.toLocation.lat} anchor="bottom">
              <div className="flex flex-col items-center">
                <div className="bg-purple-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow mb-0.5 whitespace-nowrap">Dropoff</div>
                <MapPin size={28} className="text-purple-600" fill="white" />
              </div>
            </Marker>
          </Map>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Driver Card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-5">Driver Details</h3>
            <div className="flex items-center gap-4 mb-5">
              {ride.driver?.profile_picture ? (
                <img
                  src={ride.driver.profile_picture}
                  alt={driverFullName}
                  className="w-14 h-14 rounded-full object-cover flex-shrink-0 shadow-lg border-2 border-indigo-100"
                />
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
                  <span className="text-xs text-gray-500 ml-1 font-semibold">{ride.driver?.ratings?.toFixed(1)}/5.0</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-4">
              <button
                onClick={() => setCallState({ isOpen: true, channel: `ride_${ride.id}`, otherName: driverFullName })}
                className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 text-sm font-semibold hover:bg-indigo-100 transition-colors"
              >
                <Phone size={15} /> Call Driver
              </button>
              <button
                onClick={handleChatWithDriver}
                disabled={startingChat}
                className="flex items-center gap-2 w-full justify-center py-2.5 rounded-xl border border-transparent bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {startingChat ? (
                  <>
                    <Loader2 className="animate-spin" size={15} /> Starting Chat...
                  </>
                ) : (
                  <>
                    <MessageSquare size={15} /> Chat with Driver
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Ride Info */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-5">Ride Information</h3>
            <div className="space-y-4">
              {[
                { icon: <CreditCard size={16} className="text-green-500" />, label: 'Price per seat', value: `₦${ride.pricePerSeat.toLocaleString()}` },
                { icon: <Users size={16} className="text-blue-500" />, label: 'Available seats', value: `${ride.availableSeats} of ${ride.totalSeats}` },
                { icon: <Clock size={16} className="text-indigo-500" />, label: 'Departure', value: formatTime(ride.departureTime) },
                { icon: <Car size={16} className="text-purple-500" />, label: 'Date', value: formatDate(ride.departureTime) },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    {icon} {label}
                  </div>
                  <span className="text-sm font-bold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Vehicle Info + Amenities */}
        {(ride.vehicleMake || ride.vehicleModel || ride.vehicleColor || ride.amenities) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Vehicle Info */}
            {(ride.vehicleMake || ride.vehicleModel || ride.vehicleColor) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Car size={14} color="#D97706" />
                  </span>
                  Vehicle Information
                </h3>
                <div className="space-y-3">
                  {ride.vehicleMake && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Make</span>
                      <span className="text-sm font-bold text-gray-900">{ride.vehicleMake}</span>
                    </div>
                  )}
                  {ride.vehicleModel && (
                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                      <span className="text-sm text-gray-500">Model</span>
                      <span className="text-sm font-bold text-gray-900">{ride.vehicleModel}</span>
                    </div>
                  )}
                  {ride.vehicleColor && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-gray-500">Color</span>
                      <span className="text-sm font-bold text-gray-900">{ride.vehicleColor}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Amenities */}
            {ride.amenities && (ride.amenities.ac || ride.amenities.music || ride.amenities.petAllowed) && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-base font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Wind size={14} color="#10B981" />
                  </span>
                  Amenities & Preferences
                </h3>
                <div className="flex flex-wrap gap-3">
                  {ride.amenities.ac && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                      <Wind size={16} color="#3B82F6" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1D4ED8' }}>Air Conditioning</span>
                    </div>
                  )}
                  {ride.amenities.music && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: '#FDF4FF', border: '1px solid #E9D5FF' }}>
                      <Music size={16} color="#9333EA" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#7E22CE' }}>Music</span>
                    </div>
                  )}
                  {ride.amenities.petAllowed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                      <PawPrint size={16} color="#10B981" />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#065F46' }}>Pets Allowed</span>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* Description */}
        {ride.description && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-base font-bold text-gray-800 mb-3">Driver's Note</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{ride.description}</p>
          </div>
        )}

        {/* Book CTA */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {bookingDone ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 size={48} className="text-green-500" />
              <p className="text-lg font-black text-gray-900">Booking Confirmed!</p>
              <p className="text-sm text-gray-500 text-center">Your payment was successful and your seat is reserved. Check "My Rides" on your dashboard.</p>
              <Button onClick={() => navigate('/rider')} className="mt-2">Back to Dashboard</Button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-2xl font-black text-indigo-600">₦{ride.pricePerSeat.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ride.availableSeats} seat{ride.availableSeats !== 1 ? 's' : ''} remaining</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-700">Wallet Balance</p>
                  <p className={`text-sm font-bold ${walletBalance >= ride.pricePerSeat ? 'text-green-600' : 'text-red-500'}`}>
                    ₦{walletBalance.toLocaleString()}
                  </p>
                </div>
              </div>

              {bookingError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium flex items-center gap-2">
                  <AlertCircle size={16} /> {bookingError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 mt-2">
                <Button
                  onClick={() => handleBook('wallet')}
                  isLoading={isBooking}
                  disabled={ride.availableSeats === 0 || ride.status !== 'open' || walletBalance < ride.pricePerSeat}
                  className="flex-1 px-6 py-3 h-auto rounded-xl shadow-lg shadow-indigo-200 text-base font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                >
                  Pay with Wallet
                </Button>
                
                <Button
                  onClick={() => handleBook('paystack')}
                  isLoading={isBooking}
                  disabled={ride.availableSeats === 0 || ride.status !== 'open'}
                  variant="outline"
                  className="flex-1 px-6 py-3 h-auto rounded-xl border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 font-bold"
                >
                  Pay with Card (Paystack)
                </Button>
              </div>
              
              {walletBalance < ride.pricePerSeat && (
                <p className="text-xs text-center text-gray-500">Insufficient wallet balance. Please pay with card.</p>
              )}
            </div>
          )}
        </div>

      </div>

      <CallModal
        isOpen={callState.isOpen}
        onClose={() => setCallState(prev => ({ ...prev, isOpen: false }))}
        channel={callState.channel}
        otherParticipantName={callState.otherName}
      />
    </DashboardLayout>
  );
};
