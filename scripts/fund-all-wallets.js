const { Pool } = require('pg');
const p = new Pool({database:'travelmate',user:'postgres',password:'postgres'});

(async () => {
  const { rows: users } = await p.query("SELECT w.user_id, w.balance, w.total_earnings, u.email FROM wallets w JOIN profiles u ON u.user_id = w.user_id ORDER BY u.email");
  console.log(`Found ${users.length} wallet owners`);
  for (const u of users) {
    await p.query(
      'UPDATE wallets SET balance = balance + 100000, total_earnings = COALESCE(total_earnings, 0) + 100000 WHERE user_id = $1',
      [u.user_id]
    );
    console.log(`  ${u.email}: ${u.balance || 0} → ${Number(u.balance || 0) + 100000}`);
  }

  // Also create wallets for any user without one
  const { rows: missing } = await p.query(
    "SELECT p.user_id, p.email FROM profiles p LEFT JOIN wallets w ON w.user_id = p.user_id WHERE w.user_id IS NULL AND p.user_id IS NOT NULL"
  );
  for (const u of missing) {
    await p.query(
      "INSERT INTO wallets (user_id, balance, total_earnings, status) VALUES ($1, 100000, 100000, 'active')",
      [u.user_id]
    );
    console.log(`  Created wallet for ${u.email}: 0 → 100000`);
  }

  console.log(`\nDone. ${users.length} updated, ${missing.length} created.`);
  await p.end();
})();
