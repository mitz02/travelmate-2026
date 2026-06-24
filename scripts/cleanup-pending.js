const { Pool } = require('pg');
const p = new Pool({database:'travelmate',user:'postgres',password:'postgres'});
(async () => {
  // Clean up pending booking from failed test, restore seat
  const booking = await p.query("SELECT id, ride_id, seats FROM bookings WHERE status = 'pending' AND rider_id = (SELECT user_id FROM profiles WHERE email = 'rider@travelmate.com')");
  for (const b of booking.rows) {
    await p.query("UPDATE rides SET available_seats = available_seats + $1 WHERE id = $2", [b.seats, b.ride_id]);
    await p.query("DELETE FROM bookings WHERE id = $1", [b.id]);
    console.log("Cleaned up booking", b.id, "restored", b.seats, "seats");
  }
  const ride = await p.query('SELECT id, \"from\", available_seats FROM rides WHERE id = $1', ['9d9157b8-5fc2-4b7d-a791-be7d97636f0f']);
  console.log("Ride now has", ride.rows[0]?.available_seats, "seats");
  await p.end();
})();
