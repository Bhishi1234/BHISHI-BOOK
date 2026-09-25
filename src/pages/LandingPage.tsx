import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  FileText,
  Languages,
  MessageCircle,
  Shield,
  Sparkles,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useStore } from "../store";
import {
  LangModal,
  LandingFooter,
  LandingNav,
  useLandingLang,
} from "./LandingChrome";

const BASE = "/landing/demos";

/** Keep only two real app recordings on the landing. */
const DEMOS = [
  {
    id: "create",
    webm: `${BASE}/01-how-to-create-bhishi.webm`,
    mp4: `${BASE}/01-how-to-create-bhishi.mp4`,
    poster: `${BASE}/01-how-to-create-bhishi.png`,
  },
  {
    id: "award",
    webm: `${BASE}/02-how-to-award-bhishi.webm`,
    mp4: `${BASE}/02-how-to-award-bhishi.mp4`,
    poster: `${BASE}/02-how-to-award-bhishi.png`,
  },
] as const;

const FEATURE_ICONS = [Wallet, MessageCircle, FileText, Languages, Users, Shield] as const;

function DemoPhone({
  webm,
  mp4,
  poster,
  alt,
  priority = false,
}: {
  webm: string;
  mp4: string;
  poster: string;
  alt: string;
  priority?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const el = wrapRef.current;
    const vid = ref.current;
    if (!el || !vid) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
          void vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      },
      { threshold: [0, 0.3, 0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={`lp-phone ${ready ? "is-ready" : ""}`}>
      <div className="lp-phone-chrome" aria-hidden>
        <span className="lp-phone-island" />
      </div>
      <video
        ref={ref}
        className="lp-phone-video"
        poster={poster}
        muted
        loop
        playsInline
        preload={priority ? "auto" : "metadata"}
        aria-label={alt}
        onLoadedData={() => setReady(true)}
      >
        <source src={webm} type="video/webm" />
        <source src={mp4} type="video/mp4" />
      </video>
    </div>
  );
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

  useEffect(() => {
    document.title = t.metaTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.metaDescription);
    document.documentElement.lang = lang === "en" ? "en" : lang;
  }, [t, lang]);

  function goAuth() {
    nav(user ? "/" : "/login");
  }

  const createDemo = DEMOS[0]!;
  const awardDemo = DEMOS[1]!;
  const createCopy = t.demos[0]!;
  const awardCopy = t.demos[1]!;

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
        {/* —— Hero —— */}
        <section className="lp-hero">
          <div className="lp-hero-arcs" aria-hidden>
            <span className="lp-arc lp-arc-a" />
            <span className="lp-arc lp-arc-b" />
            <span className="lp-arc lp-arc-c" />
          </div>

          <div className="lp-floaters" aria-hidden>
            <span className="lp-floater lp-floater-1">
              <Wallet size={22} />
            </span>
            <span className="lp-floater lp-floater-2">
              <Users size={20} />
            </span>
            <span className="lp-floater lp-floater-3">
              <FileText size={20} />
            </span>
            <span className="lp-floater lp-floater-4">
              <Sparkles size={18} />
            </span>
            <span className="lp-floater lp-floater-5">
              <MessageCircle size={18} />
            </span>
          </div>

          <div className="lp-hero-inner">
            <button type="button" className="lp-badge" onClick={goAuth}>
              <Zap size={14} />
              <span>{t.heroTrust}</span>
              <ArrowRight size={14} />
            </button>

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
              <a className="lp-btn lp-btn-secondary" href="#how">
                {t.heroSecondary}
              </a>
            </div>

            <p className="lp-trust-line">{t.trustLabel}</p>
            <div className="lp-trust-pills" aria-hidden>
              {t.types.map((ty) => (
                <span key={ty.title}>{ty.title}</span>
              ))}
            </div>
          </div>
        </section>

        {/* —— Core features (bento) —— */}
        <section className="lp-section" id="features">
          <Reveal className="lp-section-head">
            <p className="lp-pill">
              <span className="lp-pill-dot" />
              {t.toolsEyebrow}
            </p>
            <h2>{t.toolsTitle}</h2>
            <p>{t.toolsSub}</p>
          </Reveal>

          <div className="lp-bento">
            {t.tools.map((f, i) => {
              const Icon = FEATURE_ICONS[i] ?? Sparkles;
              return (
                <Reveal key={f.title} className={`lp-bento-card lp-bento-${i + 1}`}>
                  <div className="lp-bento-art" aria-hidden>
                    <span className="lp-bento-glow" />
                    <span className="lp-bento-icon">
                      <Icon size={28} />
                    </span>
                    {i === 0 && (
                      <div className="lp-mini-bars">
                        <i style={{ height: "42%" }} />
                        <i style={{ height: "68%" }} />
                        <i style={{ height: "54%" }} />
                        <i style={{ height: "88%" }} />
                        <i style={{ height: "62%" }} />
                      </div>
                    )}
                    {i === 1 && (
                      <div className="lp-mini-chat">
                        <span />
                        <span />
                        <span />
                      </div>
                    )}
                    {i === 2 && (
                      <div className="lp-mini-doc">
                        <em />
                        <em />
                        <em />
                      </div>
                    )}
                  </div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* —— Platform preview: 2 app demos max —— */}
        <section className="lp-section" id="preview">
          <Reveal className="lp-section-head">
            <p className="lp-pill">
              <span className="lp-pill-dot" />
              {t.demosEyebrow}
            </p>
            <h2>{t.demosTitle}</h2>
            <p>{t.demosSub}</p>
          </Reveal>

          <div className="lp-preview-grid">
            <Reveal className="lp-preview-card">
              <div className="lp-preview-copy">
                <span className="lp-step">01</span>
                <h3>{createCopy.title}</h3>
                <p>{createCopy.body}</p>
                <ul>
                  {createCopy.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="lp-preview-stage">
                <DemoPhone
                  webm={createDemo.webm}
                  mp4={createDemo.mp4}
                  poster={createDemo.poster}
                  alt={createCopy.title}
                  priority
                />
              </div>
            </Reveal>

            <Reveal className="lp-preview-card lp-preview-card-alt">
              <div className="lp-preview-copy">
                <span className="lp-step">02</span>
                <h3>{awardCopy.title}</h3>
                <p>{awardCopy.body}</p>
                <ul>
                  {awardCopy.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div className="lp-preview-stage">
                <DemoPhone
                  webm={awardDemo.webm}
                  mp4={awardDemo.mp4}
                  poster={awardDemo.poster}
                  alt={awardCopy.title}
                />
              </div>
            </Reveal>
          </div>
        </section>

        {/* —— Trust / security —— */}
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

        {/* —— How it works —— */}
        <section className="lp-section" id="how">
          <Reveal className="lp-section-head">
            <p className="lp-pill">
              <span className="lp-pill-dot" />
              {t.howEyebrow}
            </p>
            <h2>{t.howTitle}</h2>
            <p>{t.howSub}</p>
          </Reveal>

          <ol className="lp-how">
            {t.howSteps.map((step, i) => (
              <Reveal key={step.title} className="lp-how-card">
                <li>
                  <span className="lp-how-num">{String(i + 1).padStart(2, "0")}</span>
                  <h3>{step.title}</h3>
                  <p>{step.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* —— Stats —— */}
        <section className="lp-section lp-stats-section" aria-label={t.trustLabel}>
          <Reveal className="lp-section-head">
            <p className="lp-pill">
              <span className="lp-pill-dot lp-pill-dot-blue" />
              {t.forWhomEyebrow}
            </p>
            <h2>{t.forWhomTitle}</h2>
            <p>{t.forWhomSub}</p>
          </Reveal>

          <div className="lp-stats">
            {t.stats.map((s) => (
              <Reveal key={s.label} className="lp-stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </Reveal>
            ))}
          </div>

          <div className="lp-audience">
            {t.forWhom.map((item) => (
              <Reveal key={item.title} className="lp-audience-card">
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* —— FAQ —— */}
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
              {t.faq.map((item, i) => (
                <details
                  key={item.q}
                  className="lp-faq-item"
                  open={openFaq === i}
                  onToggle={(e) => {
                    if ((e.target as HTMLDetailsElement).open) setOpenFaq(i);
                  }}
                >
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* —— Final CTA —— */}
        <section className="lp-final">
          <Reveal>
            <img src="/brand/bhishi-mark-white.png?v=3" alt="" width={44} height={44} />
            <h2>{t.finalTitle}</h2>
            <p>{t.finalSub}</p>
            <button type="button" className="lp-btn lp-btn-primary lp-btn-glow lp-btn-lg" onClick={goAuth}>
              {t.finalCta}
              <span className="lp-btn-arrow" aria-hidden>
                <ArrowRight size={14} />
              </span>
            </button>
            <p className="lp-final-note">{t.heroTrust}</p>
          </Reveal>
        </section>
      </main>

      <LandingFooter t={t} />
    </div>
  );
}
