import { useMemo, useState, type ReactNode } from "react";
import { usePlatform, providerWallet, type Booking, type Provider } from "./PlatformContext";
import NotificationCenter, { useUnread } from "./Notifications";
import { AdminAnalytics, AdminPromotions } from "./AdminExtras";
import { AREA_NAMES, tierOf } from "./platformLogic";
import { CATALOG_CATEGORIES, PRICING_LABEL, money, type CatalogItem, type PricingType } from "./catalog";

type AdminView = "operations" | "compliance" | "users" | "pricing" | "finance" | "analytics" | "promotions";
const TITLES: Record<AdminView, string> = { operations: "Live Operations", compliance: "Artisan Compliance", users: "Customers & Accounts", pricing: "Services & Pricing", finance: "Finance & Escrow", analytics: "Analytics & Reports", promotions: "Promotions & Referrals" };
const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const when = (iso?: string) => iso ? new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
const mask = (v: string) => v ? `${v.slice(0, 3)}•••••${v.slice(-2)}` : "—";

function Info({ label, children }: { label: string; children?: ReactNode }) { return <div className="ap-item"><small>{label}</small><strong>{children || "—"}</strong></div>; }
function Section({ title, children }: { title: string; children: ReactNode }) { return <section className="ap-section"><h3>{title}</h3>{children}</section>; }
function Drawer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  return <div className="admin-profile-backdrop" onMouseDown={onClose}><section className="admin-profile" onMouseDown={(e) => e.stopPropagation()} style={{ overflowY: "auto" }}><button className="profile-close" onClick={onClose}>×</button>{children}</section></div>;
}
const statusTone = (s: string) => s === "completed" || s === "approved" ? "verified" : s === "cancelled" || s === "rejected" ? "rejected" : "";

