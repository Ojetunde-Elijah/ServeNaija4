import { useMemo, useState } from "react";
import { Icon, Button } from "./ui";
import { usePlatform, type Booking, type Provider } from "./PlatformContext";
import { AREA_NAMES, AREAS, PROTECTION_FEE, SLOT_OPTIONS, categoryOf, distanceKm, loyaltyDiscount } from "./platformLogic";
import { CATALOG_CATEGORIES, PLAN_DEFS, PRICING_LABEL, lineFor, money, needsQuote, planDiscount, type CatalogItem, type PlanId } from "./catalog";
import { methodLabel } from "./Profile";

export type PayDetails = {
  service: string; address: string; slot: string; amount: number; note?: string; promoCode?: string; creditUsed?: number; paidWith?: string;
  category: string; area: string; lines: Booking["lines"]; planId: string; visitsTotal: number; instant: boolean; instantFee?: number; surgeFee?: number;
};

const unitText = (item: CatalogItem) => item.pricing === "quote" ? "inspection fee" : item.pricing === "visit" ? "per visit" : item.pricing === "fixed" ? "labour" : `per ${item.unitLabel}`;
const dayLabel = (offset: number) => new Date(Date.now() + offset * 86400000).toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });

export default function BookingFlow({ service, onClose, onPay, onComplete, customerId, requested, defaultArea }: {
  service: string; onClose: () => void; onPay: (details: PayDetails, extraVisits: { slot: string; amount: number }[]) => Booking; onComplete: () => void;
  customerId: string; requested?: Provider | null; defaultArea: string;
}) {
  const platform = usePlatform();
  const profile = platform.profileOf(customerId);
  const defaultAddress = profile.addresses.find((item) => item.isDefault) || profile.addresses[0];
  const defaultMethod = profile.methods.find((item) => item.isDefault);
  const { catalog, pricing } = platform;

  const initialItem = catalog.find((item) => item.active && item.name.toLowerCase() === service.toLowerCase());
  const initialCat = initialItem?.category || (categoryOf(requested?.category || service) !== "other" ? categoryOf(requested?.category || service) : "");
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(initialCat);
  const [itemId, setItemId] = useState(initialItem?.id || "");
  const [qty, setQty] = useState(1);
  const [withMaterials, setWithMaterials] = useState(true);
  const [planId, setPlanId] = useState<PlanId>("once");
  const [when, setWhen] = useState<"instant" | "scheduled">("scheduled");
  const [slot, setSlot] = useState(SLOT_OPTIONS.includes(profile.prefs.preferredSlot) ? profile.prefs.preferredSlot : SLOT_OPTIONS[0]);
  const [area, setArea] = useState(AREA_NAMES.includes(defaultArea) ? defaultArea : AREA_NAMES[0]);
  const [address, setAddress] = useState(defaultAddress?.address || "");
  const [note, setNote] = useState(profile.prefs.accessNote);
  const [payment, setPayment] = useState(defaultMethod ? methodLabel(defaultMethod) : "Card / Paystack");
  const [promoInput, setPromoInput] = useState("");
  const [promo, setPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoMsg, setPromoMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [useCredit, setUseCredit] = useState(false);
  const [error, setError] = useState("");
  const [paidBooking, setPaidBooking] = useState<Booking | null>(null);

  const item = catalog.find((entry) => entry.id === itemId);
  const items = catalog.filter((entry) => entry.active && entry.category === category);
  const line = item ? lineFor(item, qty, withMaterials) : null;
  const plan = PLAN_DEFS.find((entry) => entry.id === planId)!;
  const isQuote = !!line && needsQuote([line]);

  // Instant availability: an approved, online partner of this category in the customer's city.
  const city = AREAS[area]?.city;
  const onlinePros = useMemo(() => platform.providers.filter((p) => p.status === "approved" && p.available !== false && p.category === category && p.city === city && (!requested || p.id === requested.id)), [platform.providers, category, city, requested]);
  const nearest = onlinePros.length ? Math.min(...onlinePros.map((p) => distanceKm(AREAS[area], AREAS[p.area || ""] || AREAS[area]))) : 0;
  const instantOk = onlinePros.length > 0;
  const instant = when === "instant" && instantOk;

  const disc = planDiscount(planId, pricing);
  const perVisit = line ? Math.round(line.total * (1 - disc / 100)) : 0;
  const surgeFee = line && pricing.surge[area] ? Math.round(line.total * pricing.surgePercent / 100) : 0;
  const instantFee = instant ? pricing.instantFee : 0;
  const firstAmount = perVisit + surgeFee + instantFee + PROTECTION_FEE;
  const extraVisits = Array.from({ length: plan.visits - 1 }, (_, n) => ({
    slot: `${dayLabel(plan.intervalDays * (n + 1) + (slot.startsWith("Tomorrow") ? 1 : 0))} · ${slot.includes("·") ? slot.split("·")[1].trim() : "flexible"}`, amount: perVisit,
  }));
  const total = firstAmount + extraVisits.reduce((sum, visit) => sum + visit.amount, 0);
  const promoDiscount = promo ? Math.min(promo.discount, firstAmount) : 0;
  const tierDiscount = Math.min(loyaltyDiscount(profile.lifetimePoints), firstAmount - promoDiscount);
  const creditUsed = useCredit ? Math.min(profile.credit, total - promoDiscount - tierDiscount) : 0;
  const payable = total - promoDiscount - tierDiscount - creditUsed;

  const applyPromo = () => {
    const result = platform.validatePromo(promoInput, firstAmount, customerId);
    setPromoMsg({ ok: result.ok, text: result.message });
    setPromo(result.ok && result.promo ? { code: result.promo.code, discount: result.discount } : null);
  };
  const go = (next: number, check?: () => string) => { const problem = check?.() || ""; setError(problem); if (!problem) setStep(next); };
  const pay = () => {
    if (!item || !line) return;
    const slotText = instant ? "Instant · within 10 mins" : slot;
    const booking = onPay({
      service: item.name, address, slot: slotText, amount: firstAmount, note: note.trim() || undefined, promoCode: promo?.code, creditUsed, paidWith: payment,
      category: item.category, area, lines: [line], planId, visitsTotal: plan.visits, instant, instantFee: instantFee || undefined, surgeFee: surgeFee || undefined,
    }, extraVisits);
    setPaidBooking(booking); setStep(5);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="booking-modal booking-flow" onMouseDown={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close"><Icon name="close" /></button>
        <div className="flow-progress">{[1, 2, 3, 4, 5].map((n) => <span key={n} className={n <= step ? "active" : ""}><i>{n < step ? <Icon name="check" size={11} /> : n}</i><small>{["Service", "Pricing", "Plan", "Payment", "Done"][n - 1]}</small></span>)}</div>

        {step === 1 && <>
          <span className="kicker">STEP 1 OF 4</span><h2>What do you need done?</h2><p>{requested ? `Booking ${requested.name} directly. ` : ""}Pick a category, then the exact job.</p>
          <div className="saved-chips">{CATALOG_CATEGORIES.map((c) => <button key={c.key} className={category === c.key ? "selected" : ""} onClick={() => { setCategory(c.key); setItemId(""); setQty(1); }}>{c.label}</button>)}</div>
          {!category && <div className="empty-state"><Icon name="search" size={26} /><p>Choose a category above to see services and prices.</p></div>}
          <div className="package-list">{items.map((entry) => <button key={entry.id} className={itemId === entry.id ? "selected" : ""} onClick={() => { setItemId(entry.id); setQty(1); setWithMaterials(true); }}><span><strong>{entry.name}</strong><small>{PRICING_LABEL[entry.pricing]}</small></span><b>{money(entry.price)}<small style={{ display: "block", fontSize: 10, fontWeight: 600 }}>{unitText(entry)}</small></b>{itemId === entry.id && <Icon name="check" size={17} />}</button>)}</div>
          {error && <div className="auth-error">{error}</div>}
          <Button className="full-button" onClick={() => go(2, () => item ? "" : "Select a service to continue.")}>Continue <Icon name="arrow" size={17} /></Button>
        </>}

        {step === 2 && item && line && <>
          <span className="kicker">STEP 2 OF 4 · {PRICING_LABEL[item.pricing].toUpperCase()}</span><h2>{item.name}</h2>
          {(item.pricing === "unit" || item.pricing === "quantity") && <>
            <p>{item.pricing === "unit" ? `Priced per ${item.unitLabel}. How many?` : `Priced per ${item.unitLabel}. Enter the total ${item.unitLabel}.`}</p>
            <label className="flow-label">QUANTITY ({item.unitLabel.toUpperCase()})<input type="number" min={1} max={item.max} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(item.max ?? 99, Number(e.target.value) || 1)))} /></label>
            <div className="order-summary"><div><span>{qty} × {money(item.price)} / {item.unitLabel}</span><strong>{money(line.total)}</strong></div></div>
          </>}
          {item.pricing === "visit" && <><p>A flat price for each visit, no hourly billing. You pay for the job, not the clock.</p><div className="order-summary"><div><span>{item.name} · per visit</span><strong>{money(line.total)}</strong></div></div></>}
          {item.pricing === "fixed" && <>
            <p>Fixed labour price. Materials are added at cost so you only pay for what the job needs.</p>
            <div className="addon-row"><span><strong>Include materials allowance</strong><small>Untick if you'll supply the parts yourself</small></span><b>+ {money(item.materials ?? 0)}</b><input type="checkbox" checked={withMaterials} onChange={(e) => setWithMaterials(e.target.checked)} /></div>
            <div className="order-summary"><div><span>Labour</span><strong>{money(item.price)}</strong></div>{line.materials > 0 && <div><span>Materials</span><strong>{money(line.materials)}</strong></div>}<div><span>Total</span><strong>{money(line.total)}</strong></div></div>
          </>}
          {item.pricing === "quote" && <>
            <p>We can't know this cost upfront. Pay a small inspection fee now — the technician diagnoses the problem and sends a quotation. <b>Nothing more is charged until you approve it.</b></p>
            <div className="order-summary"><div><span>Inspection fee</span><strong>{money(line.total)}</strong></div></div>
          </>}
          <div className="flow-actions"><Button variant="secondary" onClick={() => setStep(1)}>Back</Button><Button onClick={() => setStep(3)}>Plan & schedule <Icon name="arrow" size={17} /></Button></div>
        </>}

        {step === 3 && item && <>
          <span className="kicker">STEP 3 OF 4</span><h2>Choose your plan & timing</h2><p>Book once, or subscribe and save on every visit.</p>
          <div className="package-list">{PLAN_DEFS.map((p) => { const d = planDiscount(p.id, pricing); return <button key={p.id} className={planId === p.id ? "selected" : ""} onClick={() => setPlanId(p.id)}><span><strong>{p.label}</strong><small>{p.blurb}{d ? ` · save ${d}%` : ""}</small></span><b>{money(Math.round((line?.total || 0) * (1 - d / 100)))}<small style={{ display: "block", fontSize: 10, fontWeight: 600 }}>per visit</small></b>{planId === p.id && <Icon name="check" size={17} />}</button>; })}</div>
          <label className="flow-label">YOUR AREA<select value={area} onChange={(e) => setArea(e.target.value)}>{AREA_NAMES.map((name) => <option key={name}>{name}</option>)}</select></label>
          <div className="slot-grid">
            <button className={instant ? "selected" : ""} disabled={!instantOk} onClick={() => setWhen("instant")} style={!instantOk ? { opacity: .55 } : undefined}>⚡ Instant · arrives in ~10 mins<small style={{ display: "block" }}>{instantOk ? `${onlinePros.length} pro${onlinePros.length > 1 ? "s" : ""} online · nearest ${nearest < 0.1 ? "<0.1" : nearest.toFixed(1)} km · +${money(pricing.instantFee)}` : "No partner online in this area right now"}</small><Icon name="check" size={15} /></button>
            {SLOT_OPTIONS.map((opt) => <button className={!instant && slot === opt ? "selected" : ""} onClick={() => { setWhen("scheduled"); setSlot(opt); }} key={opt}>{opt}<Icon name="check" size={15} /></button>)}
          </div>
          {plan.visits > 1 && <small className="perk-ok">Visits 2–{plan.visits} repeat every {plan.intervalDays} days at the same time, starting {extraVisits[0]?.slot}.</small>}
          {profile.addresses.length > 0 && <div className="saved-chips">{profile.addresses.map((a) => <button key={a.id} className={address === a.address ? "selected" : ""} onClick={() => setAddress(a.address)}>{a.label}</button>)}</div>}
          <label className="flow-label">SERVICE ADDRESS<input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="House number, street, landmark" /></label>
          <label className="flow-label">ACCESS NOTE<textarea placeholder="Gate code, parking or directions for the professional" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          {error && <div className="auth-error">{error}</div>}
          <div className="flow-actions"><Button variant="secondary" onClick={() => setStep(2)}>Back</Button><Button onClick={() => go(4, () => address.trim().length < 6 ? "Enter your full service address." : "")}>Review & pay <Icon name="arrow" size={17} /></Button></div>
        </>}

        {step === 4 && item && line && <>
          <span className="kicker">STEP 4 OF 4</span><h2>Safe payment</h2><p>You pay upfront. Your money is held in escrow until you share your completion PIN{plan.visits > 1 ? " (released visit by visit)" : ""}.</p>
          <div className="payment-methods">{[...profile.methods.map(methodLabel), "Card / Paystack", "Bank transfer", "USSD"].map((opt) => <button className={payment === opt ? "selected" : ""} onClick={() => setPayment(opt)} key={opt}><span><Icon name="wallet" size={18} />{opt}</span><i>{payment === opt && <Icon name="check" size={13} />}</i></button>)}</div>
          <div className="perk-box">
            <div className="perk-row"><input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="Promo code" onKeyDown={(e) => e.key === "Enter" && applyPromo()} /><button onClick={applyPromo}>Apply</button></div>
            {promoMsg && <small className={promoMsg.ok ? "perk-ok" : "perk-bad"}>{promoMsg.text}</small>}
            {profile.credit > 0 && <label className="perk-credit"><input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />Use wallet credit <b>₦{profile.credit.toLocaleString()}</b></label>}
          </div>
          <div className="order-summary">
            <div><span>{item.name}{line.qty > 1 ? ` × ${line.qty} ${item.unitLabel}` : ""}{isQuote ? " (inspection)" : ""}</span><strong>{money(line.total)}</strong></div>
            {disc > 0 && <div><span>{plan.label} discount ({disc}%)</span><strong>−{money(line.total - perVisit)}</strong></div>}
            {plan.visits > 1 && <div><span>× {plan.visits} visits</span><strong>{money(perVisit * plan.visits)}</strong></div>}
            {surgeFee > 0 && <div><span>High-demand area (+{pricing.surgePercent}%)</span><strong>{money(surgeFee)}</strong></div>}
            {instantFee > 0 && <div><span>Instant arrival fee</span><strong>{money(instantFee)}</strong></div>}
            <div><span>Service protection fee</span><strong>{money(PROTECTION_FEE)}</strong></div>
            {promoDiscount > 0 && <div><span>Promo {promo?.code}</span><strong>−{money(promoDiscount)}</strong></div>}
            {tierDiscount > 0 && <div><span>Gold member fee waiver</span><strong>−{money(tierDiscount)}</strong></div>}
            {creditUsed > 0 && <div><span>Wallet credit</span><strong>−{money(creditUsed)}</strong></div>}
            <div className="order-total"><span>Pay now</span><strong>{money(payable)}</strong></div>
          </div>
          {isQuote && <small className="perk-ok">You'll approve any quotation before extra money is taken.</small>}
          <div className="flow-actions"><Button variant="secondary" onClick={() => setStep(3)}>Back</Button><Button onClick={pay}>Pay {money(payable)} <Icon name="arrow" size={17} /></Button></div>
        </>}

        {step === 5 && <div className="success-state">
          <span className="success-icon"><Icon name="check" size={30} /></span><span className="kicker">BOOKING CONFIRMED</span><h2>{paidBooking?.instant ? "Finding the nearest pro — about 10 minutes." : "We're finding your professional."}</h2><p>Your payment is protected. We'll notify you as soon as a verified professional accepts.</p>
          <div className="confirmation-card"><span>BOOKING REFERENCE</span><strong>{paidBooking?.id}</strong><small>{paidBooking?.slot} · {paidBooking?.address}</small></div>
          <div className="generated-pin"><span>YOUR COMPLETION CODE</span><strong>{paidBooking?.completionPin}</strong><small>Keep this private until the work is fully completed.</small></div>
          <Button className="full-button" onClick={onComplete}>Track my booking <Icon name="arrow" size={17} /></Button>
        </div>}
      </div>
    </div>
  );
}
