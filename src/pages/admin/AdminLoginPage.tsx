import { type FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { adminSignIn, adminToken } from "../../lib/adminApi";

export function AdminLoginPage() {
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (adminToken()) return <Navigate to="/adminbhishibookdashboard" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminSignIn(phone, password);
      nav("/adminbhishibookdashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-wrap">
      <div>
        <img className="login-logo" src="/brand/bhishi-circle-logo.png?v=3" alt="Bhishi Circle" width={148} height={110} />
        <p className="sub" style={{ textAlign: "center" }}>Owner admin</p>
        <form className="login-card" onSubmit={onSubmit}>
          <label className="label" htmlFor="admin-phone">Phone</label>
          <input
            id="admin-phone"
            className="field"
            inputMode="numeric"
            autoComplete="username"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit phone"
          />
          <label className="label" htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="due" style={{ marginTop: 10 }}>{error}</p>}
          <button className="btn wide" type="submit" disabled={busy} style={{ marginTop: 14 }}>
            {busy ? "Checking…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
