import { useMemo, useState } from "react";
import { usePlatform, type Booking } from "./PlatformContext";
import { CATEGORIES, categoryOf, referralCodeFor, tierOf, type Promo } from "./platformLogic";

const money = (value: number) => `₦${Math.round(value).toLocaleString()}`;
const short = (value: number) => value >= 1e6 ? `₦${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `₦${Math.round(value / 1e3)}k` : `₦${Math.round(value)}`;
const COMMISSION = 0.15;

export function AdminAnalytics({ act }: { act: (message: string) => void }) {
  const platform = usePlatform();
  const [range, setRange] = useState(14);
  const data = useMemo(() => {
    const now = Date.now(), start = now - range * 86400000;
    const rows = platform.bookings.filter((booking) => new Date(booking.createdAt).getTime() >= start);
    const done = rows.filter((booking) => booking.status === "completed");
    const cancelled = rows.filter((booking) => booking.status === "cancelled");
    const gmv = rows.filter((b) => b.status !== "cancelled").reduce((sum, b) => sum + b.amount, 0);
    const released = done.reduce((sum, b) => sum + b.amount, 0);
    const revenue = released * COMMISSION;
    const promoCost = rows.filter((b) => b.status !== "cancelled").reduce((sum, b) => sum + (b.discount || 0), 0);
    const mins = (a?: string, b?: string) => a && b ? (new Date(b).getTime() - new Date(a).getTime()) / 60000 : NaN;
    const accepts = rows.map((b) => mins(b.createdAt, b.acceptedAt)).filter((v) => !Number.isNaN(v));
    const rated = done.filter((b) => b.rating);
    const customers = new Map<string, { name: string; count: number; spend: number }>();
    rows.filter((b) => b.status !== "cancelled").forEach((b) => { const c = customers.get(b.customerId) || { name: b.customerName, count: 0, spend: 0 }; c.count++; c.spend += b.amount; customers.set(b.customerId, c); });
    const days = Array.from({ length: range }, (_, i) => { const d = new Date(now - (range - 1 - i) * 86400000); const key = d.toDateString(); const list = rows.filter((b) => b.status !== "cancelled" && new Date(b.createdAt).toDateString() === key); const value = list.reduce((s, b) => s + b.amount, 0); return { label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }), value, count: list.length }; });
    const status = ["paid", "accepted", "in_progress", "completed", "cancelled"].map((key) => ({ key, count: rows.filter((b) => b.status === key).length }));
    const mix = [...CATEGORIES.map((c) => ({ key: c.key as string, label: c.label })), { key: "other", label: "Other" }].map((c) => { const list = rows.filter((b) => b.status !== "cancelled" && categoryOf(b.service) === c.key); return { ...c, count: list.length, value: list.reduce((s, b) => s + b.amount, 0) }; }).filter((c) => c.count);
    const partners = platform.providers.filter((p) => p.status === "approved").map((p) => {
      const mine = rows.filter((b) => b.providerId === p.id), mineDone = mine.filter((b) => b.status === "completed"), ratings = mineDone.filter((b) => b.rating);
      const a = mine.map((b) => mins(b.createdAt, b.acceptedAt)).filter((v) => !Number.isNaN(v));
      return { p, jobs: mineDone.length, active: mine.length - mineDone.length, gmv: mineDone.reduce((s, b) => s + b.amount, 0), rating: ratings.length ? ratings.reduce((s, b) => s + (b.rating || 0), 0) / ratings.length : 0, accept: a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0 };
    }).sort((a, b) => b.gmv - a.gmv);
    const repeat = [...customers.values()].filter((c) => c.count > 1).length;
    return { rows, done, cancelled, gmv, revenue, promoCost, accept: accepts.length ? accepts.reduce((s, v) => s + v, 0) / accepts.length : 0, rating: rated.length ? rated.reduce((s, b) => s + (b.rating || 0), 0) / rated.length : 0, days, status, mix, partners, top: [...customers.values()].sort((a, b) => b.spend - a.spend).slice(0, 5), repeat, customerCount: customers.size };
  }, [platform.bookings, platform.providers, range]);

  const max = Math.max(1, ...data.days.map((d) => d.value));
  const width = 640, height = 190, step = width / data.days.length;
  const finished = data.done.length + data.cancelled.length;
  const referrals = Object.values(platform.profiles).filter((p) => p.referredBy).length;
  const credits = Object.values(platform.profiles).reduce((sum, p) => sum + p.credit, 0);

  const exportCsv = () => {
    const header = ["Booking", "Created", "Customer", "Service", "Partner", "Status", "Amount", "Discount", "Credit used", "Promo", "Commission (15%)", "Rating"];
    const line = (b: Booking) => [b.id, b.createdAt, b.customerName, b.service, platform.providers.find((p) => p.id === b.providerId)?.name || "", b.status, b.amount, b.discount || 0, b.creditUsed || 0, b.promoCode || "", b.status === "completed" ? Math.round(b.amount * COMMISSION) : 0, b.rating || ""].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    const blob = new Blob([[header.join(","), ...data.rows.map(line)].join("\n")], { type: "text/csv" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `servenaija-report-${range}d.csv`; link.click(); URL.revokeObjectURL(link.href);
    act(`Exported ${data.rows.length} bookings to CSV`);
  };

  return <>
    <section className="an-toolbar"><div className="an-range">{[7, 14, 30].map((d) => <button key={d} className={range === d ? "active" : ""} onClick={() => setRange(d)}>Last {d} days</button>)}</div><div className="an-actions"><button className="primary" onClick={exportCsv}>Export CSV</button></div></section>
    <section className="admin-kpis">{[["Booked GMV", money(data.gmv), `${data.rows.length} bookings`], ["Platform revenue", money(data.revenue), "15% of completed"], ["Completion rate", finished ? `${Math.round((data.done.length / finished) * 100)}%` : "—", `${data.cancelled.length} cancelled`], ["Avg. order value", data.rows.length ? money(data.gmv / Math.max(1, data.rows.length - data.cancelled.length)) : "—", "Excluding cancelled"], ["Avg. partner rating", data.rating ? `${data.rating.toFixed(2)} ★` : "—", "From customer reviews"]].map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <section className="an-grid">
      <article className="admin-panel"><div className="admin-panel-head"><div><h2>Revenue trend</h2><p>Daily booked value · last {range} days</p></div><b>{money(data.gmv)}</b></div>
        <svg className="an-chart" viewBox={`0 0 ${width} ${height + 26}`} role="img" aria-label="Daily booked value">{[0, 0.5, 1].map((t) => <g key={t}><line x1="0" x2={width} y1={height - t * (height - 14)} y2={height - t * (height - 14)} /><text x="2" y={height - t * (height - 14) - 4}>{short(max * t)}</text></g>)}{data.days.map((d, i) => { const h = (d.value / max) * (height - 14); return <g key={i}><rect x={i * step + step * 0.18} y={height - h} width={step * 0.64} height={Math.max(h, d.value ? 2 : 0)} rx="3"><title>{`${d.label}: ${money(d.value)} · ${d.count} bookings`}</title></rect>{(range <= 14 || i % 3 === 0) && <text className="x" x={i * step + step / 2} y={height + 16} textAnchor="middle">{d.label}</text>}</g>; })}</svg>
        {!data.rows.length && <div className="admin-empty">No bookings in this period yet. Make a booking as a customer, or load sample data.</div>}
      </article>
      <article className="admin-panel"><div className="admin-panel-head"><div><h2>Booking pipeline</h2><p>Where requests are right now</p></div></div><div className="an-bars">{data.status.map((s) => <div key={s.key}><span>{s.key.replace("_", " ")}</span><i><b className={s.key} style={{ width: `${(s.count / Math.max(1, data.rows.length)) * 100}%` }} /></i><em>{s.count}</em></div>)}</div>
        <div className="admin-panel-head" style={{ marginTop: 18 }}><div><h2>Service mix</h2><p>Bookings and value by category</p></div></div><div className="an-bars">{data.mix.map((m) => <div key={m.key}><span>{m.label}</span><i><b className="completed" style={{ width: `${(m.value / Math.max(1, ...data.mix.map((x) => x.value))) * 100}%` }} /></i><em>{m.count} · {short(m.value)}</em></div>)}{!data.mix.length && <p className="pf-empty">No data yet.</p>}</div>
      </article>
    </section>
    <section className="admin-kpis an-second">{[["Avg. time to accept", data.accept ? `${Math.round(data.accept)} mins` : "—", "Booking → partner accepted"], ["Unique customers", String(data.customerCount), `${data.repeat} repeat`], ["Promo & perk cost", money(data.promoCost), "Funded from commission"], ["Referrals", String(referrals), "Customers who joined via a code"], ["Wallet credit outstanding", money(credits), "Liability across customers"]].map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
    <section className="an-grid">
      <article className="admin-panel"><div className="admin-panel-head"><div><h2>Partner performance</h2><p>Ranked by completed value in period</p></div></div>
        <div className="an-table head"><span>PARTNER</span><span>JOBS</span><span>VALUE</span><span>RATING</span><span>ACCEPT</span></div>
        {data.partners.map(({ p, jobs, active, gmv, rating, accept }) => <div className="an-table" key={p.id}><span><b>{p.name}</b><small>{p.service}{p.available === false ? " · offline" : ""}</small></span><span>{jobs}{active ? <small>{active} active</small> : null}</span><span>{money(gmv)}</span><span>{rating ? `${rating.toFixed(1)} ★` : `${p.rating.toFixed(1)} ★`}</span><span>{accept ? `${Math.round(accept)}m` : "—"}</span></div>)}
      </article>
      <article className="admin-panel"><div className="admin-panel-head"><div><h2>Top customers</h2><p>By spend in period</p></div></div>{data.top.map((c) => <div className="an-table two" key={c.name}><span><b>{c.name}</b><small>{c.count} booking{c.count > 1 ? "s" : ""}</small></span><span>{money(c.spend)}</span></div>)}{!data.top.length && <p className="pf-empty">No customers yet.</p>}</article>
    </section>
  </>;
}

export function AdminPromotions({ act }: { act: (message: string) => void }) {
  const platform = usePlatform();
  const s = platform.settings;
  const [draft, setDraft] = useState({ code: "", description: "", type: "percent" as Promo["type"], value: "10", maxDiscount: "", minOrder: "", maxUses: "", expiresAt: "", audience: "all" as Promo["audience"] });
  const [settings, setSettings] = useState({ referrerReward: String(s.referrerReward), refereeReward: String(s.refereeReward), pointsPer100: String(s.pointsPer100), redeemBlock: String(s.redeemBlock), redeemValue: String(s.redeemValue) });
  const [error, setError] = useState("");
  const consumers = platform.accounts.filter((account) => account.role === "consumer");
  const board = consumers.map((account) => { const profile = platform.profiles[account.id]; const code = referralCodeFor(account); return { account, code, invited: Object.values(platform.profiles).filter((p) => p.referredBy === code).length, earned: (profile?.ledger || []).filter((l) => l.kind === "referral").reduce((sum, l) => sum + l.credit, 0), credit: profile?.credit || 0, tier: tierOf(profile?.lifetimePoints || 0).tier.name }; }).sort((a, b) => b.invited - a.invited || b.earned - a.earned);

  const create = () => {
    const result = platform.createPromo({ code: draft.code, description: draft.description || (draft.type === "percent" ? `${draft.value}% off` : `₦${Number(draft.value).toLocaleString()} off`), type: draft.type, value: Number(draft.value), maxDiscount: Number(draft.maxDiscount) || 0, minOrder: Number(draft.minOrder) || 0, maxUses: Number(draft.maxUses) || 0, expiresAt: draft.expiresAt || undefined, audience: draft.audience });
    setError(result.ok ? "" : result.message);
    if (result.ok) { act(result.message); setDraft({ ...draft, code: "", description: "", maxDiscount: "", minOrder: "", maxUses: "", expiresAt: "" }); }
  };
  const save = () => { platform.updateSettings({ referrerReward: Number(settings.referrerReward) || 0, refereeReward: Number(settings.refereeReward) || 0, pointsPer100: Number(settings.pointsPer100) || 0, redeemBlock: Math.max(1, Number(settings.redeemBlock) || 100), redeemValue: Number(settings.redeemValue) || 0 }); act("Rewards programme updated"); };

  return <>
    <section className="an-grid promo-top">
      <article className="admin-panel"><div className="admin-panel-head"><div><h2>Create promo code</h2><p>Customers see it in Profile › Rewards and apply it at checkout</p></div></div>
        <div className="promo-form">
          <input placeholder="CODE (e.g. EID15)" value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") })} />
          <input placeholder="Description shown to customers" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as Promo["type"] })}><option value="percent">Percent off</option><option value="flat">Flat ₦ off</option></select>
          <input placeholder={draft.type === "percent" ? "Percent (1–100)" : "Amount (₦)"} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value.replace(/\D/g, "") })} />
          <input placeholder="Max discount ₦ (optional)" value={draft.maxDiscount} onChange={(e) => setDraft({ ...draft, maxDiscount: e.target.value.replace(/\D/g, "") })} />
          <input placeholder="Minimum order ₦" value={draft.minOrder} onChange={(e) => setDraft({ ...draft, minOrder: e.target.value.replace(/\D/g, "") })} />
          <input placeholder="Max total uses (blank = unlimited)" value={draft.maxUses} onChange={(e) => setDraft({ ...draft, maxUses: e.target.value.replace(/\D/g, "") })} />
          <input type="date" value={draft.expiresAt} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value })} title="Expiry date" />
          <select value={draft.audience} onChange={(e) => setDraft({ ...draft, audience: e.target.value as Promo["audience"] })}><option value="all">All customers</option><option value="new">First booking only</option></select>
          <button className="primary" onClick={create}>Create &amp; notify customers</button>
        </div>{error && <div className="promo-error">{error}</div>}
      </article>
      <article className="admin-panel"><div className="admin-panel-head"><div><h2>Referral & loyalty rules</h2><p>Changes apply to future rewards</p></div></div>
        <div className="promo-form single">{([["referrerReward", "Referrer reward (₦) — paid after friend's first completed booking"], ["refereeReward", "New customer welcome credit (₦)"], ["pointsPer100", "Loyalty points earned per ₦100 spent"], ["redeemBlock", "Points needed per redemption"], ["redeemValue", "Credit value per redemption (₦)"]] as const).map(([key, label]) => <label key={key}>{label}<input value={settings[key]} onChange={(e) => setSettings({ ...settings, [key]: e.target.value.replace(/\D/g, "") })} /></label>)}<button className="primary" onClick={save}>Save rules</button></div>
      </article>
    </section>
    <section className="admin-panel promo-list"><div className="admin-panel-head"><div><h2>Promo codes</h2><p>{platform.promos.filter((p) => p.active).length} active · {platform.promos.reduce((sum, p) => sum + p.used, 0)} redemptions</p></div></div>
      <div className="an-table promo head"><span>CODE</span><span>OFFER</span><span>MIN ORDER</span><span>USED</span><span>EXPIRES</span><span>STATUS</span><span /></div>
      {platform.promos.map((p) => <div className="an-table promo" key={p.id}><span><b>{p.code}</b><small>{p.description}</small></span><span>{p.type === "percent" ? `${p.value}%${p.maxDiscount ? ` (max ${money(p.maxDiscount)})` : ""}` : money(p.value)}</span><span>{p.minOrder ? money(p.minOrder) : "—"}</span><span>{p.used}{p.maxUses ? ` / ${p.maxUses}` : ""}</span><span>{p.expiresAt || "Never"}</span><span><em className={p.active ? "on" : ""}>{p.active ? "Active" : "Paused"}</em></span><span className="row-actions"><button onClick={() => { platform.togglePromo(p.id); act(`${p.code} ${p.active ? "paused" : "activated"}`); }}>{p.active ? "Pause" : "Activate"}</button><button className="danger" onClick={() => { platform.deletePromo(p.id); act(`${p.code} deleted`); }}>Delete</button></span></div>)}
      {!platform.promos.length && <div className="admin-empty">No promo codes yet.</div>}
    </section>
    <section className="admin-panel promo-list"><div className="admin-panel-head"><div><h2>Referral leaderboard</h2><p>Customers, invites, rewards and loyalty tier</p></div></div>
      <div className="an-table lb head"><span>CUSTOMER</span><span>CODE</span><span>INVITED</span><span>EARNED</span><span>WALLET</span><span>TIER</span></div>
      {board.map((row) => <div className="an-table lb" key={row.account.id}><span><b>{row.account.name}</b></span><span>{row.code}</span><span>{row.invited}</span><span>{money(row.earned)}</span><span>{money(row.credit)}</span><span>{row.tier}</span></div>)}
    </section>
  </>;
}
