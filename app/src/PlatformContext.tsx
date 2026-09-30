import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from "react";
import type { Session, UserRole } from "./AuthModal";
import { DEFAULT_CATALOG, DEFAULT_PRICING, type CatalogItem, type LineItem, type PricingSettings } from "./catalog";
import { AREA_NAMES, AREAS, DEFAULT_SETTINGS, SEED_PROMOS, SEED_PROVIDERS, categoryOf, defaultProfile, evaluatePromo, loyaltyDiscount, referralCodeFor, type CustomerProfile, type LedgerEntry, type Promo, type PromoResult, type Settings } from "./platformLogic";

export type Account = Session & { id: string; password: string };
export type Guarantor = { name: string; relationship: string; nin: string };
export type ProviderApplication = {
  fullName: string; phone: string; email: string; city: string; lga: string; category: string; experience: string; bio: string;
  nin: string; ninVerified: boolean; bvn: string; bank: string; accountNumber: string; selfieVerified: boolean;
  guarantors: Guarantor[]; assessment: string; certificateName: string; residentIdName: string; consent: boolean; termsAccepted: boolean; submittedAt: string;
};
export type Provider = { id: string; accountId: string; name: string; service: string; category?: string; city: string; status: "pending" | "approved" | "rejected"; rating: number; completedJobs: number; joinedAt: string; phone?: string; area?: string; years?: number; bio?: string; available?: boolean; days?: string[]; reviews?: number; application?: ProviderApplication; training?: string[]; decidedAt?: string; decisionNote?: string };
export type Quote = { amount: number; note: string; status: "pending" | "approved" | "declined"; createdAt: string };
export type BookingEvent = { label: string; at: string };
export type Withdrawal = { id: string; providerId: string; amount: number; bank: string; status: "requested" | "paid"; createdAt: string; paidAt?: string };
export type BookingStatus = "paid" | "accepted" | "in_progress" | "completed" | "cancelled";
export type Booking = { id: string; customerId: string; customerName: string; service: string; address: string; slot: string; amount: number; status: BookingStatus; completionPin: string; providerId?: string; createdAt: string; completedAt?: string; note?: string; discount?: number; creditUsed?: number; promoCode?: string; paidWith?: string; requestedProviderId?: string; acceptedAt?: string; startedAt?: string; rating?: number; review?: string; ratedAt?: string; category?: string; area?: string; lines?: LineItem[]; planId?: string; seriesId?: string; visitNo?: number; visitsTotal?: number; instant?: boolean; instantFee?: number; surgeFee?: number; etaMinutes?: number; enRouteAt?: string; events?: BookingEvent[]; quote?: Quote };
export type Payment = { id: string; bookingId: string; amount: number; status: "escrow" | "released" | "refunded"; createdAt: string };
export type NotificationAudience = "consumer" | "artisan" | "admin";
export type NotificationKind = "booking" | "job" | "escrow" | "partner" | "system";
export type AppNotification = { id: string; audience: NotificationAudience; recipientId?: string; kind: NotificationKind; title: string; body: string; refId?: string; read: boolean; createdAt: string; channels: ("in_app" | "push" | "sms" | "email")[] };
export type PlatformState = { accounts: Account[]; providers: Provider[]; bookings: Booking[]; payments: Payment[]; notifications: AppNotification[]; profiles: Record<string, CustomerProfile>; promos: Promo[]; settings: Settings; catalog: CatalogItem[]; pricing: PricingSettings; withdrawals: Withdrawal[] };

type Action =
  | { type: "REGISTER"; account: Account }
  | { type: "SUBMIT_PROVIDER"; provider: Provider }
  | { type: "APPROVE_PROVIDER"; providerId: string }
  | { type: "REJECT_PROVIDER"; providerId: string }
  | { type: "CREATE_BOOKING"; booking: Booking; payment: Payment }
  | { type: "ACCEPT_BOOKING"; bookingId: string; providerId: string; at: string; eta?: number }
  | { type: "START_BOOKING"; bookingId: string; at: string }
  | { type: "COMPLETE_BOOKING"; bookingId: string; providerId: string }
  | { type: "CANCEL_BOOKING"; bookingId: string }
  | { type: "DECLINE_REQUESTED"; bookingId: string }
  | { type: "RATE_BOOKING"; bookingId: string; rating: number; review: string; at: string }
  | { type: "NOTIFY"; items: AppNotification[] }
  | { type: "MARK_READ"; ids: string[] }
  | { type: "PROFILE_UPDATE"; accountId: string; fn: (profile: CustomerProfile) => CustomerProfile }
  | { type: "RENAME_ACCOUNT"; accountId: string; name: string }
  | { type: "PROVIDER_PATCH"; providerId: string; patch: Partial<Provider> }
  | { type: "PROMO_ADD"; promo: Promo }
  | { type: "PROMO_TOGGLE"; promoId: string }
  | { type: "PROMO_DELETE"; promoId: string }
  | { type: "SETTINGS"; patch: Partial<Settings> }
  | { type: "ENROUTE"; bookingId: string; at: string }
  | { type: "QUOTE_SEND"; bookingId: string; quote: Quote }
  | { type: "QUOTE_RESPOND"; bookingId: string; approve: boolean; at: string }
  | { type: "CATALOG_SET"; catalog: CatalogItem[] }
  | { type: "PRICING_SET"; patch: Partial<PricingSettings> }
  | { type: "WITHDRAW"; withdrawal: Withdrawal }
  | { type: "WITHDRAW_PAID"; id: string; at: string }
  | { type: "BOOKING_PAYMENT_EXTRA"; bookings: Booking[]; payments: Payment[] }
  | { type: "SYNC"; state: PlatformState };

