const { Pool } = require('pg');
const p = new Pool({database:'travelmate',user:'postgres',password:'postgres'});
(async () => {
  // Check driver of the specific ride
  const driver = await p.query("SELECT user_id, email, first_name, last_name FROM profiles WHERE user_id = $1", ['602c04ce-1be4-417b-aa63-752aea44aaac']);
  console.log("DRIVER:", JSON.stringify(driver.rows, null, 2));
  
  const dWallet = await p.query("SELECT balance, total_earnings FROM wallets WHERE user_id = $1", ['602c04ce-1be4-417b-aa63-752aea44aaac']);
  console.log("DRIVER WALLET:", JSON.stringify(dWallet.rows, null, 2));
  
  // Check rider
  const rider = await p.query("SELECT user_id, email, first_name, last_name FROM profiles WHERE email = $1", ['rider@travelmate.com']);
  console.log("RIDER:", JSON.stringify(rider.rows, null, 2));
  
  const rWallet = await p.query("SELECT balance FROM wallets WHERE user_id = $1", [rider.rows[0]?.user_id]);
  console.log("RIDER WALLET:", JSON.stringify(rWallet.rows, null, 2));
  
  // Check existing bookings
  const bookings = await p.query("SELECT id, ride_id, rider_id, status, total_amount FROM bookings WHERE rider_id = $1", [rider.rows[0]?.user_id]);
  console.log("RIDER BOOKINGS:", JSON.stringify(bookings.rows, null, 2));
  
  await p.end();
})();
