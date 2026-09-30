import { useEffect, useState } from "react";
import { Icon, Button, Logo, type IconName } from "./ui";
import { usePlatform, providerWallet, type Account, type Booking } from "./PlatformContext";
import NotificationCenter, { useUnread } from "./Notifications";
import { AREAS } from "./platformLogic";
import { money } from "./catalog";

const PARTNER_TIERS = [{ name: "Bronze", min: 0 }, { name: "Silver", min: 50000 }, { name: "Gold", min: 150000 }, { name: "Platinum", min: 300000 }];
const tierFor = (gmv: number) => { const i = PARTNER_TIERS.reduce((best, t, n) => (gmv >= t.min ? n : best), 0); return { tier: PARTNER_TIERS[i], next: PARTNER_TIERS[i + 1] }; };
const COURSES = [
  { id: "safety", title: "Customer safety & conduct", lessons: 5, icon: "shield" as IconName },
  { id: "escrow", title: "Escrow and completion PINs", lessons: 3, icon: "wallet" as IconName },
  { id: "experience", title: "Premium customer experience", lessons: 5, icon: "star" as IconName },
  { id: "toolkit", title: "Using the partner toolkit", lessons: 4, icon: "dashboard" as IconName },
];
const initials = (name: string) => name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
const when = (iso?: string) => iso ? new Date(iso).toLocaleString("en-NG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
const share = (b: Booking) => Math.round(b.amount * 0.85);

function JobCard({ b, onOpen }: { b: Booking; onOpen: () => void }) {
  return <article className="job-row">
    <div className="job-time"><strong>{b.instant ? "⚡ Now" : b.slot.split("·")[0].trim()}</strong><small>{b.slot.split("·")[1]?.trim() || ""}</small></div>
    <div className={`timeline-mark ${b.status === "in_progress" ? "current" : ""}`}><span /></div>
    <div className="job-info"><div><span className={`status ${b.status === "in_progress" ? "soon" : "confirmed"}`}>{b.status === "in_progress" ? "In progress" : b.status === "accepted" ? "Accepted" : b.status === "completed" ? "Completed" : b.status === "cancelled" ? "Cancelled" : "Open"}</span><h3>{b.service}{b.visitsTotal && b.visitsTotal > 1 ? ` · visit ${b.visitNo}/${b.visitsTotal}` : ""}</h3></div><p>{b.customerName} · <Icon name="location" size={13} /> {b.address}</p></div>
    <strong className="job-price">{money(share(b))}<small>Your earnings</small></strong>
    <button className="more-button" onClick={onOpen}>•••</button>
  </article>;
}

export default function ArtisanDashboard({ onSwitch, account }: { onSwitch: () => void; account: Account }) {
  const platform = usePlatform();
  const provider = platform.providers.find((item) => item.accountId === account.id);
  const [online, setOnline] = useState(provider?.available !== false);
  const [request, setRequest] = useState(true);
  const [activeNav, setActiveNav] = useState("Overview");
  const [jobTab, setJobTab] = useState("Upcoming");
  const [dialog, setDialog] = useState<"withdraw" | "job" | "tiers" | null>(null);
  const [detail, setDetail] = useState<Booking | null>(null);
  const [completionPin, setCompletionPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [ntfOpen, setNtfOpen] = useState(false);
  const [dashMenu, setDashMenu] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteNote, setQuoteNote] = useState("");
  const [msg, setMsg] = useState("");
  const [wdAmount, setWdAmount] = useState("");
  const [, setTick] = useState(0);
  const partnerUnread = useUnread("artisan", account.id);
  useEffect(() => { const t = setInterval(() => setTick((n) => n + 1), 30000); return () => clearInterval(t); }, []);

  const mine = provider ? platform.bookings.filter((b) => b.providerId === provider.id) : [];
  const pendingBooking = provider && online ? platform.bookings.find((b) => b.status === "paid" && !b.providerId
    && (!b.requestedProviderId || b.requestedProviderId === provider.id)
    && (!b.category || b.category === provider.category)
    && (!b.area || AREAS[b.area]?.city === provider.city)) : undefined;
  useEffect(() => { setRequest(true); }, [pendingBooking?.id]);
  const active = mine.filter((b) => b.status === "accepted" || b.status === "in_progress").sort((a, b) => (a.visitNo || 0) - (b.visitNo || 0) || a.createdAt.localeCompare(b.createdAt));
  const activeBooking = active.find((b) => b.status === "in_progress") || active[0];
  const done = mine.filter((b) => b.status === "completed");
  const cancelled = mine.filter((b) => b.status === "cancelled");
  const wallet = provider ? providerWallet(platform, provider.id) : { earned: 0, withdrawn: 0, available: 0, gmv: 0, completed: 0 };
  const { tier, next } = tierFor(wallet.gmv);
  const completionRate = done.length + cancelled.length ? Math.round((done.length / (done.length + cancelled.length)) * 100) : null;
  const repeatCustomers = (() => { const counts = new Map<string, number>(); done.forEach((b) => counts.set(b.customerId, (counts.get(b.customerId) || 0) + 1)); const all = [...counts.values()]; return all.length ? Math.round((all.filter((n) => n > 1).length / all.length) * 100) : null; })();
  const onTime = (() => { const inst = done.filter((b) => b.instant && b.acceptedAt && b.startedAt); if (!inst.length) return null; return Math.round((inst.filter((b) => (new Date(b.startedAt!).getTime() - new Date(b.acceptedAt!).getTime()) / 60000 <= 15).length / inst.length) * 100); })();
  const reviews = done.filter((b) => b.review).slice(-3).reverse();
  const week = Array.from({ length: 7 }, (_, n) => { const d = new Date(); d.setDate(d.getDate() - (6 - n)); const key = d.toDateString(); return { label: d.toLocaleDateString("en", { weekday: "narrow" }), value: done.filter((b) => b.completedAt && new Date(b.completedAt).toDateString() === key).reduce((sum, b) => sum + share(b), 0) }; });
  const weekMax = Math.max(1, ...week.map((w) => w.value));
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const sideItems: [string, IconName][] = [["Overview", "dashboard"], ["My jobs", "calendar"], ["Earnings", "wallet"], ["Performance", "star"], ["Training", "shield"]];
  const flash = (text: string) => { setMsg(text); setTimeout(() => setMsg(""), 3500); };
  const support = () => window.open(`https://wa.me/2347007378362?text=${encodeURIComponent(`Partner support: ${provider?.name || account.name}`)}`, "_blank");

  if (!provider || provider.status !== "approved") {
    return <div className="approval-page"><Logo /><div className="approval-card"><span className="approval-icon"><Icon name="clock" size={30} /></span><span className="kicker">COMPLIANCE REVIEW</span><h1>{provider?.status === "rejected" ? "Application needs attention" : "Application under review"}</h1><p>{provider?.status === "rejected" ? (provider.decisionNote || "Compliance couldn't approve your profile yet. Contact partner support to update your details.") : "Our compliance team is verifying your documents. You'll be notified as soon as you're approved."}</p><Button variant="secondary" onClick={onSwitch}>Back to customer portal</Button></div></div>;
  }

  const startJourney = (b: Booking) => platform.enRoute(b.id);
  const complete = (b: Booking) => { const ok = platform.completeBooking(b.id, provider.id, completionPin); setPinError(ok ? "" : "The code is incorrect. Ask the customer to check their bookings."); if (ok) setCompletionPin(""); };
  const sendQuote = (b: Booking) => { const r = platform.sendQuote(b.id, Number(quoteAmount), quoteNote); flash(r.message); if (r.ok) { setQuoteAmount(""); setQuoteNote(""); } };
  const openJob = (b: Booking) => { setDetail(b); setDialog("job"); };
  const upcoming = active;
  const jobsForTab = jobTab === "Upcoming" ? upcoming : jobTab === "Completed" ? done : cancelled;

  return (
    <div className="dashboard-page">
      <aside className={dashMenu ? "sidebar open" : "sidebar"}>
        <Logo light />
        <div className="partner-label">PARTNER PORTAL</div>
        <nav>{sideItems.map(([label, icon]) => <button key={label} className={activeNav === label ? "active" : ""} onClick={() => { setActiveNav(label); setDashMenu(false); }}><Icon name={icon} size={19} />{label}{label === "My jobs" && upcoming.length > 0 && <span>{upcoming.length}</span>}</button>)}</nav>
        <div className="sidebar-bottom">
          <button onClick={support}><Icon name="headphones" size={19} />Support</button>
          <button onClick={onSwitch}><Icon name="home" size={19} />Customer portal</button>
          <div className="profile-mini"><span className="disc-avatar" style={{ width: 40, height: 40, borderRadius: "50%", display: "grid", placeItems: "center", background: "var(--green-soft)", color: "var(--green-dark)", fontWeight: 800 }}>{initials(provider.name)}</span><span><strong>{provider.name}</strong><small>{provider.service} · {tier.name}</small></span><Icon name="chevron" size={16} /></div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div><button className="dash-mobile-menu" aria-label="Toggle menu" aria-expanded={dashMenu} onClick={() => setDashMenu((v) => !v)}><Icon name={dashMenu ? "close" : "menu"} /></button><span>{new Date().toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" })}</span><h1>{greeting}, {provider.name.split(" ")[0]}.</h1><p>Here&apos;s what&apos;s happening with your business today.</p></div>
          <div className="dashboard-actions">
            <button className="notification-button" data-ntf-toggle onClick={() => setNtfOpen((value) => !value)}><Icon name="bell" />{partnerUnread > 0 && <span />}</button>
            <NotificationCenter audience="artisan" recipientId={account.id} open={ntfOpen} onClose={() => setNtfOpen(false)} />
            <div className="online-control"><span><i className={online ? "on" : ""} />{online ? "Online" : "Offline"}</span><button onClick={() => { platform.patchProvider(provider.id, { available: !online }); setOnline(!online); }} className={online ? "toggle on" : "toggle"}><i /></button></div>
          </div>
        </header>
        {msg && <div className="toast"><Icon name="check" size={18} />{msg}</div>}

        {activeNav === "Overview" && <>
          {request && pendingBooking && <section className="job-request">
            <div className="pulse-wrap"><span className="pulse-dot" /></div>
            <div className="request-copy"><span>{pendingBooking.instant ? "⚡ INSTANT REQUEST · ARRIVE IN 10 MIN" : pendingBooking.requestedProviderId ? "CUSTOMER REQUESTED YOU" : "NEW PAID JOB REQUEST"} · ESCROW SECURED</span><h2>{pendingBooking.service}{pendingBooking.lines?.[0] && pendingBooking.lines[0].qty > 1 ? ` × ${pendingBooking.lines[0].qty} ${pendingBooking.lines[0].unitLabel}` : ""}</h2><p><Icon name="location" size={15} /> {pendingBooking.address} · {pendingBooking.slot}</p></div>
            <div className="request-meta"><span>YOU&apos;LL EARN</span><strong>{money(share(pendingBooking))}</strong><small>after 15% commission</small></div>
            {pendingBooking.requestedProviderId === provider.id && <Button variant="secondary" onClick={() => { platform.declineBooking(pendingBooking.id, provider.id); setRequest(false); }}>Decline</Button>}
            <Button onClick={() => { platform.acceptBooking(pendingBooking.id, provider.id); setRequest(false); }}>Accept job <Icon name="arrow" size={17} /></Button>
          </section>}
          {activeBooking && <section className="active-service-card">
            <div><span>{activeBooking.status === "accepted" ? "ACCEPTED JOB" : "SERVICE IN PROGRESS"}{activeBooking.instant ? " · INSTANT" : ""}</span><h2>{activeBooking.service}</h2><p>{activeBooking.customerName} · {activeBooking.address}</p>{activeBooking.note && <p>Note: {activeBooking.note}</p>}{activeBooking.quote && <p>Quotation {money(activeBooking.quote.amount)} · {activeBooking.quote.status}</p>}</div>
            {activeBooking.status === "accepted" ? <div className="completion-control">{!activeBooking.enRouteAt && <Button variant="secondary" onClick={() => startJourney(activeBooking)}>Start journey</Button>}<Button onClick={() => platform.startBooking(activeBooking.id)}>Start service</Button></div> : <div className="completion-control">
              {activeBooking.lines?.[0]?.pricing === "quote" && !activeBooking.quote && <><label>Quotation amount (₦)<input value={quoteAmount} onChange={(e) => setQuoteAmount(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 35000" /></label><label>What needs to be done<input value={quoteNote} onChange={(e) => setQuoteNote(e.target.value)} placeholder="Diagnosis and parts" /></label><Button variant="secondary" onClick={() => sendQuote(activeBooking)}>Send quotation</Button></>}
              <label>Customer completion code<input value={completionPin} onChange={(e) => setCompletionPin(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="4-digit code" /></label>
              <Button disabled={activeBooking.quote?.status === "pending"} onClick={() => complete(activeBooking)}>Mark completed</Button>{activeBooking.quote?.status === "pending" && <small>Waiting for the customer to approve the quotation.</small>}{pinError && <small>{pinError}</small>}
            </div>}
          </section>}

          <section className="stat-grid">
            <article className="stat-card"><div className="stat-icon green"><Icon name="wallet" /></div><span>Total earnings</span><strong>{money(wallet.earned)}</strong><small className="positive">{wallet.completed} <i>completed services</i></small></article>
            <article className="stat-card"><div className="stat-icon blue"><Icon name="calendar" /></div><span>Assigned jobs</span><strong>{mine.length} <i>total</i></strong><small>{done.length} completed · {upcoming.length} upcoming</small><div className="progress"><span style={{ width: `${mine.length ? (done.length / mine.length) * 100 : 0}%` }} /></div></article>
            <article className="stat-card"><div className="stat-icon yellow"><Icon name="star" /></div><span>Your rating</span><strong>{provider.rating ? provider.rating.toFixed(2) : "New"} <i>{provider.rating ? "/ 5.0" : ""}</i></strong><small><b>{tier.name} partner</b> · {provider.reviews || 0} reviews</small></article>
            <article className="stat-card"><div className="stat-icon violet"><Icon name="clock" /></div><span>Completion rate</span><strong>{completionRate === null ? "—" : `${completionRate}%`}</strong><small>{cancelled.length} cancelled</small></article>
          </section>

          <section className="dashboard-columns">
            <div className="schedule-panel panel">
              <div className="panel-heading"><div><h2>Upcoming jobs</h2><p>{upcoming.length} job{upcoming.length === 1 ? "" : "s"} · {money(upcoming.reduce((sum, b) => sum + share(b), 0))} potential earnings</p></div><button onClick={() => setActiveNav("My jobs")}>View all <Icon name="arrow" size={16} /></button></div>
              <div className="job-list">{upcoming.slice(0, 4).map((b) => <JobCard key={b.id} b={b} onOpen={() => openJob(b)} />)}{!upcoming.length && <div className="empty-state"><Icon name="calendar" size={28} /><h3>No upcoming jobs</h3><p>{online ? "New paid requests from customers will appear here." : "You're offline — go online to receive requests."}</p></div>}</div>
            </div>
            <div className="earnings-panel panel">
              <div className="panel-heading"><div><h2>Earnings</h2><p>Last 7 days</p></div></div>
              <strong className="earnings-total">{money(wallet.available)}</strong><span className="earnings-change">available to withdraw</span>
              <div className="bar-chart">{week.map((w, i) => <div key={i}><span style={{ height: `${Math.max(4, (w.value / weekMax) * 100)}%` }} className={w.value === weekMax && w.value > 0 ? "peak" : ""} title={money(w.value)} /><small>{w.label}</small></div>)}</div>
              <div className="wallet-strip"><span><Icon name="wallet" size={18} /><i><small>Available balance</small><strong>{money(wallet.available)}</strong></i></span><Button variant="dark" onClick={() => setDialog("withdraw")}>Withdraw</Button></div>
            </div>
          </section>

          <section className="performance-strip">
            <div className="tier-badge"><Icon name="star" size={20} /><span>{tier.name.toUpperCase()}</span></div>
            <div className="tier-copy"><h3>{next ? `You're ${money(next.min - wallet.gmv)} away from ${next.name}` : "You've reached the top tier"}</h3><p>Tiers are based on the total value of jobs you've completed.</p></div>
            {next && <div className="tier-progress"><div><span style={{ width: `${Math.min(100, ((wallet.gmv - tier.min) / (next.min - tier.min)) * 100)}%` }} /><i /></div><small>{money(wallet.gmv)} of {money(next.min)}</small></div>}
            <Button variant="secondary" onClick={() => setDialog("tiers")}>View tiers <Icon name="arrow" size={16} /></Button>
          </section>
        </>}

        {activeNav === "My jobs" && <section className="artisan-view">
          <div className="view-heading"><div><span className="kicker">WORK SCHEDULE</span><h2>My jobs</h2><p>Manage upcoming jobs and review completed services.</p></div></div>
          <div className="view-tabs">{["Upcoming", "Completed", "Cancelled"].map((tab) => <button key={tab} className={jobTab === tab ? "active" : ""} onClick={() => setJobTab(tab)}>{tab}{tab === "Upcoming" && upcoming.length > 0 && <span>{upcoming.length}</span>}</button>)}</div>
          <div className="jobs-board">{jobsForTab.map((b) => <JobCard key={b.id} b={b} onOpen={() => openJob(b)} />)}{!jobsForTab.length && <div className="empty-state"><Icon name={jobTab === "Completed" ? "check" : "calendar"} size={28} /><h3>No {jobTab.toLowerCase()} jobs to show</h3><p>Your job history will appear here.</p></div>}</div>
        </section>}

        {activeNav === "Earnings" && <section className="artisan-view">
          <div className="view-heading"><div><span className="kicker">WALLET & PAYOUTS</span><h2>Your earnings</h2><p>Every payment, commission and payout.</p></div><Button onClick={() => setDialog("withdraw")}>Withdraw funds <Icon name="arrow" size={16} /></Button></div>
          <div className="wallet-hero">
            <div><span>AVAILABLE TO WITHDRAW</span><strong>{money(wallet.available)}</strong><small>{platform.withdrawals.filter((w) => w.providerId === provider.id && w.status === "requested").length} payout(s) pending</small></div>
            <div><span>TOTAL EARNED</span><strong>{money(wallet.earned)}</strong><small>{done.length} completed jobs</small></div>
            <div><span>PLATFORM COMMISSION</span><strong>{money(wallet.gmv - wallet.earned)}</strong><small>15% standard partner rate</small></div>
          </div>
          <div className="ledger panel">
            <div className="panel-heading"><div><h2>Transactions</h2><p>Amounts reflect your 85% partner share</p></div></div>
            {[...done.map((b) => ({ id: b.id, title: `${b.service} · ${b.customerName}`, at: b.completedAt || b.createdAt, amount: share(b), sign: "+", status: "Completed" })), ...platform.withdrawals.filter((w) => w.providerId === provider.id).map((w) => ({ id: w.id, title: `Payout · ${w.bank}`, at: w.paidAt || w.createdAt, amount: w.amount, sign: "−", status: w.status === "paid" ? "Paid out" : "Pending" }))].sort((a, b) => b.at.localeCompare(a.at)).map((row) => <div className="ledger-row" key={row.id}><span className="ledger-icon"><Icon name={row.sign === "+" ? "arrow" : "wallet"} size={16} /></span><div><strong>{row.title}</strong><small>{when(row.at)}</small></div><b>{row.sign} {money(row.amount)}</b><em>{row.status}</em></div>)}
            {!done.length && <div className="empty-state"><Icon name="wallet" size={28} /><h3>No earnings yet</h3><p>Completed jobs will appear here once the customer shares their PIN.</p></div>}
          </div>
        </section>}

        {activeNav === "Performance" && <section className="artisan-view">
          <div className="view-heading"><div><span className="kicker">PARTNER QUALITY</span><h2>Performance</h2><p>Your service quality, calculated from real jobs.</p></div></div>
          <div className="score-hero"><div className="score-ring"><strong>{provider.rating ? provider.rating.toFixed(1) : "—"}</strong><small>RATING</small></div><div><span>{tier.name.toUpperCase()} PARTNER</span><h2>{done.length ? `${done.length} job${done.length > 1 ? "s" : ""} completed, ${provider.name.split(" ")[0]}.` : `Welcome, ${provider.name.split(" ")[0]}.`}</h2><p>{done.length ? "Keep your ratings high to win more requests." : "Complete your first job to start building your score."}</p></div><div className="score-goal"><span>NEXT TIER</span><strong>{next?.name || "—"}</strong><small>{next ? `${money(next.min - wallet.gmv)} more needed` : "Top tier reached"}</small></div></div>
          <div className="metric-grid">{([["Customer rating", provider.rating ? `${provider.rating.toFixed(2)} / 5` : "—", `${provider.reviews || 0} reviews`, (provider.rating / 5) * 100], ["Completion rate", completionRate === null ? "—" : `${completionRate}%`, `${cancelled.length} cancelled`, completionRate || 0], ["Instant arrivals ≤ 15 min", onTime === null ? "—" : `${onTime}%`, "From instant jobs", onTime || 0], ["Repeat customers", repeatCustomers === null ? "—" : `${repeatCustomers}%`, "Booked you again", repeatCustomers || 0]] as [string, string, string, number][]).map(([name, value, note, score]) => <article key={name}><span>{name}</span><strong>{value}</strong><small>{note}</small><div className="progress"><span style={{ width: `${score}%` }} /></div></article>)}</div>
          <div className="feedback-panel panel"><div className="panel-heading"><div><h2>Recent customer feedback</h2></div></div>{reviews.map((b) => <blockquote key={b.id}>“{b.review}” <small>— {b.customerName} · {b.rating}★</small></blockquote>)}{!reviews.length && <p>No written reviews yet.</p>}</div>
        </section>}

        {activeNav === "Training" && <section className="artisan-view">
          <div className="view-heading"><div><span className="kicker">SERVENAIJA ACADEMY</span><h2>Training centre</h2><p>Complete modules to strengthen your profile.</p></div><span className="certificate-count"><Icon name="shield" size={16} /> {(provider.training || []).length}/{COURSES.length} complete</span></div>
          <div className="course-grid">{COURSES.map((c) => { const finished = provider.training?.includes(c.id); return <article key={c.id}><span><Icon name={c.icon} size={20} /></span><h3>{c.title}</h3><small>{c.lessons} lessons · {finished ? "Completed" : "Not completed"}</small><Button variant={finished ? "secondary" : "primary"} onClick={() => platform.toggleTraining(provider.id, c.id)}>{finished ? "Mark as not done" : "Mark complete"}</Button></article>; })}</div>
        </section>}
      </main>

      {dialog && <div className="modal-backdrop" onMouseDown={() => setDialog(null)}><div className="booking-modal action-dialog" onMouseDown={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setDialog(null)}><Icon name="close" /></button>
        {dialog === "withdraw" && <><div className="modal-icon"><Icon name="wallet" /></div><h2>Withdraw earnings</h2><p>Sent to {provider.application ? `${provider.application.bank} · ${provider.application.accountNumber}` : "your verified bank account"} after admin approval.</p><div className="dialog-balance"><span>AVAILABLE BALANCE</span><strong>{money(wallet.available)}</strong></div><label className="flow-label">AMOUNT (₦)<input value={wdAmount} onChange={(e) => setWdAmount(e.target.value.replace(/\D/g, ""))} placeholder={String(wallet.available)} /></label><Button className="full-button" onClick={() => { const r = platform.requestWithdrawal(provider.id, Number(wdAmount || wallet.available)); flash(r.message); if (r.ok) { setWdAmount(""); setDialog(null); } }}>Confirm withdrawal <Icon name="arrow" size={17} /></Button></>}
        {dialog === "job" && detail && (() => { const b = platform.bookings.find((x) => x.id === detail.id) || detail; return <><div className="modal-icon"><Icon name="location" /></div><h2>Job details</h2><div className="job-dialog-details"><div><span>CUSTOMER</span><strong>{b.customerName}</strong></div><div><span>ADDRESS</span><strong>{b.address}</strong></div><div><span>JOB</span><strong>{b.service}{b.lines?.[0] && b.lines[0].qty > 1 ? ` × ${b.lines[0].qty} ${b.lines[0].unitLabel}` : ""}</strong></div><div><span>WHEN</span><strong>{b.slot}</strong></div><div><span>YOUR EARNING</span><strong>{money(share(b))}</strong></div>{b.note && <div><span>ACCESS NOTE</span><strong>{b.note}</strong></div>}</div>{b.status === "accepted" && <Button className="full-button" onClick={() => { if (!b.enRouteAt) platform.enRoute(b.id); setDialog(null); }}>{b.enRouteAt ? "Close" : "Start secure journey"}</Button>}</>; })()}
        {dialog === "tiers" && <><div className="modal-icon"><Icon name="star" /></div><h2>Partner tiers</h2><p>Based on the total value of jobs you've completed ({money(wallet.gmv)} so far).</p><div className="benefit-list">{PARTNER_TIERS.map((t) => <span key={t.name}><Icon name="check" size={16} />{t.name} · from {money(t.min)}{t.name === tier.name ? " (you are here)" : ""}</span>)}</div></>}
      </div></div>}
    </div>
  );
}
