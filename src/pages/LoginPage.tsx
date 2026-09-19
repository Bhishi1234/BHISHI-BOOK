import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiMode } from "../api/client";
import { useStore } from "../store";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginPage() {
  const { sendOtp, verifyOtp, user, authHint, error } = useStore();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "sent">("email");
  const [sending, setSending] = useState(false);
  const [opening, setOpening] = useState(false);
  const demoContinue = apiMode() === "mock";

  useEffect(() => {
    if (user) nav("/");
  }, [user, nav]);

  async function send() {
    const addr = email.trim();
    if (!isEmail(addr)) return;
    setSending(true);
    try {
      await sendOtp(addr);
      setStep("sent");
    } finally {
      setSending(false);
    }
  }

  async function continueDemo() {
    setOpening(true);
    try {
      await verifyOtp(email.trim());
      nav("/");
    } finally {
      setOpening(false);
    }
  }

  return (
    <div className="login-wrap">
      <div style={{ width: "min(420px, 100%)" }}>
        <div className="brand-mark">₹</div>
        <h1>Bhishi Book</h1>
        <p className="sub">Manage your chit funds with confidence</p>
        <div className="login-card">
          {step === "email" ? (
            <>
              <label className="label" htmlFor="email">Email</label>
              <input
                id="email"
                className="field"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
              />
              {error && <p className="due">{error}</p>}
              <button className="btn wide" disabled={sending || !isEmail(email)} onClick={() => void send()}>
                {sending ? "Sending…" : "Send verification link"}
              </button>
            </>
          ) : (
            <>
              <h2 style={{ marginTop: 0 }}>Check your email</h2>
              <p className="sub" style={{ marginBottom: 16 }}>
                We sent a verification link to <strong>{email.trim()}</strong>. Open that email and continue from the link.
              </p>
              {error && <p className="due">{error}</p>}
              {demoContinue && (
                <button className="btn wide" disabled={opening} onClick={() => void continueDemo()}>
                  {opening ? "Opening…" : "Continue"}
                </button>
              )}
              <p className="fine">
                {authHint}
                <button className="link" onClick={() => setStep("email")}> Change email</button>
              </p>
            </>
          )}
        </div>
        <p className="fine">
          By continuing, you agree to our Terms and Privacy Policy. Bhishi Book is a
          record-keeping utility.
        </p>
      </div>
    </div>
  );
}
