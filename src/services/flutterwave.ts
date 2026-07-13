import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { config } from '../config';

let accessToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiresAt - 60_000) {
    return accessToken;
  }

  const { data } = await axios.post(
    config.flutterwave.idpUrl,
    new URLSearchParams({
      client_id: config.flutterwave.clientId,
      client_secret: config.flutterwave.clientSecret,
      grant_type: 'client_credentials',
    }).toString(),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
  );

  accessToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;
  return accessToken!;
}

async function getClient(): Promise<AxiosInstance> {
  const token = await getAccessToken();
  return axios.create({
    baseURL: config.flutterwave.baseUrl,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });
}

function encrypt(plainText: string): string {
  const key = config.flutterwave.encryptionKey;
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  return encrypted;
}

export interface FlutterwaveBank {
  id: number;
  code: string;
  name: string;
}

export interface FlutterwaveAccount {
  account_number: string;
  account_name: string;
  bank_code: string;
}

export interface FlutterwaveTransfer {
  id: string;
  reference: string;
  status: string;
  complete_message: string;
}

export async function listBanks(): Promise<FlutterwaveBank[]> {
  const client = await getClient();
  const { data } = await client.get('/banks', { params: { country: 'NG' } });
  return data.data?.map((b: any) => ({
    id: b.id,
    code: b.code,
    name: b.name,
  })) || [];
}

export async function resolveAccount(accountNumber: string, bankCode: string): Promise<FlutterwaveAccount> {
  const client = await getClient();
  try {
    const { data } = await client.post('/banks/account-resolve', {
      account: {
        number: accountNumber,
        code: bankCode,
      },
      currency: 'NGN',
    });
    return {
      account_number: data.data.account_number,
      account_name: data.data.account_name,
      bank_code: bankCode,
    };
  } catch (e: any) {
    console.error('Flutterwave resolve error:', JSON.stringify(e.response?.data || e.message));
    const msg = e.response?.data?.error?.message || e.response?.data?.message || e.message;
    throw new Error(msg);
  }
}

export async function initiateTransfer(params: {
  accountBank: string;
  accountNumber: string;
  amount: number;
  currency?: string;
  reference: string;
  reason: string;
}): Promise<FlutterwaveTransfer> {
  const client = await getClient();

  const payload = {
    action: 'instant',
    reference: params.reference,
    narration: params.reason,
    type: 'bank',
    payment_instruction: {
      source_currency: params.currency || 'NGN',
      destination_currency: params.currency || 'NGN',
      amount: {
        value: params.amount,
        applies_to: 'source_currency',
      },
      recipient: {
        bank: {
          account_number: params.accountNumber,
          code: params.accountBank,
        },
      },
      sender: {
        name: {
          first: '',
          last: '',
        },
      },
    },
  };

  try {
    const { data } = await client.post('/direct-transfers', payload);
    return {
      id: data.data?.id || '',
      reference: params.reference,
      status: data.data?.status || 'pending',
      complete_message: data.message || '',
    };
  } catch (e: any) {
    console.error('Flutterwave transfer error:', JSON.stringify(e.response?.data || e.message));
    const msg = e.response?.data?.error?.message || e.response?.data?.message || e.message;
    throw new Error(msg);
  }
}
