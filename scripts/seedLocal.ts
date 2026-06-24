import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env') });

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'travelmate',
});

const SALT_ROUNDS = 10;

interface SeedUser {
  email: string;
  plainPassword: string;
  phone: string;
  fullName: string;
  role: 'rider' | 'driver' | 'admin';
  isAdmin: boolean;
}

const usersToSeed: SeedUser[] = [
  {
    email: 'admin@travelmate.com',
    plainPassword: 'AdminPassword123!',
    phone: '+2348000000001',
    fullName: 'System Admin',
    role: 'admin',
    isAdmin: true,
  },
  {
    email: 'rider@travelmate.com',
    plainPassword: 'RiderPassword123!',
    phone: '+2348000000002',
    fullName: 'Test Rider',
    role: 'rider',
    isAdmin: false,
  },
  {
    email: 'driver@travelmate.com',
    plainPassword: 'DriverPassword123!',
    phone: '+2348000000003',
    fullName: 'Test Driver',
    role: 'driver',
    isAdmin: false,
  },
];

async function seedUsers() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  TravelMate — Local Seed Users');
  console.log('═══════════════════════════════════════════════');
  console.log('');

  for (const u of usersToSeed) {
    try {
      const existing = await pool.query('SELECT id FROM profiles WHERE email = $1', [u.email]);
      if (existing.rows.length > 0) {
        console.log(`👤 ${u.email} already exists — updating...`);
        const passwordHash = await bcrypt.hash(u.plainPassword, SALT_ROUNDS);
        await pool.query(
          `UPDATE profiles SET password_hash = $1, full_name = $2, phone = $3, role = $4, is_admin = $5, kyc_status = 'verified', updated_at = NOW() WHERE email = $6`,
          [passwordHash, u.fullName, u.phone, u.role, u.isAdmin, u.email]
        );
        console.log(`  ✅ Updated ${u.role}: ${u.email}`);
        continue;
      }

      const userId = crypto.randomUUID();
      const passwordHash = await bcrypt.hash(u.plainPassword, SALT_ROUNDS);
      const nameParts = u.fullName.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      await pool.query(
        `INSERT INTO profiles (id, user_id, email, password_hash, phone, full_name, first_name, last_name, role, is_admin, kyc_status, account_status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'verified', 'active')`,
        [userId, userId, u.email, passwordHash, u.phone, u.fullName, firstName, lastName, u.role, u.isAdmin]
      );

      // Create wallet
      await pool.query(
        `INSERT INTO wallets (user_id, balance, total_earnings, total_withdrawn, held_amount)
         VALUES ($1, 0, 0, 0, 0)`,
        [userId]
      );

      console.log(`  ✅ Created ${u.role}: ${u.email}`);
    } catch (e) {
      console.error(`❌ Error processing ${u.email}:`, e instanceof Error ? e.message : e);
    }
  }

  console.log('');
  console.log('───────────────────────────────────────────────');
  console.log('  Login Credentials:');
  console.log('───────────────────────────────────────────────');
  for (const u of usersToSeed) {
    console.log(`  ${u.role.toUpperCase().padEnd(8)} | ${u.email} | ${u.plainPassword}`);
  }
  console.log('───────────────────────────────────────────────');
  console.log('');

  await pool.end();
}

seedUsers();
