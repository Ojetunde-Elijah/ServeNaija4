# ServeNaija

**Trusted home services for Nigeria: verified professionals, upfront pricing, and payments held in escrow until the job is done.**

ServeNaija is a three-sided marketplace (customers, service partners, and platform admins) that turns Nigeria's huge informal skilled-trades workforce into a trusted, bookable service. It is inspired by the structured on-demand model that India's Pronto has used to scale home services, adapted for Nigerian realities: NIN/BVN identity infrastructure, escrow-first payments, and skilled trades such as AC servicing, electrical, plumbing, deep cleaning and beauty at home.

---

## Table of contents

1. [The problem](#1-the-problem)
2. [The opportunity: numbers that matter](#2-the-opportunity-numbers-that-matter)
3. [Case study: Pronto and India](#3-case-study-pronto-and-india)
4. [Why India is the right comparison for Nigeria](#4-why-india-is-the-right-comparison-for-nigeria)
5. [Why ServeNaija is the right product for Nigeria](#5-why-servenaija-is-the-right-product-for-nigeria)
6. [What ServeNaija does](#6-what-servenaija-does)
7. [How it works](#7-how-it-works)
8. [Product at a glance](#8-product-at-a-glance)
9. [Tech stack and architecture](#9-tech-stack-and-architecture)
10. [Getting started](#10-getting-started)
11. [Project status and roadmap](#11-project-status-and-roadmap)
12. [Contributors](#12-contributors)
13. [Sources](#13-sources)

---

## 1. The problem

Two groups in Nigeria are badly served by the same broken market.

**Skilled workers (supply).** Electricians, plumbers, AC technicians, cleaners and stylists have real skills, but they work without a brand, a steady stream of customers, a verifiable reputation, or protection when a client refuses to pay. Income is irregular and depends on personal referrals.

**Households (demand).** Finding a reliable professional means asking around. There is no identity verification, no upfront price, no recourse if the job is abandoned or done badly, and a real risk of paying in advance and never seeing the worker again.

Skills and demand both exist. **Trust, pricing and payment are what is missing between them.**

---

## 2. The opportunity: numbers that matter

### Nigeria's informal economy

| Metric | Figure | Source |
|---|---|---|
| Informal economy's share of GDP | about **42.5%** (after GDP rebasing) | World Bank, as reported by BusinessDay / Africa Finance Headlines |
| Informal share of all employment | **over 80%** | BusinessDay (Oct 2025) |
| Informal share of workforce (broader definition) | up to **93%** | NESG 2025 report, *From Hustle to Decent Work* |
| Formal jobs as share of total employment | only **7.8%** (2023) | NBS via BusinessDay |
| Employed Nigerians who are self-employed | about **85%** (only 15% are wage earners) | NESG 2025 |
| Young Nigerians entering the workforce each year | about **3.5 million** | NESG 2025 |
| Africa-wide informal share of jobs (for context) | about **83%** (2024) | UN Economic Commission for Africa |

The estimates vary because "informal" is defined differently across studies. Every credible source agrees on the direction: **the great majority of Nigerian work, including skilled trades, sits outside any formal system.**

### Nigeria's digital readiness

| Metric | Figure | Source |
|---|---|---|
| Population | about **237 million** (2025), nearly two-thirds under 25 | KPMG Nigeria smartphone study |
| Internet subscribers | **157 million** (NCC, May 2026) | KPMG, citing NCC |
| Phone users who are internet subscribers | **83.2%** (Jan 2026) | NCC data via MEA Tech Watch |
| Broadband penetration | **53.07%**, 115 million subscribers (Jan 2026) | NCC data via MEA Tech Watch |
| 4G share of mobile market | **53.41%** (Jan 2026) | NCC data via MEA Tech Watch |
| Smartphone shipment growth in 2025 | about **25%** | MEA Tech Watch |
| Projected new mobile internet users, 2025 to 2030 | **32 million** | GSMA via BusinessDay |
| Projected smartphone connections by 2030 | **230 million** | GSMA via BusinessDay |

A large, young, connected population is already using phones for fintech, transport and commerce. Booking a service from a phone is not a leap for this market.

---

## 3. Case study: Pronto and India

Pronto is an Indian "house help in minutes" startup that shows what happens when an informal service market gets structure. It offers trained, background-verified professionals for chores such as sweeping, mopping, utensil washing, kitchen and bathroom cleaning and laundry, bookable as instant, scheduled or recurring.

| Pronto metric | Figure | Source |
|---|---|---|
| Launched | **April 2025**, from a single hub in Sector 56, Gurugram | The Optimist (founder profile) |
| Daily bookings, about a year earlier | roughly **1,000** | TechCrunch (Mar 2026) |
| Daily bookings, March 2026 | **18,000+** | TechCrunch, Inc42 |
| Daily bookings, May 2026 | **26,000** (up from 18,000 in just over a month) | TechCrunch (May 2026) |
| Series A | **$11M** (Aug 2025) | Inc42 |
| Series B | **$25M** at a **$100M** valuation (Mar 2026) | TechCrunch, Inc42 |
| Series B extension | about **$20M** led by Lachy Groom, valuation about **$200M** (May 2026) | TechCrunch, Tracxn |
| Total raised | about **$60M** | Tracxn, The Optimist |
| Cash burned (as of Mar 2026) | about **$8M**, with roughly two years of runway | TechCrunch |
| Repeat usage | the top **10%** of users generate about **40%** of bookings | TechCrunch (May 2026) |
| Geographic concentration | the National Capital Region is about **half** of bookings | TechCrunch (Mar 2026) |
| Daily active users (Feb 2026) | about **101,000** | Sensor Tower via TechCrunch |

### The category is large and contested

- India's overall home services sector was valued at about **$56 to 57 billion** in FY2025 (Redseer, via TechCrunch).
- Rivals are scaling just as fast: Urban Company's Insta Help crossed **50,000 daily bookings** in under a year, and Snabbit has also reported **50,000 daily bookings** within a year of launch.
- Pronto's founder says most domestic-service hiring in India still happens through informal networks, meaning the market is barely digitised.

### How Pronto actually works

The speed is operational, not magic:

1. **Hubs and micro-zones.** Workers are positioned around small hubs, and instant booking is only offered to addresses inside each zone.
2. **Pre-positioned, shift-based workers.** A pro is already nearby when a customer taps "book", similar to quick-commerce delivery.
3. **Time-based pricing shown upfront.** Services are priced by duration (30, 60 or 90 minutes), so customers see the cost before confirming.
4. **Training and verification.** Workers go through in-person training and background checks, and get structured shifts instead of irregular informal income.
5. **Habit-building.** Recurring and scheduled bookings turn occasional demand into frequent use.

Pronto also says the 10-minute dispatch works in several of its micromarkets, not all of them.

---

## 4. Why India is the right comparison for Nigeria

India is the closest large, mobile-first market that has already proven this model at scale.

| Factor | India | Nigeria |
|---|---|---|
| Informal share of employment | about **87%** (ILO, 2025); roughly **79 to 80%** in urban areas | **over 80%** (up to 93% by NESG) |
| Hiring of household/skilled help | mostly through informal networks and word of mouth | mostly through referrals and word of mouth |
| Customer pain point | trust, consistency, safety | trust, consistency, safety |
| Workforce | very large, youthful, underemployed | very large, youthful, underemployed (about 3.5M new entrants a year) |
| Mobile and digital payments | mass adoption of UPI | high mobile penetration and strong fintech culture (transfers, USSD, wallets, Paystack/Flutterwave) |
| Urban density | dense metros where micro-zones work | dense pockets of Lagos, Abuja and Ibadan |

The lesson from India is not "copy the app". It is that **organising the informal workforce around verification, upfront pricing and protected payment creates a category**, and that the first-mover advantage in each city is large.

---

## 5. Why ServeNaija is the right product for Nigeria

**1. It solves the trust gap directly.** Every partner goes through NIN and BVN checks, a liveness check, guarantors and a skills assessment. Nigeria already has national identity and bank-identity infrastructure that makes this kind of verification practical.

**2. Escrow fits how Nigerians get burned.** Advance payment followed by a no-show is a common complaint. ServeNaija holds the customer's money and releases it only when the customer gives a private four-digit completion code. No code, no payout. This protects customers from non-performance and partners from non-payment.

**3. It focuses on skilled trades, not only chores.** Pronto's average order is small (roughly Rs 200 to 300, time-based, for short chore sessions). ServeNaija targets higher-value jobs such as AC servicing, electrical work, plumbing and deep cleaning, which can support a healthy commission even where purchasing power and order frequency differ.

**4. It gives workers an income path, not just a listing.** Partners get a steady stream of paid requests, protected payment, earnings tracking, training, and a public rating that becomes their portable reputation.

**5. It is honest about Nigerian operating conditions.** Traffic, power and addressing make a blanket "10-minute" promise risky in Lagos. ServeNaija starts with scheduled bookings and dispatch to verified nearby partners, and plans zone-based "instant" options only where partner density supports it. Pronto itself only promises fast dispatch in some micromarkets.

**6. It is built for the market's business model.** A 15% platform commission (85% to the partner), promo codes, referrals, wallet credit and a loyalty tier system are designed to drive repeat use. Pronto's own data shows repeat users drive a large share of bookings (top 10% of users account for about 40%).

**7. It is mobile-first.** With 157 million internet subscribers and a young population, the product is designed for phones first, including a full mobile navigation experience for customers, partners and admins.

---

## 6. What ServeNaija does

**For customers**
- Browse services and verified professionals, filter by distance, price, rating and availability, and view public profiles with real reviews
- Book with clear package pricing, choose a time window and address, add notes, and apply promo codes or wallet credit
- Pay into escrow; track the booking through each stage
- Share a private completion code to release payment; rate and review the professional
- Manage saved addresses, saved cards (last four digits only), preferences, referral code, loyalty points and wallet

**For service partners**
- Guided nine-step onboarding (identity, BVN, liveness, guarantors, skills assessment, background check, review)
- Receive paid job requests (open, or directly requested by a customer), accept or decline, start the job and complete it with the customer's code
- See earnings, the 85/15 commission split, ratings, performance and training

**For admins (Command Centre)**
- Live operations, finance and escrow, analytics and reporting, promotions and referrals
- A compliance queue to approve or reject partner applications
- Platform-wide notifications for every booking, payment and partner event

---

## 7. How it works

```
Customer books  ->  Pays into escrow  ->  Verified partner accepts
        |                                          |
        v                                          v
  Gets private                              Starts the job
  completion code                                  |
        |                                          v
        +--->  Shares code after the work  ->  Payment released
                                          (85% partner / 15% platform)
                                                   |
                                                   v
                                          Customer rates the pro
```

Every step creates notifications for the right audience (customer, partner, admin), with a channel list (in-app, push, SMS, email) so a real backend can dispatch them.

---

## 8. Product at a glance

Measured from the current codebase (v3):

| Item | Count |
|---|---|
| Portals | **4** (customer, partner, onboarding, admin) |
| Partner onboarding stages | **9** |
| Booking lifecycle states | **5** (paid, accepted, in progress, completed, cancelled) |
| Service categories | **5** (AC servicing, deep cleaning, electrical, plumbing, beauty at home) |
| Admin views | **5** (operations, compliance, finance, analytics, promotions) |
| State actions (each maps to one future API call) | **23** |
| Platform API methods exposed by the store | **27** |
| Notification triggers | **33** |
| Commission model | **15%** platform / **85%** partner |
| Source files | **13** (TypeScript/React plus CSS) |
| Application code | about **2,000 lines** of TypeScript/TSX |
| Stylesheet | about **730 lines** (about 106 KB) with **11** responsive media queries |

---

## 9. Tech stack and architecture

**Current**
- React 19 and TypeScript
- Vite 8 (build and dev server)
- Tailwind CSS v4 plus custom CSS
- A single in-browser state store (React context and reducer), persisted to local storage and synced across tabs

**Planned integrations** (each action in the store is already isolated so it becomes an API call without UI changes)

| Need | Options |
|---|---|
| Payments and escrow | Paystack, Flutterwave |
| Partner payouts | Paystack Transfers, Flutterwave Payouts, Monnify |
| SMS and OTP | Termii, Africa's Talking |
| Push notifications | Firebase Cloud Messaging, OneSignal |
| Identity (NIN/BVN) | Smile Identity, Dojah, Prembly, Youverify |
| Maps and geocoding | Google Maps Platform, Mapbox |
| Database and auth | PostgreSQL (Supabase/Neon), managed auth |

See [`BACKEND_INTEGRATION.md`](./BACKEND_INTEGRATION.md) for the notification pipeline, suggested tables, API surface and a must-fix-before-production checklist.

---

## 10. Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build
```

Open the app in a browser, or in Chrome DevTools device mode to test the mobile layout.

---

## 11. Project status and roadmap

**Status: working prototype.** The full booking, escrow, completion-code, notification and admin flows run end to end in the browser. Data lives in local storage, and payments and identity checks are simulated.

**Not yet in production**
- Real payments and escrow (Paystack/Flutterwave)
- Real NIN/BVN verification
- A server-side database, authentication and role-based access control
- SMS, push and email delivery

**Roadmap**
- Multiple service options with option-based pricing, plus time-based and recurring plans
- Zone-based "instant" availability where partner density allows
- Richer live tracking of the booking and the partner's journey
- Full customer and partner profile views for admins
- Removal of remaining demo data so the platform runs on real onboarded users
- Backend, payments and identity integrations

---

## 12. Contributors

- **Idowu Esther**
- **Bajo Boluwatife**
- **Ojetunde Elijah**, [GitHub](https://github.com/Ojetunde-Elijah)

---

## 13. Sources

Market figures were gathered in September 2026. Startup figures change quickly, so re-check before publishing.

- TechCrunch, *India's Pronto formalizes house help as its valuation jumps 8x in under a year* (2 Mar 2026): https://techcrunch.com/2026/03/02/indias-pronto-formalizes-house-help-as-its-valuation-jumps-8x-in-under-a-year/
- TechCrunch, *A 20-minute pitch wins Indian startup Pronto backing from Lachy Groom* (6 May 2026): https://techcrunch.com/2026/05/06/a-20-minute-pitch-wins-indian-startup-pronto-backing-from-lachy-groom/
- Inc42, *Home Services Startup Pronto Raises $25 Mn* (3 Mar 2026): https://inc42.com/buzz/home-services-startup-pronto-raises-25-mn/
- Tracxn, Pronto company profile: https://tracxn.com/d/companies/pronto/__jaQnkWzTYoYJJX-4oyUFY_4y4BGGbpDlQORs2_tAFzA
- The Optimist, *Anjali Sardana's Pronto*: https://theoptimist.news/anjali-sardana-pronto-founder/
- BusinessDay, *Hustle economy: 93% of Nigerians engaged in survivalist informal employment* (NESG 2025 report): https://businessday.ng/news/article/hustle-economy-93-of-nigerians-engaged-in-survivalist-informal-employment/
- BusinessDay, *Nigeria's informal economy: the fragile foundation of a $1 trillion ambition* (Oct 2025): https://premium.businessday.ng/article/insights/Nigerias-informal-economy-The-fragile-foundation-of-a-1-trillion-ambition
- Africa Finance Headlines, *Africa's informal economy employs 83% of workforce in 2024* (UN ECA data): https://northafricapost.com/?p=96624
- KPMG Nigeria, *Nigeria smartphone study* (2026): https://kpmg.com/ng/en/insights/2026/09/nigeria-smartphone-study.html
- MEA Tech Watch, *Nigeria's digital surge: 83.2% of phone users now online* (NCC Jan 2026 data): https://meatechwatch.com/2026/03/11/nigerias-digital-surge-83-2-of-phone-users-now-online/
- BusinessDay, *Internet boom to connect 32m more subscribers* (GSMA): https://businessday.ng/technology/article/internet-boom-to-connect-32m-more-subscribers/
- Data for India, *How big is India's formal sector?* (ILO informal employment rate 2025): https://www.dataforindia.com/informal-sector-sizing/
- WIEGO, *Informal Workers in India: A Statistical Profile*: https://www.wiego.org/wp-content/uploads/2020/10/WIEGO_Statistical_Brief_N24_India.pdf