const seedAccounts: Account[] = [
  { id: "admin-1", name: "Adaeze Admin", phone: "08000000000", password: "admin123", role: "admin" },
  { id: "customer-demo", name: "Chidinma Okeke", phone: "08098765432", password: "customer123", role: "consumer" },
  ...SEED_PROVIDERS.map((seed): Account => ({ id: seed.accountId, name: seed.name, phone: seed.phone, password: "partner123", role: "artisan" })),
];
const seedProviders: Provider[] = SEED_PROVIDERS.map(({ phone: _phone, ...seed }) => ({ ...seed, status: "approved" as const }));

const initialState: PlatformState = { accounts: seedAccounts, providers: seedProviders, bookings: [], payments: [], notifications: [], profiles: {}, promos: SEED_PROMOS, settings: DEFAULT_SETTINGS, catalog: DEFAULT_CATALOG, pricing: DEFAULT_PRICING, withdrawals: [] };

/** Merge saved state with new seeds/fields so existing browsers upgrade cleanly. */
function hydrate(saved: Partial<PlatformState>): PlatformState {
  const merged = { ...initialState, ...saved } as PlatformState;
  merged.accounts = [...merged.accounts, ...seedAccounts.filter((seed) => !merged.accounts.some((item) => item.id === seed.id))];
  merged.providers = [...merged.providers.map((item) => { const seed = seedProviders.find((s) => s.id === item.id); return seed ? { ...seed, ...Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined)) } as Provider : item; }), ...seedProviders.filter((seed) => !merged.providers.some((item) => item.id === seed.id))];
  merged.promos = [...(merged.promos || []), ...SEED_PROMOS.filter((seed) => !(merged.promos || []).some((item) => item.id === seed.id))];
  merged.profiles = merged.profiles || {};
  merged.settings = { ...DEFAULT_SETTINGS, ...(merged.settings || {}) };
  merged.notifications = merged.notifications || [];
  merged.catalog = merged.catalog?.length ? merged.catalog : DEFAULT_CATALOG;
  merged.pricing = { ...DEFAULT_PRICING, ...(merged.pricing || {}) };
  merged.withdrawals = merged.withdrawals || [];
  return merged;
}

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function withProfile(state: PlatformState, accountId: string, fn: (profile: CustomerProfile) => CustomerProfile): PlatformState {
  const account = state.accounts.find((item) => item.id === accountId);
  const current = state.profiles[accountId] ?? defaultProfile(account ?? { id: accountId, name: "Customer" });
  return { ...state, profiles: { ...state.profiles, [accountId]: fn(current) } };
}
function addLedger(profile: CustomerProfile, entry: Omit<LedgerEntry, "id" | "createdAt">): CustomerProfile {
  return { ...profile, credit: profile.credit + entry.credit, points: Math.max(0, profile.points + entry.points), lifetimePoints: profile.lifetimePoints + (entry.kind === "loyalty" ? entry.points : 0), ledger: [{ ...entry, id: uid("led"), createdAt: new Date().toISOString() }, ...profile.ledger].slice(0, 100) };
}
export function pointsFor(settings: Settings, booking: Booking) { return Math.floor(((booking.amount - (booking.discount || 0)) / 100) * settings.pointsPer100); }
export function referralPayout(state: PlatformState, booking: Booking) {
  const profile = state.profiles[booking.customerId];
  if (!profile?.referredBy || profile.referralRewarded) return null;
  const referrer = state.accounts.find((item) => item.role === "consumer" && item.id !== booking.customerId && referralCodeFor(item) === profile.referredBy);
  return referrer ? { referrerId: referrer.id, referrerName: referrer.name, amount: state.settings.referrerReward } : null;
}

const ev = (booking: Booking, label: string, at: string): BookingEvent[] => [...(booking.events || []), { label, at }];
export function providerWallet(state: PlatformState, providerId: string) {
  const done = state.bookings.filter((b) => b.providerId === providerId && b.status === "completed");
  const earned = Math.round(done.reduce((sum, b) => sum + b.amount, 0) * 0.85);
  const mine = state.withdrawals.filter((w) => w.providerId === providerId);
  const withdrawn = mine.reduce((sum, w) => sum + w.amount, 0);
  return { earned, withdrawn, available: Math.max(0, earned - withdrawn), gmv: done.reduce((sum, b) => sum + b.amount, 0), completed: done.length };
}

