import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FileText,
  Languages,
  MessageCircle,
  Shield,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { landingCopy } from "../i18n/landing";
import { getGuestLang, hasChosenGuestLang, setGuestLang, type GuestLang } from "../lib/uiLang";
import { useStore } from "../store";
import "../landing.css";

const SHOTS = {
  home: "/landing/shot-home.jpg",
  detail: "/landing/shot-bhishi-detail.jpg",
  create: "/landing/shot-create.jpg",
  createTerms: "/landing/shot-create-terms.jpg",
  collect: "/landing/shot-collect.jpg",
  people: "/landing/shot-people.jpg",
  auction: "/landing/shot-type-auction.jpg",
  fixed: "/landing/shot-type-fixed.jpg",
  loan: "/landing/shot-type-loan.jpg",
  sacrifice: "/landing/shot-type-sacrifice.jpg",
  lucky: "/landing/shot-type-lucky.jpg",
  luckyMembers: "/landing/shot-type-lucky-members.jpg",
  wheel: "/landing/shot-lucky-wheel.jpg",
  spinning: "/landing/shot-lucky-spinning.jpg",
} as const;

const HERO_CYCLE = [SHOTS.home, SHOTS.detail, SHOTS.collect, SHOTS.wheel] as const;
const FLOW_SHOTS = [SHOTS.create, SHOTS.collect, SHOTS.detail] as const;
const TYPE_SHOTS = [SHOTS.auction, SHOTS.fixed, SHOTS.wheel, SHOTS.sacrifice, SHOTS.loan] as const;

