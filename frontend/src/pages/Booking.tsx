import React, { useState } from 'react';
import { usePaystackPayment } from 'react-paystack';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LocationAutocomplete } from '../components/ui/LocationAutocomplete';
import { Search, Map, Clock, CreditCard } from 'lucide-react';

interface Location {
  placeName: string;
  lng: number;
  lat: number;
}

interface RideResult {
  id: string;
  driverName: string;
  vehicle: string;
  departureTime: string;
  price: number;
  seatsAvailable: number;
}

export const Booking: React.FC = () => {
  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [selectedSeatsMap, setSelectedSeatsMap] = useState<Record<string, number>>({});
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<RideResult[]>([]);
  const [selectedRide, setSelectedRide] = useState<RideResult | null>(null);

  const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || 'pk_test_ab046babd5ae5ee413da907a02f6ecd8ed63e165';

  const handleSearch = () => {
    setIsSearching(true);
    // Simulate hitting our backend geospatial search endpoint
    setTimeout(() => {
      setResults([
        { id: '1', driverName: 'John Doe', vehicle: 'Toyota Camry (Silver)', departureTime: '10:00 AM', price: 2500, seatsAvailable: 3 },
        { id: '2', driverName: 'Sarah Smith', vehicle: 'Honda Civic (Black)', departureTime: '10:30 AM', price: 2000, seatsAvailable: 1 },
        { id: '3', driverName: 'Michael Chuks', vehicle: 'Hyundai Elantra (White)', departureTime: '11:15 AM', price: 3000, seatsAvailable: 2 },
      ]);
      setIsSearching(false);
    }, 1500);
  };

  // Paystack Configuration
  const config = {
    reference: (new Date()).getTime().toString(),
    email: "user@example.com", // In a real app, this comes from the authenticated user
    amount: selectedRide ? selectedRide.price * 100 : 0, // Paystack expects amount in kobo
    publicKey: PAYSTACK_PUBLIC_KEY,
  };

  const initializePayment = usePaystackPayment(config);

  const handleBookClick = (ride: RideResult) => {
    setSelectedRide(ride);
    // Give state a moment to update before triggering Paystack
    setTimeout(() => {
      initializePayment({
        onSuccess: (reference) => {
          // Send reference to our backend `POST /api/rides/:id/book` to finalize
          console.log('Payment complete! Reference:', reference);
          alert(`Successfully booked ride with ${ride.driverName}!`);
          setSelectedRide(null);
          // Redirect to dashboard or bookings page
        },
        onClose: () => {
          console.log('Payment modal closed');
          setSelectedRide(null);
        }
      });
    }, 100);
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
        
        {results.length === 0 && !isSearching && (
          <div className="bg-white p-12 rounded-lg border border-border-color text-center flex flex-col items-center">
            <Map size={48} className="text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-main">No rides found yet</h3>
            <p className="text-muted">Enter your route details to see available rides nearby.</p>
          </div>
        )}

        {results.map((ride) => (
          <Card key={ride.id} className="hover:border-primary transition-colors">
            <div className="p-6 flex flex-col md:flex-row justify-between gap-md">
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-main">{ride.driverName}</h3>
                  <div className="text-xl font-bold text-primary">₦{ride.price.toLocaleString()}</div>
                </div>
                
                <p className="text-muted text-sm mb-4">{ride.vehicle}</p>
                
                <div className="flex gap-4 text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-md">
                  <div className="flex items-center gap-2">
                    <Clock size={16} className="text-secondary" />
                    Departs at {ride.departureTime}
                  </div>
                      <div className="flex items-center gap-2 border-l pl-4 border-gray-300">
                        {/* Seat selector */}
                        <label className="text-sm font-medium text-gray-600" htmlFor={`seats-${ride.id}`}>Seats:</label>
                        <input
                          id={`seats-${ride.id}`}
                          type="number"
                          min={1}
                          max={ride.seatsAvailable}
                          value={selectedSeatsMap[ride.id] || 1}
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
              
              <div className="flex items-center justify-end md:w-48 mt-4 md:mt-0">
                <Button 
                  fullWidth 
                  onClick={() => handleBookClick(ride)}
                  leftIcon={<CreditCard size={18} />}
                >
                  Book & Pay
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Local minimal User icon for the stats line since I didn't import it at the top
const User = ({ size, className }: { size: number, className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
