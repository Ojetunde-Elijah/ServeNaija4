import { useState } from "react";
import { usePlatform, type Account } from "./PlatformContext";

export type UserRole = "consumer" | "artisan" | "admin";

export type Session = {
  name: string;
  phone: string;
  role: UserRole;
};

export default function AuthModal({
  initialRole,
  onClose,
  onLogin,
}: {
  initialRole: UserRole;
  onClose: () => void;
  onLogin: (session: Account) => void;
}) {
  const { authenticate, register, accounts } = usePlatform();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10 || password.length < 6) {
      setError("Enter a valid Nigerian phone number and a password of at least 6 characters.");
      return;
    }
    if (mode === "register") {
      if (name.trim().length < 3) return setError("Enter your full name.");
      if (accounts.some((account) => account.phone === cleanPhone && account.role === initialRole)) return setError("An account already exists with this phone number.");
      onLogin(register(name.trim(), cleanPhone, password, initialRole as Exclude<UserRole, "admin">));
      return;
    }
    const account = authenticate(cleanPhone, password, initialRole);
    if (!account) return setError(`These details do not match a ${initialRole === "consumer" ? "customer" : initialRole === "artisan" ? "partner" : "Super Admin"} account.`);
    onLogin(account);
  };

  return (
    <div className="auth-backdrop" onMouseDown={onClose}>
      <section className="auth-card" onMouseDown={(event) => event.stopPropagation()}>
        <button className="auth-close" onClick={onClose} aria-label="Close login">×</button>
        <div className="auth-brand"><span className="auth-brand-mark">S</span><strong>ServeNaija</strong></div>
        <span className="auth-kicker">{initialRole === "consumer" ? "CUSTOMER ACCOUNT" : initialRole === "artisan" ? "PARTNER PORTAL" : "SUPER ADMIN CONSOLE"}</span>
        <h1>{mode === "login" ? "Welcome back." : initialRole === "consumer" ? "Create your account." : "Become a partner."}</h1>
        <p>{initialRole === "consumer" ? "Manage bookings, payments and completion codes." : initialRole === "artisan" ? "Access onboarding, jobs, earnings and training." : "Restricted access for authorised ServeNaija operators."}</p>
        {mode === "register" && <label className="auth-label">FULL NAME<span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Your legal name" /></span></label>}
        <label className="auth-label">
          PHONE NUMBER
          <span><b>+234</b><input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="801 234 5678" inputMode="numeric" /></span>
        </label>
        <label className="auth-label">
          PASSWORD
          <span><input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" onKeyDown={(event) => event.key === "Enter" && submit()} /></span>
        </label>
        {error && <div className="auth-error">{error}</div>}
        <button className="auth-submit" onClick={submit}>{mode === "login" ? "Sign in securely" : "Create account"} <span>→</span></button>
        {initialRole !== "admin" && <button className="auth-register" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? (initialRole === "artisan" ? "New partner? Start your application" : "New customer? Create an account") : "Already registered? Sign in"}</button>}
        {mode === "login" && <div className="demo-credentials">Demo: {initialRole === "consumer" ? "08098765432 / customer123" : initialRole === "artisan" ? "08012345678 / partner123" : "08000000000 / admin123"}</div>}
        <div className="auth-trust"><span>✓</span> Protected with bank-grade encryption</div>
      </section>
    </div>
  );
}
