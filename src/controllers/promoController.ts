import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { supabase } from '../services/supabase';

export const getAvailablePromos = async (req: AuthRequest, res: Response) => {
  try {
    const { data: promos, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('is_active', true)
      .gte('valid_until', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch promos error:', error);
      return res.status(500).json({ error: 'Failed to fetch promo codes' });
    }

    const formattedPromos = (promos || []).map((p: Record<string, unknown>) => ({
      id: p.id,
      code: p.code,
      description: p.description,
      discountPercentage: p.discount_percentage,
      maxDiscount: p.max_discount,
      minBooking: p.min_booking,
      validUntil: p.valid_until,
    }));

    return res.json({ offers: formattedPromos });
  } catch (err) {
    console.error('Get promos error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const applyPromo = async (req: AuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    const userId = req.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { data: promo, error: findError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', (code as string).toUpperCase())
      .single();

    if (findError || !promo) {
      return res.status(404).json({ error: 'Invalid promo code' });
    }

    if (!promo.is_active || new Date(promo.valid_until as string) < new Date()) {
      return res.status(400).json({ error: 'Promo code is expired or inactive' });
    }

    // Check if user already used it
    const { data: redemption } = await supabase
      .from('user_promo_redemptions')
      .select('id')
      .eq('user_id', userId)
      .eq('promo_id', promo.id)
      .maybeSingle();

    if (redemption) {
      return res.status(400).json({ error: 'You have already used this promo code' });
    }

    return res.json({
      message: 'Promo code applied successfully!',
      promo: {
        id: promo.id,
        code: promo.code,
        discountPercentage: promo.discount_percentage,
        maxDiscount: promo.max_discount,
        minBooking: promo.min_booking,
      },
    });
  } catch (err) {
    console.error('Apply promo error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
