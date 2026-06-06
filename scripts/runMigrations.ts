import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load .env before anything else
dotenvConfig({ path: resolve(process.cwd(), '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const DATABASE_URL = process.env.DATABASE_URL;
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!SUPABASE_URL) {
  console.error('❌ SUPABASE_URL missing in .env');
  process.exit(1);
}

const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];

const SCHEMA_FILE = 'sql/00_schema.sql';

async function main() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TravelMate — Database Migration Runner');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Project: ${projectRef}`);
  console.log('');

  if (!DATABASE_URL && !DB_PASSWORD) {
    console.log('⚠️  No DATABASE_URL or DB_PASSWORD found in .env');
    console.log('');
    console.log('   To run the schema automatically, add one of these to your .env:');
    console.log('');
    console.log('   Option A — Full connection string (from Supabase Dashboard → Settings → Database):');
    console.log('     DATABASE_URL=postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres');
    console.log('');
    console.log('   Option B — Just the DB password:');
    console.log(`     DB_PASSWORD=your-database-password`);
    console.log('');
    console.log('   ─── OR ─── run the schema manually:');
    console.log('');
    console.log(`   👉 Go to: https://supabase.com/dashboard/project/${projectRef}/sql/new`);
    console.log(`      Copy & paste the contents of: ${resolve(process.cwd(), SCHEMA_FILE)}`);
    console.log('      Click "Run"');
    console.log('');
    console.log('   Then run: npx tsx scripts/seedUsers.ts');
    console.log('');
    process.exit(0);
  }

  // Dynamically import pg
  let pg: any;
  try {
    pg = await import('pg');
  } catch {
    console.error('❌ "pg" package not found. Run: npm install pg');
    process.exit(1);
  }

  const { Client } = pg;

  let connectionString = DATABASE_URL;
  if (!connectionString && DB_PASSWORD) {
    connectionString = `postgresql://postgres.${projectRef}:${DB_PASSWORD}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
    console.log('  Built connection string from DB_PASSWORD');
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    console.log('✅ Connected to Postgres!');
    console.log('');

    const filePath = resolve(process.cwd(), SCHEMA_FILE);
    let sql: string;
    try {
      sql = readFileSync(filePath, 'utf-8');
    } catch {
      console.error(`❌ Could not read: ${filePath}`);
      process.exit(1);
    }

    console.log(`📄 Running: ${SCHEMA_FILE} ...`);
    await client.query(sql);
    console.log('✅ Schema created successfully!');
    console.log('');
    console.log('🎉 All done! Next: npx tsx scripts/seedUsers.ts');

  } catch (err: any) {
    console.error(`❌ Migration failed: ${err.message}`);
    console.log('');
    console.log(`   Try running the schema manually at:`);
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  } finally {
    await client.end();
  }

  console.log('');
}

main();
