import { useEffect, useRef, useState, type ReactNode } from "react";
import { recordLandingVisit } from "../lib/adminApi";
import { trackMetaPageView } from "../lib/metaPixel";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Languages,
  MessageCircle,
  Shield,
  Users,
  Wallet,
} from "lucide-react";
import { useStore } from "../store";
import {
  LangModal,
  LandingFooter,
  LandingNav,
  useLandingLang,
} from "./LandingChrome";
import { LandingStory } from "./LandingStory";

const FEATURE_ICONS = [Wallet, Shield, MessageCircle, FileText, Users, Languages] as const;

function waHref(prefill: string) {
  return `https://wa.me/919967966631?text=${encodeURIComponent(prefill)}`;
}

function Reveal({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting) {
          el.classList.add("is-in");
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`lp-reveal ${className}`.trim()}>
      {children}
    </div>
  );
}

export function LandingPage() {
  const { user } = useStore();
  const nav = useNavigate();
  const { lang, t, langOpen, pendingLang, setPendingLang, applyLang, openLang } = useLandingLang();
  const [openFaq, setOpenFaq] = useState(0);
  const enquire = waHref(t.waPrefill);

  useEffect(() => {
    document.title = t.metaTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.metaDescription);
    document.documentElement.lang = lang === "en" ? "en" : lang;
  }, [t, lang]);

  useEffect(() => {
    trackMetaPageView();
    recordLandingVisit(window.location.pathname || "/");
  }, []);

  function goAuth() {
    nav(user ? "/" : "/login");
  }

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

      <main id="top">
        <section className="lp-hero">
          <div className="lp-hero-arcs" aria-hidden>
            <span className="lp-arc lp-arc-a" />
            <span className="lp-arc lp-arc-b" />
            <span className="lp-arc lp-arc-c" />
          </div>

          <div className="lp-hero-inner">
            <p className="lp-badge">
              <span>{t.heroTrust}</span>
            </p>

            <h1>
              {t.heroTitle} <em>{t.heroTitleAccent}</em>
            </h1>
            <p className="lp-lead">{t.heroSub}</p>

            <div className="lp-actions">
              <button type="button" className="lp-btn lp-btn-primary lp-btn-glow" onClick={goAuth}>
                {t.heroCta}
                <span className="lp-btn-arrow" aria-hidden>
                  <ArrowRight size={14} />
                </span>
              </button>
              <a className="lp-btn lp-btn-wa" href={enquire} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} />
                {t.waEnquire}
              </a>
            </div>
            <p className="lp-wa-note">WhatsApp · 99679 66631</p>
          </div>
        </section>

        <section className="lp-section" id="problem">
          <Reveal className="lp-section-head">
            <p className="lp-pill">
              <span className="lp-pill-dot" />
              {t.problemEyebrow}
            </p>
            <h2>{t.problemTitle}</h2>
            <p>{t.problemSub}</p>
          </Reveal>
          <div className="lp-problems">
            {t.problems.map((item, index) => (
              <Reveal key={item.title} className="lp-problem">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Reveal>
            ))}
          </div>
          <Reveal className="lp-promise">
            <p>{t.promise}</p>
          </Reveal>
        </section>

        <section className="lp-section" id="admins">
          <Reveal className="lp-section-head">
            <p className="lp-pill">
              <span className="lp-pill-dot lp-pill-dot-blue" />
              {t.demosEyebrow}
            </p>
            <h2>{t.demosTitle}</h2>
            <p>{t.demosSub}</p>
          </Reveal>
          <div className="lp-admin-grid">
            <ol className="lp-how lp-how-compact">
              {t.howSteps.map((step, index) => (
                <li key={step.title}>
                  <span className="lp-how-num">{String(index + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              ))}
            </ol>
            <LandingStory screens={t.storyScreens} tapLabel={t.storyTap} />
          </div>
        </section>

        <section className="lp-section" id="features">
          <Reveal className="lp-section-head">
            <p className="lp-pill">
              <span className="lp-pill-dot" />
              {t.toolsEyebrow}
            </p>
            <h2>{t.toolsTitle}</h2>
            <p>{t.toolsSub}</p>
          </Reveal>
          <div className="lp-admin-tools">
            {t.tools.map((item, index) => {
              const Icon = FEATURE_ICONS[index] ?? Wallet;
              return (
                <Reveal key={item.title} className="lp-admin-tool">
                  <span className="lp-bento-icon">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        <section className="lp-section" id="styles">
          <Reveal className="lp-section-head">
            <p className="lp-pill">
              <span className="lp-pill-dot" />
              {t.typesEyebrow}
            </p>
            <h2>{t.typesTitle}</h2>
            <p>{t.typesSub}</p>
          </Reveal>
          <div className="lp-styles">
            {t.types.map((item, index) => (
              <Reveal key={item.title} className="lp-style">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="lp-section" id="trust">
          <Reveal className="lp-section-head">
            <p className="lp-pill">
              <span className="lp-pill-dot lp-pill-dot-blue" />
              {t.compareEyebrow}
            </p>
            <h2>{t.compareTitle}</h2>
            <p>{t.compareSub}</p>
          </Reveal>
          <div className="lp-trust-grid">
            <Reveal className="lp-trust-card">
              <h3>{t.compareBeforeTitle}</h3>
              <ul className="lp-trust-bad">
                {t.compareBefore.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Reveal>
            <Reveal className="lp-trust-card lp-trust-card-good">
              <h3>{t.compareAfterTitle}</h3>
              <ul className="lp-trust-good">
                {t.compareAfter.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>

        <section className="lp-section lp-stats-section">
          <Reveal className="lp-section-head">
            <p className="lp-pill">
              <span className="lp-pill-dot" />
              {t.forWhomEyebrow}
            </p>
            <h2>{t.forWhomTitle}</h2>
            <p>{t.forWhomSub}</p>
          </Reveal>
          <div className="lp-audience">
            {t.forWhom.map((item) => (
              <Reveal key={item.title} className="lp-audience-card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Reveal>
            ))}
          </div>
          <div className="lp-stats">
            {t.stats.map((item) => (
              <Reveal key={item.label} className="lp-stat">
                <strong>{item.value}</strong>
                <span>{item.label}</span>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="lp-section" id="faq">
          <div className="lp-faq-layout">
            <Reveal className="lp-section-head lp-section-head-left">
              <p className="lp-pill">
                <span className="lp-pill-dot" />
                {t.faqEyebrow}
              </p>
              <h2>{t.faqTitle}</h2>
              <p>{t.faqSub}</p>
            </Reveal>
            <div className="lp-faq-list">
              {t.faq.map((item, index) => (
                <details
                  key={item.q}
                  className="lp-faq-item"
                  open={openFaq === index}
                  onToggle={(e) => {
                    if ((e.target as HTMLDetailsElement).open) setOpenFaq(index);
                  }}
                >
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="lp-final">
          <Reveal>
            <img src="/brand/bhishi-mark-white.png?v=3" alt="" width={44} height={44} />
            <h2>{t.finalTitle}</h2>
            <p>{t.finalSub}</p>
            <div className="lp-actions lp-final-actions">
              <button type="button" className="lp-btn lp-btn-primary lp-btn-glow lp-btn-lg" onClick={goAuth}>
                {t.finalCta}
                <span className="lp-btn-arrow" aria-hidden>
                  <ArrowRight size={14} />
                </span>
              </button>
              <a className="lp-btn lp-btn-wa lp-btn-lg" href={enquire} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={16} />
                {t.waEnquire}
              </a>
            </div>
          </Reveal>
        </section>
      </main>

      <a className="lp-wa-float" href={enquire} target="_blank" rel="noopener noreferrer">
        <MessageCircle size={18} />
        <span>{t.waEnquire}</span>
      </a>

      <LandingFooter t={t} />
    </div>
  );
}
