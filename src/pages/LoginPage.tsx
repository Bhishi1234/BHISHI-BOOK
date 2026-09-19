import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function LoginPage() {
  const { sendOtp, verifyOtp, user, authHint, error } = useStore();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (user) nav("/");
  }, [user, nav]);

  async function send() {
    const addr = email.trim();
    if (!isEmail(addr)) return;
    setSending(true);
    try {
      const sent = await sendOtp(addr);
      setDevOtp(sent.devOtp || null);
      setStep("otp");
    } finally {
      setSending(false);
    }
  }

  async function submitOtp(code: string) {
    if (code.length !== 6) return;
    await verifyOtp(email.trim(), code);
    nav("/");
  }

  function typeOtp(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
    if (next.join("").length === 6) void submitOtp(next.join(""));
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
                {sending ? "Sending…" : "Send OTP"}
              </button>
            </>
          ) : (
            <>
              <p className="sub" style={{ marginBottom: 12 }}>
                Enter the OTP sent to {email.trim()}
              </p>
              <div className="otp-boxes">
                {otp.map((n, i) => (
                  <input
                    key={i}
                    ref={(el) => { refs.current[i] = el; }}
                    value={n}
                    onChange={(e) => typeOtp(i, e.target.value)}
                    maxLength={1}
                  />
                ))}
              </div>
              <button
                className="btn wide"
                onClick={() => void submitOtp(otp.join(""))}
              >
                Verify &amp; continue
              </button>
              {error && <p className="due">{error}</p>}
              {devOtp && <p className="fine">Dev OTP: {devOtp}</p>}
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
