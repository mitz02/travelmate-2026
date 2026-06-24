const { Pool } = require('pg');
const p = new Pool({database:'travelmate',user:'postgres',password:'postgres'});
(async () => {
  const r = await p.query("SELECT email, password_hash FROM profiles WHERE email = 'rider@travelmate.com'");
  console.log('Password hash:', r.rows[0]?.password_hash);
  
  const all = await p.query("SELECT email, password_hash FROM profiles WHERE password_hash IS NOT NULL");
  console.log('All users with passwords:', all.rows.map(r => r.email + ': ' + (r.password_hash?.slice(0,30) || 'null')));
  await p.end();
})();
