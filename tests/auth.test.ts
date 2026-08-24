import { beforeAll, describe, expect, it } from 'vitest';
import {
  ensureServer, get, post, put, mintToken, createUser, uniqueEmail,
  type TestUser,
} from './helpers';

beforeAll(async () => {
  await ensureServer();
});

describe('Health & infrastructure', () => {
  it('GET /health is up', async () => {
    const res = await get('/health');
    expect(res.status).toBe(200);
  });

  it('GET /api/config serves public config', async () => {
    const res = await get('/api/config');
    expect(res.status).toBe(200);
  });

  it('API docs are served', async () => {
    const res = await fetch('http://localhost:3003/api-docs/');
    expect(res.status).toBeLessThan(500);
  });
});

describe('Authentication', () => {
  let rider: TestUser;

  it('signs up a new rider', async () => {
    const email = uniqueEmail('authrider');
    const res = await post('/api/auth/signup', {
      email, password: 'Secret123!', role: 'rider', firstName: 'Auth', lastName: 'Test',
    });
    expect(res.status).toBeLessThan(300);
    expect(res.body?.user?.id || res.body?.id || res.body?.data?.user?.id).toBeTruthy();
    rider = { id: res.body.user.id, email, password: 'Secret123!', role: 'rider', token: '' };
  });

  it('rejects duplicate signup', async () => {
    const res = await post('/api/auth/signup', {
      email: rider.email, password: 'Secret123!', role: 'rider',
    });
    expect([400, 409]).toContain(res.status);
  });

  it('rejects weak password', async () => {
    const res = await post('/api/auth/signup', { email: uniqueEmail('weak'), password: '123', role: 'rider' });
    expect(res.status).toBe(400);
  });

  it('rejects signup without email or phone', async () => {
    const res = await post('/api/auth/signup', { password: 'Secret123!' });
    expect(res.status).toBe(400);
  });

  it('signs in with valid credentials', async () => {
    const res = await post('/api/auth/signin', { email: rider.email, password: rider.password });
    expect(res.status).toBeLessThan(300);
    expect(res.body?.token || res.body?.accessToken).toBeTruthy();
  });

  it('rejects wrong password', async () => {
    const res = await post('/api/auth/signin', { email: rider.email, password: 'WrongPass999!' });
    expect([400, 401]).toContain(res.status);
  });

  it('rejects unknown email', async () => {
    const res = await post('/api/auth/signin', { email: 'nobody-nowhere@test.travelmate.dev', password: 'Whatever1!' });
    expect([400, 401, 404]).toContain(res.status);
  });

  it('GET /me returns the authenticated user', async () => {
    const token = mintToken(rider.id, 'rider', rider.email);
    const res = await get('/api/auth/me', token);
    expect(res.status).toBe(200);
    const user = res.body?.user || res.body;
    expect(user.email || user.user_id || user.id).toBeTruthy();
  });

  it('GET /me without token → 401', async () => {
    const res = await get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('GET /me with garbage token → 401', async () => {
    const res = await get('/api/auth/me', 'not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('refresh with invalid refresh token → handled error', async () => {
    const res = await post('/api/auth/refresh', { refreshToken: 'garbage-token' });
    expect(res.status).toBeLessThan(500);
    expect([200, 400, 401, 404]).toContain(res.status);
  });

  it('signout succeeds or is idempotent', async () => {
    const res = await post('/api/auth/signout', { token: 'anything' }, mintToken(rider.id, 'rider'));
    expect(res.status).toBeLessThan(500);
  });

  it('change-password rejects wrong old password', async () => {
    const res = await post(
      '/api/auth/change-password',
      { oldPassword: 'DefinitelyNotIt1!', newPassword: 'NewSecret123!' },
      mintToken(rider.id, 'rider')
    );
    expect([400, 401]).toContain(res.status);
  });

  it('switch-role toggles rider/driver', async () => {
    const res = await post('/api/auth/switch-role', { role: 'driver' }, mintToken(rider.id, 'rider'));
    expect(res.status).toBeLessThan(300);
  });

  it('2FA status returns config state', async () => {
    const res = await get('/api/auth/2fa/status', mintToken(rider.id, 'rider'));
    expect(res.status).toBe(200);
  });

  it('2FA setup generates a secret without enabling it', async () => {
    const res = await post('/api/auth/2fa/setup', undefined, mintToken(rider.id, 'rider'));
    expect(res.status).toBe(200);
    // Not verifying/enabling — that would lock the fixture account behind OTP.
  });

  it('verify-otp with garbage payload → handled error', async () => {
    const res = await post('/api/auth/verify-otp', { phone: '08000000000', firebaseIdToken: 'bogus' });
    expect([400, 401]).toContain(res.status);
  });

  it('google auth with fake credential → handled error', async () => {
    const res = await post('/api/auth/google', { credential: 'fake-token', googleUserInfo: { email: 'x@y.z' } });
    expect([200, 400, 401]).toContain(res.status);
  });
});
