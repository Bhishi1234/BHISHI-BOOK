import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { useStore } from "../store";

type Step = "phone" | "otp" | "done";

export function ForgotPasswordPage() {
  const { beginPasswordReset, resetPassword, authHint, error } = useStore();
  const { m } = useI18n();
  const nav = useNavigate();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = phone.replace(/\D/g, "").slice(0, 10);
  const code = otp.join("");
  const canSend = digits.length === 10;
  const canSave = code.length === 6 && password.length >= 6 && password === confirm;

  async function sendOtp() {
    if (!canSend || busy) return;
    setBusy(true);
    setLocalError(null);
    try {
      const sent = await beginPasswordReset(digits);
      setDevOtp(sent.devOtp || null);
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setTimeout(() => refs.current[0]?.focus(), 50);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : m.login.noAccountForPhone);
    } finally {
      setBusy(false);
    }
  }

  async function savePassword() {
    if (!canSave || busy) return;
    if (password !== confirm) {
      setLocalError(m.login.passwordMismatch);
      return;
    }
    if (password.length < 6) {
      setLocalError(m.login.passwordShort);
      return;
    }
    setBusy(true);
    setLocalError(null);
    try {
      await resetPassword(digits, code, password);
      setStep("done");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  function typeOtp(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 5) refs.current[i + 1]?.focus();
  }

  return (
    <div className="login-wrap">
      <div style={{ width: "min(420px, 100%)" }}>
        <Link to="/welcome" style={{ display: "block", textAlign: "center" }}>
          <img
            className="login-logo"
            src="/brand/bhishi-circle-logo.png?v=3"
            alt={m.brand}
            width={148}
            height={110}
            decoding="async"
          />
        </Link>
        <div className="login-card">
          {step === "phone" && (
            <>
              <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>{m.login.forgotTitle}</h2>
              <p className="muted" style={{ margin: "0 0 14px" }}>{m.login.forgotHint}</p>
              <label className="label" htmlFor="reset-phone">{m.login.phone}</label>
              <div className="phone-row">
                <span>+91</span>
                <input
                  id="reset-phone"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  onKeyDown={(e) => { if (e.key === "Enter") void sendOtp(); }}
                />
              </div>
              {(localError || error) && <p className="due">{localError || error}</p>}
              <button className="btn wide" disabled={busy || !canSend} onClick={() => void sendOtp()}>
                {busy ? m.login.loggingIn : m.login.sendResetOtp}
              </button>
              <p className="fine" style={{ marginTop: 12 }}>
                <Link className="link" to="/login">{m.login.backToLogin}</Link>
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>{m.login.forgotTitle}</h2>
              <p className="muted" style={{ margin: "0 0 12px" }}>{m.login.enterOtp} · +91 {digits}</p>
              {devOtp && <p className="hint">Dev OTP: {devOtp}</p>}
              <div className="otp-row" style={{ marginBottom: 12 }}>
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { refs.current[i] = el; }}
                    className="otp-box"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => typeOtp(i, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
                    }}
                  />
                ))}
              </div>
              <label className="label" htmlFor="new-pass">{m.login.newPassword}</label>
              <input
                id="new-pass"
                className="field"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="label" htmlFor="new-pass2">{m.login.confirmNewPassword}</label>
              <input
                id="new-pass2"
                className="field"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <p className="hint">{m.login.passwordHint}</p>
              {(localError || error) && <p className="due">{localError || error}</p>}
              <button className="btn wide" disabled={busy || !canSave} onClick={() => void savePassword()}>
                {busy ? m.chit.saving : m.login.resetPasswordCta}
              </button>
              <p className="fine" style={{ marginTop: 12 }}>
                <button type="button" className="link" onClick={() => setStep("phone")}>{m.common.back}</button>
                {" · "}
                <Link className="link" to="/login">{m.login.backToLogin}</Link>
              </p>
              <p className="hint" style={{ marginTop: 8 }}>{authHint}</p>
            </>
          )}

          {step === "done" && (
            <>
              <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>{m.login.resetSuccess}</h2>
              <button className="btn wide" onClick={() => nav("/login")}>{m.login.backToLogin}</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
