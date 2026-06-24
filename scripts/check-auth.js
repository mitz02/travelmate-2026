const { Pool } = require('pg');
const p = new Pool({database:'travelmate',user:'postgres',password:'postgres'});
(async () => {
  // Check which schemas have users tables
  const schemas = await p.query("SELECT table_schema, table_name FROM information_schema.tables WHERE table_name = 'users'");
  console.log("Users tables:", JSON.stringify(schemas.rows, null, 2));
  
  // Check auth schema
  const authUsers = await p.query("SELECT id, email FROM auth.users WHERE email = 'rider@travelmate.com'");
  console.log("Rider in auth.users:", JSON.stringify(authUsers.rows, null, 2));
  
  await p.end();
})();
