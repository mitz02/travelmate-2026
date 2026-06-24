import axios from 'axios';
import { Plan } from '../models/Plan';
import { config } from '../config';
import dataplans from '../../dataplans.json';

/**
 * Fetch Bardetech data plans from the remote API.
 * The API key is required and should be provided via config.bardetech.apiKey.
 * The base URL comes from config.bardetech.baseUrl.
 */
export async function fetchBardetechPlansFromApi(): Promise<Plan[]> {
  const cfg = config.bardetech;
  if (!cfg.baseUrl) {
    throw new Error('Bardetech base URL not configured');
  }
  if (!cfg.apiKey) {
    throw new Error('Bardetech API key not configured');
  }
  // The Bardetech network endpoint returns plans grouped by network key
  // e.g. { "MTN_PLAN": [...], "AIRTEL_PLAN": [...], ... }
  const { data } = await axios.get(`${cfg.baseUrl}/network/`, {
    headers: { 'Authorization': `Token ${cfg.apiKey}` },
    timeout: 15000,
  });
  // Flatten grouped response into a single array
  let raw: any[];
  if (Array.isArray(data)) {
    raw = data;
  } else {
    raw = [];
    for (const key of Object.keys(data)) {
      if (Array.isArray(data[key])) {
        raw.push(...data[key]);
      }
    }
  }
  const NETWORK_MAP: Record<number, string> = { 1: 'mtn', 2: 'glo', 3: '9mobile', 4: 'airtel' };
  return raw.map((p: any) => {
    const rawAmount = p.plan_amount ?? p.amount;
    const amountStr = rawAmount ? String(rawAmount).replace(/[^0-9.]/g, '') : '0';
    const parsedPrice = parseFloat(amountStr);
    const planType = p.plan_type || 'Data';
    const volume = p.plan || p.size || p.volume || '';
    const validity = p.month_validate || p.validity || '';
    const netName = p.plan_network || p.network;
    let net = typeof netName === 'string' ? netName.toLowerCase() : (NETWORK_MAP[netName] || 'unknown');
    if (net === '9mobile') net = 'etisalat';
    const mappedService = `${net}-data`;
    return {
      ...p,
      id: String(p.dataplan_id ?? p.data_id ?? p.id ?? ''),
      apiType: 'bardetech' as const,
      externalId: String(p.dataplan_id ?? p.data_id ?? ''),
      service: mappedService,
      name: p.name || `${planType} - ${volume}`,
      variation_code: String(p.variation_code ?? p.dataplan_id ?? p.data_id ?? ''),
      price: p.selling_price ?? p.price ?? parsedPrice,
      network: netName,
      mode: p.mode,
      volume,
      validity,
      planType,
    } as Plan;
  });
}

/**
 * Load Bardetech data plans. Prefer the remote API when the API key is configured.
 * Falls back to the local JSON file for development environments without credentials.
 */
export async function getBardetechPlans(): Promise<Plan[]> {
  const cfg = config.bardetech;
  // If an API key is present, attempt to fetch from the remote service.
  if (cfg.apiKey && cfg.baseUrl) {
    try {
      return await fetchBardetechPlansFromApi();
    } catch (e: any) {
      console.warn('Failed to fetch Bardetech plans from API, falling back to local JSON:', e.message || e);
    }
  }
  // Fallback: use the bundled JSON file.
  const raw = dataplans as any[];
  return raw.map((p) => {
    const amountStr = p.amount ? String(p.amount).replace(/[^0-9.]/g, '') : '0';
    const parsedPrice = parseFloat(amountStr);
    const planType = p.plan_type || 'Data';
    const volume = p.size || p.volume || '';
    const validity = p.validity || '';
    let net = (p.network || '').toLowerCase();
    if (net === '9mobile') net = 'etisalat';
    const mappedService = `${net}-data`;
    return {
      ...p,
      id: String(p.data_id ?? p.id ?? ''),
      apiType: 'bardetech' as const,
      externalId: String(p.data_id ?? ''),
      service: mappedService,
      name: p.name || `${planType} - ${volume} ${validity ? `(${validity})` : ''}`.trim(),
      variation_code: String(p.variation_code ?? p.data_id ?? ''),
      price: p.selling_price ?? p.price ?? parsedPrice,
      network: p.network,
      mode: p.mode,
      volume,
      validity,
      planType,
    } as Plan;
  });
}

/**
 * Purchase a Bardetech data bundle.
 */
export async function purchaseBardetechData(params: {
  networkId: number | string;
  planId: string; // dataplan_id
  mobileNumber: string;
  portedNumber?: boolean;
  requestId?: string;
}): Promise<any> {
  const cfg = config.bardetech;
  if (!cfg || !cfg.apiKey) {
    throw new Error('Bardetech API key not configured in .env file');
  }

  const payload = {
    network: params.networkId,
    plan: params.planId,
    mobile_number: params.mobileNumber,
    Ported_number: params.portedNumber ?? true,
    ...(params.requestId ? { request_id: params.requestId } : {}),
  };

  const { data } = await axios.post(`${cfg.baseUrl}/data/`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${cfg.apiKey}`
    }
  });
  return data;
}
