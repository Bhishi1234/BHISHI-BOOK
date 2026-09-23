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
  wheel: "/landing/shot-lucky-wheel.jpg",
} as const;

const HERO_FRAMES = [SHOTS.home, SHOTS.detail, SHOTS.collect] as const;
const TYPE_FRAMES = [SHOTS.auction, SHOTS.fixed, SHOTS.wheel, SHOTS.sacrifice, SHOTS.loan] as const;
const WHEEL_NAMES = ["Anita", "Ravi", "Sneha", "Priya", "Karan"] as const;
const WHEEL_COLORS = ["#2f6fed", "#0f9f6e", "#0d9488", "#4f46e5", "#0284c8"] as const;

function Media({
  frames,
  active,
  className = "",
  alt = "",
}: {
  frames: readonly string[];
  active: number;
  className?: string;
  alt?: string;
}) {
  return (
    <div className={`lp-media ${className}`.trim()}>
      {frames.map((src, i) => (
        <img
          key={src}
          src={src}
          alt={i === active ? alt : ""}
          className={i === active ? "on" : ""}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}
    </div>
  );
}

function Phone({
  frames,
  active,
  size = "md",
  alt = "",
  className = "",
}: {
  frames: readonly string[];
  active: number;
  size?: "sm" | "md" | "lg";
  alt?: string;
  className?: string;
}) {
  return (
    <div className={`lp-phone lp-phone-${size} ${className}`.trim()}>
      <div className="lp-phone-speaker" aria-hidden />
      <Media frames={frames} active={active} alt={alt} />
    </div>
  );
}

function LuckyWheel({ winnerLabel }: { winnerLabel: string }) {
  const [phase, setPhase] = useState<"idle" | "spin" | "win">("idle");
  const [rotation, setRotation] = useState(0);
  const [winner, setWinner] = useState(0);

  useEffect(() => {
    let spinTimer: number;
    let winTimer: number;
    let resetTimer: number;

    const loop = () => {
      setPhase("idle");
      setWinner(0);
      winTimer = window.setTimeout(() => {
        const idx = Math.floor(Math.random() * WHEEL_NAMES.length);
        const seg = 360 / WHEEL_NAMES.length;
        const land = 360 * 5 + (360 - (idx + 0.5) * seg);
        setWinner(idx);
        setPhase("spin");
        setRotation((r) => r + land);
        spinTimer = window.setTimeout(() => {
          setPhase("win");
          resetTimer = window.setTimeout(loop, 3200);
        }, 4200);
      }, 900);
    };
    loop();
    return () => {
      window.clearTimeout(spinTimer);
      window.clearTimeout(winTimer);
      window.clearTimeout(resetTimer);
    };
  }, []);

  const conic = WHEEL_COLORS.map((c, i) => {
    const a = 360 / WHEEL_COLORS.length;
    return `${c} ${i * a}deg ${(i + 1) * a}deg`;
  }).join(", ");

  return (
    <div className="lp-wheel-wrap">
      <div className="lp-wheel-pointer" aria-hidden />
      <div
        className={`lp-wheel${phase === "spin" ? " spinning" : ""}`}
        style={{
          background: `conic-gradient(from 0deg, ${conic})`,
          transform: `rotate(${rotation}deg)`,
        }}
      >
        {WHEEL_NAMES.map((name, i) => {
          const a = 360 / WHEEL_NAMES.length;
          return (
            <span
              key={name}
              className="lp-wheel-label"
              style={{ transform: `rotate(${i * a + a / 2}deg) translateY(-78px)` }}
            >
              {name}
            </span>
          );
        })}
        <div className="lp-wheel-hub">BC</div>
      </div>
      <div className={`lp-wheel-result${phase === "win" ? " show" : ""}`}>
        <em>{winnerLabel}</em>
        <strong>{WHEEL_NAMES[winner]}</strong>
      </div>
    </div>
  );
}

export function LandingPage() {
  const { user } = useStore();
  const nav = useNavigate();
  const [lang, setLang] = useState<GuestLang>(() => getGuestLang());
  const [langOpen, setLangOpen] = useState(() => !hasChosenGuestLang());
  const [pendingLang, setPendingLang] = useState<GuestLang>(() => getGuestLang());
  const [heroIdx, setHeroIdx] = useState(0);
  const [flowIdx, setFlowIdx] = useState(0);
  const [typeIdx, setTypeIdx] = useState(0);
  const t = useMemo(() => landingCopy(lang), [lang]);

  useEffect(() => {
    document.title = t.metaTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.metaDescription);
    document.documentElement.lang = lang === "en" ? "en" : lang;
  }, [t, lang]);

  useEffect(() => {
    const a = window.setInterval(() => setHeroIdx((i) => (i + 1) % HERO_FRAMES.length), 4000);
    const b = window.setInterval(() => setFlowIdx((i) => (i + 1) % 3), 4800);
    const c = window.setInterval(() => setTypeIdx((i) => (i + 1) % TYPE_FRAMES.length), 4200);
    return () => {
      window.clearInterval(a);
      window.clearInterval(b);
      window.clearInterval(c);
    };
  }, []);

  function applyLang(next: GuestLang) {
    setGuestLang(next);
    setLang(next);
    setLangOpen(false);
  }

  function goAuth() {
    nav(user ? "/" : "/login");
  }

  const flowShots = [
    [SHOTS.create, SHOTS.createTerms],
    [SHOTS.collect, SHOTS.people],
    [SHOTS.detail, SHOTS.home],
  ] as const;

  return (
    <div className="lp">
      {langOpen && (
        <div className="lp-lang-back" role="dialog" aria-modal="true" aria-labelledby="lp-lang-title">
          <div className="lp-lang-modal">
            <img src="/brand/bhishi-circle-logo.png?v=3" alt="Bhishi Circle" width={120} height={90} />
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
            <button type="button" className="lp-btn lp-btn-primary lp-btn-wide" onClick={() => applyLang(pendingLang)}>
              {t.langContinue}
            </button>
          </div>
        </div>
      )}

      <header className="lp-nav">
        <a className="lp-brand" href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
          <img src="/brand/bhishi-mark.png?v=3" alt="" width={28} height={28} />
          <strong>BhishiCircle</strong>
        </a>
        <nav className="lp-nav-links">
          <a href="#product">{t.navHow}</a>
          <a href="#types">{t.navTypes}</a>
          <a href="#features">{t.navFeatures}</a>
        </nav>
        <div className="lp-nav-actions">
          <button type="button" className="lp-lang-chip" onClick={() => { setPendingLang(lang); setLangOpen(true); }}>
            <Languages size={14} />
            {lang === "hi" ? "हि" : lang === "mr" ? "मर" : "EN"}
          </button>
          {user ? (
            <Link className="lp-btn lp-btn-primary" to="/">{t.navOpenApp}</Link>
          ) : (
            <>
              <Link className="lp-btn lp-btn-ghost" to="/login">{t.navLogin}</Link>
              <Link className="lp-btn lp-btn-primary" to="/login">{t.navStart}</Link>
            </>
          )}
        </div>
      </header>

      <main id="top">
        {/* HERO */}
        <section className="lp-hero">
          <div className="lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-kicker">{t.heroEyebrow}</p>
              <h1>
                {t.heroTitle} <em>{t.heroTitleAccent}</em>
              </h1>
              <p className="lp-lead">{t.heroSub}</p>
              <div className="lp-actions">
                <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={goAuth}>
                  {t.heroCta} <ArrowRight size={18} />
                </button>
                <a className="lp-btn lp-btn-outline lp-btn-lg" href="#product">{t.heroSecondary}</a>
              </div>
              <p className="lp-meta">{t.heroTrust}</p>
            </div>
            <div className="lp-hero-visual">
              <Phone frames={HERO_FRAMES} active={heroIdx} size="lg" alt="Bhishi Circle home" className="lp-phone-main" />
              <div className="lp-chip lp-chip-a"><Wallet size={14} /> {t.demoCollect}</div>
              <div className="lp-chip lp-chip-b"><FileText size={14} /> PDF</div>
            </div>
          </div>
          <div className="lp-hero-wash" aria-hidden />
        </section>

        <section className="lp-strip">
          <p>{t.trustLabel}</p>
          <div className="lp-strip-grid">
            {t.stats.map((s) => (
              <div key={s.label}><strong>{s.value}</strong><span>{s.label}</span></div>
            ))}
          </div>
        </section>

        {/* PRODUCT — clean media panels, no phone-in-card */}
        <section className="lp-block" id="product">
          <div className="lp-block-head">
            <p className="lp-kicker lp-kicker-blue">{t.demoEyebrow}</p>
            <h2>{t.demoTitle}</h2>
            <p>{t.demoSub}</p>
          </div>
          <div className="lp-showcase">
            <figure className="lp-shot lp-shot-tall">
              <Media frames={[SHOTS.home, SHOTS.detail]} active={heroIdx % 2} alt="Dashboard" />
            </figure>
            <figure className="lp-shot">
              <Media frames={[SHOTS.collect]} active={0} alt="Collections" />
              <figcaption>
                <strong>{t.demoCards[1]!.title}</strong>
                <span>{t.demoCards[1]!.body}</span>
              </figcaption>
            </figure>
            <figure className="lp-shot">
              <Media frames={[SHOTS.people, SHOTS.create]} active={flowIdx % 2} alt="People" />
              <figcaption>
                <strong>{t.demoCards[2]!.title}</strong>
                <span>{t.demoCards[2]!.body}</span>
              </figcaption>
            </figure>
          </div>
        </section>

        {/* WORKFLOW — phone free, no glass card */}
        <section className="lp-workflow" id="flow">
          {t.flowItems.map((item, i) => (
            <div key={item.title} className={`lp-workflow-row${i % 2 ? " flip" : ""}`}>
              <div className="lp-workflow-copy">
                <span className="lp-step">{String(i + 1).padStart(2, "0")}</span>
                <h2>{item.title}</h2>
                <p>{item.body}</p>
                <ul>
                  {item.points.map((p) => (
                    <li key={p}><Check size={15} /> {p}</li>
                  ))}
                </ul>
              </div>
              <div className="lp-workflow-media">
                <Phone
                  frames={flowShots[i]!}
                  active={flowIdx % 2}
                  size="md"
                  alt={item.title}
                  className={i === flowIdx ? "lp-phone-active" : ""}
                />
              </div>
            </div>
          ))}
        </section>

        {/* TYPES */}
        <section className="lp-block" id="types">
          <div className="lp-block-head">
            <p className="lp-kicker lp-kicker-blue">{t.typesEyebrow}</p>
            <h2>{t.typesTitle}</h2>
            <p>{t.typesSub}</p>
          </div>
          <div className="lp-types">
            <div className="lp-types-nav" role="tablist">
              {t.types.map((ty, i) => (
                <button
                  key={ty.title}
                  type="button"
                  role="tab"
                  aria-selected={typeIdx === i}
                  className={typeIdx === i ? "on" : ""}
                  onClick={() => setTypeIdx(i)}
                >
                  {ty.title}
                </button>
              ))}
            </div>
            <div className="lp-types-panel">
              <div className="lp-types-copy">
                <h3>{t.types[typeIdx]!.title}</h3>
                <p>{t.types[typeIdx]!.body}</p>
                <ul>
                  {t.types[typeIdx]!.points.map((p) => (
                    <li key={p}><Check size={14} /> {p}</li>
                  ))}
                </ul>
              </div>
              <Phone frames={TYPE_FRAMES} active={typeIdx} size="md" alt={t.types[typeIdx]!.title} />
            </div>
          </div>
        </section>

        {/* LUCKY DRAW — live wheel */}
        <section className="lp-lucky" id="lucky">
          <div className="lp-lucky-copy">
            <p className="lp-kicker lp-kicker-blue">{t.luckyEyebrow}</p>
            <h2>{t.luckyTitle}</h2>
            <p>{t.luckySub}</p>
            <ul>
              {t.luckyPoints.map((p) => (
                <li key={p}><Check size={15} /> {p}</li>
              ))}
            </ul>
            <button type="button" className="lp-btn lp-btn-primary" onClick={goAuth}>
              {t.luckyCta} <ArrowRight size={16} />
            </button>
          </div>
          <LuckyWheel winnerLabel={lang === "hi" ? "विजेता" : lang === "mr" ? "विजेता" : "Winner"} />
        </section>

        {/* FEATURES */}
        <section className="lp-block" id="features">
          <div className="lp-block-head">
            <p className="lp-kicker lp-kicker-blue">{t.toolsEyebrow}</p>
            <h2>{t.toolsTitle}</h2>
            <p>{t.toolsSub}</p>
          </div>
          <div className="lp-feats">
            {t.tools.map((f, i) => {
              const Icon = [Wallet, MessageCircle, FileText, Languages, Users, Shield][i] || Sparkles;
              return (
                <article key={f.title}>
                  <span><Icon size={18} /></span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="lp-cta">
          <img src="/brand/bhishi-mark-white.png?v=3" alt="" width={44} height={44} />
          <h2>{t.finalTitle}</h2>
          <p>{t.finalSub}</p>
          <button type="button" className="lp-btn lp-btn-yellow lp-btn-lg" onClick={goAuth}>
            {t.finalCta} <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <footer className="lp-foot">
        <div>
          <img src="/brand/bhishi-mark.png?v=3" alt="" width={26} height={26} />
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
