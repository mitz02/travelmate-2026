import express, { Router, Response } from 'express';
import Joi from 'joi';
import { supabase } from '../services/supabase';
import { AuthRequest } from '../middleware/auth';

const router: Router = express.Router();

const createRideSchema = Joi.object({
  from: Joi.string().required(),
  to: Joi.string().required(),
  fromLat: Joi.number().required(),
  fromLng: Joi.number().required(),
  toLat: Joi.number().required(),
  toLng: Joi.number().required(),
  departureTime: Joi.string().required(),
  pricePerSeat: Joi.number().positive().required(),
  availableSeats: Joi.number().positive().integer().required(),
  totalSeats: Joi.number().positive().integer().required(),
  description: Joi.string().optional().allow(''),
  // Vehicle info
  vehicleMake: Joi.string().optional().allow(''),
  vehicleModel: Joi.string().optional().allow(''),
  vehicleColor: Joi.string().optional().allow(''),
  // Amenities
  amenities: Joi.object({
    ac: Joi.boolean().default(false),
    music: Joi.boolean().default(false),
    petAllowed: Joi.boolean().default(false),
  }).optional().default({}),
});

router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const { error: validationError, value } = createRideSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });
    const { data: user } = await supabase.from('profiles').select('role').eq('id', req.userId).single();
    if (user?.role !== 'driver') return res.status(403).json({ error: 'Only drivers can create rides' });
    const { data: ride, error } = await supabase
      .from('rides')
      .insert([{
        driver_id: req.userId,
        from: value.from,
        to: value.to,
        from_lat: value.fromLat,
        from_lng: value.fromLng,
        to_lat: value.toLat,
        to_lng: value.toLng,
        departure_time: value.departureTime,
        status: 'open',
        price_per_seat: value.pricePerSeat,
        available_seats: value.availableSeats,
        total_seats: value.totalSeats,
        description: value.description,
        vehicle_make: value.vehicleMake || null,
        vehicle_model: value.vehicleModel || null,
        vehicle_color: value.vehicleColor || null,
        amenities: value.amenities || {},
      }])
      .select()
      .single();
    if (error) return res.status(500).json({ error: 'Failed to create ride' });
    return res.status(201).json({
      id: ride.id,
      from: ride.from,
      to: ride.to,
      departureTime: ride.departure_time,
      pricePerSeat: ride.price_per_seat,
      availableSeats: ride.available_seats,
      totalSeats: ride.total_seats,
      status: ride.status,
    });
  } catch (err) {
    console.error('Create ride error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const updateRideSchema = Joi.object({
  departureTime: Joi.string().required(),
  pricePerSeat: Joi.number().positive().required(),
  availableSeats: Joi.number().positive().integer().required(),
  totalSeats: Joi.number().positive().integer().required(),
  description: Joi.string().allow('').optional(),
});

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = updateRideSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    // Verify ownership
    const { data: ride, error: rideError } = await supabase.from('rides').select('driver_id, status').eq('id', id).single();
    if (rideError || !ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver_id !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
    if (ride.status !== 'open') return res.status(400).json({ error: 'Only open rides can be edited' });

    // Update the ride
    const { data: updatedRide, error } = await supabase
      .from('rides')
      .update({
        departure_time: value.departureTime,
        price_per_seat: value.pricePerSeat,
        available_seats: value.availableSeats,
        total_seats: value.totalSeats,
        description: value.description,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update ride' });

    return res.json({
      id: updatedRide.id,
      departureTime: updatedRide.departure_time,
      pricePerSeat: updatedRide.price_per_seat,
      availableSeats: updatedRide.available_seats,
      totalSeats: updatedRide.total_seats,
    });
  } catch (err) {
    console.error('Update ride error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/popular', async (_req: AuthRequest, res: Response) => {
  try {
    const { data: rides, error } = await supabase
      .from('rides')
      .select('from, to, price_per_seat, available_seats')
      .eq('status', 'open')
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true })
      .limit(100);

    if (error) return res.status(500).json({ error: 'Failed to fetch popular routes' });

    // Group by route in memory
    const routeMap: Record<string, { from: string, to: string, minPrice: number, totalSeats: number }> = {};
    
    (rides || []).forEach(r => {
      const key = `${r.from} -> ${r.to}`;
      if (!routeMap[key]) {
        routeMap[key] = { from: r.from, to: r.to, minPrice: r.price_per_seat, totalSeats: 0 };
      }
      routeMap[key].totalSeats += r.available_seats;
      if (r.price_per_seat < routeMap[key].minPrice) {
        routeMap[key].minPrice = r.price_per_seat;
      }
    });

    const popularRoutes = Object.values(routeMap)
      .sort((a, b) => b.totalSeats - a.totalSeats)
      .slice(0, 4);

    return res.json({ popularRoutes });
  } catch (err) {
    console.error('Popular routes error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/search', async (req: AuthRequest, res: Response) => {
  try {
    const { 
      from, to, date, limit = 50,
      pickupLat, pickupLng, pickupRadius = 10,
      dropoffLat, dropoffLng, dropoffRadius = 10 
    } = req.query;

    const limitCount = parseInt(limit as string) || 50;

    // 1. If coordinates are provided, use the Geospatial Search RPC
    if (pickupLat && pickupLng) {
      const { data: rides, error } = await supabase.rpc('search_nearby_rides', {
        pickup_lat: Number(pickupLat),
        pickup_lng: Number(pickupLng),
        pickup_radius_km: Number(pickupRadius),
        dropoff_lat: dropoffLat ? Number(dropoffLat) : null,
        dropoff_lng: dropoffLng ? Number(dropoffLng) : null,
        dropoff_radius_km: dropoffRadius ? Number(dropoffRadius) : null,
        limit_count: limitCount
      });

      if (error) {
        console.error('RPC Error:', error);
        return res.status(500).json({ error: 'Failed to search nearby rides' });
      }

      // Since the RPC doesn't automatically join the driver profile, we need to fetch them
      const driverIds = Array.from(new Set((rides || []).map((r: any) => r.driver_id)));
      let driversMap: Record<string, any> = {};
      
      if (driverIds.length > 0) {
        const { data: drivers } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, profile_picture')
          .in('id', driverIds);
        
        drivers?.forEach(d => {
          driversMap[d.id] = d;
        });
      }

      return res.json({
        rides: (rides || []).map((r: any) => ({
          id: r.id,
          from: r.from,
          to: r.to,
          departureTime: r.departure_time,
          pricePerSeat: r.price_per_seat,
          availableSeats: r.available_seats,
          totalSeats: r.total_seats,
          driverId: r.driver_id,
          driver: driversMap[r.driver_id],
          description: r.description,
          pickupDistanceKm: r.pickup_distance_km,
          dropoffDistanceKm: r.dropoff_distance_km,
        })),
      });
    }

    // 2. Fallback: Basic text search
    let query = supabase
      .from('rides')
      .select('*, driver:driver_id(first_name, last_name, profile_picture)')
      .eq('status', 'open');
      
    if (from) query = query.ilike('from', `%${from}%`);
    if (to) query = query.ilike('to', `%${to}%`);
    if (date) {
      const start = new Date(date as string).toISOString();
      const end = new Date(new Date(date as string).getTime() + 86400000).toISOString();
      query = query.gte('departure_time', start).lte('departure_time', end);
    }
    
    const { data: rides, error } = await query
      .gt('available_seats', 0)
      .order('departure_time', { ascending: true })
      .limit(limitCount);
      
    if (error) return res.status(500).json({ error: 'Failed to search rides' });
    
    return res.json({
      rides: (rides || []).map((r: any) => ({
        id: r.id,
        from: r.from,
        to: r.to,
        departureTime: r.departure_time,
        pricePerSeat: r.price_per_seat,
        availableSeats: r.available_seats,
        totalSeats: r.total_seats,
        driverId: r.driver_id,
        driver: r.driver,
        description: r.description,
        fromLat: r.from_lat,
        fromLng: r.from_lng,
        toLat: r.to_lat,
        toLng: r.to_lng,
      })),
    });
  } catch (err) {
    console.error('Search rides error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
router.get('/driver', async (req: AuthRequest, res: Response) => {
  try {
    const { data: rides, error } = await supabase
      .from('rides')
      .select('*')
      .eq('driver_id', req.userId)
      .order('departure_time', { ascending: false });
    
    if (error) return res.status(500).json({ error: 'Failed to fetch your rides' });
    
    return res.json({ rides: rides || [] });
  } catch (err) {
    console.error('Fetch driver rides error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { data: ride, error } = await supabase
      .from('rides')
      .select('*, driver:driver_id(first_name, last_name, profile_picture, ratings)')
      .eq('id', id)
      .single();
    if (error || !ride) return res.status(404).json({ error: 'Ride not found' });
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('ride_id', id)
      .eq('status', 'confirmed');
    return res.json({
      id: ride.id,
      from: ride.from,
      to: ride.to,
      fromLocation: { lat: ride.from_lat, lng: ride.from_lng },
      toLocation: { lat: ride.to_lat, lng: ride.to_lng },
      departureTime: ride.departure_time,
      pricePerSeat: ride.price_per_seat,
      availableSeats: ride.available_seats,
      totalSeats: ride.total_seats,
      bookedSeats: bookings?.length ?? 0,
      driver: ride.driver,
      description: ride.description,
      status: ride.status,
      vehicleMake: ride.vehicle_make || null,
      vehicleModel: ride.vehicle_model || null,
      vehicleColor: ride.vehicle_color || null,
      amenities: ride.amenities || {},
    });
  } catch (err) {
    console.error('Get ride error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/cancel', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const { data: ride, error: rideError } = await supabase.from('rides').select('driver_id, status').eq('id', id).single();
    if (rideError || !ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver_id !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
    await supabase.from('rides').update({ status: 'cancelled' }).eq('id', id);
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, rider_id, total_price')
      .eq('ride_id', id)
      .eq('status', 'confirmed');
    if (bookings?.length) {
      for (const b of bookings) {
        await supabase.from('transactions').insert([{
          user_id: b.rider_id,
          type: 'refund',
          amount: b.total_price,
          status: 'completed',
          description: `Refund for cancelled ride: ${reason ?? 'No reason provided'}`,
        }]);
        const { data: wallet } = await supabase.from('wallets').select('balance, held_amount').eq('user_id', b.rider_id).single();
        if (wallet) await supabase.from('wallets').update({ balance: wallet.balance + b.total_price, held_amount: wallet.held_amount - b.total_price }).eq('user_id', b.rider_id);
      }
    }
    return res.json({ message: 'Ride cancelled successfully', refundedCount: bookings?.length ?? 0 });
  } catch (err) {
    console.error('Cancel ride error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/complete', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { data: ride, error: rideError } = await supabase.from('rides').select('driver_id, status').eq('id', id).single();
    if (rideError || !ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.driver_id !== req.userId) return res.status(403).json({ error: 'Unauthorized' });
    if (ride.status !== 'open') return res.status(400).json({ error: 'Ride is not open' });

    await supabase.from('rides').update({ status: 'completed' }).eq('id', id);

    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, rider_id, total_price, escrow_id')
      .eq('ride_id', id)
      .eq('status', 'confirmed');

    if (bookings?.length) {
      let totalEarnings = 0;

      for (const b of bookings) {
        await supabase.from('bookings').update({ status: 'completed' }).eq('id', b.id);
        if (b.escrow_id) {
          await supabase.from('escrows').update({ status: 'released' }).eq('id', b.escrow_id);
        }

        const { data: riderWallet } = await supabase.from('wallets').select('held_amount').eq('user_id', b.rider_id).single();
        if (riderWallet) {
          await supabase.from('wallets').update({ held_amount: riderWallet.held_amount - b.total_price }).eq('user_id', b.rider_id);
        }
        
        totalEarnings += b.total_price;
      }

      const { data: driverWallet } = await supabase.from('wallets').select('balance, total_earnings').eq('user_id', req.userId).single();
      if (driverWallet) {
        await supabase.from('wallets').update({ 
          balance: driverWallet.balance + totalEarnings, 
          total_earnings: driverWallet.total_earnings + totalEarnings 
        }).eq('user_id', req.userId);
      }

      await supabase.from('transactions').insert([{
        user_id: req.userId,
        type: 'payout',
        amount: totalEarnings,
        status: 'completed',
        description: `Earnings for completed ride: ${id}`,
      }]);
    }

    return res.json({ message: 'Ride completed successfully', earnings: bookings?.reduce((acc, b) => acc + b.total_price, 0) ?? 0 });
  } catch (err) {
    console.error('Complete ride error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

const rateSchema = Joi.object({
  rating: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().allow('').optional(),
});

router.post('/:id/rate', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = rateSchema.validate(req.body);
    if (validationError) return res.status(400).json({ error: validationError.details[0].message });

    // 1. Verify the ride is completed
    const { data: ride, error: rideError } = await supabase.from('rides').select('driver_id, status').eq('id', id).single();
    if (rideError || !ride) return res.status(404).json({ error: 'Ride not found' });
    if (ride.status !== 'completed') return res.status(400).json({ error: 'You can only rate completed rides' });

    // 2. Verify the user was a confirmed rider
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id')
      .eq('ride_id', id)
      .eq('rider_id', req.userId)
      .eq('status', 'completed')
      .single();
    if (bookingError || !booking) return res.status(403).json({ error: 'You did not complete this ride as a passenger' });

    // 3. Prevent duplicate ratings
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('ride_id', id)
      .eq('reviewer_id', req.userId)
      .single();
      
    if (existingReview) return res.status(400).json({ error: 'You have already rated this driver for this ride' });

    // 4. Insert the rating (the DB trigger will automatically update the driver profile)
    const { error: insertError } = await supabase
      .from('reviews')
      .insert([{
        ride_id: id,
        reviewer_id: req.userId,
        reviewee_id: ride.driver_id,
        rating: value.rating,
        comment: value.comment
      }]);

    if (insertError) {
      console.error('Insert review error:', insertError);
      return res.status(500).json({ error: 'Failed to submit rating' });
    }

    return res.json({ message: 'Rating submitted successfully' });
  } catch (err) {
    console.error('Rate ride error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
