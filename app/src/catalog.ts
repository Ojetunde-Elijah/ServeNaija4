// Service catalogue + pricing engine. Prices here are ADMIN-EDITABLE DEFAULTS (Admin > Pricing);
// the live copy is stored in platform state. Maps 1:1 to a `catalog_items` table later.

export type PricingType = "unit" | "quantity" | "visit" | "fixed" | "quote";
export const PRICING_LABEL: Record<PricingType, string> = { unit: "Per unit", quantity: "Per quantity", visit: "Per visit", fixed: "Fixed + materials", quote: "Inspection + quotation" };

export type CatalogItem = {
  id: string; category: string; name: string; pricing: PricingType;
  unitLabel: string;      // "TV", "kg", "m²", "visit"
  price: number;          // unit price, labour, visit price, or inspection fee (quote)
  materials?: number;     // optional materials allowance for `fixed`
  max?: number;           // max quantity
  active: boolean;
};

export const CATALOG_CATEGORIES = [
  { key: "cleaning", label: "Cleaning & laundry", icon: "◉" },
  { key: "plumbing", label: "Plumbing", icon: "♒" },
  { key: "electrical", label: "Electrical", icon: "ϟ" },
  { key: "ac", label: "Air conditioning", icon: "❄" },
  { key: "carpentry", label: "Carpentry & furniture", icon: "▤" },
  { key: "painting", label: "Painting & wall work", icon: "▧" },
  { key: "handyman", label: "General handyman", icon: "✚" },
  { key: "appliance", label: "Appliance services", icon: "▣" },
  { key: "beauty", label: "Beauty at home", icon: "✦" },
] as const;

// [category, name, pricing, unitLabel, price, materials?]
const D: [string, string, PricingType, string, number, number?][] = [
  ["cleaning", "Laundry", "quantity", "kg", 1200], ["cleaning", "Ironing", "unit", "item", 300], ["cleaning", "Carpet / rug cleaning", "quantity", "m²", 1500],
  ["cleaning", "Mattress cleaning", "unit", "mattress", 12000], ["cleaning", "Sofa cleaning", "unit", "seat", 4000], ["cleaning", "Deep house cleaning", "unit", "room", 9000],
  ["cleaning", "Regular house cleaning", "visit", "visit", 15000], ["cleaning", "Window cleaning", "unit", "window", 2500], ["cleaning", "Post-construction cleaning", "quote", "inspection", 5000],
  ["plumbing", "Leaking tap repair", "fixed", "job", 6000, 3000], ["plumbing", "Tap replacement", "fixed", "job", 7000, 8000], ["plumbing", "Toilet repair", "fixed", "job", 9000, 5000],
  ["plumbing", "Blocked sink / drain", "fixed", "job", 10000, 0], ["plumbing", "Water tank installation", "fixed", "job", 25000, 15000], ["plumbing", "Pipe leakage repair", "quote", "inspection", 5000],
  ["electrical", "Bulb installation", "unit", "bulb", 1500], ["electrical", "Socket installation", "unit", "socket", 3500], ["electrical", "Ceiling fan installation", "unit", "fan", 7000],
  ["electrical", "Light fixture installation", "unit", "fixture", 5000], ["electrical", "Wiring a room", "unit", "room", 25000], ["electrical", "Fault diagnosis / repair", "quote", "inspection", 5000],
  ["ac", "AC servicing", "unit", "AC unit", 12500], ["ac", "AC cleaning", "unit", "AC unit", 9000], ["ac", "AC gas refill", "fixed", "unit", 15000, 12000],
  ["ac", "AC installation", "fixed", "unit", 25000, 10000], ["ac", "AC repair", "quote", "inspection", 6000],
  ["carpentry", "Furniture assembly", "unit", "item", 8000], ["carpentry", "Door installation", "unit", "door", 15000], ["carpentry", "Shelf installation", "unit", "shelf", 4000],
  ["carpentry", "Bed / table / chair repair", "quote", "inspection", 4000], ["carpentry", "Custom cabinet / wardrobe", "quote", "inspection", 8000],
  ["painting", "Painting a room", "unit", "room", 45000], ["painting", "Wall repainting", "quantity", "m²", 1800], ["painting", "Wallpaper installation", "quantity", "m²", 2500],
  ["painting", "Wall crack / POP repair", "quote", "inspection", 5000],
  ["handyman", "TV mounting", "unit", "TV", 10000], ["handyman", "Picture / mirror mounting", "unit", "item", 3000], ["handyman", "Curtain installation", "unit", "window", 3500],
  ["handyman", "Lock replacement", "unit", "lock", 6000], ["handyman", "General handyman visit", "visit", "visit", 8000],
  ["appliance", "Washing machine installation", "unit", "machine", 10000], ["appliance", "Refrigerator cleaning", "unit", "appliance", 8000], ["appliance", "Water dispenser servicing", "unit", "appliance", 7000],
  ["appliance", "Washing machine / fridge repair", "quote", "inspection", 5000],
  ["beauty", "Makeup at home", "unit", "person", 20000], ["beauty", "Hair styling at home", "unit", "person", 12000], ["beauty", "Home grooming session", "visit", "visit", 10000],
];
export const DEFAULT_CATALOG: CatalogItem[] = D.map(([category, name, pricing, unitLabel, price, materials], i) => ({
  id: `svc-${i + 1}`, category, name, pricing, unitLabel, price, materials, max: pricing === "quantity" ? 200 : 20, active: true,
}));

