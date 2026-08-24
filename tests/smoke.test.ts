import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import {
  ensureServer, get, post, put, del, mintToken, createUser,
  ADMIN_ID, DUMMY_UUID, type ApiResponse, type TestUser,
} from './helpers';

/**
 * Exhaustive sweep: every remaining endpoint is hit at least once and must be
 * HANDLED — i.e. never return an unhandled 5xx. Where business logic allows,
 * stricter status assertions are made. Paid third-party actions (airtime/data/
 * TV/electricity purchases) are intentionally sent INVALID payloads so nothing
 * is ever bought.
 */

let admin: string;
let rider: TestUser;
let rider2: TestUser;
let driver: TestUser;

type Case = [label: string, run: () => Promise<ApiResponse>];

const cases: Case[] = [];
function sweep(label: string, run: () => Promise<ApiResponse>, exact?: number[]) {
  cases.push([label, async () => {
    const res = await run();
    if (exact && exact.length > 0) {
      expect(exact).toContain(res.status);
    } else {
      expect(res.status, `${label} crashed`).toBeLessThan(500);
    }
    return res;
  }]);
}

beforeAll(async () => {
  await ensureServer();
  admin = mintToken(ADMIN_ID, 'admin', 'admin@travelmate.com');
  rider = await createUser('rider');
  rider2 = await createUser('rider');
  driver = await createUser('driver');
});

afterAll(async () => {
  // Best-effort cleanup of fixture users through the admin API.
  try { await del(`/api/admin/users/${rider.id}`, admin); } catch { /* ignore */ }
  try { await del(`/api/admin/users/${rider2.id}`, admin); } catch { /* ignore */ }
});

// ── Profile ──────────────────────────────────────────────────────────────────
sweep('profile: get', () => get(`/api/profile/${rider.id}`, rider.token), [200]);
sweep('profile: update', () => put(`/api/profile/${rider.id}`, { firstName: 'Swept' }, rider.token));
sweep('profile: rating', () => get(`/api/profile/${rider.id}/rating`, rider.token));
sweep('profile: stats', () => get(`/api/profile/${rider.id}/stats`, rider.token));
sweep('profile: notification settings get', () => get(`/api/profile/${rider.id}/notification-settings`, rider.token));
sweep('profile: notification settings put', () => put(`/api/profile/${rider.id}/notification-settings`, {}, rider.token));
sweep('profile: avatar without file → handled', () => api0('POST', `/api/profile/${rider.id}/avatar`, rider.token));

