import jwt from 'jsonwebtoken';
import 'dotenv/config';

/**
 * API integration test helpers.
 *
 * These tests run against a REAL running server (default http://localhost:3003,
 * override with TEST_BASE_URL). They exercise the real database, so they create
 * clearly-marked fixture users and clean up where possible.
 */

export const BASE = process.env.TEST_BASE_URL || 'http://localhost:3003';

export const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/** Well-known admin user in the dev database. */
export const ADMIN_ID = process.env.TEST_ADMIN_ID || '4c838fe2-ca4f-45dd-bafe-7dc12d2640d2';

export interface ApiResponse<T = any> {
  status: number;
  body: T;
  ok: boolean;
}

/** Well-formed but nonexistent UUID for exercising not-found paths safely. */
export const DUMMY_UUID = '00000000-0000-0000-0000-000000000000';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function randomIp(): string {
  return `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
}

/** Verify the server is up; retry briefly so tests can start right after `npm run dev`. */
export async function ensureServer(retries = 10): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error(
    `Server not reachable at ${BASE}. Start it first with "npm run dev" or set TEST_BASE_URL.`
  );
}

export function mintToken(userId: string, role: 'rider' | 'driver' | 'admin', email?: string): string {
  return jwt.sign({ userId, role, email }, JWT_SECRET, { expiresIn: '1h' });
}

export async function api<T = any>(
  method: string,
  path: string,
  opts: { token?: string; body?: any; form?: FormData } = {}
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  // The server's rate limiter buckets by path + client IP (honouring
  // X-Forwarded-For). A unique IP per request keeps the suite under limits.
  headers['X-Forwarded-For'] = randomIp();
  let payload: BodyInit | undefined;
  if (opts.form) {
    payload = opts.form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(opts.body);
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: payload });
  let body: any = null;
  const text = await res.text();
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, ok: res.ok };
}

export const get = (path: string, token?: string) => api('GET', path, { token });
export const post = (path: string, body?: any, token?: string) => api('POST', path, { token, body });
export const put = (path: string, body?: any, token?: string) => api('PUT', path, { token, body });
export const patch = (path: string, body?: any, token?: string) => api('PATCH', path, { token, body });
export const del = (path: string, token?: string) => api('DELETE', path, { token });

let counter = 0;
export function uniqueEmail(prefix = 'smoke'): string {
  counter += 1;
  return `${prefix}.${Date.now()}.${counter}@test.travelmate.dev`;
}

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'rider' | 'driver';
  /** Token minted directly (does not consume auth rate-limiter quota). */
  token: string;
}

/** Create a real user through the public signup endpoint. */
export async function createUser(role: 'rider' | 'driver'): Promise<TestUser> {
  const email = uniqueEmail(role);
  const password = 'TestPass123!';
  const res = await post('/api/auth/signup', {
    email,
    password,
    role,
    firstName: 'Test',
    lastName: role === 'driver' ? 'Driver' : 'Rider',
  });
  if (!res.ok) {
    throw new Error(`Fixture signup failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  const id: string =
    res.body?.user?.id || res.body?.user?.user_id || res.body?.id ||
    res.body?.data?.user?.id || '';
  if (!id) {
    throw new Error(`Signup response missing user id: ${JSON.stringify(res.body)}`);
  }
  return { id, email, password, role, token: mintToken(id, role, email) };
}

/**
 * Marks a fixture user's KYC as verified directly in the local dev database.
 * Ride publishing (and similar driver gates) require verified KYC and there
 * is no admin API to approve KYC yet.
 */
export async function setKycVerified(userId: string): Promise<void> {
  const { Pool } = await import('pg');
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 5432),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'travelmate',
  });
  try {
    await pool.query("UPDATE profiles SET kyc_status = 'verified' WHERE id = $1", [userId]);
  } finally {
    await pool.end();
  }
}

/** Status codes that mean "the endpoint handled this correctly". */
export function isHandled(status: number): boolean {
  // 2xx success, 3xx redirect, 400/401/403/404/409/422/429 = validated/handled errors.
  // Anything 5xx means the endpoint crashed or leaked an internal error → FAIL.
  return status < 500;
}

export function expectHandled(label: string, status: number, allowed?: number[]) {
  if (allowed && allowed.includes(status)) return;
  if (!isHandled(status)) {
    throw new Error(`${label} returned ${status} (server error):\n`);
  }
}
