import { beforeAll, describe, expect, it } from 'vitest';
import { get, post, put, del, mintToken, createUser, ADMIN_ID } from './helpers';

let adminToken: string;
let riderToken: string;
let riderId = '';

beforeAll(async () => {
  const { ensureServer } = await import('./helpers');
  await ensureServer();
  adminToken = mintToken(ADMIN_ID, 'admin', 'admin@travelmate.com');
  const rider = await createUser('rider');
  riderToken = rider.token;
  riderId = rider.id;
});

describe('Admin: read-only dashboards', () => {
  const reads: Array<[string, string]> = [
    ['GET /admin/users', '/api/admin/users'],
    ['GET /admin/rides', '/api/admin/rides'],
    ['GET /admin/bookings', '/api/admin/bookings'],
    ['GET /admin/transactions', '/api/admin/transactions'],
    ['GET /admin/audit-logs', '/api/admin/audit-logs'],
    ['GET /admin/statistics', '/api/admin/statistics'],
    ['GET /admin/analytics/overview', '/api/admin/analytics/overview'],
    ['GET /admin/wallets', '/api/admin/wallets'],
    ['GET /admin/referrals', '/api/admin/referrals'],
    ['GET /admin/referrals/stats', '/api/admin/referrals/stats'],
    ['GET /admin/referrals/settings', '/api/admin/referrals/settings'],
    ['GET /admin/kyc/pending', '/api/admin/kyc/pending'],
    ['GET /admin/escrow', '/api/admin/escrow'],
    ['GET /admin/completions/pending', '/api/admin/completions/pending'],
    ['GET /admin/users/:id details', `/api/admin/users/${riderId}`],
  ];

  for (const [label, path] of reads) {
    it(label, async () => {
      const res = await get(path.replace(':id', riderId), adminToken);
      expect(res.status).toBe(200);
    });
  }
});

describe('Admin: authorization', () => {
  it('rejects unauthenticated access', async () => {
    const res = await get('/api/admin/users');
    expect([401, 403]).toContain(res.status);
  });

  it('rejects non-admin users', async () => {
    const res = await get('/api/admin/users', riderToken);
    expect([401, 403]).toContain(res.status);
  });
});

describe('Admin: API key settings (database-backed)', () => {
  it('GET returns all configured keys masked with sources', async () => {
    const res = await get('/api/admin/settings/api-keys', adminToken);
    expect(res.status).toBe(200);
    const keys = res.body?.keys || {};
    for (const name of ['MAPBOX_ACCESS_TOKEN', 'BARDETECH_API_KEY', 'PAYSTACK_SECRET_KEY',
      'DOJAH_APP_ID', 'DOJAH_SECRET_KEY', 'DOJAH_BASE_URL', 'AGORA_APP_ID',
      'AGORA_APP_CERTIFICATE', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN',
      'FLW_CLIENT_ID', 'FLW_SECRET_KEY', 'FLW_ENCRYPTION_KEY',
      'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) {
      expect(keys[name], `missing key ${name}`).toBeTruthy();
      // Full secrets must never be returned — only masked previews.
      if (name !== 'DOJAH_BASE_URL' && keys[name].configured) {
        expect(keys[name].masked).toContain('•');
      }
    }
  });

  it('POST rejects invalid Paystack key format', async () => {
    const res = await post('/api/admin/settings/api-keys', { PAYSTACK_SECRET_KEY: 'bogus' }, adminToken);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toContain('PAYSTACK_SECRET_KEY');
  });

  it('POST rejects invalid Agora app id', async () => {
    const res = await post('/api/admin/settings/api-keys', { AGORA_APP_ID: 'zzz' }, adminToken);
    expect(res.status).toBe(400);
  });

  it('POST rejects invalid Firebase PEM', async () => {
    const res = await post('/api/admin/settings/api-keys', { FIREBASE_PRIVATE_KEY: 'not-a-pem' }, adminToken);
    expect(res.status).toBe(400);
  });

  it('POST with no changes → 400', async () => {
    const res = await post('/api/admin/settings/api-keys', {}, adminToken);
    expect(res.status).toBe(400);
  });

  it('POST valid Bardetech key saves and applies immediately', async () => {
    const res = await post(
      '/api/admin/settings/api-keys',
      { BARDETECH_API_KEY: 'fa3ff726c2eb7ec0a36d817b82e0bca51ee0f7b1' },
      adminToken
    );
    expect(res.status).toBeLessThan(300);
    expect(res.body?.keys?.BARDETECH_API_KEY?.source).toBe('custom');
  });
});

describe('Admin: bardetech TV plan management', () => {
  it('GET cabletv plans loads live catalog or saved plans', async () => {
    const res = await get('/api/admin/bardetech/cabletv/plans', adminToken);
    // Endpoint healthy whether upstream works or a handled error is returned.
    expect([200, 502]).toContain(res.status);
  });
});

describe('Admin: wallet credit/debit round-trip', () => {
  it('credit +₦500 then debit −₦500 leaves balance unchanged', async () => {
    const before = await get(`/api/wallet/me`, riderToken);
    const balanceBefore = before.body?.balance ?? before.body?.wallet?.balance ?? 0;

    const credit = await post(`/api/admin/wallets/${riderId}/credit`, { amount: 500 }, adminToken);
    expect(credit.status).toBeLessThan(300);

    const debit = await post(`/api/admin/wallets/${riderId}/debit`, { amount: 500 }, adminToken);
    expect(debit.status).toBeLessThan(300);

    const after = await get(`/api/wallet/me`, riderToken);
    const balanceAfter = after.body?.balance ?? after.body?.wallet?.balance ?? 0;
    expect(Number(balanceAfter)).toBeCloseTo(Number(balanceBefore), 0);
  });
});