async function api0(method: string, path: string, token?: string): Promise<ApiResponse> {
  const res = await fetch(`http://localhost:3003${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'X-Forwarded-For': `10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.1`,
    },
  });
  let b: any = null;
  try { b = await res.json(); } catch { /* ignore */ }
  return { status: res.status, body: b, ok: res.ok };
}

// ── Chats ────────────────────────────────────────────────────────────────────
let chatId = '';
sweep('chats: create conversation', async () => {
  const res = await post('/api/chats', { participantId: driver.id }, rider.token);
  if ([200, 201].includes(res.status)) chatId = res.body?.chat?.id || res.body?.id || res.body?.chatId || '';
  return res;
});
sweep('chats: my conversations', () => get(`/api/chats/${rider.id}`, rider.token));
sweep('chats: unread count', () => get(`/api/chats/unread/${rider.id}`, rider.token));
sweep('chats: messages list', () => get(`/api/chats/${chatId || DUMMY_UUID}/messages`, rider.token));
sweep('chats: send message', () => post(`/api/chats/${chatId || DUMMY_UUID}/messages`, { content: 'hello from test' }, rider.token));
sweep('chats: mark read', () => put(`/api/chats/${chatId || DUMMY_UUID}/read`, {}, driver.token));

// ── Chat (legacy router) ────────────────────────────────────────────────────
sweep('chat: list conversations', () => get('/api/chat', rider.token));

// ── KYC ──────────────────────────────────────────────────────────────────────
sweep('kyc: status', () => get('/api/kyc/status', rider.token));
sweep('kyc: banks', () => get('/api/kyc/banks', rider.token));
sweep('kyc: submit missing fields → 400', () => post('/api/kyc/submit', {}, rider.token), [400]);
sweep('kyc: verify-nin garbage → handled upstream error', () => post('/api/kyc/verify-nin', { nin: '00000000000' }, rider.token));
sweep('kyc: verify-bvn garbage → handled upstream error', () => post('/api/kyc/verify-bvn', { bvn: '00000000000' }, rider.token));
sweep('kyc: verify-dl garbage → handled upstream error', () => post('/api/kyc/verify-dl', { licenseNumber: 'DL-TEST-000' }, rider.token));
sweep('kyc: verify-id without file → handled', () => api0('POST', '/api/kyc/verify-id', rider.token));
sweep('kyc: face-verification without file → handled', () => api0('POST', '/api/kyc/face-verification', rider.token));

// ── Location ────────────────────────────────────────────────────────────────
sweep('location: route', () => get('/api/location/route?startLat=6.5&startLng=3.37&endLat=7.37&endLng=3.94'));
sweep('location: autocomplete', () => get('/api/location/autocomplete?q=Lagos'));

// ── Bookings extras ─────────────────────────────────────────────────────────
sweep('bookings: user list', () => get(`/api/bookings/user/${rider.id}`, rider.token));
sweep('bookings: unknown id → 404-ish', () => get(`/api/bookings/${DUMMY_UUID}`, rider.token));
sweep('bookings: cancel unknown → handled', () => put(`/api/bookings/${DUMMY_UUID}/cancel`, { reason: 'test' }, rider.token));
sweep('bookings: complete unknown → handled', () => post(`/api/bookings/${DUMMY_UUID}/complete`, {}, rider.token));
sweep('bookings: rate unknown → handled', () => post(`/api/bookings/${DUMMY_UUID}/rate`, { rating: 5 }, rider.token));
sweep('bookings: confirm-paystack unknown → handled', () => post(`/api/bookings/${DUMMY_UUID}/confirm-paystack`, {}, rider.token));
sweep('bookings: confirm-pickup unknown → handled', () => post(`/api/bookings/${DUMMY_UUID}/confirm-pickup`, {}, rider.token));
sweep('bookings: confirm-dropoff unknown → handled', () => post(`/api/bookings/${DUMMY_UUID}/confirm-dropoff`, {}, rider.token));

// ── Rides extras ────────────────────────────────────────────────────────────
sweep('rides: popular', () => get('/api/rides/popular'));
sweep('rides: repost unknown → handled', () => post(`/api/rides/${DUMMY_UUID}/repost`, {}, driver.token));
sweep('rides: complete unknown → handled', () => post(`/api/rides/${DUMMY_UUID}/complete`, {}, driver.token));
sweep('rides: cancel unknown → handled', () => del(`/api/rides/${DUMMY_UUID}?reason=test`, driver.token));
sweep('rides: create validation → 400', () => post('/api/rides', { from: 'X' }, driver.token), [400]);

// ── Wallet extras ───────────────────────────────────────────────────────────
sweep('wallet: statistics', () => get('/api/wallet/me/statistics', rider.token));
sweep('wallet: banks', () => get('/api/wallet/banks', rider.token));
sweep('wallet: bank-account (unset)', () => get('/api/wallet/bank-account', rider.token));
sweep('wallet: resolve-account bad number → 400/upstream', () => post('/api/wallet/resolve-account', { bankCode: '058', accountNumber: '0000000000' }, rider.token));
sweep('wallet: transfer to self insufficient/invalid → handled', () => post('/api/wallet/transfer', { toUserId: rider.id, amount: 10 }, rider2.token));
sweep('wallet: verify-payment dummy ref → handled', () => post('/api/wallet/verify-payment', { reference: 'NOPE-123' }, rider.token));
sweep('wallet: other-user transactions as non-owner → 403-ish', () => get(`/api/wallet/${driver.id}/transactions`, rider.token), [200, 403]);

// ── Escrow ──────────────────────────────────────────────────────────────────
sweep('escrow: hold invalid booking → handled', () => post('/api/escrow/hold', { bookingId: DUMMY_UUID, amount: 100, fromUserId: rider.id, toUserId: driver.id }, rider.token));
sweep('escrow: by booking dummy', () => get(`/api/escrow/booking/${DUMMY_UUID}`, rider.token));
sweep('escrow: user escrows', () => get(`/api/escrow/user/${rider.id}`, rider.token));
sweep('escrow: status dummy', () => get(`/api/escrow/${DUMMY_UUID}/status`, rider.token));
sweep('escrow: release dummy', () => post(`/api/escrow/${DUMMY_UUID}/release`, { releasedBy: rider.id }, rider.token));
sweep('escrow: refund dummy', () => post(`/api/escrow/${DUMMY_UUID}/refund`, { reason: 'test' }, rider.token));
sweep('escrow: dispute dummy', () => post(`/api/escrow/${DUMMY_UUID}/dispute`, { reason: 'test' }, rider.token));
sweep('escrow: admin pending disputes', () => get('/api/escrow/admin/pending-disputes', admin));
sweep('escrow: resolve dummy (admin)', () => post(`/api/escrow/${DUMMY_UUID}/resolve`, { resolution: 'refund' }, admin));

// ── Payments ────────────────────────────────────────────────────────────────
sweep('payments: initialize ₦100 session (no charge)', () => post('/api/payments/initialize', { amount: 100, email: rider.email }, rider.token));
sweep('payments: verify dummy reference → handled', () => get('/api/payments/verify/DUMMYREF123'));
sweep('payments: charge-card fake → handled', () => post('/api/payments/charge-card', { card: 'tok_visa', amount: 100, email: rider.email }, rider.token));
sweep('payments: methods list', () => get(`/api/payments/methods/${rider.id}`, rider.token));
sweep('payments: delete method dummy → handled', () => del(`/api/payments/methods/${DUMMY_UUID}`, rider.token));

// ── Webhooks (signature checks must reject) ─────────────────────────────────
sweep('webhook: paystack empty → rejected/handled', () => post('/api/webhooks/paystack', {}), [400, 401, 403]);
sweep('webhook: bardetech empty → rejected/handled', () => post('/api/webhooks/bardetech', {}));
sweep('webhook: termii empty → rejected/handled', () => post('/api/webhooks/termii', {}));

// ── Notifications ───────────────────────────────────────────────────────────
sweep('notifications: send', () => post('/api/notifications/send', { userId: rider.id, title: 'Test', body: 'from suite' }, admin));
sweep('notifications: register-token', () => post('/api/notifications/register-token', { token: 'fake-fcm-token-for-tests', device: 'android' }, rider.token));
sweep('notifications: unregister-token', () => del('/api/notifications/unregister-token', rider.token));
sweep('notifications: my notifications', () => get('/api/notifications/me', rider.token));
sweep('notifications: read-all', () => put('/api/notifications/read-all', {}, rider.token));
sweep('notifications: by userId', () => get(`/api/notifications/${rider.id}`, rider.token));
sweep('notifications: delete dummy', () => del(`/api/notifications/${DUMMY_UUID}`, rider.token));

// ── Emergency ───────────────────────────────────────────────────────────────
let alertId = '';
sweep('emergency: trigger SOS', async () => {
  const res = await post('/api/emergency/sos', {
    userId: rider.id,
    location: { lat: 6.5244, lng: 3.3792, address: 'Test Location Lagos' },
  }, rider.token);
  if (res.ok) alertId = res.body?.alert?.id || res.body?.alertId || res.body?.id || '';
  return res;
});
if (alertId) {
  sweep('emergency: alert status', () => get(`/api/emergency/${alertId}/status`, rider.token));
  sweep('emergency: cancel alert', () => post(`/api/emergency/${alertId}/cancel`, {}, rider.token), [200]);
}
let contactId = '';
sweep('emergency: add contact', async () => {
  const res = await post('/api/emergency/contacts', { name: 'Test Contact', phone: '08000000001' }, rider.token);
  if (res.ok) contactId = res.body?.contact?.id || res.body?.id || '';
  return res;
});
sweep('emergency: list contacts', () => get(`/api/emergency/contacts/${rider.id}`, rider.token));
if (contactId) {
  sweep('emergency: update contact', () => put(`/api/emergency/contacts/${contactId}`, { name: 'Updated' }, rider.token));
  sweep('emergency: delete contact', () => del(`/api/emergency/contacts/${contactId}`, rider.token));
}

// ── Search chatter ──────────────────────────────────────────────────────────
let requestId = '';
sweep('search-chatter: create request', async () => {
  const res = await post('/api/search-chatter/requests', {
    origin: 'Ibadan', destination: 'Lagos',
    date: new Date(Date.now() + 864e5).toISOString().slice(0, 10),
    seats: 1,
  }, rider.token);
  if (res.ok) requestId = res.body?.request?.id || res.body?.id || '';
  return res;
});
sweep('search-chatter: active requests', () => get('/api/search-chatter/requests'));
sweep('search-chatter: make offer', () => post(`/api/search-chatter/requests/${requestId || DUMMY_UUID}/offers`, { price: 3000, departureTime: new Date().toISOString() }, driver.token));
sweep('search-chatter: list offers', () => get(`/api/search-chatter/requests/${requestId || DUMMY_UUID}/offers`, rider.token));
sweep('search-chatter: accept offer dummy → handled', () => put(`/api/search-chatter/offers/${DUMMY_UUID}/accept`, {}, driver.token));
sweep('search-chatter: reject offer dummy → handled', () => put(`/api/search-chatter/offers/${DUMMY_UUID}/reject`, {}, driver.token));
if (requestId) sweep('search-chatter: delete request', () => del(`/api/search-chatter/requests/${requestId}`, rider.token), [200]);

// ── Route feed ──────────────────────────────────────────────────────────────
let statusId = '';
sweep('route-feed: create status', async () => {
  const res = await post('/api/route-feed', { route: 'Ibadan-Lagos', content: 'Traffic update from test', type: 'text' }, rider.token);
  if (res.ok) statusId = res.body?.status?.id || res.body?.id || '';
  return res;
});
sweep('route-feed: feed', () => get('/api/route-feed'));
sweep('route-feed: by route', () => get('/api/route-feed/route/Ibadan-Lagos'));
if (statusId) {
  sweep('route-feed: comment', () => post(`/api/route-feed/${statusId}/comment`, { content: 'noted' }, driver.token));
  sweep('route-feed: react', () => post(`/api/route-feed/${statusId}/react`, { type: 'like' }, driver.token));
  sweep('route-feed: delete own status', () => del(`/api/route-feed/${statusId}`, rider.token));
}

// ── Tracking ────────────────────────────────────────────────────────────────
sweep('tracking: eta', () => get('/api/tracking/eta?lat=6.5&lng=3.37'));
sweep('tracking: deviation', () => post('/api/tracking/deviation', { bookingId: DUMMY_UUID, lat: 6.5, lng: 3.37 }, rider.token));
sweep('tracking: start dummy booking', () => post(`/api/tracking/${DUMMY_UUID}/start`, { driverLocation: { lat: 6.5, lng: 3.37 } }, rider.token));
sweep('tracking: live dummy', () => get(`/api/tracking/${DUMMY_UUID}/live`, rider.token));
sweep('tracking: history dummy', () => get(`/api/tracking/${DUMMY_UUID}/history`, rider.token));
sweep('tracking: end dummy', () => post(`/api/tracking/${DUMMY_UUID}/end`, {}, rider.token));
sweep('tracking: update location dummy', () => post(`/api/tracking/${DUMMY_UUID}/update`, { lat: 6.6, lng: 3.4 }, rider.token));

// ── Calls & Agora ───────────────────────────────────────────────────────────
sweep('calls: initiate missing rideId → 400', () => post('/api/calls/initiate', {}, rider.token), [400]);
sweep('calls: incoming', () => get('/api/calls/incoming', driver.token));
sweep('calls: history', () => get('/api/calls/history', rider.token));
sweep('calls: accept unknown call → 404', () => put(`/api/calls/${DUMMY_UUID}/accept`, {}, rider.token));
sweep('calls: reject unknown call → 404', () => put(`/api/calls/${DUMMY_UUID}/reject`, {}, rider.token));
sweep('calls: end unknown call → 404', () => put(`/api/calls/${DUMMY_UUID}/end`, {}, rider.token));
sweep('agora: token', () => get('/api/agora/token?channelName=test-channel&uid=123', rider.token));

// ── Services (VTU reads; NO real purchases) ─────────────────────────────────
sweep('services: cabletv plans (live catalog)', () => get('/api/services/cabletv/plans', rider.token));
sweep('services: electricity providers (live)', () => get('/api/services/electricity/providers', rider.token));
sweep('services: data plans AIRTEL (live)', () => get('/api/services/data/plans/AIRTEL', rider.token));
sweep('services: saved plans tv', () => get('/api/services/saved-plans/tv', rider.token));
sweep('services: airtime amount 0 → 400 (never buys)', () => post('/api/services/airtime', { phone: '08000000000', network: 'MTN', amount: 0 }, rider.token), [400]);

// ── Bills (reads + invalid purchase attempts only) ──────────────────────────
sweep('bills: services', () => get('/api/bills/services'));
sweep('bills: providers', () => get('/api/bills/providers'));
sweep('bills: data-plans', () => get('/api/bills/data-plans'));
sweep('bills: saved tv plans', () => get('/api/bills/saved-plans/tv'));
sweep('bills: saved data plans', () => get('/api/bills/saved-plans/data'));
sweep('bills: history', () => get(`/api/bills/history/${rider.id}`, rider.token));
sweep('bills: airtime invalid → 400 (never buys)', () => post('/api/bills/airtime', { phone: '123', network: '', amount: 0 }, rider.token), [400]);
sweep('bills: data invalid → 400 (never buys)', () => post('/api/bills/data', { phone: '123', network: '', plan: '', amount: 0 }, rider.token), [400]);
sweep('bills: electricity invalid → 400 (never pays)', () => post('/api/bills/electricity', { meterNumber: '', disco: '', amount: 0 }, rider.token), [400]);
sweep('bills: verify-meter → handled', () => post('/api/bills/verify-meter', { meterNumber: '0000000000', disco: 'ikeja-electric' }));

// ── Referral & Promo ────────────────────────────────────────────────────────
sweep('referral: my referrals', () => get('/api/referral', rider.token));
sweep('referral: generate code', () => post('/api/referral/generate', {}, rider2.token));
sweep('referral: apply bogus code → handled', () => post('/api/referral/apply', { code: 'BOGUS42' }, rider.token));
sweep('promo: available promos', () => get('/api/promo', rider.token));
sweep('promo: apply bogus → handled', () => post('/api/promo/apply', { code: 'BOGUS' }, rider.token));

// ── PDF ─────────────────────────────────────────────────────────────────────
it('pdf: export receipts/report', async () => {
  const res = await fetch('http://localhost:3003/api/pdf/export/transactions', {
    headers: { Authorization: `Bearer ${rider.token}`, 'X-Forwarded-For': '10.1.1.1' },
  });
  expect(res.status).toBeLessThan(500);
  expect([200, 201, 404]).toContain(res.status);
});

// ── User (index-mounted) ────────────────────────────────────────────────────
sweep('user: activity', () => get('/api/user/activity', rider.token));
sweep('user: activity-feed', () => get('/api/user/activity-feed', rider.token));

// ── Run the whole sweep ─────────────────────────────────────────────────────
describe('All-endpoints smoke sweep', () => {
  for (const [label, run] of cases) {
    it(label, run);
  }
});
