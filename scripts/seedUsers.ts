import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env FIRST — before any other imports
config({ path: resolve(process.cwd(), '.env') });

// Now create a standalone Supabase client (don't import from src/ to avoid module init issues)
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface SeedUser {
  email: string;
  plainPassword: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: 'rider' | 'driver' | 'admin';
  kyc: string;
  isAdmin: boolean;
}

const usersToSeed: SeedUser[] = [
  {
    email: 'admin@travelmate.com',
    plainPassword: 'AdminPassword123!',
    phone: '+2348000000001',
    firstName: 'System',
    lastName: 'Admin',
    role: 'admin',
    kyc: 'approved',
    isAdmin: true,
  },
  {
    email: 'rider@travelmate.com',
    plainPassword: 'RiderPassword123!',
    phone: '+2348000000002',
    firstName: 'Test',
    lastName: 'Rider',
    role: 'rider',
    kyc: 'approved',
    isAdmin: false,
  },
  {
    email: 'driver@travelmate.com',
    plainPassword: 'DriverPassword123!',
    phone: '+2348000000003',
    firstName: 'Test',
    lastName: 'Driver',
    role: 'driver',
    kyc: 'approved',
    isAdmin: false,
  },
];

async function seedUsers() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  TravelMate — Seed Users');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log('');

  for (const u of usersToSeed) {
    try {
      // Check if already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', u.email)
        .maybeSingle();

      if (existingUser) {
        console.log(`⏭️  ${u.email} already exists — skipping`);
        continue;
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(u.plainPassword, salt);

      // Insert profile
      const { data: newUser, error } = await supabase
        .from('profiles')
        .insert({
          email: u.email,
          password_hash: passwordHash,
          phone: u.phone,
          first_name: u.firstName,
          last_name: u.lastName,
          role: u.role,
          is_admin: u.isAdmin,
          kyc_status: u.kyc,
          phone_verified: true,
          email_verified: true,
          account_status: 'active',
          address: {},
          preferences: {},
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Failed to create ${u.email}:`, error.message);
        continue;
      }

      // Create wallet for the user
      const { error: walletError } = await supabase
        .from('wallets')
        .insert({
          user_id: newUser.id,
          balance: 0,
          total_earnings: 0,
          total_withdrawn: 0,
          held_amount: 0,
        });

      if (walletError) {
        console.error(`⚠️  User ${u.email} created but wallet failed:`, walletError.message);
      }

      console.log(`✅ Created ${u.role}: ${u.email}`);

    } catch (error) {
      console.error(`❌ Error processing ${u.email}:`, error);
    }
  }

  console.log('');
  console.log('───────────────────────────────────────────────');
  console.log('  Login Credentials:');
  console.log('───────────────────────────────────────────────');
  for (const u of usersToSeed) {
    console.log(`  ${u.role.toUpperCase().padEnd(8)} │ ${u.email} │ ${u.plainPassword}`);
  }
  console.log('───────────────────────────────────────────────');
  console.log('');
}

seedUsers();
