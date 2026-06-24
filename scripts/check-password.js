const { Pool } = require('pg');
const p = new Pool({database:'travelmate',user:'postgres',password:'postgres'});
(async () => {
  // Check auth.users for rider@travelmate.com
  const r1 = await p.query("SELECT id, email, encrypted_password, raw_user_meta_data FROM auth.users WHERE email = 'rider@travelmate.com'");
  console.log("Auth user:", JSON.stringify(r1.rows.map(r => ({ id: r.id, email: r.email, pw: r.encrypted_password?.slice(0,30), meta: r.raw_user_meta_data })), null, 2));
  
  // Also check if there's an app-level users table
  const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'profiles')");
  console.log("Tables:", tables.rows.map(r => r.table_name));
  
  // Check profiles for the rider
  const r2 = await p.query("SELECT * FROM profiles WHERE email = 'rider@travelmate.com'");
  console.log("Profile:", JSON.stringify(r2.rows, null, 2));
  
  // Check if there's a password somewhere
  const r3 = await p.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'");
  console.log("Profile columns:", r3.rows.map(r => r.column_name));
  
  await p.end();
})();
