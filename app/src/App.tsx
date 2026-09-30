import { useCallback, useEffect, useState, type ReactNode } from "react";
import AuthModal, { type UserRole } from "./AuthModal";
import Onboarding from "./Onboarding";
import SuperAdmin from "./SuperAdmin";
import { usePlatform, type Account, type Booking } from "./PlatformContext";
import NotificationCenter, { useUnread } from "./Notifications";
import ProfilePage, { methodLabel } from "./Profile";
import DiscoverPage from "./Discover";
import { AREA_NAMES, AREAS } from "./platformLogic";
import BookingFlow from "./BookingFlow";
import TrackingPage from "./Tracking";
import { CATALOG_CATEGORIES, fromPrice, money, } from "./catalog";
import type { Provider } from "./PlatformContext";
import { Icon, Button, Logo } from "./ui";
import ArtisanDashboard from "./Partner";

const POPULAR_IMAGES = [
  "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1633119713175-c53c29479984?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=85",
];
const TINTS = ["bg-sky-50 text-sky-700", "bg-amber-50 text-amber-700", "bg-violet-50 text-violet-700", "bg-blue-50 text-blue-700", "bg-rose-50 text-rose-700"];


function ConsumerInfoPage({
  page,
  onBook,
}: {
  page: "how" | "safety" | "help";
  onBook: () => void;
}) {
  if (page === "how") {
    return (
      <main className="subpage">
        <div className="subpage-hero">
          <span className="kicker">SIMPLE, SAFE, RELIABLE</span>
          <h1>Home services without the usual stress.</h1>
          <p>From booking to payment, every step is designed around your safety and convenience.</p>
        </div>
        <div className="steps-grid content-width">
          {[
            ["01", "Choose a service", "Browse transparent packages, add-ons and verified customer reviews."],
            ["02", "Pick your time", "Choose a convenient slot and share access instructions securely."],
            ["03", "Meet your professional", "Track arrival live and verify their photo and ServeNaija badge."],
            ["04", "Release payment", "Share your completion PIN only when you are satisfied with the work."],
          ].map(([number, title, copy]) => <article key={number}><span>{number}</span><h2>{title}</h2><p>{copy}</p></article>)}
        </div>
        <div className="subpage-cta"><div><h2>Ready to get it sorted?</h2><p>A trusted professional could be with you today.</p></div><Button onClick={onBook}>Book a service <Icon name="arrow" size={17} /></Button></div>
      </main>
    );
  }

  if (page === "safety") {
    return (
      <main className="subpage safety-page">
        <div className="subpage-hero"><span className="kicker">SERVENAIJA SAFE</span><h1>Your safety is built into every booking.</h1><p>Protection before, during and after every service visit.</p></div>
        <div className="safety-layout content-width">
          <div className="safety-photo"><img src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=1000&q=85" alt="Verified service professional" /><span><Icon name="shield" /> NIN verified professional</span></div>
          <div className="safety-list">
            {[
              ["Identity checks", "Every partner completes NIN, BVN, facial liveness and guarantor verification."],
              ["Background screening", "Police record and local residency checks are completed before activation."],
              ["Escrow payments", "Your payment stays protected until you confirm completion with your private PIN."],
              ["Live safety support", "Track arrival, share job details and reach our response team throughout the visit."],
            ].map(([title, copy]) => <article key={title}><span><Icon name="check" size={17} /></span><div><h2>{title}</h2><p>{copy}</p></div></article>)}
          </div>
        </div>
      </main>
    );
  }

  if (page === "help") {
    return (
      <main className="subpage help-page">
        <div className="subpage-hero"><span className="kicker">HELP CENTRE</span><h1>How can we help?</h1><p>Find quick answers or speak with our Nigerian support team.</p></div>
        <div className="help-grid content-width">
          {[
            ["Booking & rescheduling", "Change a service time, address or package."],
            ["Payments & refunds", "Escrow, transfers, USSD and refund timelines."],
            ["Safety & complaints", "Report a concern or open a service dispute."],
            ["Account support", "Manage your profile, addresses and phone number."],
          ].map(([title, copy]) => <button key={title} onClick={() => window.alert(`${title}: a support specialist is ready to help.`)}><span><Icon name="headphones" /></span><strong>{title}</strong><small>{copy}</small><Icon name="chevron" size={17} /></button>)}
        </div>
        <div className="support-banner content-width"><div><span>NEED MORE HELP?</span><h2>Talk to a real person, 24/7.</h2><p>Average response time is under two minutes.</p></div><Button onClick={() => window.open("https://wa.me/2347007378362", "_blank")}>Chat on WhatsApp</Button><Button variant="secondary" onClick={() => { window.location.href = "tel:+2347007378362"; }}>Call 0700-SERVE-NAIJA</Button></div>
      </main>
    );
  }

  return null;
}


