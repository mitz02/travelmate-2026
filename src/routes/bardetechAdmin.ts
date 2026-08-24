import { Router, Request, Response } from 'express';
import axios from 'axios';
import { adminMiddleware } from '../middleware/admin';
import { getBardetechPlans, fetchCableTvPlansFromApi } from '../services/bardetech';
import { supabase } from '../services/supabase';
import type { Plan } from '../models/Plan';

const router = Router();

router.use(adminMiddleware);

export async function loadAllSavedPlans(): Promise<Plan[]> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'SAVED_PLANS')
    .single();
  if (error || !data || !data.value) return [];
  try {
    return typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
  } catch (e) {
    console.error('Error parsing saved plans from app_settings', e);
    return [];
  }
}

async function saveAllPlansToDb(plans: Plan[]) {
  const { data: existing } = await supabase
    .from('app_settings')
    .select('key')
    .eq('key', 'SAVED_PLANS')
    .single();

  if (existing) {
    const { error } = await supabase
      .from('app_settings')
      .update({ value: JSON.stringify(plans), updated_at: new Date().toISOString() })
      .eq('key', 'SAVED_PLANS');
    if (error) console.error('Error updating SAVED_PLANS:', error);
  } else {
    const { error } = await supabase
      .from('app_settings')
      .insert([{ key: 'SAVED_PLANS', value: JSON.stringify(plans), is_public: false }]);
    if (error) console.error('Error inserting SAVED_PLANS:', error);
  }
}

async function getSavedPlans(service: string, apiType?: string): Promise<Plan[]> {
  const allPlans = await loadAllSavedPlans();
  let filtered = allPlans.filter(p => p.service === service);
  if (apiType && apiType !== 'all') {
    filtered = filtered.filter(p => p.apiType === apiType);
  }
  return filtered;
}

// GET /admin/bardetech/plans?service=...&apiType=...&savedOnly=true
router.get('/plans', async (req: Request, res: Response) => {
  const service = req.query.service as string;
  const apiType = (req.query.apiType as string) || 'bardetech';
  const savedOnly = req.query.savedOnly === 'true';

  if (!service) return res.status(400).json({ error: 'service query param required' });

  try {
    if (savedOnly) {
      const saved = await getSavedPlans(service, apiType);
      return res.json(saved);
    }

    // Always fetch from Bardetech
    const bardetechPlans = await getBardetechPlans();
    return res.json(bardetechPlans.filter(p => p.service === service));
  } catch (e) {
    console.error('Failed to fetch plans:', e);
    const message = e instanceof Error ? e.message : 'Failed to fetch plans';
    res.status(500).json({ error: message });
  }
});

// GET /admin/bardetech/cabletv/plans?provider=dstv — Fetch ALL available cable TV plans from Bardetech API
router.get('/cabletv/plans', async (req: Request, res: Response) => {
  const { provider } = req.query;
  try {
    let plans = await fetchCableTvPlansFromApi();
    if (provider) {
      const providerLower = provider.toString().toLowerCase();
      plans = plans.filter(p => p.provider === providerLower);
    }
    return res.json(plans);
  } catch (e: any) {
    const status = e?.response?.status;
    const rawDetail = e?.response?.data?.detail || e?.response?.data?.message || e?.message || 'Failed to fetch cable TV plans';
    const detail = String(rawDetail).replace(/\.+$/, '');
    console.error(`Failed to fetch cable TV plans from Bardetech API (HTTP ${status || 'n/a'}):`, detail);
    if (status === 401 || /invalid token/i.test(String(detail))) {
      return res.status(502).json({ error: `Bardetech API rejected the configured API key${detail ? `: ${detail}` : ''}. Update BARDTECH_API_KEY or add the plan manually.` });
    }
    res.status(502).json({ error: `Bardetech API error${status ? ` (HTTP ${status})` : ''}: ${detail}` });
  }
});

