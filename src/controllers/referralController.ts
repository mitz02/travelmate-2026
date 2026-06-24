import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../services/supabase';
import { queryOne } from '../config/database';

// Helper to generate a unique referral code
const generateReferralCode = (name: string) => {
  const prefix = (name || 'USR').substring(0, 3).toUpperCase();
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `TMR${prefix}${randomChars}`;
};

export const getReferrals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    // Get user profile for their code
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, referral_code')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Ensure they have a referral code
    let referralCode = profile.referral_code;
    if (!referralCode) {
      referralCode = generateReferralCode(profile.first_name || 'USR');
      await supabase.from('profiles').update({ referral_code: referralCode }).eq('id', userId);
    }

    // Fetch referrals made by this user
    const { data: referrals, error: refError } = await supabase
      .from('referrals')
      .select('id, status, reward_amount, created_at, referee:referee_id(first_name, last_name)')
      .eq('referrer_id', userId)
      .order('created_at', { ascending: false });

    if (refError) {
      console.error('Fetch referrals error:', refError);
      return res.status(500).json({ error: 'Failed to fetch referrals' });
    }

    let totalEarned = 0;
    const formattedReferrals = (referrals || []).map((r: Record<string, unknown>) => {
      if (r.status === 'completed') {
        totalEarned += Number(r.reward_amount) || 0;
      }
      const referee = Array.isArray(r.referee) ? (r.referee as Record<string, unknown>[])[0] : r.referee as Record<string, unknown>;
      return {
        id: r.id,
        status: r.status,
        reward_amount: r.reward_amount,
        created_at: r.created_at,
        refereeName: referee ? `${referee.first_name} ${referee.last_name}` : 'Unknown User',
      };
    });

    return res.json({
      referralCode,
      totalReferrals: formattedReferrals.length,
      totalEarned,
      referrals: formattedReferrals,
    });
  } catch (err) {
    console.error('Get referrals error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const applyReferral = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const refereeId = req.userId;
    if (!refereeId) return res.status(401).json({ error: 'Unauthorized' });

    // 1. Find referrer by their code
    const { data: referrer, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', code)
      .single();

    if (findError || !referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    if (referrer.id === refereeId) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    // 2. Insert referral record (unique constraint on referee_id prevents double use)
    const { error: insertError } = await supabase.from('referrals').insert([{
      referrer_id: referrer.id,
      referee_id: refereeId,
      status: 'pending',
      reward_amount: 2000,
    }]);

    if (insertError) {
      if (insertError.code === '23505') {
        return res.status(400).json({ error: 'You have already used a referral code' });
      }
      console.error('Insert referral error:', insertError);
      return res.status(500).json({ error: 'Failed to apply referral code' });
    }

    // 3. Award N1,000 welcome bonus to referee
    const wallet = await queryOne<{ balance: number }>('SELECT balance FROM wallets WHERE user_id = $1', [refereeId]);
    if (wallet) {
      await supabase.from('wallets').update({ balance: wallet.balance + 1000 }).eq('user_id', refereeId);
      await supabase.from('transactions').insert([{
        user_id: refereeId,
        type: 'bonus',
        amount: 1000,
        status: 'completed',
        description: 'Referral welcome bonus',
      }]);
    }

    return res.json({ message: 'Referral code applied successfully. You received a ₦1,000 bonus!' });
  } catch (err) {
    console.error('Apply referral error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
