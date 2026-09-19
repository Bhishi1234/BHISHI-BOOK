import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginPage() {
  const { signIn, signUp, logout, user, error } = useStore();
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canSubmit = isEmail(email) && password.length >= 6 && (mode === "signin" || password === confirm);

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const result = await signUp(email.trim(), password);
        if (result.needsVerification) {
          setNotice(`We sent a verification link to ${email.trim()}. Open it, then sign in with your password.`);
          setMode("signin");
          setPassword("");
          setConfirm("");
          return;
        }
        nav("/");
        return;
      }
      await signIn(email.trim(), password);
      nav("/");
    } finally {
      setBusy(false);
    }
  }

  if (user) {
    return (
      <div className="login-wrap">
        <div style={{ width: "min(420px, 100%)" }}>
          <div className="brand-mark">₹</div>
          <h1>Bhishi Book</h1>
          <p className="sub">You are signed in</p>
          <div className="login-card">
            <p className="sub" style={{ marginBottom: 16 }}>{user.email || user.name}</p>
            <button className="btn wide" onClick={() => nav("/")}>Go to dashboard</button>
            <button className="btn ghost wide" style={{ marginTop: 10 }} onClick={() => void logout()}>Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div style={{ width: "min(420px, 100%)" }}>
        <div className="brand-mark">₹</div>
        <h1>Bhishi Book</h1>
        <p className="sub">Manage your chit funds with confidence</p>
        <div className="login-card">
          <div className="seg center" style={{ marginBottom: 18 }}>
            <button className={`chip ${mode === "signin" ? "dark" : ""}`} onClick={() => { setMode("signin"); setNotice(null); }}>
              Sign in
            </button>
            <button className={`chip ${mode === "signup" ? "dark" : ""}`} onClick={() => { setMode("signup"); setNotice(null); }}>
              Create account
            </button>
          </div>
          <label className="label" htmlFor="email">Email</label>
          <input
            id="email"
            className="field"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="label" htmlFor="password">Password</label>
          <input
            id="password"
            className="field"
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && mode === "signin") void submit(); }}
          />
          {mode === "signup" && (
            <>
              <label className="label" htmlFor="confirm">Confirm password</label>
              <input
                id="confirm"
                className="field"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
              />
            </>
          )}
          {mode === "signup" && password && confirm && password !== confirm && (
            <p className="due">Passwords do not match.</p>
          )}
          {notice && <p className="fine" style={{ textAlign: "left", marginTop: 0 }}>{notice}</p>}
          {error && <p className="due">{error}</p>}
          <button className="btn wide" disabled={busy || !canSubmit} onClick={() => void submit()}>
            {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
          </button>
          <p className="fine">
            {mode === "signup"
              ? "We’ll email a verification link. After you open it, sign in with this password."
              : "Use the email and password you registered with."}
          </p>
        </div>
        <p className="fine">
          By continuing, you agree to our Terms and Privacy Policy. Bhishi Book is a
          record-keeping utility.
        </p>
      </div>
    </div>
  );
}
