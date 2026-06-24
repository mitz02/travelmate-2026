const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'travelmate',
});

async function seedWallets() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: riders } = await client.query("SELECT user_id, email FROM profiles WHERE role = 'rider'");
    console.log(`Found ${riders.length} riders`);

    let created = 0, updated = 0, skipped = 0;
    for (const rider of riders) {
      if (!rider.user_id) { skipped++; continue; }
      const { rows: existing } = await client.query('SELECT balance FROM wallets WHERE user_id = $1', [rider.user_id]);
      if (existing.length === 0) {
        await client.query(
          "INSERT INTO wallets (user_id, balance, status) VALUES ($1, 5000, 'active')",
          [rider.user_id]
        );
        created++;
        console.log(`  Created wallet for ${rider.email} — ₦5,000`);
      } else if ((existing[0].balance || 0) < 1000) {
        await client.query(
          'UPDATE wallets SET balance = balance + 5000, status = COALESCE(status, $2) WHERE user_id = $1',
          [rider.user_id, 'active']
        );
        updated++;
        console.log(`  Topped up ${rider.email} — was ₦${existing[0].balance}, now ₦${existing[0].balance + 5000}`);
      } else {
        console.log(`  Skipped ${rider.email} — balance ₦${existing[0].balance} sufficient`);
      }
    }

    await client.query('COMMIT');
    console.log(`\nDone. ${created} created, ${updated} topped up, ${skipped} skipped (null user_id).`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seedWallets();
