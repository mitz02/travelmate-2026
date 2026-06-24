import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LocationAutocomplete } from '../components/ui/LocationAutocomplete';
import { usePaystackPayment } from 'react-paystack';
import { Search, Map, Clock, CreditCard, User, AlertCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface Location {
  placeName: string;
  lng: number;
  lat: number;
}

interface RideResult {
  id: string;
  driverName: string;
  from: string;
  to: string;
  departureTime: string;
  price: number;
  seatsAvailable: number;
}

export const Booking: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [date, setDate] = useState('');
  const [selectedSeatsMap, setSelectedSeatsMap] = useState<Record<string, number>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RideResult[]>([]);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [paystackConfig, setPaystackConfig] = useState<any>(null);
  const initializePayment = usePaystackPayment(paystackConfig || { publicKey: '' });

  const getTotalAmount = (ride: RideResult) => {
    const seats = selectedSeatsMap[ride.id] || 1;
    return ride.price * seats;
  };

  useEffect(() => {
    if (paystackConfig && initializePayment) {
      initializePayment({
        onSuccess: (response: any) => {
          handlePaystackSuccess(response.reference || paystackConfig.reference, paystackConfig.bookingId);
          setPaystackConfig(null);
        },
        onClose: () => {
          setIsBooking(false);
          setPaystackConfig(null);
          setBookingError('Payment was cancelled.');
        },
      });
    }
  }, [paystackConfig, initializePayment]);

  const handleSearch = async () => {
    if (!pickup || !dropoff) return;
    setIsSearching(true);
    setResults([]);
    setBookingError('');
    try {
      const params: Record<string, string> = { origin: pickup.placeName, dest: dropoff.placeName };
      if (date) params.date = date;
      const res = await api.get('/rides/search', { params });
      const rides: RideResult[] = (res.data.rides || []).map((r: any) => ({
        id: r.id,
        driverName: r.driver ? `${r.driver.first_name} ${r.driver.last_name}` : 'Driver',
        from: r.from,
        to: r.to,
        departureTime: r.departure_time || r.departureTime || '',
        price: Number(r.price_per_seat || r.pricePerSeat || 0),
        seatsAvailable: Number(r.available_seats || r.availableSeats || 0),
      }));
      setResults(rides);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePaystackSuccess = async (reference: string, bid: string) => {
    try {
      await api.get(`/payments/verify/${reference}`);
      await api.post(`/bookings/${bid}/confirm-paystack`);
      setIsBooking(false);
      navigate(`/rider/ride/${results.find(r => r.id === bid)?.id || ''}`, { replace: true });
    } catch (err) {
      setIsBooking(false);
      setBookingError('Payment was successful, but confirmation failed. Contact support.');
    }
  };

  const handleBookClick = async (ride: RideResult) => {
    setBookingError('');
    setIsBooking(true);
    try {
      const seats = selectedSeatsMap[ride.id] || 1;
      const res = await api.post('/bookings', { rideId: ride.id, seats, paymentMethod: 'paystack' });
      const bid = res.data.booking?.id || res.data.id;
      const email = res.data.email || 'user@example.com';
      const reference = res.data.reference;
      const amount = getTotalAmount(ride) * 100;

      setPaystackConfig({
        reference,
        email,
        amount,
        publicKey: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || '',
        bookingId: bid,
        metadata: {
          bookingId: bid,
          userId: user?.id,
        },
      });
    } catch (err: any) {
      setIsBooking(false);
      setBookingError(err.response?.data?.error || 'Failed to book. Try again.');
    }
  };

  return (
    <div className="container min-h-screen py-8 grid grid-cols-1 lg:grid-cols-3 gap-lg animate-fade-in">
      {/* Search Panel */}
      <div className="lg:col-span-1">
        <Card padding="lg" className="sticky top-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search size={20} className="text-primary" />
              Find a Ride
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-md">
              <LocationAutocomplete 
                label="Pickup Location" 
                placeholder="Where are you leaving from?" 
                onLocationSelect={setPickup}
              />
              <LocationAutocomplete 
                label="Dropoff Location" 
                placeholder="Where are you going?" 
                onLocationSelect={setDropoff}
              />
              <Input 
                type="date" 
                label="Date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              
              <Button 
                size="lg" 
                className="mt-4" 
                fullWidth 
                onClick={handleSearch}
                isLoading={isSearching}
                disabled={!pickup || !dropoff || !date}
              >
                Search Available Rides
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results Panel */}
      <div className="lg:col-span-2 flex flex-col gap-md">
        <h2 className="text-2xl font-bold mb-2">Available Rides</h2>
        
        {bookingError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
            <AlertCircle size={16} className="flex-shrink-0" />
            {bookingError}
          </div>
        )}

        {results.length === 0 && !isSearching && (
          <div className="bg-white p-12 rounded-lg border border-border-color text-center flex flex-col items-center">
            <Map size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-main">No rides found yet</h3>
            <p className="text-muted">Enter your route details to see available rides nearby.</p>
          </div>
        )}

        {results.map((ride) => {
          const seatCount = selectedSeatsMap[ride.id] || 1;
          const totalAmt = getTotalAmount(ride);
          return (
          <Card key={ride.id} className="hover:border-primary transition-colors">
            <div className="p-6 flex flex-col md:flex-row justify-between gap-md">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-main">{ride.driverName}</h3>
                  <div className="text-right">
                    <div className="text-xl font-bold text-primary">₦{ride.price.toLocaleString()}</div>
                    <div className="text-xs text-gray-400">per seat</div>
                  </div>
                </div>
                
                <p className="text-muted text-sm mb-4">{ride.from} → {ride.to}</p>
                
                <div className="flex flex-wrap gap-4 text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-secondary" />
                    Departs at {ride.departureTime}
                  </div>
                  <div className="flex items-center gap-2 border-l pl-4 border-gray-300">
                    <label className="text-sm font-medium text-gray-600" htmlFor={`seats-${ride.id}`}>Seats:</label>
                    <input
                      id={`seats-${ride.id}`}
                      type="number"
                      min={1}
                      max={ride.seatsAvailable}
                      value={seatCount}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(ride.seatsAvailable, Number(e.target.value)));
                        setSelectedSeatsMap(prev => ({ ...prev, [ride.id]: val }));
                      }}
                      className="w-12 p-1 border rounded text-center"
                    />
                    <User size={16} className="text-primary" />
                    {ride.seatsAvailable} seats left
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end justify-end md:w-48 mt-4 md:mt-0 gap-2">
                <div className="text-lg font-bold text-indigo-600">₦{totalAmt.toLocaleString()}</div>
                <Button 
                  fullWidth 
                  onClick={() => handleBookClick(ride)}
                  isLoading={isBooking}
                  disabled={isBooking}
                  leftIcon={isBooking ? undefined : <CreditCard size={18} />}
                >
                  {isBooking ? 'Booking...' : 'Book & Pay'}
                </Button>
              </div>
            </div>
          </Card>
          );
        })}
      </div>
    </div>
  );
};