export default function SuperAdmin({ onLogout }: { onLogout: () => void }) {
  const platform = usePlatform();
  const [view, setView] = useState<AdminView>("operations");
  const [notice, setNotice] = useState("");
  const [ntfOpen, setNtfOpen] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);
  const [note, setNote] = useState("");
  const [search, setSearch] = useState("");
  const [newSvc, setNewSvc] = useState({ category: "plumbing", name: "", pricing: "fixed" as PricingType, unitLabel: "job", price: "", materials: "" });
  const adminUnread = useUnread("admin");
  const admin = platform.accounts.find((a) => a.role === "admin");

  const { bookings, payments, providers, accounts, pricing, catalog, withdrawals } = platform;
  const customers = accounts.filter((a) => a.role === "consumer");
  const completed = bookings.filter((b) => b.status === "completed");
  const activeBookings = bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled");
  const cancelled = bookings.filter((b) => b.status === "cancelled");
  const totalGmv = payments.filter((p) => p.status !== "refunded").reduce((sum, p) => sum + p.amount, 0);
  const escrowTotal = payments.filter((p) => p.status === "escrow").reduce((sum, p) => sum + p.amount, 0);
  const releasedGmv = payments.filter((p) => p.status === "released").reduce((sum, p) => sum + p.amount, 0);
  const pending = providers.filter((p) => p.status === "pending");
  const approved = providers.filter((p) => p.status === "approved");
  const pendingWd = withdrawals.filter((w) => w.status === "requested");
  const avgMinutes = completed.length ? Math.round(completed.reduce((sum, b) => sum + (new Date(b.completedAt || b.createdAt).getTime() - new Date(b.createdAt).getTime()) / 60000, 0) / completed.length) : 0;
  const act = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(""), 2800); };
  const providerName = (id?: string) => providers.find((p) => p.id === id)?.name || "—";
  const areaDemand = (area: string) => activeBookings.filter((b) => b.area === area).length;

  const provider = providers.find((p) => p.id === providerId) || null;
  const user = accounts.find((a) => a.id === userId) || null;
  const booking = bookings.find((b) => b.id === bookingId) || null;
  const filteredCustomers = useMemo(() => customers.filter((c) => `${c.name} ${c.phone}`.toLowerCase().includes(search.toLowerCase())), [customers, search]);

  const navItems: [AdminView, string, string, number?][] = [["operations", "⌂", "Live operations"], ["compliance", "✓", "Compliance", pending.length], ["users", "☺", "Customers"], ["pricing", "₦", "Services & pricing"], ["finance", "▣", "Finance & escrow", pendingWd.length], ["analytics", "▤", "Analytics"], ["promotions", "✦", "Promotions"]];
  const goto = (v: AdminView) => { setView(v); setSearch(""); };
  const openProvider = (id: string) => { setProviderId(id); setReveal(false); setNote(""); };

  const decide = (p: Provider, ok: boolean) => {
    platform.patchProvider(p.id, { decisionNote: note.trim() || undefined, decidedAt: new Date().toISOString() });
    if (ok) platform.approveProvider(p.id); else platform.rejectProvider(p.id);
    act(`${p.name} ${ok ? "approved" : "rejected"}`); setNote("");
  };

  const bookingTable = (rows: Booking[]) => <>
    <div className="audit-row audit-head"><span>BOOKING</span><span>CUSTOMER</span><span>PARTNER</span><span>STATUS</span><span>AMOUNT</span></div>
    {rows.map((b) => <div className="audit-row" key={b.id} style={{ cursor: "pointer" }} onClick={() => setBookingId(b.id)}><span><b>{b.id}<small>{b.service}{b.instant ? " · ⚡ instant" : ""}</small></b></span><span>{b.customerName}</span><span>{providerName(b.providerId)}</span><span><em className={statusTone(b.status)}>{b.status.replace("_", " ")}</em></span><span><strong>{money(b.amount)}</strong></span></div>)}
    {!rows.length && <div className="empty-state"><p>No bookings yet. They appear here in real time as customers book.</p></div>}
  </>;

  const updateItem = (id: string, patch: Partial<CatalogItem>) => platform.saveCatalog(catalog.map((c) => c.id === id ? { ...c, ...patch } : c));
  const addItem = () => {
    if (newSvc.name.trim().length < 3 || !(Number(newSvc.price) > 0)) return act("Enter a service name and price");
    platform.saveCatalog([...catalog, { id: `svc-${Date.now()}`, category: newSvc.category, name: newSvc.name.trim(), pricing: newSvc.pricing, unitLabel: newSvc.pricing === "quote" ? "inspection" : newSvc.pricing === "visit" ? "visit" : newSvc.unitLabel || "unit", price: Number(newSvc.price), materials: newSvc.pricing === "fixed" ? Number(newSvc.materials) || 0 : undefined, max: newSvc.pricing === "quantity" ? 200 : 20, active: true }]);
    setNewSvc({ ...newSvc, name: "", price: "", materials: "" }); act("Service added to the catalogue");
  };

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-logo"><span>S</span><strong>ServeNaija</strong></div><small>COMMAND CENTRE</small>
        <nav>{navItems.map(([key, icon, label, count]) => <button key={key} className={view === key ? "active" : ""} onClick={() => goto(key)}>{icon} <span>{label}</span>{!!count && <i>{count}</i>}</button>)}</nav>
        <div className="admin-user"><span>{initials(admin?.name || "Admin")}</span><div><strong>{admin?.name || "Administrator"}</strong><small>Super Administrator</small></div></div>
        <button className="admin-logout" onClick={onLogout}>Sign out</button>
      </aside>
      <main className="admin-main">
        <nav className="admin-mobile-tabs" aria-label="Admin sections">{navItems.map(([key, , label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => goto(key)}>{label}</button>)}<button onClick={onLogout}>Sign out</button></nav>
        {notice && <div className="admin-toast">✓ {notice}</div>}
        <header className="admin-header"><div><span>{new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })} · {new Date().toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" })}</span><h1>{TITLES[view]}</h1></div><div><button data-ntf-toggle onClick={() => setNtfOpen((v) => !v)}>Notifications {adminUnread > 0 && <b className="ntf-badge">{adminUnread}</b>}</button><NotificationCenter audience="admin" open={ntfOpen} onClose={() => setNtfOpen(false)} /></div></header>

        {view === "operations" && <>
          <section className="admin-kpis">{[["Active bookings", String(activeBookings.length), `${bookings.length} total requests`], ["Approved partners", String(approved.length), `${pending.length} awaiting approval`], ["Total GMV", money(totalGmv), `${payments.length} payments`], ["Services completed", String(completed.length), `${customers.length} customers`], ["Avg. completion", avgMinutes ? `${avgMinutes} mins` : "—", "Paid to completed"]].map(([l, v, t]) => <article key={l}><span>{l}</span><strong>{v}</strong><small>{t}</small></article>)}</section>
          <section className="admin-grid">
            <article className="ops-map admin-panel"><div className="admin-panel-head"><div><h2>Live demand by area</h2><p>Active bookings right now</p></div></div><div className="city-map"><span className="map-label lekki">Lekki <b>{areaDemand("Lekki Phase 1, Lagos")}</b></span><span className="map-label vi">Victoria Island <b>{areaDemand("Victoria Island, Lagos")}</b></span><span className="map-label ikeja">Ikeja <b>{areaDemand("Ikeja GRA, Lagos")}</b></span><span className="map-label yaba">Yaba <b>{areaDemand("Yaba, Lagos")}</b></span><i className="heat heat-one" /><i className="heat heat-two" /><i className="heat heat-three" /></div></article>
            <article className="activity-feed admin-panel"><div className="admin-panel-head"><div><h2>Live activity</h2><p>Across all cities</p></div></div>{platform.notifications.filter((n) => n.audience === "admin").slice(0, 6).map((n) => { const m = Math.round((Date.now() - new Date(n.createdAt).getTime()) / 60000); return <div key={n.id}><strong>{n.title}</strong><small>{n.body}</small><em>{m < 1 ? "NOW" : m < 60 ? `${m}M` : `${Math.round(m / 60)}H`}</em></div>; })}{!platform.notifications.some((n) => n.audience === "admin") && <div className="empty-state"><p>Activity will appear here as customers and partners use the platform.</p></div>}</article>
          </section>
          <section className="audit-table admin-panel"><div className="admin-panel-head"><div><h2>All bookings</h2><p>Click any booking for the full timeline, quotation and payment</p></div></div>{bookingTable(bookings.slice(0, 25))}</section>
          <section className="surge-panel admin-panel"><div className="admin-panel-head"><div><h2>Demand, surge & instant controls</h2><p>Changes apply to new bookings immediately</p></div></div>
            <div className="surge-table">{AREA_NAMES.map((zone) => { const on = !!pricing.surge[zone]; return <div key={zone}><strong>{zone}</strong><span>{areaDemand(zone)} active request{areaDemand(zone) === 1 ? "" : "s"}</span><b className={on ? "high" : ""}>{on ? `+${pricing.surgePercent}% surge` : "Standard pricing"}</b><button className={on ? "toggle-switch on" : "toggle-switch"} onClick={() => platform.updatePricing({ surge: { ...pricing.surge, [zone]: !on } })}><i /></button></div>; })}</div>
            <div className="ap-grid" style={{ marginTop: 14 }}><label className="ap-item"><small>SURGE % (HIGH-DEMAND AREAS)</small><input type="number" min={0} max={100} value={pricing.surgePercent} onChange={(e) => platform.updatePricing({ surgePercent: Math.max(0, Number(e.target.value) || 0) })} /></label><label className="ap-item"><small>INSTANT (10-MIN) FEE ₦</small><input type="number" min={0} value={pricing.instantFee} onChange={(e) => platform.updatePricing({ instantFee: Math.max(0, Number(e.target.value) || 0) })} /></label></div>
          </section>
        </>}

        {view === "compliance" && <>
          <section className="pipeline">{[["Pending review", pending.length, "awaiting decision"], ["Approved", approved.length, "active partners"], ["Rejected", providers.filter((p) => p.status === "rejected").length, "need follow-up"], ["All partners", providers.length, "total records"]].map(([l, n, s]) => <article key={String(l)}><span>{l}</span><strong>{n}</strong><small>{s}</small></article>)}</section>
          <section className="audit-table admin-panel"><div className="admin-panel-head"><div><h2>Application queue</h2><p>{pending.length ? `${pending.length} application${pending.length > 1 ? "s" : ""} need your decision` : "No pending applications"}</p></div></div>
            <div className="audit-row audit-head"><span>APPLICANT</span><span>NIN</span><span>BVN</span><span>SUBMITTED</span><span>ACTION</span></div>
            {pending.map((p) => <div className="audit-row" key={p.id}><span><i>{initials(p.name)}</i><b>{p.name}<small>{p.service} · {p.city}</small></b></span><span><em className={p.application?.ninVerified ? "verified" : ""}>{p.application?.ninVerified ? "Matched" : "Unverified"}</em></span><span><em className={p.application?.bvn ? "verified" : ""}>{p.application?.bvn ? "Provided" : "Missing"}</em></span><span>{when(p.application?.submittedAt || p.joinedAt)}</span><span><button onClick={() => openProvider(p.id)}>Review</button></span></div>)}
          </section>
          <section className="provider-directory admin-panel"><div className="admin-panel-head"><div><h2>Partner profiles</h2><p>Click a partner to see everything they submitted</p></div></div>
            {providers.map((p) => <div className="provider-row" key={p.id} style={{ cursor: "pointer" }} onClick={() => openProvider(p.id)}><span className="provider-avatar">{initials(p.name)}</span><div><strong>{p.name}</strong><small>{p.service} · {p.city}</small></div><em className={p.status}>{p.status}</em><span><b>{p.completedJobs}</b><small>completed</small></span><span><b>{bookings.filter((b) => b.providerId === p.id && b.status !== "completed" && b.status !== "cancelled").length}</b><small>running</small></span><span><b>{p.rating ? p.rating.toFixed(2) : "New"}</b><small>rating</small></span></div>)}
          </section>
        </>}

        {view === "users" && <section className="provider-directory admin-panel"><div className="admin-panel-head"><div><h2>{customers.length} customer{customers.length === 1 ? "" : "s"}</h2><p>Everyone who signed up — click for their full profile</p></div><input placeholder="Search name or phone" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          {filteredCustomers.map((c) => { const mine = bookings.filter((b) => b.customerId === c.id); const spent = mine.filter((b) => b.status !== "cancelled").reduce((sum, b) => sum + b.amount, 0); const prof = platform.profileOf(c.id); return <div className="provider-row" key={c.id} style={{ cursor: "pointer" }} onClick={() => setUserId(c.id)}><span className="provider-avatar">{initials(c.name)}</span><div><strong>{c.name}</strong><small>{c.phone}</small></div><em className="approved">{tierOf(prof.lifetimePoints).tier.name}</em><span><b>{mine.length}</b><small>bookings</small></span><span><b>{money(spent)}</b><small>spent</small></span><span><b>{money(prof.credit)}</b><small>wallet</small></span></div>; })}
          {!filteredCustomers.length && <div className="empty-state"><p>No customers match.</p></div>}
        </section>}

        {view === "pricing" && <>
          <section className="admin-panel"><div className="admin-panel-head"><div><h2>Subscription plans</h2><p>Discount applied to every visit when a customer picks a recurring plan</p></div></div>
            <div className="ap-grid"><label className="ap-item"><small>WEEKLY · 4 VISITS DISCOUNT %</small><input type="number" min={0} max={90} value={pricing.weekly4Discount} onChange={(e) => platform.updatePricing({ weekly4Discount: Math.max(0, Number(e.target.value) || 0) })} /></label><label className="ap-item"><small>WEEKLY · 12 VISITS DISCOUNT %</small><input type="number" min={0} max={90} value={pricing.weekly12Discount} onChange={(e) => platform.updatePricing({ weekly12Discount: Math.max(0, Number(e.target.value) || 0) })} /></label></div></section>
          <section className="admin-panel"><div className="admin-panel-head"><div><h2>Add a service</h2><p>Choose the pricing model that fits the job</p></div><button onClick={addItem}>Add service</button></div>
            <div className="ap-grid">
              <label className="ap-item"><small>CATEGORY</small><select value={newSvc.category} onChange={(e) => setNewSvc({ ...newSvc, category: e.target.value })}>{CATALOG_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}</select></label>
              <label className="ap-item"><small>SERVICE NAME</small><input value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })} placeholder="e.g. Gate repair" /></label>
              <label className="ap-item"><small>PRICING MODEL</small><select value={newSvc.pricing} onChange={(e) => setNewSvc({ ...newSvc, pricing: e.target.value as PricingType })}>{(Object.keys(PRICING_LABEL) as PricingType[]).map((k) => <option key={k} value={k}>{PRICING_LABEL[k]}</option>)}</select></label>
              {(newSvc.pricing === "unit" || newSvc.pricing === "quantity") && <label className="ap-item"><small>UNIT (kg, m², TV…)</small><input value={newSvc.unitLabel} onChange={(e) => setNewSvc({ ...newSvc, unitLabel: e.target.value })} /></label>}
              <label className="ap-item"><small>{newSvc.pricing === "quote" ? "INSPECTION FEE ₦" : newSvc.pricing === "fixed" ? "LABOUR ₦" : "PRICE ₦"}</small><input type="number" value={newSvc.price} onChange={(e) => setNewSvc({ ...newSvc, price: e.target.value })} /></label>
              {newSvc.pricing === "fixed" && <label className="ap-item"><small>MATERIALS ALLOWANCE ₦</small><input type="number" value={newSvc.materials} onChange={(e) => setNewSvc({ ...newSvc, materials: e.target.value })} /></label>}
            </div></section>
          {CATALOG_CATEGORIES.map((cat) => { const rows = catalog.filter((c) => c.category === cat.key); return <section className="admin-panel" key={cat.key}><div className="admin-panel-head"><div><h2>{cat.icon} {cat.label}</h2><p>{rows.length} service{rows.length === 1 ? "" : "s"}</p></div></div>
            {rows.map((c) => <div className="finance-row" key={c.id} style={{ gap: 10, flexWrap: "wrap" }}><span style={{ flex: "1 1 180px" }}><strong>{c.name}</strong><small>{PRICING_LABEL[c.pricing]}{c.pricing === "unit" || c.pricing === "quantity" ? ` · per ${c.unitLabel}` : ""}</small></span>
              <label>₦ <input style={{ width: 92 }} type="number" value={c.price} onChange={(e) => updateItem(c.id, { price: Math.max(0, Number(e.target.value) || 0) })} /></label>
              {c.pricing === "fixed" && <label>+ mat ₦ <input style={{ width: 82 }} type="number" value={c.materials ?? 0} onChange={(e) => updateItem(c.id, { materials: Math.max(0, Number(e.target.value) || 0) })} /></label>}
              <button className={c.active ? "toggle-switch on" : "toggle-switch"} title={c.active ? "Visible to customers" : "Hidden"} onClick={() => updateItem(c.id, { active: !c.active })}><i /></button></div>)}
          </section>; })}
        </>}

        {view === "analytics" && <AdminAnalytics act={act} />}
        {view === "promotions" && <AdminPromotions act={act} />}

        {view === "finance" && <>
          <section className="finance-hero"><div><span>TOTAL GMV</span><strong>{money(totalGmv)}</strong><small>{payments.length} customer payments</small></div><div><span>PLATFORM REVENUE</span><strong>{money(releasedGmv * 0.15)}</strong><small>15% of released payments</small></div><div><span>IN ESCROW</span><strong>{money(escrowTotal)}</strong><small>{activeBookings.length} active bookings</small></div><div><span>RELEASED TO PARTNERS</span><strong>{money(releasedGmv * 0.85)}</strong><small>After completion PIN</small></div></section>
          <section className="finance-columns">
            <article className="admin-panel"><div className="admin-panel-head"><div><h2>Escrow ledger</h2><p>Live customer payments and completion status</p></div><b>{payments.filter((p) => p.status === "escrow").length} held</b></div>
              {bookings.map((b) => { const pay = payments.find((p) => p.bookingId === b.id); return <div className="finance-row" key={b.id} style={{ cursor: "pointer" }} onClick={() => setBookingId(b.id)}><span><strong>{b.id}</strong><small>{b.service} · {b.customerName}</small></span><b>{money(b.amount)}</b><em className={pay?.status === "released" ? "verified" : pay?.status === "refunded" ? "rejected" : ""}>{pay?.status === "released" ? "Released" : pay?.status === "refunded" ? "Refunded" : "In escrow"}</em></div>; })}
              {!bookings.length && <div className="empty-state"><p>No payments yet.</p></div>}</article>
            <article className="admin-panel"><div className="admin-panel-head"><div><h2>Payout requests</h2><p>Partner withdrawals to bank</p></div><b>{pendingWd.length} pending</b></div>
              {withdrawals.map((w) => <div className="settlement-row" key={w.id}><i>{providerName(w.providerId)[0]}</i><span><strong>{providerName(w.providerId)}</strong><small>{w.bank} · {when(w.createdAt)}</small></span><b>{money(w.amount)}</b>{w.status === "requested" ? <button onClick={() => { platform.markWithdrawalPaid(w.id); act("Payout marked as sent"); }}>Mark paid</button> : <em className="verified">Paid</em>}</div>)}
              {!withdrawals.length && <div className="empty-state"><p>No payout requests yet.</p></div>}</article>
          </section>
          <section className="dispute-strip"><span>!</span><div><strong>{cancelled.length} cancelled booking{cancelled.length === 1 ? "" : "s"} · {money(cancelled.reduce((s, b) => s + b.amount, 0))} refunded or under refund review</strong><small>Open a booking in the ledger above to see its full history.</small></div></section>
        </>}
      </main>

      {booking && <Drawer onClose={() => setBookingId(null)}>
        <div className="profile-identity"><span>{initials(booking.customerName)}</span><div><em className={statusTone(booking.status)}>{booking.status.replace("_", " ")}</em><h2>{booking.service}</h2><p>{booking.id} · {booking.customerName}</p></div></div>
        <Section title="Job"><div className="ap-grid"><Info label="CUSTOMER"><a href="#c" onClick={(e) => { e.preventDefault(); setBookingId(null); setUserId(booking.customerId); }}>{booking.customerName}</a></Info><Info label="PARTNER">{booking.providerId ? <a href="#p" onClick={(e) => { e.preventDefault(); setBookingId(null); openProvider(booking.providerId!); }}>{providerName(booking.providerId)}</a> : "Not assigned"}</Info><Info label="ADDRESS">{booking.address}</Info><Info label="WHEN">{booking.slot}</Info><Info label="PLAN">{booking.visitsTotal && booking.visitsTotal > 1 ? `${booking.visitsTotal}-visit plan (visit ${booking.visitNo})` : "One-time"}</Info><Info label="INSTANT">{booking.instant ? `Yes · ${money(booking.instantFee || 0)}` : "No"}</Info><Info label="ACCESS NOTE">{booking.note}</Info><Info label="COMPLETION PIN">{booking.completionPin}</Info></div></Section>
        <Section title="Pricing & payment"><div className="ap-grid">{booking.lines?.map((l) => <Info key={l.itemId} label={`${PRICING_LABEL[l.pricing].toUpperCase()}${l.qty > 1 ? ` · ${l.qty} ${l.unitLabel}` : ""}`}>{money(l.total)}</Info>)}{booking.surgeFee ? <Info label="SURGE">{money(booking.surgeFee)}</Info> : null}{booking.discount ? <Info label="DISCOUNTS">−{money(booking.discount)}</Info> : null}{booking.creditUsed ? <Info label="WALLET CREDIT">−{money(booking.creditUsed)}</Info> : null}<Info label="TOTAL">{money(booking.amount)}</Info><Info label="PAID WITH">{booking.paidWith}</Info><Info label="ESCROW">{payments.find((p) => p.bookingId === booking.id)?.status}</Info><Info label="PLATFORM FEE (15%)">{money(Math.round(booking.amount * 0.15))}</Info></div>{booking.quote && <p style={{ marginTop: 10 }}>Quotation {money(booking.quote.amount)} ({booking.quote.status}){booking.quote.note ? ` — ${booking.quote.note}` : ""}</p>}{booking.rating && <p>Rated {booking.rating}★{booking.review ? ` — “${booking.review}”` : ""}</p>}</Section>
        <Section title="Timeline">{(booking.events || []).map((e, i) => <div className="ap-event" key={i}><b>{e.label}</b><small>{when(e.at)}</small></div>)}</Section>
        {booking.status !== "completed" && booking.status !== "cancelled" && <button className="admin-logout" style={{ marginTop: 12 }} onClick={() => { platform.cancelBooking(booking.id); act("Booking cancelled and refunded"); }}>Cancel & refund booking</button>}
      </Drawer>}

      {provider && <Drawer onClose={() => setProviderId(null)}>
        <div className="profile-identity"><span>{initials(provider.name)}</span><div><em className={provider.status}>{provider.status}</em><h2>{provider.name}</h2><p>{provider.service} · {provider.city}</p></div></div>
        {(() => { const w = providerWallet(platform, provider.id); const running = bookings.filter((b) => b.providerId === provider.id && b.status !== "completed" && b.status !== "cancelled").length; return <div className="profile-metrics"><span><small>COMPLETED</small><strong>{provider.completedJobs}</strong></span><span><small>RUNNING</small><strong>{running}</strong></span><span><small>EARNED</small><strong>{money(w.earned)}</strong></span><span><small>RATING</small><strong>{provider.rating ? provider.rating.toFixed(2) : "New"}</strong></span></div>; })()}
        {provider.application ? (() => { const a = provider.application; return <>
          <Section title="Personal details"><div className="ap-grid"><Info label="LEGAL NAME">{a.fullName}</Info><Info label="PHONE">{a.phone}</Info><Info label="EMAIL">{a.email}</Info><Info label="CITY / AREA">{a.lga}, {a.city}</Info><Info label="PRIMARY SERVICE">{a.category}</Info><Info label="EXPERIENCE">{a.experience}</Info><Info label="SUBMITTED">{when(a.submittedAt)}</Info><Info label="ONLINE">{provider.available === false ? "Offline" : "Online"}</Info></div><p style={{ marginTop: 8 }}>{a.bio}</p></Section>
          <Section title="Identity & compliance"><div className="ap-grid"><Info label="NIN">{reveal ? a.nin : mask(a.nin)} {a.ninVerified ? "✓ matched" : "(unverified)"}</Info><Info label="BVN">{reveal ? a.bvn : mask(a.bvn)}</Info><Info label="LIVENESS SELFIE">{a.selfieVerified ? "✓ Confirmed" : "Not completed"}</Info><Info label="TRADE CERTIFICATE">{a.certificateName || "Not uploaded"}</Info><Info label="RESIDENT ID">{a.residentIdName || "Not uploaded"}</Info><Info label="BACKGROUND CONSENT">{a.consent ? "✓ Given" : "No"}</Info><Info label="PARTNER TERMS">{a.termsAccepted ? "✓ Accepted" : "No"}</Info><Info label="ASSESSMENT SLOT">{a.assessment}</Info></div><button className="admin-logout" style={{ marginTop: 10 }} onClick={() => setReveal((v) => !v)}>{reveal ? "Hide" : "Reveal"} sensitive numbers</button></Section>
          <Section title="Guarantors">{a.guarantors.map((g, i) => <div className="ap-grid" key={i} style={{ marginBottom: 8 }}><Info label={`GUARANTOR ${i + 1}`}>{g.name}</Info><Info label="RELATIONSHIP">{g.relationship}</Info><Info label="NIN">{reveal ? g.nin : mask(g.nin)}</Info></div>)}</Section>
          <Section title="Payout account"><div className="ap-grid"><Info label="BANK">{a.bank}</Info><Info label="ACCOUNT NUMBER">{reveal ? a.accountNumber : mask(a.accountNumber)}</Info></div></Section>
        </>; })() : <Section title="Application"><p>This is the demo partner, so there is no onboarding submission on file.</p></Section>}
        <Section title="Recent jobs">{bookings.filter((b) => b.providerId === provider.id).slice(0, 8).map((b) => <div className="ap-event" key={b.id} style={{ cursor: "pointer" }} onClick={() => { setProviderId(null); setBookingId(b.id); }}><b>{b.service} · {b.customerName}</b><small>{b.status.replace("_", " ")} · {money(b.amount)}</small></div>)}{!bookings.some((b) => b.providerId === provider.id) && <p>No jobs yet.</p>}</Section>
        {provider.decisionNote && <Section title="Decision note"><p>{provider.decisionNote}</p></Section>}
        <Section title="Decision"><textarea style={{ width: "100%", minHeight: 60 }} placeholder="Optional note to the partner" value={note} onChange={(e) => setNote(e.target.value)} /><div className="ap-grid" style={{ marginTop: 8 }}>{provider.status !== "approved" && <button className="admin-logout" onClick={() => decide(provider, true)}>Approve partner</button>}{provider.status !== "rejected" && <button className="admin-logout" onClick={() => decide(provider, false)}>Reject</button>}</div></Section>
      </Drawer>}

      {user && <Drawer onClose={() => setUserId(null)}>
        {(() => { const p = platform.profileOf(user.id); const mine = bookings.filter((b) => b.customerId === user.id); const spent = mine.filter((b) => b.status !== "cancelled").reduce((sum, b) => sum + b.amount, 0); return <>
          <div className="profile-identity"><span>{initials(user.name)}</span><div><em className="approved">{tierOf(p.lifetimePoints).tier.name}</em><h2>{user.name}</h2><p>{user.phone}</p></div></div>
          <div className="profile-metrics"><span><small>BOOKINGS</small><strong>{mine.length}</strong></span><span><small>TOTAL SPENT</small><strong>{money(spent)}</strong></span><span><small>WALLET</small><strong>{money(p.credit)}</strong></span><span><small>POINTS</small><strong>{p.points}</strong></span></div>
          <Section title="Account"><div className="ap-grid"><Info label="FULL NAME">{user.name}</Info><Info label="PHONE">{user.phone}</Info><Info label="EMAIL">{p.email}</Info><Info label="ACCOUNT ID">{user.id}</Info><Info label="REFERRAL CODE">{p.referralCode}</Info><Info label="REFERRED BY">{p.referredBy}</Info><Info label="LIFETIME POINTS">{p.lifetimePoints}</Info><Info label="PREFERRED SLOT">{p.prefs.preferredSlot}</Info></div></Section>
          <Section title="Saved addresses">{p.addresses.map((a) => <div className="ap-event" key={a.id}><b>{a.label}{a.isDefault ? " · default" : ""}</b><small>{a.address}</small></div>)}{!p.addresses.length && <p>None saved.</p>}</Section>
          <Section title="Payment methods (masked)">{p.methods.map((m) => <div className="ap-event" key={m.id}><b>{m.brand} •••• {m.last4}{m.isDefault ? " · default" : ""}</b><small>{m.holder} · exp {m.expiry}</small></div>)}{!p.methods.length && <p>None saved.</p>}</Section>
          <Section title="Bookings">{mine.map((b) => <div className="ap-event" key={b.id} style={{ cursor: "pointer" }} onClick={() => { setUserId(null); setBookingId(b.id); }}><b>{b.service} · {b.id}</b><small>{b.status.replace("_", " ")} · {money(b.amount)} · {providerName(b.providerId)}</small></div>)}{!mine.length && <p>No bookings yet.</p>}</Section>
          <Section title="Wallet & loyalty ledger">{p.ledger.slice(0, 10).map((l) => <div className="ap-event" key={l.id}><b>{l.note}</b><small>{l.credit ? `${l.credit > 0 ? "+" : "−"}${money(Math.abs(l.credit))}` : ""} {l.points ? `${l.points > 0 ? "+" : ""}${l.points} pts` : ""} · {when(l.createdAt)}</small></div>)}{!p.ledger.length && <p>No activity.</p>}</Section>
        </>; })()}
      </Drawer>}
    </div>
  );
}
