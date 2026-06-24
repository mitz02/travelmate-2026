const { Pool } = require('pg');
const p = new Pool({database:'travelmate',user:'postgres',password:'postgres'});
(async () => {
  const r = await p.query("SELECT id, \"from\", \"to\", status, available_seats, price_per_seat, driver_id FROM rides WHERE id = $1", ['9d9157b8-5fc2-4b7d-a791-be7d97636f0f']);
  console.log(JSON.stringify(r.rows, null, 2));
  await p.end();
})();
