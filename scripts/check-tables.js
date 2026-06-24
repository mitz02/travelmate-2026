const { Pool } = require('pg');
const p = new Pool({database:'travelmate',user:'postgres',password:'postgres'});
(async () => {
  // Check all tables in public schema
  const tables = await p.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log("All tables:", tables.rows.map(r => r.table_name));

  // Check if auth is using the profiles table directly
  const profileCols = await p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles'");
  console.log("Profile columns:", profileCols.rows.map(r => r.column_name + ' ' + r.data_type));

  await p.end();
})();
