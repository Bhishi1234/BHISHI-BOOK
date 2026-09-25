import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, MessageCircle } from "lucide-react";
import {
  LangModal,
  LandingFooter,
  LandingNav,
  useLandingLang,
} from "./LandingChrome";
import type { LandingCopy } from "../i18n/landing";

function useLegalPage(titleKey: "termsTitle" | "privacyTitle" | "contactTitle") {
  const chrome = useLandingLang();
  useEffect(() => {
    document.title = `${chrome.t[titleKey]} — Bhishi Circle`;
    document.documentElement.lang = chrome.lang === "en" ? "en" : chrome.lang;
  }, [chrome.t, chrome.lang, titleKey]);
  return chrome;
}

function LegalSections({ sections }: { sections: LandingCopy["termsSections"] }) {
  return (
    <div className="lp-legal-body">
      {sections.map((sec) => (
        <section key={sec.heading}>
          <h2>{sec.heading}</h2>
          {sec.body.map((p) => (
            <p key={p.slice(0, 64)}>{p}</p>
          ))}
        </section>
      ))}
    </div>
  );
}

export function TermsPage() {
  const { lang, t, langOpen, pendingLang, setPendingLang, applyLang, openLang } = useLegalPage("termsTitle");

  return (
    <div className="lp">
      <LangModal
        open={langOpen}
        t={t}
        pendingLang={pendingLang}
        setPendingLang={setPendingLang}
        onApply={applyLang}
      />
      <LandingNav t={t} lang={lang} onOpenLang={openLang} />
      <main className="lp-legal">
        <Link className="lp-legal-back" to="/welcome">
          ← {t.legalNavBack}
        </Link>
        <h1>{t.termsTitle}</h1>
        <p className="lp-legal-updated">{t.termsUpdated}</p>
        <LegalSections sections={t.termsSections} />
      </main>
      <LandingFooter t={t} />
    </div>
  );
}

export function PrivacyPage() {
  const { lang, t, langOpen, pendingLang, setPendingLang, applyLang, openLang } = useLegalPage("privacyTitle");

  return (
    <div className="lp">
      <LangModal
        open={langOpen}
        t={t}
        pendingLang={pendingLang}
        setPendingLang={setPendingLang}
        onApply={applyLang}
      />
      <LandingNav t={t} lang={lang} onOpenLang={openLang} />
      <main className="lp-legal">
        <Link className="lp-legal-back" to="/welcome">
          ← {t.legalNavBack}
        </Link>
        <h1>{t.privacyTitle}</h1>
        <p className="lp-legal-updated">{t.privacyUpdated}</p>
        <LegalSections sections={t.privacySections} />
      </main>
      <LandingFooter t={t} />
    </div>
  );
}

export function ContactPage() {
  const { lang, t, langOpen, pendingLang, setPendingLang, applyLang, openLang } = useLegalPage("contactTitle");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Bhishi Circle contact — ${name || "Organiser"}`);
    const body = encodeURIComponent(`Name: ${name}\nContact: ${email}\n\n${message}`);
    window.location.href = `mailto:${t.contactEmail}?subject=${subject}&body=${body}`;
  }

  const waDigits = t.contactWhatsApp.replace(/\D/g, "");
  const secondaryHref = waDigits.length >= 10
    ? `https://wa.me/${waDigits.startsWith("91") ? waDigits : `91${waDigits}`}`
    : `mailto:${t.contactEmail}`;

  return (
    <div className="lp">
      <LangModal
        open={langOpen}
        t={t}
        pendingLang={pendingLang}
        setPendingLang={setPendingLang}
        onApply={applyLang}
      />
      <LandingNav t={t} lang={lang} onOpenLang={openLang} />
      <main className="lp-legal lp-contact">
        <Link className="lp-legal-back" to="/welcome">
          ← {t.legalNavBack}
        </Link>
        <h1>{t.contactTitle}</h1>
        <p className="lp-legal-lead">{t.contactSub}</p>

        <div className="lp-contact-grid">
          <div className="lp-contact-channels">
            <a className="lp-contact-card" href={`mailto:${t.contactEmail}`}>
              <Mail size={18} />
              <div>
                <strong>{t.contactEmailLabel}</strong>
                <span>{t.contactEmail}</span>
              </div>
            </a>
            <a
              className="lp-contact-card"
              href={secondaryHref}
              target={waDigits.length >= 10 ? "_blank" : undefined}
              rel={waDigits.length >= 10 ? "noreferrer" : undefined}
            >
              <MessageCircle size={18} />
              <div>
                <strong>{t.contactWhatsAppLabel}</strong>
                <span>{t.contactWhatsApp}</span>
              </div>
            </a>
          </div>

          <form className="lp-contact-form" onSubmit={onSubmit}>
            <label>
              <span>{t.contactFormName}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label>
              <span>{t.contactFormEmail}</span>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label>
              <span>{t.contactFormMessage}</span>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                required
              />
            </label>
            <button type="submit" className="lp-btn lp-btn-primary">
              {t.contactFormSubmit}
            </button>
            <p className="lp-contact-note">{t.contactNote}</p>
          </form>
        </div>
      </main>
      <LandingFooter t={t} />
    </div>
  );
}
