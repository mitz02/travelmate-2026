import { Response } from 'express';
import { supabaseAdmin } from '../config/supabase';
import { query, queryOne } from '../config/database';
import { AuthenticatedRequest } from '../types';
import type { CreateRideBody, UpdateRideBody, CancelRideBody } from '../validators/rides';

export async function createRide(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const profile = await queryOne<{ kyc_status: string }>(
      'SELECT kyc_status FROM profiles WHERE id = $1', [req.user.id]
    );
    if (!profile || profile.kyc_status !== 'verified') {
      res.status(403).json({ error: 'KYC verification required. Please complete your identity verification before creating rides.' });
      return;
    }
    const body = req.body as CreateRideBody;
    const { data: ride, error } = await supabaseAdmin
      .from('rides')
      .insert({
        driver_id: req.user.id,
        from: body.from,
        to: body.to,
        from_lat: body.fromLat ?? null,
        from_lng: body.fromLng ?? null,
        to_lat: body.toLat ?? null,
        to_lng: body.toLng ?? null,
        departure_time: body.departureTime,
        available_seats: body.availableSeats,
        total_seats: body.totalSeats,
        price_per_seat: body.pricePerSeat,
        description: body.description ?? null,
        vehicle_make: body.vehicleMake ?? null,
        vehicle_model: body.vehicleModel ?? null,
        vehicle_color: body.vehicleColor ?? null,
        amenities: { ac: body.ac ?? false, music: body.music ?? false, pets: body.pets ?? false, smoking: body.smoking ?? false },
        pickup_point: body.pickupPoints ?? null,
        dropoff_point: body.dropoffPoints ?? null,
        status: 'open',
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ ride });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRides(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { origin, destination, date, seats } = req.query;
    const params: any[] = ['open'];
    let sql = 'SELECT * FROM rides WHERE status = $1';
    if (origin) {
      sql += ' AND "from" ILIKE $' + (params.length + 1);
      params.push(String(origin));
    }
    if (destination) {
      sql += ' AND "to" ILIKE $' + (params.length + 1);
      params.push(String(destination));
    }
    if (date) {
      sql += ' AND departure_time >= $' + (params.length + 1) + ' AND departure_time < $' + (params.length + 2);
      params.push(String(date), String(date) + 'T23:59:59');
    }
    if (seats) {
      sql += ' AND available_seats >= $' + (params.length + 1);
      params.push(Number(seats));
    }
    sql += ' ORDER BY departure_time ASC';
    const rides = await query(sql, params);
    res.json({ rides: rides ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRideById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const rideId = req.params.rideId;
    const ride = await queryOne('SELECT * FROM rides WHERE id = $1', [rideId]);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }
    const [driver, vehicle] = await Promise.all([
      queryOne('SELECT * FROM profiles WHERE user_id = $1', [ride.driver_id]),
      queryOne('SELECT * FROM vehicles WHERE id = $1', [ride.vehicle_id]),
    ]);

    // Check if the current user already has an active (non-cancelled) booking on this ride
    let hasActiveBooking = false;
    if (req.user?.id) {
      const existing = await queryOne(
        `SELECT id FROM bookings WHERE ride_id = $1 AND rider_id = $2 AND status NOT IN ('cancelled')`,
        [rideId, req.user.id]
      );
      hasActiveBooking = !!existing;
    }

    res.json({
      ride,
      driver: driver ?? null,
      vehicle: vehicle ?? null,
      hasActiveBooking,
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function updateRide(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const rideId = req.params.rideId;
    const body = req.body as UpdateRideBody;

    const existing = await queryOne('SELECT amenities FROM rides WHERE id = $1 AND driver_id = $2', [rideId, req.user.id]);
    const currentAmenities = (existing?.amenities as Record<string, boolean>) || {};

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.from !== undefined) updates.from = body.from;
    if (body.to !== undefined) updates.to = body.to;
    if (body.fromLat !== undefined) updates.from_lat = body.fromLat;
    if (body.fromLng !== undefined) updates.from_lng = body.fromLng;
    if (body.toLat !== undefined) updates.to_lat = body.toLat;
    if (body.toLng !== undefined) updates.to_lng = body.toLng;
    if (body.departureTime !== undefined) updates.departure_time = body.departureTime;
    if (body.availableSeats !== undefined) updates.available_seats = body.availableSeats;
    if (body.totalSeats !== undefined) updates.total_seats = body.totalSeats;
    if (body.pricePerSeat !== undefined) updates.price_per_seat = body.pricePerSeat;
    if (body.description !== undefined) updates.description = body.description;
    if (body.vehicleMake !== undefined) updates.vehicle_make = body.vehicleMake;
    if (body.vehicleModel !== undefined) updates.vehicle_model = body.vehicleModel;
    if (body.vehicleColor !== undefined) updates.vehicle_color = body.vehicleColor;
    if (body.ac !== undefined || body.music !== undefined || body.pets !== undefined || body.smoking !== undefined) {
      updates.amenities = {
        ac: body.ac ?? currentAmenities.ac ?? false,
        music: body.music ?? currentAmenities.music ?? false,
        pets: body.pets ?? currentAmenities.pets ?? false,
        smoking: body.smoking ?? currentAmenities.smoking ?? false,
      };
    }
    if (body.pickupPoints !== undefined) updates.pickup_point = body.pickupPoints;
    if (body.dropoffPoints !== undefined) updates.dropoff_point = body.dropoffPoints;
    const { data: ride, error } = await supabaseAdmin
      .from('rides')
      .update(updates)
      .eq('id', rideId)
      .eq('driver_id', req.user.id)
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }
    res.json({ ride });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function cancelRide(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const rideId = req.params.rideId;
    const _body = req.body as CancelRideBody;
    const { error } = await supabaseAdmin
      .from('rides')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', rideId)
      .eq('driver_id', req.user.id);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getDriverRides(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const userId = req.params.userId === 'me' ? req.user.id : req.params.userId;
    if (req.user.id !== userId) {
      res.status(403).json({ error: 'Forbidden: You can only view your own rides' });
      return;
    }
    const { status, page } = req.query;
    const pageNum = Math.max(1, Number(page) || 1);
    const pageSize = 20;

    const countResult = await queryOne<{ count: string }>('SELECT COUNT(*)::int AS count FROM rides WHERE driver_id = $1', [userId]);
    const total = countResult ? Number(countResult.count) : 0;

    const params: any[] = [userId];
    let sql = 'SELECT * FROM rides WHERE driver_id = $1';
    if (status) {
      sql += ' AND status = $' + (params.length + 1);
      params.push(String(status));
    }
    sql += ' ORDER BY departure_time DESC OFFSET $' + (params.length + 1) + ' LIMIT $' + (params.length + 2);
    params.push((pageNum - 1) * pageSize, pageSize);
    const ridesData = await query(sql, params);
    if (ridesData.length > 0) {
      const rideIds = ridesData.map((r: any) => r.id);
      const bookings = await query('SELECT ride_id, seats, total_amount, status FROM bookings WHERE ride_id = ANY($1::uuid[])', [rideIds]);
        
      const bookingsByRide: Record<string, any[]> = {};
      for (const b of (bookings || [])) {
        if (!bookingsByRide[b.ride_id]) bookingsByRide[b.ride_id] = [];
        bookingsByRide[b.ride_id].push(b);
      }
      
      for (const ride of ridesData) {
        const rideBookings = bookingsByRide[ride.id] || [];
        const confirmedBookings = rideBookings.filter((b: any) => b.status === 'confirmed' || b.status === 'completed');
        const pendingBookings = rideBookings.filter((b: any) => b.status === 'pending');
        
        ride.stats = {
          bookedSeats: confirmedBookings.reduce((sum: number, b: any) => sum + (b.seats || 0), 0),
          totalSeats: ride.available_seats || 0,
          earnings: confirmedBookings.reduce((sum: number, b: any) => sum + (b.total_amount || 0), 0),
          pendingRequests: pendingBookings.length,
        };
      }
    }
    
    const totalPages = Math.ceil((total ?? 0) / pageSize);
    res.json({ rides: ridesData, page: pageNum, totalPages, total });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function searchRides(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { origin, dest, date, seats, maxPrice } = req.query;
    const params: any[] = ['open'];
    let sql = 'SELECT * FROM rides WHERE status = $1';
    if (origin) {
      sql += ' AND "from" ILIKE $' + (params.length + 1);
      params.push(String(origin));
    }
    if (dest) {
      sql += ' AND "to" ILIKE $' + (params.length + 1);
      params.push(String(dest));
    }
    if (date) {
      sql += ' AND departure_time >= $' + (params.length + 1) + ' AND departure_time < $' + (params.length + 2);
      params.push(String(date), String(date) + 'T23:59:59');
    }
    if (seats) {
      sql += ' AND available_seats >= $' + (params.length + 1);
      params.push(Number(seats));
    }
    if (maxPrice) {
      sql += ' AND price_per_seat <= $' + (params.length + 1);
      params.push(Number(maxPrice));
    }
    sql += ' ORDER BY departure_time ASC';
    const rides = await query(sql, params);
    res.json({ rides: rides ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function repostRide(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const rideId = req.params.rideId;
    const existing = await queryOne('SELECT * FROM rides WHERE id = $1 AND driver_id = $2', [rideId, req.user.id]);
    if (!existing) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }
    const { from, to, departure_time, available_seats, price_per_seat, vehicle_id, preferences } = existing;
    const { data: ride, error } = await supabaseAdmin
      .from('rides')
      .insert({
        driver_id: req.user.id,
        from,
        to,
        departure_time,
        available_seats,
        price_per_seat,
        vehicle_id,
        preferences: preferences ?? {},
        status: 'active',
      })
      .select()
      .single();
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(201).json({ ride });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function completeRide(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const rideId = req.params.rideId;
    const ride = await queryOne('SELECT * FROM rides WHERE id = $1', [rideId]);
    if (!ride) {
      res.status(404).json({ error: 'Ride not found' });
      return;
    }
    if (ride.driver_id !== req.user.id) {
      res.status(403).json({ error: 'Forbidden: Only the driver can complete this ride' });
      return;
    }

    // Fetch all confirmed/in_progress bookings for this ride
    const bookings = await query('SELECT * FROM bookings WHERE ride_id = $1 AND status = ANY($2::text[])', [rideId, ['confirmed', 'in_progress']]);

    let completedCount = 0;

    for (const booking of (bookings || [])) {
      await supabaseAdmin
        .from('bookings')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', booking.id);

      completedCount++;
    }

    const { error } = await supabaseAdmin
      .from('rides')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', rideId);
    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.json({
      success: true,
      completedBookings: completedCount,
      message: 'Bookings completed. Awaiting admin approval for payment release.',
    });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getRideBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const rideId = req.params.rideId;
    const bookings = await query(
      `SELECT b.*,
              p.first_name AS rider_first_name,
              p.last_name AS rider_last_name,
              p.phone AS rider_phone,
              p.profile_picture AS rider_avatar
       FROM bookings b
       LEFT JOIN profiles p ON p.user_id = b.rider_id
       WHERE b.ride_id = $1
       ORDER BY b.created_at DESC`,
      [rideId]
    );
    res.json({ bookings: bookings ?? [] });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function getPopularRoutes(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 10), 50);

    const rows = await query(
      `SELECT r.from AS origin, r.to AS destination,
              COUNT(*)::int AS trips,
              MIN(r.price_per_seat) AS "minPrice"
       FROM bookings b
       JOIN rides r ON r.id = b.ride_id
       WHERE b.status IN ($1, $2)
       GROUP BY r.from, r.to
       ORDER BY trips DESC
       LIMIT $3`,
      ['confirmed', 'completed', limit]
    );

    res.json({ popularRoutes: rows });
  } catch (e) {
    res.status(500).json({ error: 'Internal server error' });
  }
}
