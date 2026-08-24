import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { Plan } from '../models/Plan';
import dataplans from '../../dataplans.json';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BardetechResponse {
  status: string;
  Status?: string;
  message?: string;
  code?: string;
  request_id?: string;
  token?: string;
  msg?: string;
  Customer_Name?: string;
  true_response?: string;
}

export interface ServiceVariation {
  variation_code: string;
  name: string;
  variation_amount: string;
  fixedPrice: string;
}

// ─── Client Factory ───────────────────────────────────────────────────────────

/**
 * Build an Axios client pointed at the Bardetech base URL with correct auth headers.
 */
function getBardetechClient(): AxiosInstance {
  const cfg = config.bardetech;
  return axios.create({
    baseURL: cfg.baseUrl,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Token ${cfg.apiKey}`,
    },
    timeout: 30000,
  });
}

// ─── Network Maps ─────────────────────────────────────────────────────────────

/** Map human-friendly network names to Bardetech network IDs */
export const BARDETECH_NETWORKS: Record<string, number> = {
  mtn: 1,
  glo: 2,
  '9mobile': 3,
  etisalat: 3,
  airtel: 4,
};

/** Map cable TV provider names to Bardetech cable IDs */
export const BARDETECH_CABLE_IDS: Record<string, number> = {
  gotv: 1,
  dstv: 2,
  startimes: 3,
};

/** Map electricity provider names to Bardetech disco IDs */
export const BARDETECH_ELECTRICITY_IDS: Record<string, number> = {
  'ikeja electric': 1,
  'ikedc': 1,
  'eko electric': 2,
  'ekedc': 2,
  'abuja electric': 3,
  'aedc': 3,
  'kano electric': 4,
  'kedco': 4,
  'enugu electric': 5,
  'eedc': 5,
  'portharcourt electric': 6,
  'phed': 6,
  'ibadan electric': 7,
  'ibedc': 7,
  'kaduna electric': 8,
  'kaedco': 8,
  'jos electric': 9,
  'jed': 9,
  'benin electric': 10,
  'bedc': 10,
  'yola electric': 11,
  'yedc': 11,
};

// ─── Airtime Services ────────────────────────────────────────────────────────

/**
 * Buy airtime for any Nigerian network.
 *
 * Endpoint: POST /topup/
 * Payload: { network, amount, mobile_number, Ported_number, airtime_type }
 */
export async function buyAirtime(params: {
  network: string;
  phone: string;
  amount: number;
}): Promise<BardetechResponse> {
  const client = getBardetechClient();
  const networkId = BARDETECH_NETWORKS[params.network.toLowerCase()];
  if (!networkId) throw new Error(`Unknown network: ${params.network}`);

  const payload = {
    network: String(networkId),
    amount: params.amount,
    mobile_number: params.phone,
    Ported_number: true,
    airtime_type: 'VTU',
  };

  console.log('[Bardetech] buyAirtime payload:', payload);
  const { data } = await client.post('/topup/', payload);
  console.log('[Bardetech] buyAirtime response:', data);
  return data;
}

// ─── Data Services ────────────────────────────────────────────────────────────

/**
 * Fetch Bardetech data plans from the remote API.
 * Endpoint: GET /network/ — returns plans grouped by network key
 * e.g. { "MTN_PLAN": [...], "GLO_PLAN": [...], "AIRTEL_PLAN": [...], "9MOBILE_PLAN": [...] }
 */
function normalizeBardetechData(raw: any[]): Plan[] {
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

export async function fetchBardetechPlansFromApi(): Promise<Plan[]> {
  const cfg = config.bardetech;
  if (!cfg.baseUrl) {
    throw new Error('Bardetech base URL not configured');
  }
  if (!cfg.apiKey) {
    throw new Error('Bardetech API key not configured');
  }
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
  return normalizeBardetechData(raw);
}

/**
 * Load Bardetech data plans. Prefer the remote API when the API key is configured.
 * Falls back to empty array if API call fails.
 */
export async function getBardetechPlans(): Promise<Plan[]> {
  const cfg = config.bardetech;
  if (cfg.apiKey && cfg.baseUrl) {
    try {
      return await fetchBardetechPlansFromApi();
    } catch (e: any) {
      console.warn('Failed to fetch Bardetech plans from API, using local fallback:', e?.response?.status || '', e.message || e);
    }
  } else if (!cfg.apiKey) {
    console.warn('Bardetech API key not configured, using local fallback plans');
  }
  return normalizeBardetechData(dataplans as any[]);
}

/**
 * Purchase a Bardetech data bundle.
 *
 * Endpoint: POST /data/
 * Payload: { network, plan, mobile_number, Ported_number, request_id }
 */
export async function purchaseBardetechData(params: {
  networkId: number | string;
  planId: string;
  mobileNumber: string;
  portedNumber?: boolean;
  requestId?: string;
}): Promise<BardetechResponse> {
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

// ─── Cable TV Services ────────────────────────────────────────────────────────

/**
 * Fetch all cable TV plans from Bardetech API.
 * Endpoint: GET /cable/
 * Returns: { GOTVPLAN: [...], DSTVPLAN: [...], STARTIME: [...], cablename: [...] }
 */
export async function fetchCableTvPlansFromApi(): Promise<any[]> {
  const cfg = config.bardetech;
  if (!cfg.apiKey) throw new Error('Bardetech API key not configured');

  const { data } = await axios.get(`${cfg.baseUrl}/cable/`, {
    headers: { 'Authorization': `Token ${cfg.apiKey}` },
    timeout: 15000,
  });

  if (!data || typeof data !== 'object') {
    throw new Error('Unexpected response from Bardetech cable plans endpoint');
  }

  const plans: any[] = [];

  // Match response keys case-insensitively and fuzzily, e.g. GOTVPLAN,
  // DstvPlans, startimes_plan all resolve to the right provider.
  for (const [rawKey, arr] of Object.entries(data)) {
    if (!Array.isArray(arr)) continue;
    const key = rawKey.toLowerCase();
    let provider: string | null = null;
    if (key.includes('gotv')) provider = 'gotv';
    else if (key.includes('dstv')) provider = 'dstv';
    else if (key.includes('startime') || key.includes('starttimes')) provider = 'startimes';
    if (!provider) continue;

    for (const p of arr) {
      const id = String(p.cableplan_id ?? p.id ?? '');
      if (!id) continue;
      plans.push({
        id,
        variation_code: id,
        name: p.package || p.name || '',
        price: parseFloat(String(p.plan_amount ?? p.amount ?? '0').replace(/[^0-9.]/g, '')),
        provider,
        cable: p.cable || '',
      });
    }
  }
  return plans;
}

/**
 * Cable TV plans are admin-configured, not fetched from Bardetech API.
 * Use loadAllSavedPlans() from bardetechAdmin to get saved plans.
 */
export async function getCableTvPlans(): Promise<any[]> {
  return [];
}

/**
 * Verify cable TV subscription details (IUC/smartcard number).
 *
 * Endpoint: GET /validateiuc?smart_card_number=iuc&cablename=id
 */
export async function verifyCableTv(params: {
  provider: string;
  iucnumber: string;
}): Promise<BardetechResponse> {
  const client = getBardetechClient();
  const cableId = BARDETECH_CABLE_IDS[params.provider.toLowerCase()];
  if (!cableId) throw new Error(`Unknown cable provider: ${params.provider}`);
  
  const queryParams = {
    smart_card_number: params.iucnumber,
    cablename: String(cableId),
  };

  console.log('[Bardetech] verifyCableTv params:', queryParams);
  try {
    const { data } = await client.get('/validateiuc', { params: queryParams });
    console.log('[Bardetech] verifyCableTv response:', data);
    return data;
  } catch (err: any) {
    const status = err?.response?.status;
    const body = err?.response?.data;
    console.error(`[Bardetech] verifyCableTv failed (HTTP ${status}):`, body || err.message);
    if (status === 500) {
      throw new Error('Bardetech API returned an error. The smartcard number may be invalid or the service is temporarily unavailable.');
    }
    throw err;
  }
}

/**
 * Purchase cable TV subscription.
 *
 * Endpoint: POST /cablesub/
 * Payload: { cablename, cableplan, smart_card_number }
 */
export async function purchaseCableTv(params: {
  provider: string;
  iucnumber: string;
  plan: string;
  requestId: string;
  subscriptionType?: string;
  phone: string;
}): Promise<BardetechResponse> {
  const client = getBardetechClient();
  const cableId = BARDETECH_CABLE_IDS[params.provider.toLowerCase()];
  if (!cableId) throw new Error(`Unknown cable provider: ${params.provider}`);

  const payload = {
    cablename: String(cableId),
    cableplan: params.plan,
    smart_card_number: params.iucnumber,
  };

  console.log('[Bardetech] purchaseCableTv payload:', payload);
  const { data } = await client.post('/cablesub/', payload);
  console.log('[Bardetech] purchaseCableTv response:', data);
  return data;
}

// ─── Electricity Services ─────────────────────────────────────────────────────

/**
 * Electricity providers are defined in BARDETECH_ELECTRICITY_IDS mapping.
 * No API endpoint needed - providers are hardcoded.
 */
export async function getElectricityProviders(): Promise<any[]> {
  return Object.entries(BARDETECH_ELECTRICITY_IDS).map(([name, id]) => ({
    id: name,
    discoId: id,
  }));
}

/**
 * Verify electricity meter number.
 *
 * Endpoint: GET /validatemeter?meternumber=meter&disconame=id&mtype=metertype
 */
export async function verifyElectricityMeter(params: {
  provider: string;
  meternumber: string;
  metertype?: string;
}): Promise<BardetechResponse> {
  const client = getBardetechClient();
  const discoId = BARDETECH_ELECTRICITY_IDS[params.provider.toLowerCase()];
  if (!discoId) throw new Error(`Unknown electricity provider: ${params.provider}`);
  
  // Map meter type string to number
  const mtype = params.metertype?.toLowerCase() === 'postpaid' ? 2 : 1;

  const queryParams = {
    meternumber: params.meternumber,
    disconame: String(discoId),
    mtype: String(mtype),
  };

  console.log('[Bardetech] verifyElectricityMeter params:', queryParams);
  const { data } = await client.get('/validatemeter', { params: queryParams });
  console.log('[Bardetech] verifyElectricityMeter response:', data);
  return data;
}

/**
 * Pay electricity bill.
 *
 * Endpoint: POST /billpayment/
 * Payload: { disco_name, amount, meter_number, MeterType }
 * MeterType: 1 = PREPAID, 2 = POSTPAID
 */
export async function payElectricityBill(params: {
  provider: string;
  meternumber: string;
  amount: number;
  metertype?: string;
}): Promise<BardetechResponse> {
  const client = getBardetechClient();
  const discoId = BARDETECH_ELECTRICITY_IDS[params.provider.toLowerCase()];
  if (!discoId) throw new Error(`Unknown electricity provider: ${params.provider}`);
  
  // Map meter type string to number
  const meterTypeNum = params.metertype?.toLowerCase() === 'postpaid' ? 2 : 1;

  const payload = {
    disco_name: String(discoId),
    amount: params.amount,
    meter_number: params.meternumber,
    metertype: String(meterTypeNum),
  };

  console.log('[Bardetech] payElectricityBill payload:', payload);
  const { data } = await client.post('/billpayment/', payload);
  console.log('[Bardetech] payElectricityBill response:', data);
  return data;
}

// ─── Transaction Status ──────────────────────────────────────────────────────

/**
 * Check transaction status.
 *
 * Endpoint: GET /transaction/status/?reference=transaction_ref
 */
export async function getTransactionStatus(reference: string): Promise<any> {
  const client = getBardetechClient();
  const { data } = await client.get(`/transaction/status/?reference=${reference}`);
  return data;
}

// ─── Wallet Balance ──────────────────────────────────────────────────────────

/**
 * Fetch wallet balance.
 *
 * Endpoint: GET /user/
 */
export async function getWalletBalance(): Promise<any> {
  const client = getBardetechClient();
  const { data } = await client.get('/user/');
  return data;
}
