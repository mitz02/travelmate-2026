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
  // The Bardetech network endpoint returns a list of plans.
  // According to the docs, a GET request to `${baseUrl}/network/` with the API key header returns JSON.
  const { data } = await axios.get(`${cfg.baseUrl}/network/`, {
    headers: { 'api_key': cfg.apiKey },
  });
  // Normalise the response to match our Plan interface.
  const raw = Array.isArray(data) ? data : (data?.content?.plans || []);
  return raw.map((p: any) => {
    const amountStr = p.amount ? String(p.amount).replace(/[^0-9.]/g, '') : '0';
    const parsedPrice = parseFloat(amountStr);
    const planType = p.plan_type || 'Data';
    const volume = p.size || p.volume || '';
    const validity = p.validity || '';
    const generatedName = `${planType} - ${volume} ${validity ? `(${validity})` : ''}`.trim();
    let net = (p.network || '').toLowerCase();
    if (net === '9mobile') net = 'etisalat';
    const mappedService = `${net}-data`;
    return {
      id: p.data_id ?? p.id ?? '',
      apiType: 'bardetech' as const,
      externalId: p.data_id,
      service: mappedService,
      name: p.name || generatedName,
      variation_code: p.variation_code ?? p.data_id ?? '',
      price: p.selling_price ?? p.price ?? parsedPrice,
      network: p.network,
      mode: p.mode,
      volume,
      validity,
      planType,
      ...p,
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
    const generatedName = `${planType} - ${volume} ${validity ? `(${validity})` : ''}`.trim();
    let net = (p.network || '').toLowerCase();
    if (net === '9mobile') net = 'etisalat';
    const mappedService = `${net}-data`;
    return {
      id: p.data_id ?? p.id ?? '',
      apiType: 'bardetech' as const,
      externalId: p.data_id,
      service: mappedService,
      name: p.name || generatedName,
      variation_code: p.variation_code ?? p.data_id ?? '',
      price: p.selling_price ?? p.price ?? parsedPrice,
      network: p.network,
      mode: p.mode,
      volume,
      validity,
      planType,
      ...p,
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
console.log(payload)
  const { data } = await axios.post(`https://bardetech.com/api/data/`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${cfg.apiKey}`
    }
  });
  return data;
}
