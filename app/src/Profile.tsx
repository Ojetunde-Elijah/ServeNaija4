import { useState } from "react";
import { usePlatform, type Account } from "./PlatformContext";
import { SLOT_OPTIONS, TIERS, tierOf, type PaymentMethod } from "./platformLogic";

type Tab = "overview" | "addresses" | "payments" | "preferences" | "rewards" | "history";
const tabs: [Tab, string][] = [["overview", "Overview"], ["addresses", "Saved addresses"], ["payments", "Payment methods"], ["preferences", "Booking preferences"], ["rewards", "Rewards & referrals"], ["history", "History & reviews"]];

const luhn = (digits: string) => { let sum = 0; digits.split("").reverse().forEach((d, i) => { let n = Number(d); if (i % 2) { n *= 2; if (n > 9) n -= 9; } sum += n; }); return sum % 10 === 0; };
const brandOf = (digits: string) => /^4/.test(digits) ? "Visa" : /^(5[1-5]|2[2-7])/.test(digits) ? "Mastercard" : /^(506|650)/.test(digits) ? "Verve" : "Card";
export const methodLabel = (method: PaymentMethod) => `${method.brand} •••• ${method.last4}`;
const money = (value: number) => `₦${value.toLocaleString()}`;

export default function ProfilePage({ account, onBook }: { account: Account; onBook: () => void }) {
  const platform = usePlatform();
  const profile = platform.profileOf(account.id);
  const [tab, setTab] = useState<Tab>("overview");
  const [msg, setMsg] = useState("");
  const flash = (text: string) => { setMsg(text); window.setTimeout(() => setMsg(""), 3000); };
  const live = platform.accounts.find((item) => item.id === account.id) || account;
  const mine = platform.bookings.filter((booking) => booking.customerId === account.id);
  const completed = mine.filter((booking) => booking.status === "completed");
  const spent = completed.reduce((sum, booking) => sum + booking.amount - (booking.discount || 0), 0);
  const { tier, next } = tierOf(profile.lifetimePoints);

  const [name, setName] = useState(live.name);
  const [email, setEmail] = useState(profile.email);
  const [label, setLabel] = useState("Home");
  const [addr, setAddr] = useState("");
  const [card, setCard] = useState({ number: "", expiry: "", holder: "" });
  const [prefs, setPrefs] = useState(profile.prefs);
  const [codeInput, setCodeInput] = useState("");
  const [reviewDraft, setReviewDraft] = useState<Record<string, { rating: number; text: string }>>({});

  const saveDetails = () => {
    if (name.trim().length < 3) return flash("Enter your full name.");
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return flash("Enter a valid email address.");
    platform.renameAccount(account.id, name.trim());
    platform.updateProfile(account.id, (p) => ({ ...p, email: email.trim() }));
    flash("Profile saved.");
  };
  const addAddress = () => {
    if (addr.trim().length < 8) return flash("Enter the full street address.");
    platform.updateProfile(account.id, (p) => ({ ...p, addresses: [...p.addresses.map((a) => ({ ...a, isDefault: p.addresses.length === 0 ? false : a.isDefault })), { id: `addr-${Date.now()}`, label, address: addr.trim(), isDefault: p.addresses.length === 0 }] }));
    setAddr(""); flash("Address saved.");
  };
  const addCard = () => {
    const digits = card.number.replace(/\D/g, "");
    if (digits.length < 13 || !luhn(digits)) return flash("That card number doesn't look right.");
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry)) return flash("Use expiry format MM/YY.");
    if (card.holder.trim().length < 3) return flash("Enter the name on the card.");
    // Only the last 4 digits are kept. In production the PAN goes straight to Paystack/Flutterwave and only a token is stored.
    const method: PaymentMethod = { id: `pm-${Date.now()}`, brand: brandOf(digits), last4: digits.slice(-4), expiry: card.expiry, holder: card.holder.trim(), isDefault: profile.methods.length === 0, gatewayRef: `demo_auth_${Math.random().toString(36).slice(2, 10)}` };
    platform.updateProfile(account.id, (p) => ({ ...p, methods: [...p.methods, method] }));
    setCard({ number: "", expiry: "", holder: "" }); flash(`${methodLabel(method)} saved.`);
  };
  const canAddCode = !profile.referredBy && !mine.some((booking) => booking.status !== "cancelled");
  const balanceBlocks = Math.floor(profile.points / platform.settings.redeemBlock);

  return (
    <main className="subpage profile-page">
      {msg && <div className="toast">✓ {msg}</div>}
      <div className="subpage-title content-width"><div><span className="kicker">MY ACCOUNT</span><h1>Profile & settings</h1><p>Manage saved addresses, payment methods, preferences and rewards.</p></div><button className="button button-primary" onClick={onBook}>Book a service</button></div>
      <div className="profile-layout content-width">
        <nav className="profile-tabs" aria-label="Profile sections">{tabs.map(([key, text]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{text}{key === "rewards" && profile.credit > 0 && <b>{money(profile.credit)}</b>}</button>)}</nav>
        <section className="profile-panel">
          {tab === "overview" && <>
            <div className="pf-identity"><span>{live.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span><div><h2>{live.name}</h2><p>+234 {live.phone.replace(/^0/, "")} · <em className={`pf-tier ${tier.name.toLowerCase()}`}>{tier.name} member</em></p></div></div>
            <div className="pf-stats"><span><small>BOOKINGS</small><strong>{mine.length}</strong></span><span><small>COMPLETED</small><strong>{completed.length}</strong></span><span><small>TOTAL SPENT</small><strong>{money(spent)}</strong></span><span><small>WALLET CREDIT</small><strong>{money(profile.credit)}</strong></span></div>
            <label className="pf-field">FULL NAME<input value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className="pf-field">EMAIL (RECEIPTS)<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label className="pf-field">PHONE NUMBER<input value={`+234 ${live.phone.replace(/^0/, "")}`} disabled /></label>
            <button className="button button-primary" onClick={saveDetails}>Save changes</button>
          </>}

          {tab === "addresses" && <>
            <h2>Saved addresses</h2><p className="pf-sub">Pick a saved address in one tap when booking. Your default is pre-filled.</p>
            <div className="pf-list">{profile.addresses.map((item) => <div className="pf-row" key={item.id}><span><strong>{item.label}{item.isDefault && <em className="pf-badge">Default</em>}</strong><small>{item.address}</small></span>{!item.isDefault && <button onClick={() => platform.updateProfile(account.id, (p) => ({ ...p, addresses: p.addresses.map((a) => ({ ...a, isDefault: a.id === item.id })) }))}>Set default</button>}<button className="danger" onClick={() => platform.updateProfile(account.id, (p) => { const rest = p.addresses.filter((a) => a.id !== item.id); return { ...p, addresses: rest.map((a, i) => ({ ...a, isDefault: item.isDefault ? i === 0 : a.isDefault })) }; })}>Remove</button></div>)}{!profile.addresses.length && <p className="pf-empty">No saved addresses yet.</p>}</div>
            <div className="pf-form"><select value={label} onChange={(event) => setLabel(event.target.value)}><option>Home</option><option>Work</option><option>Family</option><option>Other</option></select><input value={addr} onChange={(event) => setAddr(event.target.value)} placeholder="Street, area, city" /><button className="button button-primary" onClick={addAddress}>Add address</button></div>
          </>}

          {tab === "payments" && <>
            <h2>Payment methods</h2><p className="pf-sub">Saved cards appear as payment options at checkout. We only keep the last 4 digits — full card numbers are never stored.</p>
            <div className="pf-list">{profile.methods.map((item) => <div className="pf-row" key={item.id}><span><strong>{methodLabel(item)}{item.isDefault && <em className="pf-badge">Default</em>}</strong><small>{item.holder} · expires {item.expiry}</small></span>{!item.isDefault && <button onClick={() => platform.updateProfile(account.id, (p) => ({ ...p, methods: p.methods.map((m) => ({ ...m, isDefault: m.id === item.id })) }))}>Set default</button>}<button className="danger" onClick={() => platform.updateProfile(account.id, (p) => { const rest = p.methods.filter((m) => m.id !== item.id); return { ...p, methods: rest.map((m, i) => ({ ...m, isDefault: item.isDefault ? i === 0 : m.isDefault })) }; })}>Remove</button></div>)}{!profile.methods.length && <p className="pf-empty">No saved cards yet. You can still pay with Paystack, bank transfer or USSD.</p>}</div>
            <div className="pf-form card"><input inputMode="numeric" value={card.number} onChange={(event) => setCard({ ...card, number: event.target.value.replace(/[^\d ]/g, "").slice(0, 23) })} placeholder="Card number" /><input inputMode="numeric" value={card.expiry} onChange={(event) => { const d = event.target.value.replace(/\D/g, "").slice(0, 4); setCard({ ...card, expiry: d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d }); }} placeholder="MM/YY" /><input value={card.holder} onChange={(event) => setCard({ ...card, holder: event.target.value })} placeholder="Name on card" /><button className="button button-primary" onClick={addCard}>Save card</button></div>
          </>}

          {tab === "preferences" && <>
            <h2>Booking preferences</h2><p className="pf-sub">These are applied automatically to every new booking.</p>
            <label className="pf-field">PREFERRED TIME SLOT<select value={prefs.preferredSlot} onChange={(event) => setPrefs({ ...prefs, preferredSlot: event.target.value })}>{SLOT_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="pf-field">DEFAULT ACCESS NOTE<textarea rows={3} value={prefs.accessNote} onChange={(event) => setPrefs({ ...prefs, accessNote: event.target.value })} placeholder="Gate code, parking or directions for the professional" /></label>
            <h3>How should we reach you?</h3>
            <div className="pf-list"><div className="pf-row"><span><strong>In-app alerts</strong><small>Always on — booking, dispatch and payment updates</small></span><i className="pf-switch on locked" /></div>
              {([["push", "Push notifications", "Professional assigned, service started"], ["sms", "SMS", "Booking confirmations and completion code"], ["email", "Email", "Receipts and summaries"]] as const).map(([key, title, copy]) => <div className="pf-row" key={key}><span><strong>{title}</strong><small>{copy}</small></span><button className={`pf-switch ${prefs.channels[key] ? "on" : ""}`} aria-pressed={prefs.channels[key]} onClick={() => setPrefs({ ...prefs, channels: { ...prefs.channels, [key]: !prefs.channels[key] } })}><i /></button></div>)}</div>
            <button className="button button-primary" onClick={() => { platform.updateProfile(account.id, (p) => ({ ...p, prefs })); flash("Preferences saved."); }}>Save preferences</button>
          </>}

          {tab === "rewards" && <>
            <div className="rw-hero"><div><small>WALLET CREDIT</small><strong>{money(profile.credit)}</strong><span>Applied automatically at checkout</span></div><div><small>LOYALTY POINTS</small><strong>{profile.points}</strong><span className={`pf-tier ${tier.name.toLowerCase()}`}>{tier.name}</span></div></div>
            <div className="rw-tier"><div><span style={{ width: `${next ? Math.min(100, ((profile.lifetimePoints - tier.min) / (next.min - tier.min)) * 100) : 100}%` }} /></div><small>{next ? `${next.min - profile.lifetimePoints} more points to ${next.name}` : "You've reached the top tier"} · {tier.perk}</small></div>
            <div className="pf-row"><span><strong>Redeem points</strong><small>{platform.settings.redeemBlock} points = {money(platform.settings.redeemValue)} credit</small></span><button disabled={!balanceBlocks} onClick={() => { const r = platform.redeemPoints(account.id, balanceBlocks); flash(r.message); }}>Redeem {balanceBlocks ? money(balanceBlocks * platform.settings.redeemValue) : ""}</button></div>
            <h3>Refer a friend</h3>
            <div className="rw-code"><span><small>YOUR CODE</small><strong>{profile.referralCode}</strong></span><button onClick={() => { navigator.clipboard?.writeText(`Join me on ServeNaija and get ${money(platform.settings.refereeReward)} off with my code ${profile.referralCode}`); flash("Invite message copied."); }}>Copy invite</button></div>
            <p className="pf-sub">Your friend gets {money(platform.settings.refereeReward)} credit; you get {money(platform.settings.referrerReward)} when they complete their first booking. Friends referred: {Object.values(platform.profiles).filter((p) => p.referredBy === profile.referralCode).length}.</p>
            {canAddCode && <div className="pf-form"><input value={codeInput} onChange={(event) => setCodeInput(event.target.value.toUpperCase())} placeholder="Have a friend's code?" /><button className="button button-primary" onClick={() => { const r = platform.redeemReferralCode(account.id, codeInput); flash(r.message); if (r.ok) setCodeInput(""); }}>Apply code</button></div>}
            {profile.referredBy && <p className="pf-sub">Referral code applied: <b>{profile.referredBy}</b></p>}
            <h3>Offers you can use</h3>
            <div className="pf-list">{platform.promos.filter((promo) => promo.active).map((promo) => <div className="pf-row" key={promo.id}><span><strong>{promo.code}</strong><small>{promo.description}{promo.expiresAt ? ` · until ${promo.expiresAt}` : ""}</small></span><button onClick={() => { navigator.clipboard?.writeText(promo.code); flash(`${promo.code} copied — paste it at checkout.`); }}>Copy</button></div>)}{!platform.promos.some((promo) => promo.active) && <p className="pf-empty">No active offers right now.</p>}</div>
            <h3>Activity</h3>
            <div className="pf-list">{profile.ledger.slice(0, 12).map((entry) => <div className="pf-row" key={entry.id}><span><strong>{entry.note}</strong><small>{new Date(entry.createdAt).toLocaleDateString()}</small></span><b className={entry.credit < 0 || entry.points < 0 ? "neg" : "pos"}>{entry.credit ? `${entry.credit > 0 ? "+" : "−"}${money(Math.abs(entry.credit))}` : `${entry.points > 0 ? "+" : "−"}${Math.abs(entry.points)} pts`}</b></div>)}{!profile.ledger.length && <p className="pf-empty">Your credit and points activity will show up here.</p>}</div>
            <div className="rw-tiers">{TIERS.map((item) => <span key={item.name} className={item.name === tier.name ? "current" : ""}><strong>{item.name}</strong><small>{item.min}+ pts · {item.perk}</small></span>)}</div>
          </>}

          {tab === "history" && <>
            <h2>History & reviews</h2><p className="pf-sub">Rate completed services — your rating updates the partner's public profile.</p>
            <div className="pf-list">{mine.map((booking) => { const provider = platform.providers.find((item) => item.id === booking.providerId); const draft = reviewDraft[booking.id] || { rating: 0, text: "" }; return (
              <div className="pf-history" key={booking.id}>
                <div className="pf-row"><span><strong>{booking.service}</strong><small>{booking.id} · {provider ? provider.name : "Awaiting professional"} · {new Date(booking.createdAt).toLocaleDateString()}</small></span><b>{money(booking.amount - (booking.discount || 0) - (booking.creditUsed || 0))}</b><em className={`pf-status ${booking.status}`}>{booking.status.replace("_", " ")}</em></div>
                {booking.status === "completed" && (booking.rating ? <p className="pf-rated">{"★".repeat(booking.rating)}{"☆".repeat(5 - booking.rating)} {booking.review ? `“${booking.review}”` : "Thanks for rating."}</p> : <div className="pf-rate"><span>{[1, 2, 3, 4, 5].map((n) => <button key={n} className={n <= draft.rating ? "on" : ""} onClick={() => setReviewDraft({ ...reviewDraft, [booking.id]: { ...draft, rating: n } })} aria-label={`${n} stars`}>★</button>)}</span><input value={draft.text} onChange={(event) => setReviewDraft({ ...reviewDraft, [booking.id]: { ...draft, text: event.target.value } })} placeholder="Add a comment (optional)" /><button className="button button-primary" disabled={!draft.rating} onClick={() => flash(platform.rateBooking(booking.id, draft.rating, draft.text).message)}>Submit</button></div>)}
              </div>); })}{!mine.length && <p className="pf-empty">No bookings yet.</p>}</div>
          </>}
        </section>
      </div>
    </main>
  );
}
