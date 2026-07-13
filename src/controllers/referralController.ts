import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { query, queryOne } from '../config/database';

const DEFAULT_REFERRER_REWARD = 500;
const DEFAULT_REFEREE_BONUS = 500;

async function getReferralRewards(): Promise<{ refereeBonus: number; referrerReward: number }> {
  try {
    const row = await queryOne<{ value: any }>(
      `SELECT value FROM app_settings WHERE key = 'referral_rewards'`
    );
    if (row?.value) {
      const raw = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
      return {
        refereeBonus: raw.refereeBonus ?? DEFAULT_REFEREE_BONUS,
        referrerReward: raw.referrerReward ?? DEFAULT_REFERRER_REWARD,
      };
    }
  } catch {}
  return { refereeBonus: DEFAULT_REFEREE_BONUS, referrerReward: DEFAULT_REFERRER_REWARD };
}

async function getOrGenerateReferralCode(userId: string): Promise<string> {
  const profile = await queryOne<{ first_name: string; referral_code: string }>(
    `SELECT first_name, referral_code FROM profiles WHERE user_id = $1`, [userId]
  );
  if (!profile) return '';
  if (profile.referral_code) return profile.referral_code;

  const prefix = (profile.first_name || 'USR').substring(0, 3).toUpperCase();
  const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
  const code = `TMR${prefix}${randomChars}`;
  await query(`UPDATE profiles SET referral_code = $1 WHERE user_id = $2`, [code, userId]);
  return code;
}

export const generateCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const referralCode = await getOrGenerateReferralCode(userId);
    if (!referralCode) return res.status(404).json({ error: 'User not found' });

    return res.json({ referralCode });
  } catch (err) {
    console.error('Generate referral code error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getReferrals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const referralCode = await getOrGenerateReferralCode(userId);
    if (!referralCode) return res.status(404).json({ error: 'User not found' });

    const referrals = await query(
      `SELECT r.id, r.status, r.reward_amount, r.created_at,
              p.first_name AS referee_first_name, p.last_name AS referee_last_name
       FROM referrals r
       LEFT JOIN profiles p ON p.user_id = r.referee_id
       WHERE r.referrer_id = $1
       ORDER BY r.created_at DESC`,
      [userId]
    );

    let totalEarned = 0;
    const formattedReferrals = (referrals || []).map((r: any) => {
      if (r.status === 'completed') {
        totalEarned += Number(r.reward_amount) || 0;
      }
      return {
        id: r.id,
        status: r.status,
        reward_amount: r.reward_amount,
        created_at: r.created_at,
        refereeName: r.referee_first_name && r.referee_last_name
          ? `${r.referee_first_name} ${r.referee_last_name}`
          : 'Unknown User',
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

    const { refereeBonus, referrerReward } = await getReferralRewards();

    const referrer = await queryOne<{ user_id: string }>(
      `SELECT user_id FROM profiles WHERE referral_code = $1`, [code]
    );
    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    if (referrer.user_id === refereeId) {
      return res.status(400).json({ error: 'You cannot use your own referral code' });
    }

    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM referrals WHERE referee_id = $1`, [refereeId]
    );
    if (existing) {
      return res.status(400).json({ error: 'You have already used a referral code' });
    }

    await query(
      `INSERT INTO referrals (id, referrer_id, referee_id, status, reward_amount, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, 'pending', $3, NOW(), NOW())`,
      [referrer.user_id, refereeId, referrerReward]
    );

    const wallet = await queryOne<{ balance: number }>(
      'SELECT balance FROM wallets WHERE user_id = $1', [refereeId]
    );
    if (wallet) {
      await query(
        'UPDATE wallets SET balance = balance + $1 WHERE user_id = $2',
        [refereeBonus, refereeId]
      );
      await query(
        `INSERT INTO wallet_transactions (user_id, type, amount, status, created_at)
         VALUES ($1, 'bonus', $2, 'completed', NOW())`,
        [refereeId, refereeBonus]
      );
    }

    return res.json({ message: `Referral code applied successfully. You received a ₦${refereeBonus.toLocaleString()} bonus!` });
  } catch (err) {
    console.error('Apply referral error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
