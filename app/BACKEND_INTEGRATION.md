# ServeNaija – Backend & 3rd-Party Integration Notes

The frontend currently runs on a local, in-browser store (`src/PlatformContext.tsx`, persisted to
localStorage and synced across tabs). Every action below is already isolated in one function, so each
becomes an API call later without changing any UI.

## 1. Notification pipeline (implemented in-app, backend-ready)

Event -> `AppNotification` rows (one per audience/recipient) -> channel fan-out.

| Trigger (context fn)      | Customer                     | Partner                          | Super Admin                |
|---------------------------|------------------------------|----------------------------------|----------------------------|
| createBooking             | Booking confirmed + PIN (in-app, email, SMS) | New paid job request to every approved partner (in-app, push) | New booking, escrow funded |
| acceptBooking             | Professional assigned (in-app, push, SMS) | Job accepted                     | Job dispatched             |
| startBooking              | Service started (in-app, push) | –                              | Service in progress        |
| completeBooking (PIN ok)  | Service completed, payment released | Payment released after 15% commission (in-app, push, SMS) | Escrow released + revenue |
| cancelBooking             | Booking cancelled            | Job cancelled (in-app, push)     | Refund review needed       |
| submitProvider            | –                            | Application received             | New partner application    |
| approve/rejectProvider    | –                            | Approved / needs attention (in-app, push, SMS) | Partner activated/rejected |

Each notification carries `channels` so the backend worker knows what to dispatch.

### Suggested tables
`notifications(id, audience, recipient_id, kind, title, body, ref_id, channels[], read_at, created_at)`
`notification_prefs(user_id, push, sms, email)` (feeds the future Customer Settings screen)
`device_tokens(user_id, platform, token)`

### Real-time delivery
Replace the cross-tab `storage` listener with WebSocket / SSE (or Supabase Realtime / Ably / Pusher).
Channel per audience: `admin`, `partner:{accountId}`, `customer:{accountId}`.

## 2. Third-party services to plan for (suggestions – pick per your preference)

| Need | Options (Nigeria-friendly) | Used for |
|------|----------------------------|----------|
| Payments + escrow | Paystack, Flutterwave | Card/transfer/USSD checkout; hold funds, release 85% to partner on PIN, 15% commission, refunds |
| Partner payouts | Paystack Transfers, Flutterwave Payouts, Monnify | Withdrawals, settlement batches (Settlement queue in Admin) |
| SMS / OTP | Termii, Africa's Talking, Twilio | Phone login OTP, completion PIN, job SMS |
| Push | Firebase Cloud Messaging, OneSignal | Partner job dispatch, customer status |
| Email | Resend, SendGrid, Postmark | Receipts, booking confirmations |
| Identity (NIN/BVN) | Smile Identity, Dojah, Prembly, Youverify | Compliance queue & partner onboarding |
| Maps / geocoding | Google Maps Platform, Mapbox | Address autocomplete, job location, zone demand map |
| File storage | Cloudinary, AWS S3 | Partner documents, profile photos |
| Auth | Supabase Auth, Firebase Auth, Auth0 | Replace plain-text demo passwords |
| Database | PostgreSQL (Supabase/Neon) | All entities |
| Monitoring | Sentry, PostHog | Errors, analytics |

## 3. Must-fix before production
- Demo passwords are stored in plain text in the browser: move to hashed auth (bcrypt/argon2) or a managed provider.
- Completion PIN and escrow state must be validated server-side; never trust the client.
- Payment webhooks (Paystack/Flutterwave) must be signature-verified and idempotent.
- Secrets live in server env vars only, never in the Vite bundle.
- Admin role enforced server-side (RBAC), not by a login screen.

## 4. Suggested API surface
POST /auth/register, /auth/login, /auth/otp
POST /bookings, /bookings/:id/accept, /start, /complete, /cancel
POST /payments/initialize, /webhooks/paystack
GET  /notifications?audience=&cursor= · PATCH /notifications/read
POST /partners/apply · POST /admin/partners/:id/approve|reject

## 5. What's implemented in this round (frontend, backend-ready)

- **Customer Profile & Settings** (`src/Profile.tsx`): saved addresses, saved cards (last 4 digits only —
  full PAN should go straight to Paystack/Flutterwave via their JS SDK and never touch our servers),
  booking preferences (default slot, access note, channel toggles), wallet & loyalty, referral code,
  and history with a ratings/review flow that updates the partner's public rating.
- **Advanced Search & Discovery** (`src/Discover.tsx`): filters by distance (haversine from a chosen
  area), category, price range, minimum rating, day-of-week availability and "available now"; sort by
  recommended/nearest/rating/price/jobs; public provider profile modal with bio, weekly availability,
  trust badges and real reviews pulled from completed, rated bookings. "Book" pre-fills the requested
  partner so the job is offered to them first (`requestedProviderId`), with automatic fallback to all
  partners if they decline.
- **Analytics & Reporting Dashboard** (`src/AdminExtras.tsx` → `AdminAnalytics`): GMV, platform revenue
  (15% commission), completion rate, AOV, avg. partner rating, revenue trend chart, pipeline funnel,
  service-mix breakdown, partner leaderboard, top customers, CSV export. A "Load sample data" button
  seeds 42 deterministic demo bookings so the dashboard is easy to demo before real volume exists.
- **Referral & Promotions System** (`src/AdminExtras.tsx` → `AdminPromotions`): admin can create/pause/
  delete promo codes (percent or flat, min order, max discount, usage cap, expiry, new-customer-only),
  edit the referral/loyalty rules (reward amounts, points-per-₦100, redemption rate), and see a referral
  leaderboard. Promo codes are validated server-side style in `PlatformContext.createBooking` — the
  client-side check in the promo box is only ever a preview.
- All of the above emit notifications (see section 1) and share one localStorage-backed store
  (`src/PlatformContext.tsx`, logic in `src/platformLogic.ts`) that a real backend replaces 1:1: every
  `dispatch`/mutator maps to one API call, and `hydrate()` shows exactly how new fields should migrate
  existing rows.
- Card numbers are validated with a Luhn check client-side as a UX nicety only — real PAN validation and
  storage must happen inside Paystack/Flutterwave's hosted fields, never in application code.
