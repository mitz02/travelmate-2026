import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fundAllWallets() {
  const AMOUNT = 10000;

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email');

  if (usersError) {
    console.error('Failed to fetch users:', usersError.message);
    return;
  }

  console.log(`Found ${users.length} users. Funding each with ₦${AMOUNT.toLocaleString()}...\n`);

  for (const user of users) {
    // Check if wallet exists
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', user.id)
      .single();

    if (wallet) {
      // Update existing wallet
      const newBalance = wallet.balance + AMOUNT;
      const { error } = await supabase
        .from('wallets')
        .update({ balance: newBalance })
        .eq('id', wallet.id);

      if (error) {
        console.error(`  ✗ ${user.first_name} ${user.last_name} (${user.email}) - ERROR: ${error.message}`);
      } else {
        console.log(`  ✓ ${user.first_name} ${user.last_name} (${user.email}) — ₦${wallet.balance} → ₦${newBalance}`);
      }
    } else {
      // Create new wallet
      const { error } = await supabase
        .from('wallets')
        .insert([{ user_id: user.id, balance: AMOUNT }]);

      if (error) {
        console.error(`  ✗ ${user.first_name} ${user.last_name} (${user.email}) - ERROR: ${error.message}`);
      } else {
        console.log(`  ✓ ${user.first_name} ${user.last_name} (${user.email}) — NEW wallet ₦${AMOUNT}`);
      }
    }
  }

  console.log('\n✅ Done! All wallets funded.');
}

fundAllWallets();
