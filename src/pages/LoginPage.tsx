import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store";

export function LoginPage() {
  const { sendOtp, verifyOtp, user, authHint, error } = useStore();
  const nav = useNavigate();
  const [phone, setPhone] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [sending, setSending] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (user) nav("/");
  }, [user, nav]);

  async function send() {
    const digits = phone.replace(/\D/g, "").slice(0, 10);
    if (digits.length !== 10) return;
    setSending(true);
    try {
      const sent = await sendOtp(digits);
      setDevOtp(sent.devOtp || null);
      setStep("otp");
    } finally {
      setSending(false);
    }
  }

  async function submitOtp(code: string) {
    if (code.length !== 6) return;
    await verifyOtp(phone.replace(/\D/g, "").slice(0, 10), code);
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
          {step === "phone" ? (
            <>
              <label className="label" htmlFor="phone">Mobile number</label>
              <div className="phone-row">
                <span>+91</span>
                <input
                  id="phone"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              {error && <p className="due">{error}</p>}
              <button className="btn wide" disabled={sending} onClick={send}>
                {sending ? "Sending…" : "Send OTP"}
              </button>
            </>
          ) : (
            <>
              <p className="sub" style={{ marginBottom: 12 }}>
                Enter the OTP sent to +91 {phone.replace(/\D/g, "").slice(0, 10)}
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
                <button className="link" onClick={() => setStep("phone")}> Change number</button>
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
