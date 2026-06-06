import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { User } from 'lucide-react';
import api from '../services/api';

interface BookingInfo {
  id: string;
  rideId: string;
  seatsBooked: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  // ride details
  from: string;
  to: string;
  departureTime: string;
  availableSeats: number;
  driver: {
    first_name: string;
    last_name: string;
    profile_picture?: string;
    ratings?: number;
  };
}

export const RiderBookings: React.FC = () => {
  const [bookings, setBookings] = useState<BookingInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const res = await api.get('/bookings', { params: { role: 'rider' } });
        setBookings(res.data);
      } catch (err) {
        console.error('Failed to fetch rider bookings', err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-lg font-medium text-gray-600">Loading bookings...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6 text-primary">My Bookings</h1>
        {bookings.length === 0 ? (
          <p className="text-muted">You have no bookings yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {bookings.map((b) => (
              <Card key={b.id} className="hover:shadow-xl transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    {b.driver.profile_picture ? (
                      <img
                        src={b.driver.profile_picture}
                        alt="Driver"
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white font-bold">
                        {b.driver.first_name.charAt(0)}{b.driver.last_name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-lg">
                        {b.driver.first_name} {b.driver.last_name}
                      </CardTitle>
                      <p className="text-sm text-gray-500">{b.from} → {b.to}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="mb-2"><strong>Departure:</strong> {b.departureTime}</p>
                  <p className="mb-2"><strong>Seats Booked:</strong> {b.seatsBooked}</p>
                  <p className="mb-2 flex items-center">
                    <User size={16} className="text-primary mr-1" />
                    <strong>Remaining Seats:</strong> {b.availableSeats}
                  </p>
                  <p className="mb-2"><strong>Status:</strong> {b.status}</p>
                  <p className="mb-2"><strong>Total Paid:</strong> ₦{b.totalPrice.toLocaleString()}</p>
                  <Button variant="outline" size="sm" onClick={() => console.log('View details', b.id)}>
                    View Details
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};
