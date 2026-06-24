import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

import bcrypt from 'bcryptjs';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface SeedUser {
  email: string;
  plainPassword: string;
  phone: string;
  fullName: string;
  role: 'rider' | 'driver' | 'admin';
  kyc: string;
  isAdmin: boolean;
}

const usersToSeed: SeedUser[] = [
  {
    email: 'admin@travelmate.com',
    plainPassword: 'AdminPassword123!',
    phone: '+2348000000001',
    fullName: 'System Admin',
    role: 'admin',
    kyc: 'verified',
    isAdmin: true,
  },
  {
    email: 'rider@travelmate.com',
    plainPassword: 'RiderPassword123!',
    phone: '+2348000000002',
    fullName: 'Test Rider',
    role: 'rider',
    kyc: 'verified',
    isAdmin: false,
  },
  {
    email: 'driver@travelmate.com',
    plainPassword: 'DriverPassword123!',
    phone: '+2348000000003',
    fullName: 'Test Driver',
    role: 'driver',
    kyc: 'verified',
    isAdmin: false,
  },
];

async function ensureProfile(userId: string, email: string, fullName: string, phone: string, role: string, passwordHash?: string) {
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, role, password_hash: passwordHash, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    return existing;
  }

  const { data: inserted, error } = await supabase
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        email,
        password_hash: passwordHash,
        full_name: fullName,
        phone,
        role,
        kyc_status: 'verified',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single();

  if (error) {
    console.error(`  ⚠️  Profile insert failed: ${error.message}`);
    return null;
  }
  return inserted;
}

async function ensureWallet(userId: string) {
  const { data: existing } = await supabase
    .from('wallets')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return existing;

  const { error } = await supabase.from('wallets').insert({
    user_id: userId,
    balance: 0,
    total_earnings: 0,
    total_withdrawn: 0,
    held_amount: 0,
  });

  if (error) {
    console.error(`  ⚠️  Wallet creation failed: ${error.message}`);
  }
}

async function seedUsers() {
  console.log('');
  console.log('═══════════════════════════════════════════════');
  console.log('  TravelMate — Seed Users');
  console.log('═══════════════════════════════════════════════');
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log('');

  // Fetch existing auth users to check for duplicates
  let existingAuthUsers: Map<string, string> = new Map();
  let page = 0;
  let hasMore = true;
  while (hasMore) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: page + 1,
      perPage: 1000,
    });
    if (error) {
      console.error('❌ Failed to list auth users:', error.message);
      process.exit(1);
    }
    for (const u of data.users) {
      if (u.email) existingAuthUsers.set(u.email, u.id);
    }
    hasMore = data.users.length === 1000;
    page++;
  }

  for (const u of usersToSeed) {
    try {
      let userId = existingAuthUsers.get(u.email);

      if (userId) {
        console.log(`👤 ${u.email} already exists in auth.users — updating profile...`);
      } else {
        console.log(`📝 Creating ${u.email} in auth.users...`);
        const { data, error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.plainPassword,
          email_confirm: true,
          phone_confirm: true,
          user_metadata: { full_name: u.fullName, role: u.role, phone: u.phone },
        });

        if (error) {
          console.error(`❌ Failed to create ${u.email}: ${error.message}`);
          continue;
        }
        userId = data.user.id;
        existingAuthUsers.set(u.email, userId);
      }

      const passwordHash = await bcrypt.hash(u.plainPassword, 10);
      const profile = await ensureProfile(userId, u.email, u.fullName, u.phone, u.role, passwordHash);
      if (profile) {
        console.log(`  ✅ Profile synced (id: ${profile.id})`);
      }

      await ensureWallet(userId);

      const createdOrUpdated = existingAuthUsers.get(u.email) === userId && !existingAuthUsers.has(u.email) ? 'Created' : 'Updated';
      console.log(`✅ ${createdOrUpdated} ${u.role}: ${u.email}`);

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
