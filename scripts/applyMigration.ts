import 'dotenv/config';
import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

async function main() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const PROJECT_REF = supabaseUrl.match(/https:\/\/(.+?)\.supabase\.co/)![1];
  const password = process.argv[2] || process.env.SUPABASE_DB_PASSWORD || '';
  if (!password) {
    console.error('Usage: npx tsx scripts/applyMigration.ts <password>');
    process.exit(1);
  }

  console.log(`Project ref: ${PROJECT_REF}`);

  const regions = [
    'us-west-1', 'us-east-1', 'us-east-2',
    'eu-west-1', 'eu-west-2', 'eu-west-3',
    'eu-central-1', 'eu-central-2',
    'ap-southeast-1', 'ap-southeast-2',
    'ap-northeast-1', 'ap-northeast-2',
    'ap-south-1', 'sa-east-1', 'ca-central-1',
  ];

  const configs: { host: string; port: number; user: string }[] = [];
  for (const region of regions) {
    configs.push({ host: `aws-0-${region}.pooler.supabase.com`, port: 5432, user: `postgres.${PROJECT_REF}` });
    configs.push({ host: `aws-0-${region}.pooler.supabase.com`, port: 6543, user: `postgres.${PROJECT_REF}` });
  }
  // Also try without region prefix
  configs.push({ host: `pooler.supabase.com`, port: 5432, user: `postgres.${PROJECT_REF}` });

  // Try direct too
  configs.push({ host: `db.${PROJECT_REF}.supabase.co`, port: 5432, user: 'postgres' });

  let pool: pg.Pool | null = null;

  for (const cfg of configs) {
    try {
      const testPool = new Pool({
        host: cfg.host,
        port: cfg.port,
        database: 'postgres',
        user: cfg.user,
        password,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 6000,
      });
      const client = await testPool.connect();
      const res = await client.query('SELECT version()');
      console.log(`✅ ${cfg.host}:${cfg.port} as ${cfg.user}`);
      console.log(`   ${res.rows[0].version.substring(0, 60)}`);
      client.release();
      pool = testPool;
      break;
    } catch {
      // silent
    }
  }

  if (!pool) {
    console.error('\nAll connection attempts failed.');
    console.error('Try enabling IPv4 in Supabase Dashboard > Project Settings > Database.');
    process.exit(1);
  }

  const sql = readFileSync(
    new URL('../supabase/migrations/fix_schema_mismatch.sql', import.meta.url),
    'utf-8',
  );

  // Split on ';' at end of line
  const raw = sql.split(/;\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('--'));

  // Rejoin DO blocks
  const blocks: string[] = [];
  let buf = '';
  for (const line of raw) {
    if (line === '$$') {
      buf += ';' + line;
      blocks.push(buf.replace(/^;/, ''));
      buf = '';
    } else if (buf) {
      buf += ' ' + line;
    } else if (line.endsWith('$$')) {
      blocks.push(line);
    } else {
      blocks.push(line);
    }
  }
  if (buf) blocks.push(buf);

  console.log(`\nExecuting ${blocks.length} statements...`);
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < blocks.length; i++) {
    const stmt = blocks[i].replace(/;\s*$/, '') + ';';
    const preview = stmt.substring(0, 100).replace(/\n/g, ' ');
    try {
      await pool.query(stmt);
      ok++;
      process.stdout.write('.');
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('duplicate') ||
          msg.includes('does not exist') || msg.includes('not exist') ||
          msg.includes('cannot be deleted') || msg.includes('depends on') ||
          msg.includes('not unique') || msg.includes('not found') ||
          msg.includes('cannot drop')) {
        ok++;
        process.stdout.write('.');
      } else {
        fail++;
        console.log(`\n❌ [${i + 1}] ${msg.substring(0, 250)}`);
        console.log(`   SQL: ${preview}`);
      }
    }
  }

  console.log(`\nDone: ${ok} ok, ${fail} failed`);
  await pool.end();
}

main().catch(console.error);
