import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useStore } from "../store";

export function LoginPage() {
  const { sendOtp, verifyOtp, logout, user, authHint, error } = useStore();
  const { m, tx } = useI18n();
  const nav = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = phone.replace(/\D/g, "").slice(0, 10);
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const canSend = digits.length === 10 && firstName.trim().length >= 1 && lastName.trim().length >= 1;

  async function send() {
    if (!canSend) return;
    setSending(true);
    try {
      const sent = await sendOtp(digits, fullName);
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
      await verifyOtp(digits, code, fullName);
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
          <h1>{m.brand}</h1>
          <p className="sub">{m.login.signedIn}</p>
          <div className="login-card">
            <p className="sub" style={{ marginBottom: 16 }}>
              {[user.name && user.name !== "Organiser" ? user.name : null, user.phone ? `+91 ${user.phone}` : null]
                .filter(Boolean)
                .join(" · ") || user.name}
            </p>
            <button className="btn wide" onClick={() => nav("/")}>{m.login.goDashboard}</button>
            <button className="btn ghost wide" style={{ marginTop: 10 }} onClick={() => void logout()}>{m.nav.signOut}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div style={{ width: "min(420px, 100%)" }}>
        <div className="brand-mark">₹</div>
        <h1>{m.brand}</h1>
        <p className="sub">{m.login.tagline}</p>
        <div className="login-card">
          {step === "phone" ? (
            <>
              <div className="grid-2" style={{ gap: 10, marginBottom: 0 }}>
                <div>
                  <label className="label" htmlFor="firstName">{m.login.firstName}</label>
                  <input
                    id="firstName"
                    className="field"
                    autoComplete="given-name"
                    placeholder="Ramesh"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label" htmlFor="lastName">{m.login.lastName}</label>
                  <input
                    id="lastName"
                    className="field"
                    autoComplete="family-name"
                    placeholder="Kumar"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <label className="label" htmlFor="phone">{m.login.phone}</label>
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
              <p className="hint">{m.loginExtra.otpHint}</p>
              {error && <p className="due">{error}</p>}
              <button className="btn wide" disabled={sending || !canSend} onClick={() => void send()}>
                {sending ? m.common.loading : m.login.sendOtp}
              </button>
            </>
          ) : (
            <>
              <p className="sub" style={{ marginBottom: 12, textAlign: "left" }}>
                {tx(m.loginExtra.otpGreeting, { name: firstName.trim(), phone: digits })}
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
                {verifying ? m.loginExtra.verifying : m.login.verify}
              </button>
              <p className="fine">
                {authHint}{" "}
                <button
                  type="button"
                  className="link"
                  onClick={() => { setStep("phone"); setDevOtp(null); setOtp(["", "", "", "", "", ""]); }}
                >
                  {m.loginExtra.changeDetails}
                </button>
              </p>
            </>
          )}
        </div>
        <p className="fine">
          By continuing, you agree to our Terms and Privacy Policy. Bhishi Circle is a
          record-keeping utility.
        </p>
      </div>
    </div>
  );
}
