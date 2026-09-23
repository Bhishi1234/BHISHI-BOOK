import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import type { Lang } from "../i18n/types";
import { useStore } from "../store";

type Mode = "login" | "signup";
type Step = "form" | "otp";

export function LoginPage() {
  const { beginSignup, loginWithPassword, verifyOtp, logout, user, authHint, error } = useStore();
  const { m, tx, lang, setUiLang } = useI18n();
  const nav = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [step, setStep] = useState<Step>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  const digits = phone.replace(/\D/g, "").slice(0, 10);
  const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const canLogin = digits.length === 10 && password.length >= 6;
  const canSignup =
    digits.length === 10
    && firstName.trim().length >= 1
    && lastName.trim().length >= 1
    && password.length >= 6
    && confirm === password;

  function switchMode(next: Mode) {
    setMode(next);
    setStep("form");
    setLocalError(null);
    setDevOtp(null);
    setOtp(["", "", "", "", "", ""]);
  }

  async function doLogin() {
    if (!canLogin) return;
    setBusy(true);
    setLocalError(null);
    try {
      await loginWithPassword(digits, password);
      nav("/");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : m.login.wrongPassword);
    } finally {
      setBusy(false);
    }
  }

  async function doSignupSend() {
    if (password.length < 6) {
      setLocalError(m.login.passwordShort);
      return;
    }
    if (password !== confirm) {
      setLocalError(m.login.passwordMismatch);
      return;
    }
    if (!canSignup) return;
    setBusy(true);
    setLocalError(null);
    try {
      const sent = await beginSignup({
        name: fullName,
        phone: digits,
        password,
        language: lang,
      });
      setDevOtp(sent.devOtp || null);
      setOtp(["", "", "", "", "", ""]);
      setStep("otp");
      setTimeout(() => refs.current[0]?.focus(), 50);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Signup failed");
    } finally {
      setBusy(false);
    }
  }

  async function submitOtp(code: string) {
    if (code.length !== 6 || busy) return;
    setBusy(true);
    setLocalError(null);
    try {
      await verifyOtp(digits, code, fullName, { password, language: lang });
      nav("/");
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Invalid OTP");
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
    if (next.join("").length === 6) void submitOtp(next.join(""));
  }

  function onOtpKeyDown(i: number, key: string) {
    if (key === "Backspace" && !otp[i] && i > 0) refs.current[i - 1]?.focus();
  }

  if (user) {
    return (
      <div className="login-wrap">
        <div style={{ width: "min(420px, 100%)" }}>
          <img
            className="login-logo"
            src="/brand/bhishi-circle-logo.png?v=3"
            alt={m.brand}
            width={148}
            height={110}
            decoding="async"
          />
          <p className="sub" style={{ marginTop: 4 }}>{m.login.signedIn}</p>
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
          {step === "form" && (
            <div className="seg" style={{ marginBottom: 14 }}>
              <button type="button" className={`chip ${mode === "login" ? "on" : ""}`} onClick={() => switchMode("login")}>
                {m.login.tabLogin}
              </button>
              <button type="button" className={`chip ${mode === "signup" ? "on" : ""}`} onClick={() => switchMode("signup")}>
                {m.login.tabSignup}
              </button>
            </div>
          )}

          {step === "form" && mode === "login" && (
            <>
              <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>{m.login.loginTitle}</h2>
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
                  onKeyDown={(e) => { if (e.key === "Enter") void doLogin(); }}
                />
              </div>
              <label className="label" htmlFor="password">{m.login.password}</label>
              <input
                id="password"
                className="field"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") void doLogin(); }}
              />
              <p className="hint">{m.loginExtra.loginPasswordHint}</p>
              {(localError || error) && <p className="due">{localError || error}</p>}
              <button className="btn wide" disabled={busy || !canLogin} onClick={() => void doLogin()}>
                {busy ? m.login.loggingIn : m.login.loginCta}
              </button>
              <p className="fine" style={{ marginTop: 12 }}>
                <button type="button" className="link" onClick={() => switchMode("signup")}>{m.login.noAccount}</button>
              </p>
            </>
          )}

          {step === "form" && mode === "signup" && (
            <>
              <h2 style={{ margin: "0 0 12px", fontSize: 18 }}>{m.login.signupTitle}</h2>
              <label className="label">{m.login.language}</label>
              <div className="seg" style={{ marginBottom: 6 }}>
                {([
                  ["en", "English"],
                  ["hi", "हिन्दी"],
                  ["mr", "मराठी"],
                ] as const).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={`chip ${lang === id ? "on" : ""}`}
                    onClick={() => setUiLang(id as Lang)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="hint">{m.login.languageHint}</p>
              <div className="grid-2" style={{ gap: 10, marginBottom: 0 }}>
                <div>
                  <label className="label" htmlFor="firstName">{m.login.firstName}</label>
                  <input
                    id="firstName"
                    className="field"
                    autoComplete="given-name"
                    placeholder={m.login.firstNamePh}
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
                    placeholder={m.login.lastNamePh}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
              </div>
              <label className="label" htmlFor="signupPhone">{m.login.phone}</label>
              <div className="phone-row">
                <span>+91</span>
                <input
                  id="signupPhone"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                />
              </div>
              <label className="label" htmlFor="signupPassword">{m.login.password}</label>
              <input
                id="signupPassword"
                className="field"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label className="label" htmlFor="confirmPassword">{m.login.confirmPassword}</label>
              <input
                id="confirmPassword"
                className="field"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <p className="hint">{m.login.passwordHint}</p>
              {(localError || error) && <p className="due">{localError || error}</p>}
              <button className="btn wide" disabled={busy || !canSignup} onClick={() => void doSignupSend()}>
                {busy ? m.login.creatingAccount : m.login.signupCta}
              </button>
              <p className="fine" style={{ marginTop: 12 }}>
                <button type="button" className="link" onClick={() => switchMode("login")}>{m.login.haveAccount}</button>
              </p>
            </>
          )}

          {step === "otp" && (
            <>
              <p className="sub" style={{ marginBottom: 12, textAlign: "left" }}>
                {tx(m.loginExtra.otpGreeting, { name: firstName.trim(), phone: digits })}
              </p>
              <p className="hint">{m.loginExtra.signupOtpHint}</p>
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
              {(localError || error) && <p className="due">{localError || error}</p>}
              {devOtp && <p className="fine">{tx(m.loginExtra.devOtp, { code: devOtp })}</p>}
              <button
                className="btn wide"
                disabled={busy || otp.join("").length !== 6}
                onClick={() => void submitOtp(otp.join(""))}
              >
                {busy ? m.loginExtra.verifying : m.login.verify}
              </button>
              <p className="fine">
                {authHint}{" "}
                <button
                  type="button"
                  className="link"
                  onClick={() => { setStep("form"); setDevOtp(null); setOtp(["", "", "", "", "", ""]); }}
                >
                  {m.loginExtra.changeDetails}
                </button>
              </p>
            </>
          )}
        </div>
        <p className="fine">{m.login.legal}</p>
      </div>
    </div>
  );
}
