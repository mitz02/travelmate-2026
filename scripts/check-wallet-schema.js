const { Pool } = require('pg');
const p = new Pool({database:'travelmate',user:'postgres',password:'postgres'});

(async () => {
  const r = await p.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wallets'");
  console.table(r.rows);
  await p.end();
})();