// PATCH /admin/bardetech/plan/:id – update price (or other fields) of a saved plan
router.patch('/plan/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;
  try {
    const allPlans = await loadAllSavedPlans();
    const planIndex = allPlans.findIndex(p => p.id === id);
    if (planIndex === -1) return res.status(404).json({ error: 'Plan not found' });
    allPlans[planIndex] = { ...allPlans[planIndex], ...updates };
    await saveAllPlansToDb(allPlans);
    res.json(allPlans[planIndex]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// PATCH /admin/bardetech/plans/bulk – update fields on multiple plans
router.patch('/plans/bulk', async (req: Request, res: Response) => {
  const { ids, updates } = req.body;
  if (!ids || !updates) return res.status(400).json({ error: 'ids and updates are required' });
  try {
    const allPlans = await loadAllSavedPlans();
    const updatedPlans: Plan[] = [];
    ids.forEach((id: string) => {
      const planIndex = allPlans.findIndex(p => p.id === id);
      if (planIndex !== -1) {
        allPlans[planIndex] = { ...allPlans[planIndex], ...updates };
        updatedPlans.push(allPlans[planIndex]);
      }
    });
    await saveAllPlansToDb(allPlans);
    res.json(updatedPlans);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to bulk update plans' });
  }
});

// POST /admin/bardetech/plans – create or upsert a plan (persisted to Supabase app_settings)
router.post('/plans', async (req: Request, res: Response) => {
  const { service, name, variationCode, price, apiPrice, volume, validity, planType, network, mode, apiType = 'bardetech' } = req.body;
  try {
    const allPlans = await loadAllSavedPlans();
    const existingIndex = allPlans.findIndex(p =>
      p.variation_code === variationCode &&
      p.service === service &&
      p.apiType === apiType &&
      (mode ? p.mode === mode : true)
    );

    if (existingIndex !== -1) {
      const existing = allPlans[existingIndex];
      const updatedPlan: Plan = {
        ...existing,
        name: name ?? existing.name,
        price: price ?? existing.price,
        apiPrice: apiPrice ?? existing.apiPrice,
        volume: volume ?? existing.volume,
        validity: validity ?? existing.validity,
        planType: planType ?? existing.planType,
        network: network ?? existing.network,
        mode: mode ?? existing.mode,
        cashbackType: req.body.cashbackType ?? existing.cashbackType,
        cashbackValue: req.body.cashbackValue ?? existing.cashbackValue,
        isSaved: true,
      };
      allPlans[existingIndex] = updatedPlan;
      await saveAllPlansToDb(allPlans);
      return res.json(updatedPlan);
    }

    let newPlan: Plan;
    if (apiType === 'bardetech') {
      const { planId, networkId, ...rest } = req.body;
      const actualPlanId = planId || variationCode;
      newPlan = {
        id: `${apiType}-${actualPlanId}`,
        service,
        name: name ?? actualPlanId,
        variation_code: actualPlanId,
        externalId: actualPlanId,
        price: rest.price ?? price,
        apiPrice: apiPrice ?? rest.price ?? price,
        volume,
        validity,
        planType,
        network: networkId ?? network,
        mode,
        apiType: 'bardetech',
        cashbackType: req.body.cashbackType ?? 'fixed',
        cashbackValue: req.body.cashbackValue ?? 0,
        isSaved: true,
        ...rest,
      };
    } else {
      newPlan = {
        id: `${apiType}-${variationCode}`,
        service,
        name: name ?? variationCode,
        variation_code: variationCode,
        price,
        apiPrice: apiPrice ?? price,
        volume,
        validity,
        planType,
        network,
        mode,
        apiType,
        cashbackType: req.body.cashbackType ?? 'fixed',
        cashbackValue: req.body.cashbackValue ?? 0,
        isSaved: true,
      };
    }

    allPlans.push(newPlan);
    await saveAllPlansToDb(allPlans);
    return res.json(newPlan);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to save plan' });
  }
});

// DELETE /admin/bardetech/plans/bardetech – remove all saved Bardetech plans
router.delete('/plans/bardetech', async (_req: Request, res: Response) => {
  try {
    const allPlans = await loadAllSavedPlans();
    const beforeCount = allPlans.length;
    const filtered = allPlans.filter(p => p.apiType !== 'bardetech');
    const removed = beforeCount - filtered.length;
    await saveAllPlansToDb(filtered);
    res.json({ removed, remaining: filtered.length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete Bardetech plans' });
  }
});

// DELETE /admin/bardetech/plans/:id – delete a single saved plan by its ID
router.delete('/plans/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const allPlans = await loadAllSavedPlans();
    const beforeCount = allPlans.length;
    const filtered = allPlans.filter(p => p.id !== id);
    const removed = beforeCount - filtered.length;
    if (removed === 0) {
      return res.status(404).json({ error: 'Plan not found' });
    }
    await saveAllPlansToDb(filtered);
    res.json({ removed, remaining: filtered.length, deletedId: id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete plan' });
  }
});

// DELETE /admin/bardetech/plans – delete plans (optionally by apiType)
router.delete('/plans', async (req: Request, res: Response) => {
  try {
    const apiType = req.query.apiType as string | undefined;
    const allPlans = await loadAllSavedPlans();
    const beforeCount = allPlans.length;
    let filtered: Plan[];
    if (apiType) {
      filtered = allPlans.filter(p => p.apiType !== apiType);
    } else {
      filtered = [];
    }
    const removed = beforeCount - filtered.length;
    await saveAllPlansToDb(filtered);
    res.json({ removed, remaining: filtered.length, deletedApiType: apiType ?? 'all' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete plans' });
  }
});

export default router;
