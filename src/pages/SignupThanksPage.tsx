import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { clearSignupThanks, consumeSignupConversion, signupThanksAccess, trackMetaPageView } from "../lib/metaPixel";
import { useStore } from "../store";

export function SignupThanksPage() {
  const { user, ready } = useStore();
  const { m } = useI18n();
  const nav = useNavigate();
  const [access] = useState(signupThanksAccess);

  useEffect(() => {
    if (!ready || !user || access === "none") return;
    trackMetaPageView();
    if (access === "pending") consumeSignupConversion();
  }, [access, ready, user]);

  if (!ready) return <div className="login-wrap">Loading…</div>;
  if (!user || access === "none") {
    return <Navigate to={user ? "/" : "/login"} replace />;
  }

  const who = [user.name && user.name !== "Organiser" ? user.name : null, user.phone ? `+91 ${user.phone}` : null]
    .filter(Boolean)
    .join(" · ");

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
        <p className="sub" style={{ marginTop: 4 }}>{m.login.thanksTitle}</p>
        <div className="login-card">
          <p style={{ margin: "0 0 8px", fontWeight: 600 }}>{m.login.signedIn}</p>
          {who && <p className="sub" style={{ marginBottom: 12 }}>{who}</p>}
          <p className="hint" style={{ marginBottom: 16 }}>{m.login.thanksBody}</p>
          <button
            className="btn wide"
            onClick={() => {
              clearSignupThanks();
              nav("/", { replace: true });
            }}
          >
            {m.login.goDashboard}
          </button>
        </div>
      </div>
    </div>
  );
}
