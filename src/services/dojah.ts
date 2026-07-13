import axios from 'axios';
import { config } from '../config';

function getClient() {
  const cfg = config.dojah;
  console.log('[Dojah] Config loaded:', { appId: cfg.appId, baseUrl: cfg.baseUrl, hasSecret: !!cfg.secretKey });
  return axios.create({
    baseURL: cfg.baseUrl,
    headers: {
      'AppId': cfg.appId,
      'Authorization': cfg.secretKey,
    },
    timeout: 15000,
  });
}

export interface DojahNinResult {
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender: string;
  date_of_birth: string;
  phone_number?: string;
  photo?: string;
  employment_status?: string;
  marital_status?: string;
}

export interface DojahBvnResult {
  bvn: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  gender: string;
  date_of_birth: string;
  phone_number1?: string;
  phone_number2?: string;
  image?: string;
  email?: string;
  enrollment_bank?: string;
  enrollment_branch?: string;
  state_of_origin?: string;
  state_of_residence?: string;
}

export async function verifyNin(nin: string): Promise<DojahNinResult> {
  const client = getClient();
  const { data } = await client.get('/api/v1/kyc/nin', {
    params: { nin },
  });
  return data.entity;
}

export async function verifyBvn(bvn: string): Promise<DojahBvnResult> {
  const client = getClient();
  const { data } = await client.get('/api/v1/kyc/bvn/full', {
    params: { bvn },
  });
  return data.entity;
}

export interface DojahDlResult {
  licenseNo: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: string;
  issuedDate: string;
  expiryDate: string;
  stateOfIssue: string;
  birthDate: string;
  photo?: string;
}

export async function verifyDriverLicense(licenseNumber: string): Promise<DojahDlResult> {
  const client = getClient();
  const { data } = await client.get('/api/v1/kyc/dl', {
    params: { license_number: licenseNumber },
  });
  return data.entity;
}
