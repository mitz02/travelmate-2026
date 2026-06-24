import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function probe() {
  // Check profiles columns via raw SQL
  const { data: profCols, error: pe } = await supabase.rpc('exec_raw_sql', {
    query: `SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles'`,
  });
  if (pe) {
    // Try reading from profiles directly
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
      console.log('profiles error:', error.message);
      // Try to get the table info via the API
      try {
        // @ts-ignore
        const r = await supabase.from('profiles').select('COUNT').limit(0);
        console.log('Response:', JSON.stringify(r));
      } catch (e) {
        console.log('Fallback error:', e);
      }
    } else {
      console.log('profiles has rows:', data?.length ?? 0);
      if (data && data.length > 0) {
        console.log('profiles columns:', Object.keys(data[0]).join(', '));
        console.log('profile row:', JSON.stringify(data[0], null, 2));
      }
    }
  } else {
    console.log('profiles columns:', profCols);
  }

  // Check wallets FK info
  const { data: wf, error: we } = await supabase.rpc('exec_raw_sql', {
    query: `
      SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_name = 'wallets'
    `,
  });
  if (we) console.log('wallet FK error:', we.message);
  else console.log('wallet FK:', JSON.stringify(wf));
}
probe();
