import { useMemo, useState } from "react";
import { usePlatform, type Provider } from "./PlatformContext";
import { AREAS, AREA_NAMES, CATEGORIES, DAYS, categoryOf, distanceKm } from "./platformLogic";
import { fromPrice } from "./catalog";

const money = (value: number) => `₦${value.toLocaleString()}`;
const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2);
export function serviceLabel(provider: Provider) { const key = categoryOf(provider.service); return CATEGORIES.find((item) => item.key === key)?.label || provider.service; }

type Sort = "recommended" | "nearest" | "rating" | "price" | "jobs";

export default function DiscoverPage({ customerId, defaultArea, onBook, onNeedLogin }: { customerId?: string; defaultArea: string; onBook: (service: string, provider: Provider) => void; onNeedLogin: () => void }) {
  const platform = usePlatform();
  const [area, setArea] = useState(AREA_NAMES.includes(defaultArea) ? defaultArea : AREA_NAMES[0]);
  const [radius, setRadius] = useState(0);
  const [category, setCategory] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minRating, setMinRating] = useState(0);
  const [availableNow, setAvailableNow] = useState(false);
  const [day, setDay] = useState("");
  const [favOnly, setFavOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recommended");
  const [open, setOpen] = useState<Provider | null>(null);
  const profile = customerId ? platform.profileOf(customerId) : undefined;
  const favourites = profile?.favourites || [];
  const origin = AREAS[area];

  const results = useMemo(() => {
    const rows = platform.providers.filter((provider) => provider.status === "approved").map((provider) => {
      const spot = AREAS[provider.area || ""] || AREAS[AREA_NAMES.find((name) => AREAS[name].city === provider.city) || AREA_NAMES[0]];
      return { provider, km: distanceKm(origin, spot), price: fromPrice(platform.catalog, provider.category || categoryOf(provider.service)), live: provider.available !== false, days: provider.days || DAYS, key: categoryOf(provider.service) };
    }).filter((row) => {
      if (radius && row.km > radius) return false;
      if (category !== "all" && row.key !== category) return false;
      if (minPrice && row.price < Number(minPrice)) return false;
      if (maxPrice && row.price > Number(maxPrice)) return false;
      if (minRating && row.provider.rating < minRating) return false;
      if (availableNow && !row.live) return false;
      if (day && !row.days.includes(day)) return false;
      if (favOnly && !favourites.includes(row.provider.id)) return false;
      if (query && !`${row.provider.name} ${row.provider.service}`.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
    const score = (row: (typeof rows)[number]) => row.provider.rating * 2 - row.km * 0.08 + Math.log10(row.provider.completedJobs + 1) + (row.live ? 1.5 : 0);
    return rows.sort((a, b) => sort === "nearest" ? a.km - b.km : sort === "rating" ? b.provider.rating - a.provider.rating : sort === "price" ? a.price - b.price : sort === "jobs" ? b.provider.completedJobs - a.provider.completedJobs : score(b) - score(a));
  }, [platform.providers, origin, radius, category, minPrice, maxPrice, minRating, availableNow, day, favOnly, query, sort, favourites]);

  const toggleFavourite = (id: string) => {
    if (!customerId) return onNeedLogin();
    platform.updateProfile(customerId, (p) => ({ ...p, favourites: p.favourites.includes(id) ? p.favourites.filter((item) => item !== id) : [...p.favourites, id] }));
  };
  const reset = () => { setRadius(0); setCategory("all"); setMinPrice(""); setMaxPrice(""); setMinRating(0); setAvailableNow(false); setDay(""); setFavOnly(false); setQuery(""); setSort("recommended"); };
  const filtersOn = radius || category !== "all" || minPrice || maxPrice || minRating || availableNow || day || favOnly || query;

  return (
    <main className="subpage discover-page">
      <div className="subpage-title content-width"><div><span className="kicker">FIND A PROFESSIONAL</span><h1>Discover verified pros</h1><p>Filter by distance, price, rating and availability, then view public profiles before you book.</p></div></div>
      <div className="discover-layout content-width">
        <aside className="disc-filters">
          <label>YOUR LOCATION<select value={area} onChange={(event) => setArea(event.target.value)}>{AREA_NAMES.map((name) => <option key={name}>{name}</option>)}</select></label>
          <label>WITHIN<select value={radius} onChange={(event) => setRadius(Number(event.target.value))}><option value={0}>Any distance</option>{[3, 5, 10, 20, 50].map((km) => <option key={km} value={km}>{km} km</option>)}</select></label>
          <label>SERVICE<div className="disc-chips"><button className={category === "all" ? "on" : ""} onClick={() => setCategory("all")}>All</button>{CATEGORIES.map((item) => <button key={item.key} className={category === item.key ? "on" : ""} onClick={() => setCategory(item.key)}>{item.label}</button>)}</div></label>
          <label>STARTING PRICE (₦)<div className="disc-pair"><input inputMode="numeric" placeholder="Min" value={minPrice} onChange={(event) => setMinPrice(event.target.value.replace(/\D/g, ""))} /><input inputMode="numeric" placeholder="Max" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value.replace(/\D/g, ""))} /></div></label>
          <label>MINIMUM RATING<select value={minRating} onChange={(event) => setMinRating(Number(event.target.value))}><option value={0}>Any rating</option><option value={4}>4.0 ★ &amp; up</option><option value={4.5}>4.5 ★ &amp; up</option><option value={4.8}>4.8 ★ &amp; up</option></select></label>
          <label>AVAILABLE ON<select value={day} onChange={(event) => setDay(event.target.value)}><option value="">Any day</option>{DAYS.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="disc-check"><input type="checkbox" checked={availableNow} onChange={(event) => setAvailableNow(event.target.checked)} />Available now (online)</label>
          <label className="disc-check"><input type="checkbox" checked={favOnly} onChange={(event) => (customerId ? setFavOnly(event.target.checked) : onNeedLogin())} />Saved favourites only</label>
          {filtersOn ? <button className="disc-reset" onClick={reset}>Reset filters</button> : null}
        </aside>
        <section>
          <div className="disc-bar"><input className="disc-search" placeholder="Search by name or service" value={query} onChange={(event) => setQuery(event.target.value)} /><label>Sort<select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="recommended">Recommended</option><option value="nearest">Nearest</option><option value="rating">Top rated</option><option value="price">Lowest price</option><option value="jobs">Most jobs done</option></select></label></div>
          <p className="disc-count">{results.length} professional{results.length === 1 ? "" : "s"} near {area.split(",")[0]}</p>
          <div className="disc-grid">
            {results.map(({ provider, km, price, live, days }) => (
              <article className={`disc-card ${live ? "" : "offline"}`} key={provider.id}>
                <button className={`disc-fav ${favourites.includes(provider.id) ? "on" : ""}`} onClick={() => toggleFavourite(provider.id)} aria-label="Save to favourites">{favourites.includes(provider.id) ? "♥" : "♡"}</button>
                <div className="disc-head"><span className="disc-avatar">{initials(provider.name)}</span><div><strong>{provider.name}<i title="Verified">✓</i></strong><small>{provider.service}</small></div></div>
                <div className="disc-meta"><span>★ <b>{provider.rating ? provider.rating.toFixed(2) : "New"}</b>{provider.rating ? ` (${provider.reviews ?? provider.completedJobs})` : ""}</span><span>{provider.completedJobs} jobs</span><span>{km < 1 ? "<1" : km.toFixed(1)} km away</span></div>
                <div className="disc-foot"><span><small>From</small><strong>{money(price)}</strong></span><em className={live ? "live" : ""}>{live ? "Available now" : `Offline · ${days.slice(0, 2).join(", ")}${days.length > 2 ? "…" : ""}`}</em></div>
                <div className="disc-actions"><button onClick={() => setOpen(provider)}>View profile</button><button className="primary" disabled={!live} onClick={() => onBook(serviceLabel(provider), provider)}>{live ? "Book" : "Unavailable"}</button></div>
              </article>
            ))}
            {!results.length && <div className="disc-empty"><strong>No professionals match these filters</strong><p>Try a wider distance or fewer filters.</p><button onClick={reset}>Reset filters</button></div>}
          </div>
        </section>
      </div>

      {open && (() => {
        const provider = platform.providers.find((item) => item.id === open.id) || open;
        const reviews = platform.bookings.filter((booking) => booking.providerId === provider.id && booking.rating).sort((a, b) => (b.ratedAt || "").localeCompare(a.ratedAt || "")).slice(0, 5);
        const live = provider.available !== false;
        return <div className="modal-backdrop" onMouseDown={() => setOpen(null)}><div className="pro-modal" onMouseDown={(event) => event.stopPropagation()}>
          <button className="modal-close" onClick={() => setOpen(null)} aria-label="Close">×</button>
          <div className="disc-head big"><span className="disc-avatar">{initials(provider.name)}</span><div><strong>{provider.name}<i title="Verified">✓</i></strong><small>{provider.service} · {provider.area || provider.city}</small><em className={live ? "live" : ""}>{live ? "Available now" : "Currently offline"}</em></div></div>
          <div className="pro-stats"><span><small>RATING</small><strong>{provider.rating ? provider.rating.toFixed(2) : "New"}</strong></span><span><small>JOBS DONE</small><strong>{provider.completedJobs}</strong></span><span><small>EXPERIENCE</small><strong>{provider.years ?? 1} yrs</strong></span><span><small>FROM</small><strong>{money(fromPrice(platform.catalog, provider.category || categoryOf(provider.service)))}</strong></span></div>
          <h3>About</h3><p>{provider.bio || `${provider.service} professional serving ${provider.city}.`}</p>
          <h3>Weekly availability</h3><div className="pro-days">{DAYS.map((item) => <span key={item} className={(provider.days || DAYS).includes(item) ? "on" : ""}>{item}</span>)}</div>
          <h3>Trust & safety</h3><ul className="pro-trust"><li>NIN &amp; BVN verified</li><li>Background checked</li><li>Skills assessed</li><li>Escrow-protected payment</li></ul>
          <h3>Recent reviews</h3>
          {reviews.length ? reviews.map((booking) => <div className="pro-review" key={booking.id}><b>{"★".repeat(booking.rating || 0)}<span>{"★".repeat(5 - (booking.rating || 0))}</span></b><p>{booking.review || "Great service."}</p><small>{booking.customerName.split(" ")[0]} · {booking.service}</small></div>) : <p className="pf-empty">Reviews from completed services will appear here.</p>}
          <div className="pro-actions"><button onClick={() => toggleFavourite(provider.id)}>{favourites.includes(provider.id) ? "♥ Saved" : "♡ Save"}</button><button className="primary" disabled={!live} onClick={() => { setOpen(null); onBook(serviceLabel(provider), provider); }}>{live ? `Book ${provider.name.split(" ")[0]}` : "Unavailable right now"}</button></div>
        </div></div>;
      })()}
    </main>
  );
}
