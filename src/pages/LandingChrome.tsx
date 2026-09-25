import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Languages } from "lucide-react";
import { landingCopy, type LandingCopy } from "../i18n/landing";
import { getGuestLang, hasChosenGuestLang, setGuestLang, type GuestLang } from "../lib/uiLang";
import { useStore } from "../store";
import "../landing.css";

export function useLandingLang() {
  const [lang, setLang] = useState<GuestLang>(() => getGuestLang());
  const [langOpen, setLangOpen] = useState(() => !hasChosenGuestLang());
  const [pendingLang, setPendingLang] = useState<GuestLang>(() => getGuestLang());
  const t = useMemo(() => landingCopy(lang), [lang]);

  function applyLang(next: GuestLang) {
    setGuestLang(next);
    setLang(next);
    setLangOpen(false);
  }

  function openLang() {
    setPendingLang(lang);
    setLangOpen(true);
  }

  return { lang, t, langOpen, pendingLang, setPendingLang, applyLang, openLang };
}

export function LangModal({
  open,
  t,
  pendingLang,
  setPendingLang,
  onApply,
}: {
  open: boolean;
  t: LandingCopy;
  pendingLang: GuestLang;
  setPendingLang: (l: GuestLang) => void;
  onApply: (l: GuestLang) => void;
}) {
  if (!open) return null;
  return (
    <div className="lp-lang-back" role="dialog" aria-modal="true" aria-labelledby="lp-lang-title">
      <div className="lp-lang-modal">
        <img src="/brand/bhishi-circle-logo.png?v=3" alt="Bhishi Circle" width={110} height={82} />
        <h2 id="lp-lang-title">{t.langTitle}</h2>
        <p>{t.langHint}</p>
        <div className="lp-lang-opts">
          {([["en", t.langEn], ["hi", t.langHi], ["mr", t.langMr]] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`lp-lang-opt${pendingLang === id ? " on" : ""}`}
              onClick={() => setPendingLang(id)}
            >
              <Languages size={18} /> {label}
            </button>
          ))}
        </div>
        <button type="button" className="lp-btn lp-btn-primary lp-btn-glow lp-btn-wide" onClick={() => onApply(pendingLang)}>
          {t.langContinue}
        </button>
      </div>
    </div>
  );
}

export function LandingNav({
  t,
  lang,
  onOpenLang,
}: {
  t: LandingCopy;
  lang: GuestLang;
  onOpenLang: () => void;
}) {
  const { user } = useStore();
  const loc = useLocation();
  const onLanding = loc.pathname === "/" || loc.pathname === "/welcome";
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="lp-nav">
      <Link className="lp-brand" to="/welcome" onClick={() => setMenuOpen(false)}>
        <img src="/brand/bhishi-mark.png?v=3" alt="" width={28} height={28} />
        <strong>Bhishi Circle</strong>
      </Link>

      {onLanding && (
        <nav className={`lp-nav-links${menuOpen ? " is-open" : ""}`} aria-label="Primary">
          <a href="#features" onClick={() => setMenuOpen(false)}>
            {t.navFeatures}
          </a>
          <a href="#preview" onClick={() => setMenuOpen(false)}>
            {t.navHow}
          </a>
          <a href="#how" onClick={() => setMenuOpen(false)}>
            {t.navHowItWorks}
          </a>
        </nav>
      )}

      <div className="lp-nav-actions">
        <button type="button" className="lp-lang-chip" onClick={onOpenLang} aria-label="Language">
          <Languages size={14} />
          {lang === "hi" ? "हि" : lang === "mr" ? "मर" : "EN"}
        </button>
        {user ? (
          <Link className="lp-btn lp-btn-primary lp-btn-glow" to="/">
            {t.navOpenApp}
          </Link>
        ) : (
          <>
            <Link className="lp-btn lp-btn-ghost lp-nav-login" to="/login">
              {t.navLogin}
            </Link>
            <Link className="lp-btn lp-btn-primary lp-btn-glow" to="/login">
              {t.navStart}
              <span className="lp-btn-arrow" aria-hidden>
                →
              </span>
            </Link>
          </>
        )}
        {onLanding && (
          <button
            type="button"
            className={`lp-menu-btn${menuOpen ? " is-open" : ""}`}
            aria-label="Menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        )}
      </div>
    </header>
  );
}

export function LandingFooter({ t }: { t: LandingCopy }) {
  return (
    <footer className="lp-foot">
      <div className="lp-foot-top">
        <div className="lp-foot-brand">
          <img src="/brand/bhishi-mark.png?v=3" alt="" width={28} height={28} />
          <div>
            <strong>Bhishi Circle</strong>
            <span>{t.footerTagline}</span>
          </div>
        </div>
        <nav className="lp-foot-links" aria-label="Footer">
          <Link to="/terms">{t.footerTerms}</Link>
          <Link to="/privacy">{t.footerPrivacy}</Link>
          <Link to="/contact">{t.footerContact}</Link>
          <Link to="/login">{t.navLogin}</Link>
        </nav>
      </div>
      <p className="lp-foot-legal">{t.footerLegal}</p>
      <p className="lp-foot-copy">{t.footerCopyright}</p>
    </footer>
  );
}
