import { useEffect, useState } from "react";
import { Icon, Button } from "./ui";
import { usePlatform, type Booking } from "./PlatformContext";
import { money } from "./catalog";

const STATUS_LABEL: Record<Booking["status"], string> = { paid: "FINDING A PRO", accepted: "PRO ASSIGNED", in_progress: "IN PROGRESS", completed: "COMPLETED", cancelled: "CANCELLED" };
const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const when = (iso: string) => new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function TrackingPage({ customerId, onBook }: { customerId: string; onBook: () => void }) {
  const platform = usePlatform();
  const mine = platform.bookings.filter((b) => b.customerId === customerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const activeList = mine.filter((b) => b.status !== "completed" && b.status !== "cancelled");
  const [tab, setTab] = useState<"active" | "history">(activeList.length || !mine.length ? "active" : "history");
  const list = tab === "active" ? activeList : mine.filter((b) => b.status === "completed" || b.status === "cancelled");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const booking = mine.find((b) => b.id === selectedId) || list[0];
  const [, setTick] = useState(0);
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState("");
  const [msg, setMsg] = useState("");
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 15000); return () => clearInterval(t); }, []);

  const provider = booking ? platform.providers.find((p) => p.id === booking.providerId) : undefined;
  const series = booking?.seriesId ? mine.filter((b) => b.seriesId === booking.seriesId).sort((a, b) => (a.visitNo || 0) - (b.visitNo || 0)) : [];
  // ETA is derived from the real accept/en-route timestamps, never hardcoded.
  let etaValue = "—", etaLabel = "STATUS", progress = 0;
  if (booking) {
    if (booking.status === "paid") { etaLabel = "MATCHING"; etaValue = booking.instant ? "~10 min" : "Soon"; }
    else if (booking.status === "accepted") {
      if (booking.instant && booking.etaMinutes) {
        const start = new Date(booking.enRouteAt || booking.acceptedAt || booking.createdAt).getTime();
        const left = Math.max(0, Math.ceil(booking.etaMinutes - (Date.now() - start) / 60000));
        progress = Math.min(1, (Date.now() - start) / 60000 / booking.etaMinutes);
        etaLabel = left ? "ARRIVING IN" : "ARRIVING"; etaValue = left ? `${left} min` : "Now";
      } else { etaLabel = booking.enRouteAt ? "ON THE WAY" : "SCHEDULED"; etaValue = booking.enRouteAt ? "En route" : booking.slot.split("·")[0].trim(); progress = booking.enRouteAt ? .5 : 0; }
    } else if (booking.status === "in_progress") { etaLabel = "NOW"; etaValue = "On site"; progress = 1; }
    else { etaLabel = booking.status === "completed" ? "DONE" : "CLOSED"; etaValue = booking.status === "completed" ? "✓" : "—"; }
  }

  const cancel = () => { if (booking && window.confirm("Cancel this booking? Your payment will be refunded.")) platform.cancelBooking(booking.id); };
  const submitRating = () => { if (!booking) return; const r = platform.rateBooking(booking.id, rating, review); setMsg(r.message); };
  const helpUrl = `https://wa.me/2347007378362?text=${encodeURIComponent(`Hi ServeNaija, I need help with booking ${booking?.id || ""}`)}`;

  return (
    <main className="subpage bookings-page">
      <div className="subpage-title content-width"><div><span className="kicker">MY ACCOUNT</span><h1>Your bookings</h1><p>Track active services and see your booking history.</p></div><Button onClick={onBook}>Book another service</Button></div>
      <div className="content-width">
        <div className="view-tabs"><button className={tab === "active" ? "active" : ""} onClick={() => { setTab("active"); setSelectedId(null); }}>Active<span>{activeList.length}</span></button><button className={tab === "history" ? "active" : ""} onClick={() => { setTab("history"); setSelectedId(null); }}>History</button></div>
        {list.length > 1 && <div className="saved-chips" style={{ margin: "12px 0" }}>{list.map((b) => <button key={b.id} className={booking?.id === b.id ? "selected" : ""} onClick={() => setSelectedId(b.id)}>{b.service} · {b.id}</button>)}</div>}
      </div>
      <div className="bookings-layout content-width">
        {booking ? <article className="active-booking">
          <div className="active-booking-head"><span className="live-pill"><i /> {STATUS_LABEL[booking.status]}</span><strong>Booking #{booking.id}</strong></div>
          <div className="technician-row">
            <span className="disc-avatar" style={{ width: 54, height: 54, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--green-soft)", color: "var(--green-dark)", fontWeight: 800 }}>{provider ? initials(provider.name) : "?"}</span>
            <div>{provider ? <><h2>{provider.name}</h2><p><Icon name="star" size={14} /> {provider.rating ? provider.rating.toFixed(2) : "New"} · {provider.completedJobs} jobs · {provider.service}</p><span><Icon name="shield" size={14} /> NIN & background verified</span></> : <><h2>{booking.status === "cancelled" ? "No professional assigned" : "Matching you with a pro…"}</h2><p>{booking.instant ? "Instant request sent to online partners nearby." : "Verified partners in your area have been notified."}</p></>}</div>
            <div className="eta"><small>{etaLabel}</small><strong>{etaValue}</strong></div>
          </div>
          {provider && booking.status !== "cancelled" && booking.status !== "completed" && <div className="tracking-map"><div className="map-road road-one" /><div className="map-road road-two" /><span className="map-home"><Icon name="home" size={16} /></span><span className="map-tech" style={{ left: `${12 + progress * 52}%`, bottom: `${30 + progress * 40}px`, transition: "all 1s" }}>{initials(provider.name)}</span><div className="map-route" /></div>}

          {booking.quote && <div className="perk-box" style={{ margin: "14px 0" }}>
            <strong>Quotation from your professional: {money(booking.quote.amount)}</strong>
            {booking.quote.note && <small>{booking.quote.note}</small>}
            {booking.quote.status === "pending" ? <div className="flow-actions"><Button variant="secondary" onClick={() => platform.respondQuote(booking.id, false)}>Decline</Button><Button onClick={() => platform.respondQuote(booking.id, true)}>Approve & pay {money(booking.quote.amount)}</Button></div> : <small className={booking.quote.status === "approved" ? "perk-ok" : "perk-bad"}>{booking.quote.status === "approved" ? "Approved — added to escrow" : "Declined"}</small>}
          </div>}

          <div className="ledger panel" style={{ margin: "14px 0" }}>
            <div className="panel-heading"><div><h2>Progress</h2><p>Every step, in real time</p></div></div>
            {(booking.events || []).slice().reverse().map((e, i) => <div className="ledger-row" key={i}><span className="ledger-icon"><Icon name={i === 0 ? "clock" : "check"} size={16} /></span><div><strong>{e.label}</strong><small>{when(e.at)}</small></div></div>)}
          </div>

          {booking.status === "completed" && !booking.rating && <div className="perk-box"><strong>Rate {provider?.name || "your pro"}</strong><div className="saved-chips">{[1, 2, 3, 4, 5].map((n) => <button key={n} className={rating === n ? "selected" : ""} onClick={() => setRating(n)}>{n}★</button>)}</div><textarea placeholder="Tell others about the service (optional)" value={review} onChange={(e) => setReview(e.target.value)} /><Button onClick={submitRating}>Submit rating</Button></div>}
          {(msg || booking.rating) && <small className="perk-ok">{msg || `You rated this ${booking.rating}★`}</small>}

          <div className="booking-actions">
            {provider?.phone && booking.status !== "completed" && booking.status !== "cancelled" && <a className="button button-primary" href={`tel:${provider.phone}`}>Call pro</a>}
            {(booking.status === "paid" || booking.status === "accepted") && <Button variant="secondary" onClick={cancel}>Cancel booking</Button>}
            <a className="button button-ghost" href={helpUrl} target="_blank" rel="noreferrer">Get help</a>
          </div>
        </article> : <article className="active-booking empty-booking"><Icon name="calendar" size={30} /><h2>{tab === "active" ? "No active bookings" : "No past bookings"}</h2><p>Book a trusted professional and manage every step here.</p><Button onClick={onBook}>Book a service</Button></article>}

        {booking && <aside className="booking-summary">
          {booking.status !== "completed" && booking.status !== "cancelled" && <><span>COMPLETION CODE</span><div className="customer-pin">{booking.completionPin}</div><p>Only give this code to your partner after the service is completed to your satisfaction.</p></>}
          <h2>{booking.service}</h2><p>{booking.slot}</p><p>{booking.address}</p>
          {booking.lines?.map((l) => <div key={l.itemId}><span>{l.qty > 1 ? `${l.qty} × ` : ""}{l.name}</span><strong>{money(l.total)}</strong></div>)}
          {booking.instantFee ? <div><span>Instant fee</span><strong>{money(booking.instantFee)}</strong></div> : null}
          {booking.surgeFee ? <div><span>High-demand</span><strong>{money(booking.surgeFee)}</strong></div> : null}
          {booking.discount ? <div><span>Discounts</span><strong>−{money(booking.discount)}</strong></div> : null}
          {booking.creditUsed ? <div><span>Wallet credit</span><strong>−{money(booking.creditUsed)}</strong></div> : null}
          <div><span>Booking total</span><strong>{money(booking.amount)}</strong></div>
          <div><span>Paid with</span><strong>{booking.paidWith || "—"}</strong></div>
          {series.length > 1 && <><h2 style={{ marginTop: 14 }}>Plan · {series.length} visits</h2>{series.map((v) => <div key={v.id}><span>Visit {v.visitNo}{v.id === booking.id ? " (this)" : ""}</span><strong>{v.status === "completed" ? "Done ✓" : v.status === "cancelled" ? "Cancelled" : v.slot.split("·")[0]}</strong></div>)}</>}
        </aside>}
      </div>
    </main>
  );
}