function reducer(state: PlatformState, action: Action): PlatformState {
  switch (action.type) {
    case "REGISTER": return { ...state, accounts: [...state.accounts, action.account] };
    case "SUBMIT_PROVIDER": {
      const exists = state.providers.some((provider) => provider.accountId === action.provider.accountId);
      return { ...state, providers: exists ? state.providers.map((provider) => provider.accountId === action.provider.accountId ? action.provider : provider) : [...state.providers, action.provider] };
    }
    case "APPROVE_PROVIDER": return { ...state, providers: state.providers.map((provider) => provider.id === action.providerId ? { ...provider, status: "approved" } : provider) };
    case "REJECT_PROVIDER": return { ...state, providers: state.providers.map((provider) => provider.id === action.providerId ? { ...provider, status: "rejected" } : provider) };
    case "CREATE_BOOKING": {
      let next: PlatformState = { ...state, bookings: [action.booking, ...state.bookings], payments: [action.payment, ...state.payments] };
      const code = action.booking.promoCode;
      if (code) next = { ...next, promos: next.promos.map((promo) => promo.code === code ? { ...promo, used: promo.used + 1 } : promo) };
      if (action.booking.creditUsed) next = withProfile(next, action.booking.customerId, (profile) => addLedger(profile, { kind: "spent", credit: -(action.booking.creditUsed || 0), points: 0, note: `Credit applied to ${action.booking.id}` }));
      return next;
    }
    case "ACCEPT_BOOKING": {
      const target = state.bookings.find((b) => b.id === action.bookingId);
      return { ...state, bookings: state.bookings.map((b) => {
        const same = b.id === action.bookingId || (!!target?.seriesId && b.seriesId === target.seriesId && b.status === "paid" && !b.providerId);
        return same ? { ...b, providerId: action.providerId, status: "accepted", acceptedAt: action.at, etaMinutes: action.eta, events: ev(b, "Professional accepted the job", action.at) } : b;
      }) };
    }
    case "ENROUTE": return { ...state, bookings: state.bookings.map((b) => b.id === action.bookingId ? { ...b, enRouteAt: action.at, events: ev(b, "Professional is on the way", action.at) } : b) };
    case "START_BOOKING": return { ...state, bookings: state.bookings.map((b) => b.id === action.bookingId ? { ...b, status: "in_progress", startedAt: action.at, events: ev(b, "Service started", action.at) } : b) };
    case "QUOTE_SEND": return { ...state, bookings: state.bookings.map((b) => b.id === action.bookingId ? { ...b, quote: action.quote, events: ev(b, `Quotation sent · ₦${action.quote.amount.toLocaleString()}`, action.quote.createdAt) } : b) };
    case "QUOTE_RESPOND": {
      const booking = state.bookings.find((b) => b.id === action.bookingId);
      if (!booking?.quote || booking.quote.status !== "pending") return state;
      const add = action.approve ? booking.quote.amount : 0;
      return { ...state,
        bookings: state.bookings.map((b) => b.id === action.bookingId ? { ...b, amount: b.amount + add, quote: { ...b.quote!, status: action.approve ? "approved" : "declined" }, events: ev(b, action.approve ? "Quotation approved · escrow topped up" : "Quotation declined", action.at) } : b),
        payments: state.payments.map((p) => p.bookingId === action.bookingId ? { ...p, amount: p.amount + add } : p) };
    }
    case "CATALOG_SET": return { ...state, catalog: action.catalog };
    case "PRICING_SET": return { ...state, pricing: { ...state.pricing, ...action.patch } };
    case "WITHDRAW": return { ...state, withdrawals: [action.withdrawal, ...state.withdrawals] };
    case "WITHDRAW_PAID": return { ...state, withdrawals: state.withdrawals.map((w) => w.id === action.id ? { ...w, status: "paid", paidAt: action.at } : w) };
    case "BOOKING_PAYMENT_EXTRA": return { ...state, bookings: [...action.bookings, ...state.bookings], payments: [...action.payments, ...state.payments] };
    case "COMPLETE_BOOKING": {
      const booking = state.bookings.find((item) => item.id === action.bookingId);
      let next: PlatformState = {
        ...state,
        bookings: state.bookings.map((item) => item.id === action.bookingId ? { ...item, status: "completed", completedAt: new Date().toISOString(), events: ev(item, "Service completed · payment released", new Date().toISOString()) } : item),
        payments: state.payments.map((payment) => payment.bookingId === action.bookingId ? { ...payment, status: "released" } : payment),
        providers: state.providers.map((provider) => provider.id === action.providerId ? { ...provider, completedJobs: provider.completedJobs + 1 } : provider),
      };
      if (booking) {
        const earned = pointsFor(state.settings, booking);
        next = withProfile(next, booking.customerId, (profile) => addLedger(profile, { kind: "loyalty", credit: 0, points: earned, note: `Earned on ${booking.id}` }));
        const payout = referralPayout(state, booking);
        if (payout) {
          next = withProfile(next, payout.referrerId, (profile) => addLedger(profile, { kind: "referral", credit: payout.amount, points: 0, note: `Referral reward · ${booking.customerName}'s first booking` }));
          next = withProfile(next, booking.customerId, (profile) => ({ ...profile, referralRewarded: true }));
        }
      }
      return next;
    }
    case "CANCEL_BOOKING": {
      const booking = state.bookings.find((item) => item.id === action.bookingId);
      if (!booking || booking.status === "completed" || booking.status === "cancelled") return state;
      let next: PlatformState = { ...state, bookings: state.bookings.map((item) => item.id === action.bookingId ? { ...item, status: "cancelled", events: ev(item, "Booking cancelled", new Date().toISOString()) } : item), payments: state.payments.map((payment) => payment.bookingId === action.bookingId ? { ...payment, status: "refunded" } : payment) };
      if (booking.promoCode) next = { ...next, promos: next.promos.map((promo) => promo.code === booking.promoCode ? { ...promo, used: Math.max(0, promo.used - 1) } : promo) };
      if (booking.creditUsed) next = withProfile(next, booking.customerId, (profile) => addLedger(profile, { kind: "refund", credit: booking.creditUsed || 0, points: 0, note: `Credit refunded from ${booking.id}` }));
      return next;
    }
    case "DECLINE_REQUESTED": return { ...state, bookings: state.bookings.map((booking) => booking.id === action.bookingId ? { ...booking, requestedProviderId: undefined } : booking) };
    case "RATE_BOOKING": {
      const booking = state.bookings.find((item) => item.id === action.bookingId);
      if (!booking || booking.rating) return state;
      return {
        ...state,
        bookings: state.bookings.map((item) => item.id === action.bookingId ? { ...item, rating: action.rating, review: action.review || undefined, ratedAt: action.at } : item),
        providers: state.providers.map((provider) => {
          if (provider.id !== booking.providerId) return provider;
          const count = provider.rating > 0 ? (provider.reviews ?? provider.completedJobs) : 0;
          return { ...provider, rating: Math.round(((provider.rating * count + action.rating) / (count + 1)) * 100) / 100, reviews: count + 1 };
        }),
      };
    }
    case "NOTIFY": return { ...state, notifications: [...action.items, ...state.notifications].slice(0, 300) };
    case "MARK_READ": return { ...state, notifications: state.notifications.map((item) => action.ids.includes(item.id) ? { ...item, read: true } : item) };
    case "PROFILE_UPDATE": return withProfile(state, action.accountId, action.fn);
    case "RENAME_ACCOUNT": return { ...state, accounts: state.accounts.map((item) => item.id === action.accountId ? { ...item, name: action.name } : item) };
    case "PROVIDER_PATCH": return { ...state, providers: state.providers.map((provider) => provider.id === action.providerId ? { ...provider, ...action.patch } : provider) };
    case "PROMO_ADD": return { ...state, promos: [action.promo, ...state.promos] };
    case "PROMO_TOGGLE": return { ...state, promos: state.promos.map((promo) => promo.id === action.promoId ? { ...promo, active: !promo.active } : promo) };
    case "PROMO_DELETE": return { ...state, promos: state.promos.filter((promo) => promo.id !== action.promoId) };
    case "SETTINGS": return { ...state, settings: { ...state.settings, ...action.patch } };
    case "SYNC": return action.state;
  }
  return state;
}