export function LandingPage() {
  const { user } = useStore();
  const nav = useNavigate();
  const [lang, setLang] = useState<GuestLang>(() => getGuestLang());
  const [langOpen, setLangOpen] = useState(() => !hasChosenGuestLang());
  const [pendingLang, setPendingLang] = useState<GuestLang>(() => getGuestLang());
  const [heroIdx, setHeroIdx] = useState(0);
  const [flowIdx, setFlowIdx] = useState(0);
  const [typeIdx, setTypeIdx] = useState(0);
  const [wheelPulse, setWheelPulse] = useState(false);
  const t = useMemo(() => landingCopy(lang), [lang]);

  useEffect(() => {
    document.title = t.metaTitle;
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", t.metaDescription);
    document.documentElement.lang = lang === "en" ? "en" : lang;
    let ld = document.getElementById("lp-jsonld");
    if (!ld) {
      ld = document.createElement("script");
      ld.id = "lp-jsonld";
      (ld as HTMLScriptElement).type = "application/ld+json";
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Bhishi Circle",
      applicationCategory: "FinanceApplication",
      operatingSystem: "Web, Android",
      description: t.metaDescription,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      inLanguage: ["en", "hi", "mr"],
    });
  }, [t, lang]);

  useEffect(() => {
    const id = window.setInterval(() => setHeroIdx((i) => (i + 1) % HERO_CYCLE.length), 3200);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setFlowIdx((i) => (i + 1) % FLOW_SHOTS.length), 4000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setTypeIdx((i) => (i + 1) % TYPE_SHOTS.length);
      setWheelPulse((p) => !p);
    }, 3800);
    return () => window.clearInterval(id);
  }, []);

  function applyLang(next: GuestLang) {
    setGuestLang(next);
    setLang(next);
    setLangOpen(false);
  }

  function goAuth() {
    nav(user ? "/" : "/login");
  }

  const heroLabels = [t.demoCreate, t.demoAward, t.demoCollect, t.types[2]!.title];

  return (
    <div className="fx">
      {langOpen && (
        <div className="fx-lang-back" role="dialog" aria-modal="true" aria-labelledby="fx-lang-title">
          <div className="fx-lang-modal">
            <img src="/brand/bhishi-circle-logo.png?v=3" alt="Bhishi Circle" width={120} height={90} />
            <h2 id="fx-lang-title">{t.langTitle}</h2>
            <p>{t.langHint}</p>
            <div className="fx-lang-opts">
              {([["en", t.langEn], ["hi", t.langHi], ["mr", t.langMr]] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  className={`fx-lang-opt${pendingLang === id ? " on" : ""}`}
                  onClick={() => setPendingLang(id)}
                >
                  <Languages size={18} /> {label}
                </button>
              ))}
            </div>
            <button type="button" className="fx-btn fx-btn-primary fx-btn-wide" onClick={() => applyLang(pendingLang)}>
              {t.langContinue}
            </button>
          </div>
        </div>
      )}

      <header className="fx-nav">
        <a className="fx-brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <img src="/brand/bhishi-mark.png?v=3" alt="" width={30} height={30} />
          <strong>BhishiCircle</strong>
        </a>
        <nav className="fx-nav-links" aria-label="Primary">
          <a href="#demo">{t.navHow}</a>
          <a href="#types">{t.navTypes}</a>
          <a href="#features">{t.navFeatures}</a>
        </nav>
        <div className="fx-nav-actions">
          <button type="button" className="fx-lang-chip" onClick={() => { setPendingLang(lang); setLangOpen(true); }}>
            <Languages size={14} />
            {lang === "hi" ? "हि" : lang === "mr" ? "मर" : "EN"}
          </button>
          {user ? (
            <Link className="fx-btn fx-btn-primary" to="/">{t.navOpenApp}</Link>
          ) : (
            <>
              <Link className="fx-btn fx-btn-ghost" to="/login">{t.navLogin}</Link>
              <Link className="fx-btn fx-btn-primary" to="/login">{t.navStart}</Link>
            </>
          )}
        </div>
      </header>

      <main id="top">
        {/* HERO — Flexfye-style full-bleed */}
        <section className="fx-hero">
          <div className="fx-hero-glow" aria-hidden />
          <div className="fx-hero-inner">
            <div className="fx-hero-copy">
              <p className="fx-pill">{t.heroEyebrow}</p>
              <h1>
                {t.heroTitle} <span>{t.heroTitleAccent}</span>
              </h1>
              <p className="fx-lead">{t.heroSub}</p>
              <div className="fx-cta-row">
                <button type="button" className="fx-btn fx-btn-primary fx-btn-lg" onClick={goAuth}>
                  {t.heroCta} <ArrowRight size={18} />
                </button>
                <a className="fx-btn fx-btn-ghost fx-btn-lg" href="#demo">{t.heroSecondary}</a>
              </div>
              <p className="fx-trust-line">{t.heroTrust}</p>
            </div>
            <div className="fx-hero-stage">
              <div className="fx-phone fx-phone-float">
                <div className="fx-phone-bezel">
                  <img key={HERO_CYCLE[heroIdx]} src={HERO_CYCLE[heroIdx]} alt="" className="fx-phone-img fx-fade" />
                </div>
                <div className="fx-phone-tabs" aria-hidden>
                  {heroLabels.map((lab, i) => (
                    <span key={lab} className={i === heroIdx ? "on" : ""}>{lab}</span>
                  ))}
                </div>
              </div>
              <div className="fx-float-card fx-float-a" aria-hidden>
                <Wallet size={16} /> {t.demoCollect}
              </div>
              <div className="fx-float-card fx-float-b" aria-hidden>
                <FileText size={16} /> PDF
              </div>
            </div>
          </div>
        </section>

        <section className="fx-trust">
          <p>{t.trustLabel}</p>
          <div className="fx-trust-stats">
            {t.stats.map((s) => (
              <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>
            ))}
          </div>
        </section>

        {/* PRODUCT DEMO */}
        <section className="fx-section" id="demo">
          <p className="fx-eyebrow">{t.demoEyebrow}</p>
          <h2 className="fx-h2">{t.demoTitle}</h2>
          <p className="fx-sub">{t.demoSub}</p>
          <div className="fx-demo-grid">
            <div className="fx-demo-main">
              <img src={SHOTS.home} alt="Bhishi Circle home" />
            </div>
            <div className="fx-demo-side">
              {t.demoCards.map((c, i) => (
                <article key={c.title} className="fx-card fx-card-rise" style={{ animationDelay: `${i * 0.08}s` }}>
                  <span className="fx-card-ico"><Sparkles size={16} /></span>
                  <h3>{c.title}</h3>
                  <p>{c.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* WORKFLOW — matched screenshots */}
        <section className="fx-band" id="flow">
          <div className="fx-band-inner">
            <p className="fx-eyebrow fx-eyebrow-light">{t.flowEyebrow}</p>
            <h2 className="fx-h2 fx-h2-light">{t.flowTitle}</h2>
            <p className="fx-sub fx-sub-light">{t.flowSub}</p>
            <div className="fx-flow">
              <div className="fx-flow-list">
                {t.flowItems.map((item, i) => (
                  <button
                    key={item.title}
                    type="button"
                    className={`fx-flow-item${flowIdx === i ? " on" : ""}`}
                    onClick={() => setFlowIdx(i)}
                  >
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <strong>{item.title}</strong>
                      {flowIdx === i && (
                        <>
                          <p>{item.body}</p>
                          <ul>
                            {item.points.map((p) => (
                              <li key={p}><Check size={14} /> {p}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="fx-phone fx-phone-static">
                <div className="fx-phone-bezel">
                  <img key={FLOW_SHOTS[flowIdx]} src={FLOW_SHOTS[flowIdx]} alt="" className="fx-phone-img fx-fade" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BHISHI TYPES */}
        <section className="fx-section" id="types">
          <p className="fx-eyebrow">{t.typesEyebrow}</p>
          <h2 className="fx-h2">{t.typesTitle}</h2>
          <p className="fx-sub">{t.typesSub}</p>
          <div className="fx-types-layout">
            <div className="fx-types-list">
              {t.types.map((ty, i) => (
                <button
                  key={ty.title}
                  type="button"
                  className={`fx-type-row${typeIdx === i ? " on" : ""}`}
                  onClick={() => setTypeIdx(i)}
                >
                  <strong>{ty.title}</strong>
                  {typeIdx === i && (
                    <>
                      <p>{ty.body}</p>
                      <ul>
                        {ty.points.map((p) => (
                          <li key={p}><Check size={13} /> {p}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </button>
              ))}
            </div>
            <div className="fx-type-visual">
              <div className="fx-phone fx-phone-static">
                <div className="fx-phone-bezel">
                  <img key={TYPE_SHOTS[typeIdx]} src={TYPE_SHOTS[typeIdx]} alt="" className="fx-phone-img fx-fade" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LUCKY DRAW SPOTLIGHT */}
        <section className="fx-lucky" id="lucky">
          <div className="fx-lucky-copy">
            <p className="fx-eyebrow">{t.luckyEyebrow}</p>
            <h2 className="fx-h2">{t.luckyTitle}</h2>
            <p className="fx-sub">{t.luckySub}</p>
            <ul className="fx-check">
              {t.luckyPoints.map((p) => (
                <li key={p}><Check size={16} /> {p}</li>
              ))}
            </ul>
            <button type="button" className="fx-btn fx-btn-primary fx-btn-lg" onClick={goAuth}>
              {t.luckyCta} <ArrowRight size={18} />
            </button>
          </div>
          <div className={`fx-lucky-frame${wheelPulse ? " pulse" : ""}`}>
            <img src={SHOTS.wheel} alt="Bhishi Circle lucky draw wheel" />
            <img className="fx-lucky-spin" src={SHOTS.spinning} alt="" aria-hidden />
          </div>
        </section>

        {/* FEATURES GRID */}
        <section className="fx-section" id="features">
          <p className="fx-eyebrow">{t.toolsEyebrow}</p>
          <h2 className="fx-h2">{t.toolsTitle}</h2>
          <p className="fx-sub">{t.toolsSub}</p>
          <div className="fx-tools">
            {t.tools.map((f, i) => {
              const Icon = [Wallet, MessageCircle, FileText, Languages, Users, Shield][i] || Sparkles;
              return (
                <article key={f.title} className="fx-tool">
                  <span className="fx-tool-ico"><Icon size={18} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* STATS */}
        <section className="fx-stats">
          <p className="fx-eyebrow fx-eyebrow-light">{t.statsEyebrow}</p>
          <h2 className="fx-h2 fx-h2-light">{t.statsTitle}</h2>
          <p className="fx-sub fx-sub-light">{t.statsSub}</p>
          <div className="fx-stats-grid">
            {t.stats.map((s) => (
              <div key={s.label} className="fx-stat">
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="fx-final">
          <img src="/brand/bhishi-mark-white.png?v=3" alt="" width={52} height={52} />
          <h2>{t.finalTitle}</h2>
          <p>{t.finalSub}</p>
          <button type="button" className="fx-btn fx-btn-yellow fx-btn-lg" onClick={goAuth}>
            {t.finalCta} <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <footer className="fx-footer">
        <div className="fx-footer-brand">
          <img src="/brand/bhishi-mark.png?v=3" alt="" width={28} height={28} />
          <div>
            <strong>Bhishi Circle</strong>
            <span>{t.footerTagline}</span>
          </div>
        </div>
        <p>{t.footerLegal}</p>
        <Link to="/login">{t.footerLogin}</Link>
      </footer>
    </div>
  );
}
