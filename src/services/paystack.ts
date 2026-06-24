import { config } from '../config';

const BASE = config.paystack.baseUrl;
const SECRET = config.paystack.secretKey;

async function call(method: string, path: string, body?: unknown) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${SECRET}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { status: boolean; message?: string; data: any };
  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack ${method} ${path} failed`);
  }
  return json.data;
}

export type PaystackBank = {
  id: number;
  code: string;
  name: string;
  slug: string;
  longcode: string;
};

export type AccountResolution = {
  account_number: string;
  account_name: string;
  bank_id: number;
};

export type TransferRecipient = {
  recipient_code: string;
  active: boolean;
  type: string;
  name: string;
  details: { account_number: string; bank_code: string };
};

export type Transfer = {
  reference: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'reversed';
  recipient: TransferRecipient;
  transfer_code: string;
  fail_reason?: string;
};

export async function listBanks(): Promise<PaystackBank[]> {
  return call('GET', '/bank?country=nigeria&currency=NGN');
}

export async function resolveAccount(
  accountNumber: string,
  bankCode: string
): Promise<AccountResolution> {
  return call(
    'GET',
    `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`
  );
}

export async function createRecipient(
  name: string,
  bankCode: string,
  accountNumber: string,
): Promise<TransferRecipient> {
  return call('POST', '/transferrecipient', {
    type: 'nuban',
    name,
    account_number: accountNumber,
    bank_code: bankCode,
    currency: 'NGN',
  });
}

export async function initiateTransfer(
  amountKobo: number,
  recipientCode: string,
  reason = 'Wallet withdrawal'
): Promise<Transfer> {
  return call('POST', '/transfer', {
    source: 'balance',
    amount: amountKobo,
    recipient: recipientCode,
    reason,
  });
}

export async function verifyTransfer(
  transferCode: string
): Promise<Transfer> {
  return call('GET', `/transfer/${transferCode}`);
}

export type PaystackTransactionInit = {
  authorization_url: string;
  reference: string;
  access_code: string;
};

export async function initializeTransaction(
  email: string,
  amountKobo: number,
  callbackUrl?: string,
): Promise<PaystackTransactionInit> {
  return call('POST', '/transaction/initialize', {
    email,
    amount: amountKobo,
    callback_url: callbackUrl,
  });
}

export type PaystackTransactionVerification = {
  id: number;
  status: 'success' | 'failed' | 'abandoned';
  reference: string;
  amount: number;
  paid_at: string;
  channel: string;
  currency: string;
  metadata: Record<string, unknown>;
};

export async function verifyTransaction(
  reference: string,
): Promise<PaystackTransactionVerification> {
  const data = await call('GET', `/transaction/verify/${reference}`);
  return data as PaystackTransactionVerification;
}