function ConsumerPortal({
  onSwitch,
  isAuthenticated,
  onLogin,
  onAdmin,
  launchService,
  onLaunchConsumed,
}: {
  onSwitch: () => void;
  isAuthenticated: boolean;
  onLogin: (service?: string) => void;
  onAdmin: () => void;
  launchService: string | null;
  onLaunchConsumed: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [location, setLocation] = useState("Lekki Phase 1, Lagos");
  const [notice, setNotice] = useState("");
  const [page, setPage] = useState<"home" | "how" | "safety" | "help" | "bookings" | "profile" | "discover">("home");
  const [requested, setRequested] = useState<Provider | null>(null);
  const [ntfOpen, setNtfOpen] = useState(false);
  const platform = usePlatform();
  const customerAccount = platform.accounts.find((account) => account.role === "consumer" && account.phone === JSON.parse(localStorage.getItem("servenaija-session") || "null")?.phone);
  const customerBookings = customerAccount ? platform.bookings.filter((booking) => booking.customerId === customerAccount.id) : [];
  const customerUnread = useUnread("consumer", customerAccount?.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const go = (action: () => void) => { setMenuOpen(false); action(); };
  const [query, setQuery] = useState("");
  const approvedPros = platform.providers.filter((p) => p.status === "approved");
  const ratedPros = approvedPros.filter((p) => p.rating > 0);
  const avgRating = ratedPros.length ? ratedPros.reduce((sum, p) => sum + p.rating, 0) / ratedPros.length : 0;
  const doneCount = platform.bookings.filter((b) => b.status === "completed").length;
  const activeCatalog = platform.catalog.filter((item) => item.active);
  const popularItems = (() => {
    const counts = new Map<string, number>();
    platform.bookings.forEach((b) => counts.set(b.service, (counts.get(b.service) || 0) + 1));
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => activeCatalog.find((item) => item.name === name)).filter(Boolean) as typeof activeCatalog;
    const fill = CATALOG_CATEGORIES.map((c) => activeCatalog.find((item) => item.category === c.key && item.pricing !== "quote")).filter(Boolean) as typeof activeCatalog;
    return [...top, ...fill.filter((item) => !top.includes(item))].slice(0, 3);
  })();
  const ratingFor = (category: string) => { const r = approvedPros.filter((p) => p.category === category && p.rating > 0); return r.length ? (r.reduce((sum, p) => sum + p.rating, 0) / r.length).toFixed(1) : ""; };
  const searchMatch = query.trim() ? activeCatalog.find((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())) : undefined;

  useEffect(() => {
    if (launchService && isAuthenticated) {
      setSelected(launchService);
      setPage("home");
      onLaunchConsumed();
    }
  }, [launchService, isAuthenticated, onLaunchConsumed]);

  const startBooking = (service: string, provider: Provider | null = null) => {
    if (!isAuthenticated) return onLogin(service);
    setRequested(provider);
    setSelected(service);
  };

  const openBookings = () => {
    if (!isAuthenticated) return onLogin();
    setPage("bookings");
  };

  const confirm = () => {
    setSelected(null);
    setPage("bookings");
    setNotice("Booking confirmed. A verified professional will be assigned shortly.");
    window.setTimeout(() => setNotice(""), 4000);
  };

  return (
    <div className="consumer-page">
      <header className="consumer-nav">
        <Logo />
        <nav className="consumer-links" aria-label="Main navigation">
          <button onClick={() => setPage("home")}>Services</button><button onClick={() => setPage("discover")}>Find pros</button><button onClick={() => setPage("how")}>How it works</button><button onClick={() => setPage("safety")}>Safety</button><button onClick={() => setPage("help")}>Help</button>
        </nav>
        <div className="nav-actions">
          <Button variant="ghost" onClick={onSwitch}>Partner dashboard</Button>
          <Button variant="ghost" onClick={onAdmin}>Admin</Button>
          {isAuthenticated ? <><Button variant="ghost" onClick={openBookings}>My bookings</Button><Button variant="ghost" onClick={() => setPage("profile")}>Profile</Button><span data-ntf-toggle><Button variant="ghost" onClick={() => setNtfOpen((value) => !value)}><Icon name="bell" size={18} />{customerUnread > 0 && <b className="ntf-badge">{customerUnread}</b>}</Button></span><NotificationCenter audience="consumer" recipientId={customerAccount?.id} open={ntfOpen} onClose={() => setNtfOpen(false)} /></> : <Button variant="ghost" onClick={() => onLogin()}>Sign in</Button>}
          <Button onClick={() => { setPage("home"); startBooking("home service"); }}>Book a service <Icon name="arrow" size={17} /></Button>
        </div>
        <button className="mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}><Icon name={menuOpen ? "close" : "menu"} /></button>
      </header>

      {isAuthenticated && <div className="mobile-ntf"><NotificationCenter audience="consumer" recipientId={customerAccount?.id} open={ntfOpen} onClose={() => setNtfOpen(false)} /></div>}

      {menuOpen && <div className="mobile-drawer-wrap">
        <button className="mobile-drawer-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
        <aside className="mobile-drawer" aria-label="Mobile navigation">
          <Button className="mobile-drawer-cta" onClick={() => go(() => { setPage("home"); startBooking("home service"); })}>Book a service <Icon name="arrow" size={17} /></Button>
          {isAuthenticated ? <>
            <button onClick={() => go(openBookings)}>My bookings</button>
            <button onClick={() => go(() => setPage("profile"))}>Profile</button>
            <button onClick={() => go(() => setNtfOpen(true))}>Notifications{customerUnread > 0 && <b className="ntf-badge">{customerUnread}</b>}</button>
          </> : <button className="mobile-drawer-signin" onClick={() => go(() => onLogin())}>Sign in</button>}
          <hr />
          <button onClick={() => go(() => setPage("home"))}>Services</button>
          <button onClick={() => go(() => setPage("discover"))}>Find pros</button>
          <button onClick={() => go(() => setPage("how"))}>How it works</button>
          <button onClick={() => go(() => setPage("safety"))}>Safety</button>
          <button onClick={() => go(() => setPage("help"))}>Help</button>
          <hr />
          <button onClick={() => go(onSwitch)}>Partner dashboard</button>
          <button onClick={() => go(onAdmin)}>Admin</button>
        </aside>
      </div>}

      {notice && <div className="toast"><Icon name="check" size={18} />{notice}</div>}

      {page === "home" ? <main>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow"><span />{approvedPros.length > 0 ? `${approvedPros.length} verified professional${approvedPros.length > 1 ? "s" : ""} ready to serve you` : "Verified professionals · escrow-protected payments"}</div>
            <h1>Your home, handled with <em>care.</em></h1>
            <p>Book trusted, background-checked professionals for every home need. Upfront pricing, safe payments, no surprises.</p>
            <div className="finder">
              <label>
                <span>YOUR LOCATION</span>
                <span className="finder-field"><Icon name="location" size={19} /><select value={location} onChange={(event) => setLocation(event.target.value)}>{AREA_NAMES.map((name) => <option key={name}>{name}</option>)}</select></span>
              </label>
              <div className="finder-divider" />
              <label className="service-search">
                <span>WHAT DO YOU NEED?</span>
                <span className="finder-field"><Icon name="search" size={19} /><input placeholder="Search for a service" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (searchMatch ? startBooking(searchMatch.name) : document.getElementById("services")?.scrollIntoView({ behavior: "smooth" }))} /></span>
              </label>
              <Button className="find-button" onClick={() => searchMatch ? startBooking(searchMatch.name) : document.getElementById("services")?.scrollIntoView({ behavior: "smooth" })}>{searchMatch ? `Book ${searchMatch.name}` : "Find services"}</Button>
            </div>
            <div className="trust-row">
              <span><Icon name="shield" size={17} />Verified professionals</span>
              <span><Icon name="wallet" size={17} />Escrow protected</span>
              <span><Icon name="star" size={17} />{avgRating ? `${avgRating.toFixed(1)} average rating` : "Rated by real customers"}</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">
              <img src="https://images.unsplash.com/photo-1739271933165-2725a7375391?auto=format&fit=crop&w=1100&q=88" alt="A professional ready to help with home services" />
            </div>
            <div className="verified-card">
              <span className="verified-icon"><Icon name="shield" size={22} /></span>
              <span><strong>100% verified</strong><small>NIN & background checked</small></span>
            </div>
            <div className="rating-card">
              <div className="avatar-stack"><span>AO</span><span>KI</span><span>BN</span></div>
              <div><strong>{avgRating ? avgRating.toFixed(1) : "New"} <span>★</span></strong><small>{doneCount} completed service{doneCount === 1 ? "" : "s"}</small></div>
            </div>
            <div className="hero-pattern" />
          </div>
        </section>

        <section className="services-section content-width" id="services">
          <div className="section-heading">
            <div><span className="kicker">SERVICES FOR EVERY HOME</span><h2>What can we help with?</h2></div>
            <button className="see-all" onClick={() => startBooking("home service")}>View all services <Icon name="arrow" size={18} /></button>
          </div>
          <div className="service-grid">
            {CATALOG_CATEGORIES.map((cat, idx) => (
              <button className="service-card" key={cat.key} onClick={() => startBooking(cat.label)}>
                <span className={`service-icon ${TINTS[idx % TINTS.length]}`}>{cat.icon}</span>
                <strong>{cat.label}</strong><small>{fromPrice(platform.catalog, cat.key) ? `From ${money(fromPrice(platform.catalog, cat.key))}` : "Coming soon"}</small>
                <span className="service-arrow"><Icon name="chevron" size={17} /></span>
              </button>
            ))}
          </div>
        </section>

        <section className="popular-section">
          <div className="content-width">
            <div className="section-heading">
              <div><span className="kicker">POPULAR RIGHT NOW</span><h2>Popular near you</h2></div>
              <span className="location-chip"><Icon name="location" size={15} /> {location.split(",")[0]}</span>
            </div>
            <div className="popular-grid">
              {popularItems.map((item, idx) => (
                <article className="popular-card" key={item.id}>
                  <div className="popular-image"><img src={POPULAR_IMAGES[idx % POPULAR_IMAGES.length]} alt="" /><span>POPULAR</span></div>
                  <div className="popular-copy">
                    {ratingFor(item.category) && <div className="rating"><Icon name="star" size={14} /> {ratingFor(item.category)}</div>}
                    <h3>{item.name}</h3><p>{CATALOG_CATEGORIES.find((c) => c.key === item.category)?.label}</p>
                    <div className="price-row"><span><strong>{money(item.price)}</strong><del>{item.pricing === "quote" ? "inspection" : item.pricing === "visit" ? "per visit" : item.pricing === "fixed" ? "labour" : `per ${item.unitLabel}`}</del></span><Button variant="secondary" onClick={() => startBooking(item.name)}>Book</Button></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main> : page === "bookings" && customerAccount ? <TrackingPage customerId={customerAccount.id} onBook={() => { setPage("home"); startBooking("home service"); }} /> : page === "profile" && customerAccount ? <ProfilePage account={customerAccount} onBook={() => { setPage("home"); startBooking("home service"); }} /> : page === "discover" ? <DiscoverPage customerId={customerAccount?.id} defaultArea={location} onNeedLogin={() => onLogin()} onBook={(service, provider) => startBooking(service, provider)} /> : <ConsumerInfoPage page={page as "how" | "safety" | "help"} onBook={() => { setPage("home"); startBooking("home service"); }} />}

      {selected && customerAccount && <BookingFlow service={selected} customerId={customerAccount.id} requested={requested} defaultArea={location} onClose={() => { setSelected(null); setRequested(null); }} onPay={(details, extra) => platform.createBooking({ ...details, customerId: customerAccount.id, customerName: customerAccount.name, requestedProviderId: requested?.id }, extra)} onComplete={() => { setRequested(null); confirm(); }} />}
    </div>
  );
}

type Portal = "consumer" | "artisan" | "admin" | "onboarding";

export default function App() {
  const platform = usePlatform();
  const [portal, setPortal] = useState<Portal>("consumer");
  const [session, setSession] = useState<Account | null>(() => {
    const saved = localStorage.getItem("servenaija-session");
    return saved ? JSON.parse(saved) : null;
  });
  const [authRole, setAuthRole] = useState<UserRole | null>(null);
  const [pendingService, setPendingService] = useState<string | null>(null);
  const [launchService, setLaunchService] = useState<string | null>(null);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const requestLogin = (role: UserRole, service?: string) => {
    setAuthRole(role);
    setPendingService(service || null);
  };

  const login = (nextSession: Account) => {
    localStorage.setItem("servenaija-session", JSON.stringify(nextSession));
    setSession(nextSession);
    setAuthRole(null);
    if (nextSession.role === "admin") setPortal("admin");
    else if (nextSession.role === "artisan") {
      setOnboardingStep(Number(localStorage.getItem(`servenaija-onboarding-step-${nextSession.id}`) || 0));
      const provider = platform.providers.find((item) => item.accountId === nextSession.id);
      setPortal(provider ? "artisan" : "onboarding");
    }
    else {
      setPortal("consumer");
      if (pendingService) setLaunchService(pendingService);
    }
    setPendingService(null);
  };

  const logout = () => {
    localStorage.removeItem("servenaija-session");
    setSession(null);
    setPortal("consumer");
  };

  const openPartner = () => {
    if (!session || session.role !== "artisan") return requestLogin("artisan");
    const provider = platform.providers.find((item) => item.accountId === session.id);
    setPortal(provider ? "artisan" : "onboarding");
  };

  const saveOnboarding = useCallback((step: number) => {
    if (session) localStorage.setItem(`servenaija-onboarding-step-${session.id}`, String(step));
    setOnboardingStep(step);
  }, [session]);

  const finishOnboarding = () => {
    if (session) localStorage.setItem(`servenaija-onboarding-step-${session.id}`, "9");
    setOnboardingStep(9);
    if (session?.role === "artisan") {
      const d = JSON.parse(localStorage.getItem(`servenaija-onboarding-data-${session.id}`) || "{}");
      platform.submitProvider(session, {
        fullName: d.fullName || session.name, phone: d.phone || session.phone, email: d.email || "", city: d.city || "Lagos", lga: d.lga || "Lekki", category: d.category || CATALOG_CATEGORIES[0].label,
        experience: d.experience || "", bio: d.bio || "", nin: d.nin || "", ninVerified: !!d.ninVerified, bvn: d.bvn || "", bank: d.bank || "", accountNumber: d.accountNumber || "", selfieVerified: !!d.selfieVerified,
        guarantors: [{ name: d.g1Name || "", relationship: d.g1Rel || "", nin: d.g1Nin || "" }, { name: d.g2Name || "", relationship: d.g2Rel || "", nin: d.g2Nin || "" }],
        assessment: d.assessment || "", certificateName: d.certificateName || "", residentIdName: d.residentIdName || "", consent: !!d.consent, termsAccepted: !!d.termsAccepted, submittedAt: new Date().toISOString(),
      });
    }
    setPortal("artisan");
  };

  return (
    <>
      {portal === "consumer" && <ConsumerPortal onSwitch={openPartner} onAdmin={() => requestLogin("admin")} isAuthenticated={session?.role === "consumer"} onLogin={(service) => requestLogin("consumer", service)} launchService={launchService} onLaunchConsumed={() => setLaunchService(null)} />}
      {portal === "artisan" && session?.role === "artisan" && <ArtisanDashboard account={session} onSwitch={() => setPortal("consumer")} />}
      {portal === "onboarding" && session?.role === "artisan" && <Onboarding account={session} storageKey={session.id} initialStep={onboardingStep} onSave={saveOnboarding} onComplete={finishOnboarding} onExit={() => setPortal("consumer")} />}
      {portal === "admin" && <SuperAdmin onLogout={logout} />}
      {authRole && <AuthModal initialRole={authRole} onClose={() => { setAuthRole(null); setPendingService(null); }} onLogin={login} />}
    </>
  );
}