type Result = { ok: boolean; message: string };
type PlatformApi = PlatformState & {
  register: (name: string, phone: string, password: string, role: Exclude<UserRole, "admin">) => Account;
  authenticate: (phone: string, password: string, role: UserRole) => Account | null;
  submitProvider: (account: Account, application: ProviderApplication) => void;
  approveProvider: (providerId: string) => void;
  rejectProvider: (providerId: string) => void;
  createBooking: (input: Omit<Booking, "id" | "createdAt" | "completionPin" | "status">, extraVisits?: { slot: string; amount: number }[]) => Booking;
  acceptBooking: (bookingId: string, providerId: string) => void;
  declineBooking: (bookingId: string, providerId: string) => void;
  startBooking: (bookingId: string) => void;
  completeBooking: (bookingId: string, providerId: string, pin: string) => boolean;
  cancelBooking: (bookingId: string) => void;
  rateBooking: (bookingId: string, rating: number, review: string) => Result;
  notificationsFor: (audience: NotificationAudience, recipientId?: string) => AppNotification[];
  markNotificationsRead: (ids: string[]) => void;
  // customer profile, wallet & loyalty
  profileOf: (accountId: string) => CustomerProfile;
  updateProfile: (accountId: string, fn: (profile: CustomerProfile) => CustomerProfile) => void;
  renameAccount: (accountId: string, name: string) => void;
  validatePromo: (code: string, subtotal: number, customerId: string) => PromoResult & { promo?: Promo };
  redeemReferralCode: (accountId: string, code: string) => Result;
  redeemPoints: (accountId: string, blocks: number) => Result;
  // partner listing
  patchProvider: (providerId: string, patch: Partial<Provider>) => void;
  // admin: promotions, settings, demo data
  createPromo: (input: Pick<Promo, "code" | "description" | "type" | "value" | "maxDiscount" | "minOrder" | "maxUses" | "expiresAt" | "audience">) => Result;
  togglePromo: (promoId: string) => void;
  deletePromo: (promoId: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  enRoute: (bookingId: string) => void;
  sendQuote: (bookingId: string, amount: number, note: string) => Result;
  respondQuote: (bookingId: string, approve: boolean) => void;
  saveCatalog: (catalog: CatalogItem[]) => void;
  updatePricing: (patch: Partial<PricingSettings>) => void;
  requestWithdrawal: (providerId: string, amount: number) => Result;
  markWithdrawalPaid: (id: string) => void;
  toggleTraining: (providerId: string, courseId: string) => void;
};

const PlatformContext = createContext<PlatformApi | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState, (fallback) => {
    const saved = localStorage.getItem("servenaija-platform-state-v2");
    if (!saved) return fallback;
    try { return hydrate(JSON.parse(saved)); } catch { return fallback; }
  });
  useEffect(() => { localStorage.setItem("servenaija-platform-state-v2", JSON.stringify(state)); }, [state]);
  // Keep every open tab (customer, partner, admin) in sync in real time.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== "servenaija-platform-state-v2" || !event.newValue) return;
      try { dispatch({ type: "SYNC", state: hydrate(JSON.parse(event.newValue)) }); } catch { /* ignore */ }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const money = (amount: number) => `₦${amount.toLocaleString()}`;
  // Integration point: replace with POST /notifications + push/SMS/email providers (see BACKEND_INTEGRATION.md).
  const make = (audience: NotificationAudience, kind: NotificationKind, title: string, body: string, refId?: string, recipientId?: string, channels: AppNotification["channels"] = ["in_app"]): AppNotification => {
    const prefs = audience === "consumer" && recipientId ? state.profiles[recipientId]?.prefs.channels : undefined;
    const allowed = prefs ? channels.filter((channel) => channel === "in_app" || prefs[channel]) : channels;
    return { id: uid("ntf"), audience, recipientId, kind, title, body, refId, read: false, createdAt: new Date().toISOString(), channels: allowed };
  };
  const notify = (items: AppNotification[]) => { if (items.length) dispatch({ type: "NOTIFY", items }); };
  const getProfile = (accountId: string) => {
    const account = state.accounts.find((item) => item.id === accountId);
    return state.profiles[accountId] ?? defaultProfile(account ?? { id: accountId, name: "Customer" });
  };
  const promoContext = (customerId: string, code: string) => ({
    isNewCustomer: !state.bookings.some((booking) => booking.customerId === customerId && booking.status !== "cancelled"),
    usedByCustomer: state.bookings.some((booking) => booking.customerId === customerId && booking.promoCode === code && booking.status !== "cancelled"),
  });

  const api = useMemo<PlatformApi>(() => ({
    ...state,
    register(name, phone, password, role) {
      const account: Account = { id: `acct-${Date.now()}`, name, phone: phone.replace(/\D/g, ""), password, role };
      dispatch({ type: "REGISTER", account });
      return account;
    },
    authenticate(phone, password, role) {
      const cleanPhone = phone.replace(/\D/g, "");
      return state.accounts.find((account) => account.phone === cleanPhone && account.password === password && account.role === role) || null;
    },
    submitProvider(account, application) {
      const category = categoryOf(application.category);
      const area = AREA_NAMES.find((name) => name.toLowerCase().startsWith(application.lga.toLowerCase())) || AREA_NAMES.find((name) => AREAS[name].city.toLowerCase() === application.city.toLowerCase()) || AREA_NAMES[0];
      const years = application.experience.startsWith("6") ? 6 : application.experience.startsWith("3") ? 4 : application.experience.startsWith("1") ? 1 : 0;
      const existing = state.providers.find((item) => item.accountId === account.id);
      dispatch({ type: "SUBMIT_PROVIDER", provider: { ...(existing || {}), id: `provider-${account.id}`, accountId: account.id, name: application.fullName || account.name, phone: application.phone || account.phone, service: application.category, category, city: application.city, status: "pending", rating: existing?.rating ?? 0, completedJobs: existing?.completedJobs ?? 0, joinedAt: existing?.joinedAt ?? new Date().toISOString(), area, available: true, days: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], years, bio: application.bio || `${application.category} professional serving ${application.city}.`, application } });
      notify([
        make("admin", "partner", "New partner application", `${application.fullName} applied as ${application.category} in ${application.city}. Review in Compliance.`, `provider-${account.id}`),
        make("artisan", "partner", "Application received", "Your application is with our compliance team. We'll notify you once it's reviewed.", `provider-${account.id}`, account.id),
      ]);
    },
    approveProvider(providerId) {
      const provider = state.providers.find((item) => item.id === providerId);
      dispatch({ type: "APPROVE_PROVIDER", providerId });
      if (provider) notify([make("artisan", "partner", "You're approved 🎉", "Your profile is live. You can now receive paid job requests.", providerId, provider.accountId, ["in_app", "push", "sms"]), make("admin", "partner", "Partner activated", `${provider.name} was approved and is now live.`, providerId)]);
    },
    rejectProvider(providerId) {
      const provider = state.providers.find((item) => item.id === providerId);
      dispatch({ type: "REJECT_PROVIDER", providerId });
      if (provider) notify([make("artisan", "partner", "Application needs attention", "Compliance couldn't approve your profile yet. Contact partner support to update your details.", providerId, provider.accountId, ["in_app", "sms"]), make("admin", "partner", "Partner rejected", `${provider.name}'s application was rejected.`, providerId)]);
    },
    createBooking(input, extraVisits = []) {
      const stamp = String(Date.now()).slice(-6);
      const id = `SN-${stamp}`;
      const now = new Date().toISOString();
      const seriesId = extraVisits.length ? `SR-${stamp}` : undefined;
      const profile = getProfile(input.customerId);
      // Server-side style validation: never trust discounts or credit sent by the UI.
      const code = input.promoCode?.trim().toUpperCase();
      const promo = code ? state.promos.find((item) => item.code === code) : undefined;
      const promoResult = code ? evaluatePromo(promo, input.amount, promoContext(input.customerId, code)) : undefined;
      const promoDiscount = promoResult?.ok ? promoResult.discount : 0;
      const tierDiscount = Math.min(loyaltyDiscount(profile.lifetimePoints), input.amount - promoDiscount);
      const discount = promoDiscount + tierDiscount;
      const creditUsed = Math.max(0, Math.min(input.creditUsed ?? 0, profile.credit, input.amount - discount));
      const paid = input.amount - discount - creditUsed;
      const pin = () => String(Math.floor(1000 + Math.random() * 9000));
      const booking: Booking = { ...input, id, createdAt: now, completionPin: pin(), status: "paid", seriesId, visitNo: seriesId ? 1 : undefined, discount: discount || undefined, creditUsed: creditUsed || undefined, promoCode: promoDiscount ? code : undefined, events: [{ label: "Booking placed · payment held in escrow", at: now }] };
      dispatch({ type: "CREATE_BOOKING", booking, payment: { id: `PAY-${Date.now()}`, bookingId: id, amount: booking.amount, status: "escrow", createdAt: now } });
      if (extraVisits.length) {
        const more: Booking[] = extraVisits.map((visit, n) => ({ ...input, id: `${id}-V${n + 2}`, createdAt: now, completionPin: pin(), status: "paid", seriesId, visitNo: n + 2, slot: visit.slot, amount: visit.amount, instant: false, instantFee: undefined, surgeFee: undefined, promoCode: undefined, creditUsed: undefined, discount: undefined, events: [{ label: "Recurring visit scheduled · paid upfront", at: now }] }));
        dispatch({ type: "BOOKING_PAYMENT_EXTRA", bookings: more, payments: more.map((b, n) => ({ id: `PAY-${Date.now()}-${n + 2}`, bookingId: b.id, amount: b.amount, status: "escrow" as const, createdAt: now })) });
      }
      const cityOf = booking.area ? AREAS[booking.area]?.city : undefined;
      const approved = state.providers.filter((item) => item.status === "approved" && (!booking.category || item.category === booking.category) && (!cityOf || item.city === cityOf) && (!booking.instant || item.available !== false));
      const targets = booking.requestedProviderId ? state.providers.filter((item) => item.id === booking.requestedProviderId && item.status === "approved") : approved;
      const perks = [promoDiscount ? `promo ${code} −${money(promoDiscount)}` : "", tierDiscount ? `Gold fee waiver −${money(tierDiscount)}` : "", creditUsed ? `credit −${money(creditUsed)}` : ""].filter(Boolean).join(" · ");
      notify([
        make("consumer", "booking", "Booking confirmed", `${booking.service} · ${money(paid)} paid${perks ? ` (${perks})` : ""} and held safely in escrow.${extraVisits.length ? ` ${extraVisits.length + 1} visits scheduled.` : ""} Your completion code is ${booking.completionPin}.`, id, booking.customerId, ["in_app", "email", "sms"]),
        ...targets.map((item) => make("artisan", "job", booking.instant ? "⚡ INSTANT job · respond now" : booking.requestedProviderId ? "Customer requested you" : "New paid job request", `${booking.service} at ${booking.address}. You'll earn ${money(Math.round(booking.amount * .85))}.${booking.note ? ` Note: ${booking.note}` : ""}`, id, item.accountId, ["in_app", "push", "sms"])),
        make("admin", "escrow", "New booking · escrow funded", `${booking.customerName} booked ${booking.service} (${id}) · ${money(booking.amount)}${perks ? ` · ${perks}` : ""}.${targets.length ? "" : " ⚠ No matching partner online."}`, id),
      ]);
      return booking;
    },
    acceptBooking(bookingId, providerId) {
      const booking = state.bookings.find((item) => item.id === bookingId);
      const provider = state.providers.find((item) => item.id === providerId);
      dispatch({ type: "ACCEPT_BOOKING", bookingId, providerId, at: new Date().toISOString(), eta: booking?.instant ? 10 : 30 });
      if (booking && provider) notify([
        make("consumer", "booking", "Professional assigned", `${provider.name} accepted your ${booking.service} booking${booking.instant ? " and will arrive in about 10 minutes" : ""}.`, bookingId, booking.customerId, ["in_app", "push", "sms"]),
        make("artisan", "job", "Job accepted", `${booking.service} for ${booking.customerName} is now on your schedule.`, bookingId, provider.accountId),
        make("admin", "booking", "Job dispatched", `${provider.name} accepted ${bookingId} (${booking.service}).`, bookingId),
      ]);
    },
    enRoute(bookingId) {
      const booking = state.bookings.find((item) => item.id === bookingId);
      const provider = state.providers.find((item) => item.id === booking?.providerId);
      dispatch({ type: "ENROUTE", bookingId, at: new Date().toISOString() });
      if (booking) notify([make("consumer", "booking", "Your professional is on the way", `${provider?.name || "Your professional"} has left for ${booking.address}. Track arrival in My bookings.`, bookingId, booking.customerId, ["in_app", "push", "sms"])]);
    },
    sendQuote(bookingId, amount, note) {
      const booking = state.bookings.find((item) => item.id === bookingId);
      if (!booking) return { ok: false, message: "Booking not found." };
      if (!(amount > 0)) return { ok: false, message: "Enter the quotation amount." };
      dispatch({ type: "QUOTE_SEND", bookingId, quote: { amount: Math.round(amount), note: note.trim(), status: "pending", createdAt: new Date().toISOString() } });
      notify([make("consumer", "booking", "Quotation ready for approval", `${booking.service}: your professional quoted ${money(amount)}. Approve it in My bookings before work begins.`, bookingId, booking.customerId, ["in_app", "push", "sms"]), make("admin", "booking", "Quotation issued", `${bookingId} quoted ${money(amount)}.`, bookingId)]);
      return { ok: true, message: "Quotation sent to the customer." };
    },
    respondQuote(bookingId, approve) {
      const booking = state.bookings.find((item) => item.id === bookingId);
      dispatch({ type: "QUOTE_RESPOND", bookingId, approve, at: new Date().toISOString() });
      if (booking?.providerId) { const provider = state.providers.find((item) => item.id === booking.providerId); if (provider) notify([make("artisan", "job", approve ? "Quotation approved" : "Quotation declined", approve ? `${booking.customerName} approved ${money(booking.quote?.amount || 0)}. The extra amount is now in escrow — you can begin the work.` : `${booking.customerName} declined the quotation. Complete the inspection only.`, bookingId, provider.accountId, ["in_app", "push"])]); }
    },
    saveCatalog(catalog) { dispatch({ type: "CATALOG_SET", catalog }); },
    updatePricing(patch) { dispatch({ type: "PRICING_SET", patch }); },
    requestWithdrawal(providerId, amount) {
      const provider = state.providers.find((item) => item.id === providerId);
      const wallet = providerWallet(state, providerId);
      if (!provider) return { ok: false, message: "Partner not found." };
      if (!(amount > 0) || amount > wallet.available) return { ok: false, message: "Amount exceeds your available balance." };
      const bank = provider.application ? `${provider.application.bank} · ${provider.application.accountNumber || "—"}` : "Bank on file";
      dispatch({ type: "WITHDRAW", withdrawal: { id: uid("wd"), providerId, amount: Math.round(amount), bank, status: "requested", createdAt: new Date().toISOString() } });
      notify([make("admin", "escrow", "Withdrawal requested", `${provider.name} requested ${money(amount)} to ${bank}.`, providerId), make("artisan", "escrow", "Withdrawal requested", `${money(amount)} is queued for payout to ${bank}.`, undefined, provider.accountId)]);
      return { ok: true, message: `${money(amount)} queued for payout.` };
    },
    markWithdrawalPaid(id) {
      const wd = state.withdrawals.find((item) => item.id === id);
      dispatch({ type: "WITHDRAW_PAID", id, at: new Date().toISOString() });
      const provider = state.providers.find((item) => item.id === wd?.providerId);
      if (wd && provider) notify([make("artisan", "escrow", "Payout sent", `${money(wd.amount)} has been sent to ${wd.bank}.`, undefined, provider.accountId, ["in_app", "sms"])]);
    },
    toggleTraining(providerId, courseId) {
      const provider = state.providers.find((item) => item.id === providerId);
      const has = provider?.training?.includes(courseId);
      dispatch({ type: "PROVIDER_PATCH", providerId, patch: { training: has ? (provider?.training || []).filter((c) => c !== courseId) : [...(provider?.training || []), courseId] } });
    },
    declineBooking(bookingId, providerId) {
      const booking = state.bookings.find((item) => item.id === bookingId);
      if (!booking || booking.requestedProviderId !== providerId || booking.providerId) return;
      const provider = state.providers.find((item) => item.id === providerId);
      dispatch({ type: "DECLINE_REQUESTED", bookingId });
      notify([
        make("consumer", "booking", "Finding another professional", `${provider?.name || "Your requested professional"} is unavailable. We're matching you with another verified pro.`, bookingId, booking.customerId, ["in_app", "push"]),
        ...state.providers.filter((item) => item.status === "approved" && item.id !== providerId).map((item) => make("artisan", "job", "New paid job request", `${booking.service} at ${booking.address}. You'll earn ${money(Math.round(booking.amount * .85))}.`, bookingId, item.accountId, ["in_app", "push"])),
        make("admin", "booking", "Requested partner declined", `${provider?.name} declined ${bookingId}; it's now open to all partners.`, bookingId),
      ]);
    },
    startBooking(bookingId) {
      const booking = state.bookings.find((item) => item.id === bookingId);
      const provider = state.providers.find((item) => item.id === booking?.providerId);
      dispatch({ type: "START_BOOKING", bookingId, at: new Date().toISOString() });
      if (booking) notify([
        make("consumer", "booking", "Service started", `${provider?.name || "Your professional"} has started ${booking.service}. Share your completion code only when you're satisfied.`, bookingId, booking.customerId, ["in_app", "push"]),
        make("admin", "booking", "Service in progress", `${bookingId} (${booking.service}) is now in progress.`, bookingId),
      ]);
    },
    completeBooking(bookingId, providerId, pin) {
      const booking = state.bookings.find((item) => item.id === bookingId);
      if (!booking || booking.completionPin !== pin || booking.providerId !== providerId) return false;
      const provider = state.providers.find((item) => item.id === providerId);
      const earned = pointsFor(state.settings, booking);
      const payout = referralPayout(state, booking);
      dispatch({ type: "COMPLETE_BOOKING", bookingId, providerId });
      notify([
        make("consumer", "escrow", "Service completed", `${booking.service} is complete. Payment released to the partner. You earned ${earned} loyalty points — rate your pro in Profile › History.`, bookingId, booking.customerId, ["in_app", "email"]),
        make("artisan", "escrow", "Payment released", `${money(Math.round(booking.amount * .85))} for ${bookingId} was released to your wallet after 15% commission.`, bookingId, provider?.accountId, ["in_app", "push", "sms"]),
        make("admin", "escrow", "Escrow released", `${bookingId} completed with PIN. ${money(booking.amount)} released · ${money(Math.round(booking.amount * .15))} platform revenue.`, bookingId),
        ...(payout ? [make("consumer", "system", "Referral reward earned 🎁", `${booking.customerName} completed their first booking — ${money(payout.amount)} credit added to your wallet.`, bookingId, payout.referrerId, ["in_app", "push"]), make("admin", "system", "Referral reward issued", `${money(payout.amount)} credited to ${payout.referrerName} for referring ${booking.customerName}.`, bookingId)] : []),
      ]);
      return true;
    },
    cancelBooking(bookingId) {
      const booking = state.bookings.find((item) => item.id === bookingId);
      const provider = state.providers.find((item) => item.id === booking?.providerId);
      dispatch({ type: "CANCEL_BOOKING", bookingId });
      if (booking) notify([
        make("consumer", "booking", "Booking cancelled", `${booking.service} (${bookingId}) was cancelled.${booking.creditUsed ? ` ${money(booking.creditUsed)} credit returned to your wallet.` : ""}`, bookingId, booking.customerId),
        ...(provider ? [make("artisan", "job", "Job cancelled", `${booking.service} (${bookingId}) was cancelled by the customer.`, bookingId, provider.accountId, ["in_app", "push"])] : []),
        make("admin", "escrow", "Booking cancelled · refund due", `${bookingId} cancelled. ${money(booking.amount)} needs refund review.`, bookingId),
      ]);
    },
    rateBooking(bookingId, rating, review) {
      const booking = state.bookings.find((item) => item.id === bookingId);
      if (!booking || booking.status !== "completed") return { ok: false, message: "Only completed services can be rated." };
      if (booking.rating) return { ok: false, message: "You've already rated this service." };
      const provider = state.providers.find((item) => item.id === booking.providerId);
      dispatch({ type: "RATE_BOOKING", bookingId, rating, review: review.trim(), at: new Date().toISOString() });
      notify([
        ...(provider ? [make("artisan", "job", `New ${rating}★ rating`, `${booking.customerName} rated ${booking.service}${review.trim() ? `: "${review.trim()}"` : "."}`, bookingId, provider.accountId, ["in_app", "push"])] : []),
        ...(rating <= 2 ? [make("admin", "system", "Low rating alert", `${booking.id} received ${rating}★ for ${provider?.name || "a partner"}. Consider a quality follow-up.`, bookingId)] : []),
      ]);
      return { ok: true, message: "Thanks — your rating has been shared with the partner." };
    },
    notificationsFor(audience, recipientId) {
      return state.notifications.filter((item) => item.audience === audience && (audience === "admin" || !item.recipientId || item.recipientId === recipientId));
    },
    markNotificationsRead(ids) { if (ids.length) dispatch({ type: "MARK_READ", ids }); },

    profileOf: getProfile,
    updateProfile(accountId, fn) { dispatch({ type: "PROFILE_UPDATE", accountId, fn }); },
    renameAccount(accountId, name) { dispatch({ type: "RENAME_ACCOUNT", accountId, name }); },
    validatePromo(code, subtotal, customerId) {
      const clean = code.trim().toUpperCase();
      if (!clean) return { ok: false, discount: 0, message: "Enter a promo code." };
      const promo = state.promos.find((item) => item.code === clean);
      return { ...evaluatePromo(promo, subtotal, promoContext(customerId, clean)), promo };
    },
    redeemReferralCode(accountId, code) {
      const clean = code.trim().toUpperCase();
      const me = state.accounts.find((item) => item.id === accountId);
      if (!me) return { ok: false, message: "Account not found." };
      if (getProfile(accountId).referredBy) return { ok: false, message: "You've already added a referral code." };
      if (state.bookings.some((booking) => booking.customerId === accountId && booking.status !== "cancelled")) return { ok: false, message: "Referral codes can only be added before your first booking." };
      const referrer = state.accounts.find((item) => item.role === "consumer" && referralCodeFor(item) === clean);
      if (!referrer) return { ok: false, message: "We couldn't find that referral code." };
      if (referrer.id === accountId) return { ok: false, message: "You can't use your own code." };
      const reward = state.settings.refereeReward;
      dispatch({ type: "PROFILE_UPDATE", accountId, fn: (profile) => addLedger({ ...profile, referredBy: clean }, { kind: "welcome", credit: reward, points: 0, note: `Welcome credit · referred by ${referrer.name}` }) });
      notify([
        make("consumer", "system", "Welcome credit added 🎁", `${money(reward)} from ${referrer.name}'s referral is in your wallet. Use it at checkout.`, undefined, accountId, ["in_app", "email"]),
        make("consumer", "system", "A friend joined with your code", `${me.name} used your code. You'll earn ${money(state.settings.referrerReward)} when they complete their first booking.`, undefined, referrer.id, ["in_app", "push"]),
        make("admin", "system", "New referral", `${me.name} joined via ${referrer.name}'s code (${clean}).`),
      ]);
      return { ok: true, message: `${money(reward)} credit added to your wallet.` };
    },
    redeemPoints(accountId, blocks) {
      const { redeemBlock, redeemValue } = state.settings;
      const points = blocks * redeemBlock;
      if (blocks < 1 || getProfile(accountId).points < points) return { ok: false, message: `You need ${redeemBlock} points to redeem.` };
      dispatch({ type: "PROFILE_UPDATE", accountId, fn: (profile) => addLedger(profile, { kind: "redeem", credit: blocks * redeemValue, points: -points, note: `Redeemed ${points} points` }) });
      notify([make("consumer", "system", "Points redeemed", `${points} points converted to ${money(blocks * redeemValue)} wallet credit.`, undefined, accountId, ["in_app"])]);
      return { ok: true, message: `${money(blocks * redeemValue)} added to your wallet.` };
    },
    patchProvider(providerId, patch) { dispatch({ type: "PROVIDER_PATCH", providerId, patch }); },

    createPromo(input) {
      const code = input.code.trim().toUpperCase();
      if (!/^[A-Z0-9]{3,20}$/.test(code)) return { ok: false, message: "Code must be 3–20 letters or numbers." };
      if (state.promos.some((item) => item.code === code)) return { ok: false, message: "That code already exists." };
      if (!(input.value > 0)) return { ok: false, message: "Enter a discount value." };
      if (input.type === "percent" && input.value > 100) return { ok: false, message: "Percent can't exceed 100." };
      const promo: Promo = { ...input, code, id: uid("promo"), used: 0, active: true, createdAt: new Date().toISOString() };
      dispatch({ type: "PROMO_ADD", promo });
      notify([make("consumer", "system", `New offer: ${code}`, input.description || "Use this code at checkout.", undefined, undefined, ["in_app", "push"])]);
      return { ok: true, message: `${code} is live.` };
    },
    togglePromo(promoId) { dispatch({ type: "PROMO_TOGGLE", promoId }); },
    deletePromo(promoId) { dispatch({ type: "PROMO_DELETE", promoId }); },
    updateSettings(patch) { dispatch({ type: "SETTINGS", patch }); },
  }), [state]);

  return <PlatformContext.Provider value={api}>{children}</PlatformContext.Provider>;
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) throw new Error("usePlatform must be used inside PlatformProvider");
  return context;
}
