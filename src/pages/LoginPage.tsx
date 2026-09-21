import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";

export function LoginPage() {
  const { sendOtp, verifyOtp, logout, user, authHint, error } = useStore();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = phone.replace(/\D/g, "").slice(0, 10);

  async function send() {
    if (digits.length !== 10) return;
    setSending(true);
    try {
      const sent = await sendOtp(digits);
      setDevOtp(sent.devOtp || null);
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setTimeout(() => refs.current[0]?.focus(), 50);
    } finally {
      setSending(false);
    }
  }

  async function submitOtp(code: string) {
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    try {
      await verifyOtp(digits, code);
      nav("/");
    } finally {
      setVerifying(false);
    }
  }

  function typeOtp(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
    if (next.join("").length === 6) void submitOtp(next.join(""));
  }

  function onOtpKeyDown(i: number, key: string) {
    if (key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  }

  if (user) {
    return (
      <div className="login-wrap">
        <div style={{ width: "min(420px, 100%)" }}>
          <div className="brand-mark">₹</div>
          <h1>Bhishi Book</h1>
          <p className="sub">You are signed in</p>
          <div className="login-card">
            <p className="sub" style={{ marginBottom: 16 }}>
              {user.phone ? `+91 ${user.phone}` : user.name}
            </p>
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
          {step === "phone" ? (
            <>
              <label className="label" htmlFor="phone">Mobile number</label>
              <div className="phone-row">
                <span>+91</span>
                <input
                  id="phone"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onKeyDown={(e) => { if (e.key === "Enter") void send(); }}
                />
              </div>
              <p className="hint">We’ll text a one-time code to this number via SMS.</p>
              {error && <p className="due">{error}</p>}
              <button className="btn wide" disabled={sending || digits.length !== 10} onClick={() => void send()}>
                {sending ? "Sending…" : "Send OTP"}
              </button>
            </>
          ) : (
            <>
              <p className="sub" style={{ marginBottom: 12, textAlign: "left" }}>
                Enter the OTP sent to +91 {digits}
              </p>
              <div className="otp-boxes">
                {otp.map((n, i) => (
                  <input
                    key={i}
                    ref={(el) => { refs.current[i] = el; }}
                    value={n}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    onChange={(e) => typeOtp(i, e.target.value)}
                    onKeyDown={(e) => onOtpKeyDown(i, e.key)}
                    maxLength={1}
                  />
                ))}
              </div>
              {error && <p className="due">{error}</p>}
              {devOtp && <p className="fine">Dev OTP: {devOtp}</p>}
              <button
                className="btn wide"
                disabled={verifying || otp.join("").length !== 6}
                onClick={() => void submitOtp(otp.join(""))}
              >
                {verifying ? "Verifying…" : "Verify & continue"}
              </button>
              <p className="fine">
                {authHint}{" "}
                <button
                  type="button"
                  className="link"
                  onClick={() => { setStep("phone"); setDevOtp(null); setOtp(["", "", "", "", "", ""]); }}
                >
                  Change number
                </button>
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