export const PLAN_DEFS = [
  { id: "once", label: "One-time", visits: 1, intervalDays: 0, blurb: "Single visit, no commitment" },
  { id: "weekly4", label: "Weekly · 4 visits", visits: 4, intervalDays: 7, blurb: "Same service every week for a month" },
  { id: "weekly12", label: "Weekly · 12 visits", visits: 12, intervalDays: 7, blurb: "A full quarter of weekly visits" },
] as const;
export type PlanId = (typeof PLAN_DEFS)[number]["id"];
export type PricingSettings = { weekly4Discount: number; weekly12Discount: number; instantFee: number; surgePercent: number; surge: Record<string, boolean> };
export const DEFAULT_PRICING: PricingSettings = { weekly4Discount: 10, weekly12Discount: 15, instantFee: 1500, surgePercent: 25, surge: {} };
export function planDiscount(plan: PlanId, s: PricingSettings) { return plan === "weekly4" ? s.weekly4Discount : plan === "weekly12" ? s.weekly12Discount : 0; }

export type LineItem = { itemId: string; name: string; pricing: PricingType; unitLabel: string; qty: number; unitPrice: number; materials: number; total: number };

/** One visit's cost. `withMaterials` only affects `fixed` items. */
export function lineFor(item: CatalogItem, qty: number, withMaterials: boolean): LineItem {
  const q = Math.max(1, Math.min(item.max ?? 99, Math.round(qty) || 1));
  const mats = item.pricing === "fixed" && withMaterials ? item.materials ?? 0 : 0;
  const labour = item.pricing === "unit" || item.pricing === "quantity" ? item.price * q : item.price;
  return { itemId: item.id, name: item.name, pricing: item.pricing, unitLabel: item.unitLabel, qty: item.pricing === "unit" || item.pricing === "quantity" ? q : 1, unitPrice: item.price, materials: mats, total: labour + mats };
}
export const needsQuote = (lines: LineItem[]) => lines.some((line) => line.pricing === "quote");
export const fromPrice = (catalog: CatalogItem[], category: string) => {
  const prices = catalog.filter((item) => item.active && item.category === category).map((item) => item.price);
  return prices.length ? Math.min(...prices) : 0;
};
export const money = (value: number) => `₦${Math.round(value).toLocaleString()}`;
