// Pure helpers + seed data shared by the platform store and the new feature screens.
// Everything here maps 1:1 to a future backend service (see BACKEND_INTEGRATION.md).

export type Area = { lat: number; lng: number; city: string };
export const AREAS: Record<string, Area> = {
  "Lekki Phase 1, Lagos": { lat: 6.4478, lng: 3.4723, city: "Lagos" },
  "Victoria Island, Lagos": { lat: 6.4281, lng: 3.4219, city: "Lagos" },
  "Ikeja GRA, Lagos": { lat: 6.5833, lng: 3.35, city: "Lagos" },
  "Yaba, Lagos": { lat: 6.5095, lng: 3.3711, city: "Lagos" },
  "Wuse 2, Abuja": { lat: 9.0765, lng: 7.4698, city: "Abuja" },
  "Maitama, Abuja": { lat: 9.0906, lng: 7.493, city: "Abuja" },
};
export const AREA_NAMES = Object.keys(AREAS);

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export const CATEGORIES = [
  { key: "cleaning", label: "Cleaning & laundry", match: /clean|laundry/i },
  { key: "plumbing", label: "Plumbing", match: /plumb/i },
  { key: "electrical", label: "Electrical", match: /electr/i },
  { key: "ac", label: "Air conditioning", match: /\bac\b|air.?con/i },
  { key: "carpentry", label: "Carpentry & furniture", match: /carpent|furniture/i },
  { key: "painting", label: "Painting & wall work", match: /paint|wall/i },
  { key: "handyman", label: "General handyman", match: /handyman/i },
  { key: "appliance", label: "Appliance services", match: /appliance/i },
  { key: "beauty", label: "Beauty at home", match: /beauty|makeup|hair|groom/i },
] as const;
export function categoryOf(service: string) { return CATEGORIES.find((item) => item.key === service || item.label === service || item.match.test(service))?.key ?? "other"; }

export const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/* ---------- customer profile, wallet, loyalty ---------- */
export type SavedAddress = { id: string; label: string; address: string; isDefault: boolean };
export type PaymentMethod = { id: string; brand: string; last4: string; expiry: string; holder: string; isDefault: boolean; gatewayRef: string };
export type LedgerEntry = { id: string; kind: "welcome" | "referral" | "loyalty" | "redeem" | "spent" | "refund"; credit: number; points: number; note: string; createdAt: string };
export type CustomerProfile = {
  accountId: string; email: string; addresses: SavedAddress[]; methods: PaymentMethod[];
  prefs: { preferredSlot: string; accessNote: string; channels: { push: boolean; sms: boolean; email: boolean } };
  referralCode: string; referredBy?: string; referralRewarded?: boolean;
  credit: number; points: number; lifetimePoints: number; ledger: LedgerEntry[]; favourites: string[];
};
export const SLOT_OPTIONS = ["Today · 2:00 – 4:00 PM", "Today · 5:00 – 7:00 PM", "Tomorrow · 9:00 – 11:00 AM", "Tomorrow · 1:00 – 3:00 PM"];

export function referralCodeFor(account: { id: string; name: string }) {
  const letters = account.name.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 4).padEnd(4, "X");
  let hash = 0;
  for (const char of account.id) hash = (hash * 31 + char.charCodeAt(0)) % 900;
  return `${letters}${100 + hash}`;
}
export function defaultProfile(account: { id: string; name: string }): CustomerProfile {
  return { accountId: account.id, email: "", addresses: [], methods: [], prefs: { preferredSlot: SLOT_OPTIONS[0], accessNote: "", channels: { push: true, sms: true, email: true } }, referralCode: referralCodeFor(account), credit: 0, points: 0, lifetimePoints: 0, ledger: [], favourites: [] };
}
export const TIERS = [
  { name: "Bronze", min: 0, perk: "Earn 1 point per ₦100 spent" },
  { name: "Silver", min: 500, perk: "Priority support + early access to offers" },
  { name: "Gold", min: 1500, perk: "Free service protection fee on every booking" },
];
export function tierOf(lifetimePoints: number) {
  const index = TIERS.reduce((best, tier, i) => (lifetimePoints >= tier.min ? i : best), 0);
  return { tier: TIERS[index], next: TIERS[index + 1] };
}

export type Settings = { referrerReward: number; refereeReward: number; pointsPer100: number; redeemBlock: number; redeemValue: number };
export const DEFAULT_SETTINGS: Settings = { referrerReward: 1000, refereeReward: 1000, pointsPer100: 1, redeemBlock: 100, redeemValue: 500 };

/* ---------- promotions ---------- */
export type Promo = { id: string; code: string; description: string; type: "percent" | "flat"; value: number; maxDiscount: number; minOrder: number; maxUses: number; used: number; expiresAt?: string; audience: "all" | "new"; active: boolean; createdAt: string };
export type PromoResult = { ok: boolean; discount: number; message: string };
export function evaluatePromo(promo: Promo | undefined, subtotal: number, ctx: { isNewCustomer: boolean; usedByCustomer: boolean }, now = Date.now()): PromoResult {
  const fail = (message: string): PromoResult => ({ ok: false, discount: 0, message });
  if (!promo) return fail("That code isn't valid.");
  if (!promo.active) return fail("This code is no longer active.");
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() + 86400000 < now) return fail("This code has expired.");
  if (promo.maxUses > 0 && promo.used >= promo.maxUses) return fail("This code has been fully redeemed.");
  if (promo.audience === "new" && !ctx.isNewCustomer) return fail("This code is for first bookings only.");
  if (ctx.usedByCustomer) return fail("You've already used this code.");
  if (subtotal < promo.minOrder) return fail(`Spend at least ₦${promo.minOrder.toLocaleString()} to use this code.`);
  let discount = promo.type === "percent" ? Math.floor((subtotal * promo.value) / 100) : promo.value;
  if (promo.maxDiscount > 0) discount = Math.min(discount, promo.maxDiscount);
  discount = Math.min(discount, subtotal);
  return { ok: true, discount, message: `${promo.code} applied · you save ₦${discount.toLocaleString()}` };
}

/* ---------- seeds: ONLY the demo customer / partner / admin accounts. Everything else is created by real users. ---------- */
type SeedProvider = { id: string; accountId: string; name: string; phone: string; service: string; category: string; city: string; rating: number; completedJobs: number; joinedAt: string; area: string; years: number; bio: string; available: boolean; days: string[]; reviews: number };
export const SEED_PROVIDERS: SeedProvider[] = [
  { id: "provider-demo", accountId: "partner-demo", name: "Ibrahim Musa", phone: "08012345678", service: "Air conditioning", category: "ac", city: "Lagos", rating: 0, completedJobs: 0, joinedAt: "2024-03-18T09:00:00.000Z", area: "Lekki Phase 1, Lagos", years: 8, bio: "Certified HVAC technician (demo partner).", available: true, days: DAYS.slice(0, 6), reviews: 0 },
];
export const SEED_PROMOS: Promo[] = [];

export const PROTECTION_FEE = 750;
/** Gold members have the service protection fee waived (funded by the platform). */
export function loyaltyDiscount(lifetimePoints: number) { return tierOf(lifetimePoints).tier.name === "Gold" ? PROTECTION_FEE : 0; }
