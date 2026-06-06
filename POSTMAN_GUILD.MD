# TravelMate API – Postman Guide

Use this checklist to verify all backend endpoints. Base URL: `http://localhost:3000/api`

**Authentication:** All endpoints except the registration flow, `/auth/login`, and `/payments/webhook/paystack` require:
```
Authorization: Bearer <jwt-token>
```

---

## Auth (`/api/auth`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /auth/register/start | ❌ | Step 1: Start registration (email, phone, role) |
| POST | /auth/register/verify-phone | ❌ | Step 2: Firebase OTP verification (sessionToken, firebaseIdToken) |
| POST | /auth/register/verify-email | ❌ | Step 3a: Send verification email (sessionToken) |
| GET  | /auth/register/confirm-email | ❌ | Step 3b: Confirm email link (query: ?token=) |
| POST | /auth/register/set-password | ❌ | Step 4: Set password (sessionToken, password) |
| POST | /auth/register/personal-info | ❌ | Step 5: Personal info (sessionToken, firstName, lastName, surname, dateOfBirth, gender) |
| POST | /auth/register/address | ❌ | Step 6: Address & create account (sessionToken, state, localGovt, ward, street, houseNumber) |
| POST | /auth/login | ❌ | Login (email, password) → returns JWT |
| GET  | /auth/me | ✅ | Current user profile (includes trips, memberSince, preferences, rating) |
| PUT  | /auth/profile | ✅ | Edit profile — address fields + profile picture (name/email/phone are locked) |
| PUT  | /auth/preferences | ✅ | Update ride preferences (ac, music, pets, smoking, autoAccept) |
| POST | /auth/role | ✅ | Switch role (role: "rider" \| "driver") — driver requires verified KYC |

---

## Wallet (`/api/wallet`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | /wallet/balance | ✅ | Wallet balance (totalBalance, availableBalance, heldAmount, pending) |
| GET  | /wallet/transactions | ✅ | Transaction history (query: type, status, limit, offset) |
| POST | /wallet/withdraw | ✅ | Withdraw (amount, bankCode, accountNumber) |
| POST | /wallet/deposit | ✅ | Deposit (amount, paymentMethod) |

---

## Rides (`/api/rides`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /rides | ✅ | Create ride (driver only) |
| GET  | /rides/popular | ✅ | Top popular routes (grouped by from→to, sorted by availability) |
| GET  | /rides/search | ✅ | Search rides (query: from, to, date, limit) |
| GET  | /rides/:id | ✅ | Ride details (includes driver profile + booked seats count) |
| POST | /rides/:id/cancel | ✅ | Cancel ride + auto-refund riders (driver only) |
| POST | /rides/:id/complete | ✅ | Complete ride + release earnings to driver (driver only) |

---

## Bookings (`/api/bookings`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /bookings | ✅ | Create booking (rideId, seatsBooked) → status: "pending" |
| POST | /bookings/:id/accept | ✅ | Driver accepts booking → status: "accepted" |
| GET  | /bookings | ✅ | List bookings (query: status, role="rider"\|"driver") |
| GET  | /bookings/:id | ✅ | Single booking details |
| POST | /bookings/:id/cancel | ✅ | Cancel booking + auto-refund if paid |

**Booking lifecycle:**
```
POST /bookings           → status: "pending"
POST /bookings/:id/accept → status: "accepted"  ← driver action
POST /payments/initiate  → payment link
POST /payments/webhook   → status: "confirmed"  ← Paystack webhook
POST /rides/:id/complete → status: "completed"  ← driver action
```

---

## Payments (`/api/payments`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /payments/initiate | ✅ | Initiate Paystack payment (bookingId, email, amount) — booking must be "accepted" |
| POST | /payments/verify/:reference | ✅ | Verify payment by Paystack reference |
| POST | /payments/webhook/paystack | ❌ | Paystack webhook (verified via x-paystack-signature header) |

---

## KYC (`/api/kyc`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | /kyc/status | ✅ | KYC status |
| POST | /kyc/submit | ✅ | Submit KYC documents |
| POST | /kyc/verify-account | ✅ | Resolve bank account (accountNumber, bankCode) |
| GET  | /kyc/banks | ✅ | List Nigerian banks |

---

## User (`/api/user`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /user/activity | ✅ | User stats (totalBookings, completedBookings, averageRating, totalRides) |

---

## Chat (`/api/chat`)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /chat | ✅ | Start a conversation (body: rideId) → returns conversationId |
| GET  | /chat | ✅ | List all conversations (shows other participant + last message) |
| GET  | /chat/:conversationId/messages | ✅ | Message history (query: limit, offset) |
| POST | /chat/:conversationId/messages | ✅ | Send a message (body: content) |

> **Note:** For real-time chat, subscribe to the `messages` table via Supabase Realtime on the frontend.

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | ❌ | Server health check |

---

## Database Migration Required

Run **[sql/chat_and_preferences.sql](./sql/chat_and_preferences.sql)** in your Supabase SQL editor to:
- Add `preferences` JSONB column to `profiles`
- Create `conversations` and `messages` tables with RLS policies

---

## Quick Test (curl)

```bash
# Health check
curl http://localhost:3000/health

# Step 1: Start registration
curl -X POST http://localhost:3000/api/auth/register/start \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","phone":"+2348012345678","role":"rider"}'

# Login (returns JWT token)
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test@1234"}'

# Get current user (replace TOKEN)
curl http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer TOKEN"

# Update preferences
curl -X PUT http://localhost:3000/api/auth/preferences \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ac":true,"music":true,"autoAccept":false}'

# Get popular routes
curl http://localhost:3000/api/rides/popular \
  -H "Authorization: Bearer TOKEN"

# Start a chat conversation
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"rideId":"<ride-uuid>"}'

# Send a message
curl -X POST http://localhost:3000/api/chat/<conversationId>/messages \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hi, I will be there in 5 minutes!"}'
```

---

*Last updated: All endpoints verified against `src/routes/`. TypeScript compiles with zero errors. Run server: `npm run dev`.*
