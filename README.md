# TravelMate API

Express/TypeScript backend for the TravelMate ride-sharing platform. Handles auth (multi-step registration + Firebase OTP), rides, bookings, payments (Paystack + escrow), wallet, KYC, chat, and user profiles.

## Setup

```bash
cp .env.example .env
# Edit .env with your credentials (see Environment section below)

npm install
npm run dev
```

Server runs at `http://localhost:3000`. See `POSTMAN_GUILD.MD` for the full endpoint reference and curl examples.

## Database Migration

Before using the API, run the following SQL scripts in your **Supabase SQL editor** (in order):

| Script | Purpose |
|--------|---------|
| `sql/chat_and_preferences.sql` | Creates `conversations` + `messages` tables, adds `preferences` column to `profiles`, enables RLS |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server with hot-reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled app from `dist/` |
| `npm run typecheck` | Type-check without emitting files |

## Project Structure

```
src/
├── config/         # Env and app config
├── middleware/     # JWT auth, error handler
├── routes/
│   ├── auth.ts     # Registration (6-step), login, /me, /profile, /preferences, /role
│   ├── booking.ts  # Create, accept, list, get, cancel bookings
│   ├── chat.ts     # Conversations and messages
│   ├── kyc.ts      # KYC steps, bank verification, banks list
│   ├── payment.ts  # Paystack initiate, verify, webhook
│   ├── ride.ts     # Create, search, popular, get, cancel, complete rides
│   ├── user.ts     # Activity stats
│   └── wallet.ts   # Balance, transactions, withdraw, deposit
├── services/
│   ├── email.ts    # Email verification (Nodemailer/SMTP)
│   ├── firebase.ts # Firebase Admin SDK (phone OTP)
│   └── supabase.ts # Supabase client
├── app.ts          # Express app factory
└── index.ts        # Entry point
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `development` or `production` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `JWT_SECRET` | Secret for signing auth tokens |
| `REGISTRATION_SECRET` | Secret for signing registration session tokens |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account email |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Email server credentials |
| `APP_URL` | Base URL for email verification links |

## API Overview

| Area | Key Endpoints |
|------|--------------|
| **Auth** | `POST /register/start` → `verify-phone` → `verify-email` → `confirm-email` → `set-password` → `personal-info` → `address`, `POST /login`, `GET /me`, `PUT /profile`, `PUT /preferences`, `POST /role` |
| **Rides** | `POST /`, `GET /popular`, `GET /search`, `GET /:id`, `POST /:id/cancel`, `POST /:id/complete` |
| **Bookings** | `POST /`, `POST /:id/accept` (driver), `GET /`, `GET /:id`, `POST /:id/cancel` |
| **Payments** | `POST /initiate`, `POST /verify/:reference`, `POST /webhook/paystack` |
| **Wallet** | `GET /balance`, `GET /transactions`, `POST /withdraw`, `POST /deposit` |
| **KYC** | `GET /status`, `POST /step1-identity`, `POST /step2-address`, `POST /step3-bank`, `POST /step4-face`, `POST /verify-account`, `GET /banks` |
| **Chat** | `POST /` (start), `GET /` (list), `GET /:id/messages`, `POST /:id/messages` |
| **User** | `GET /activity` |

All protected routes require `Authorization: Bearer <token>`. See `POSTMAN_GUILD.MD` for full details.

## Booking Flow

```
POST /api/bookings              → status: "pending"
POST /api/bookings/:id/accept   → status: "accepted"   ← driver accepts
POST /api/payments/initiate     → Paystack payment link
POST /api/payments/webhook      → status: "confirmed"  ← Paystack confirms payment
POST /api/rides/:id/complete    → status: "completed"  ← driver marks complete, releases earnings
```
