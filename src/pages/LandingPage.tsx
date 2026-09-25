import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { useStore } from "../store";
import {
  LangModal,
  LandingFooter,
  LandingNav,
  useLandingLang,
} from "./LandingChrome";

const BASE = "/landing/demos";

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
  {
    id: "payments",
    webm: `${BASE}/03-how-to-record-payments.webm`,
    mp4: `${BASE}/03-how-to-record-payments.mp4`,
    poster: `${BASE}/03-how-to-record-payments.png`,
  },
  {
    id: "reports",
    webm: `${BASE}/04-how-to-share-reports.webm`,
    mp4: `${BASE}/04-how-to-share-reports.mp4`,
    poster: `${BASE}/04-how-to-share-reports.png`,
  },
  {
    id: "members",
    webm: `${BASE}/05-how-to-see-members.webm`,
    mp4: `${BASE}/05-how-to-see-members.mp4`,
    poster: `${BASE}/05-how-to-see-members.png`,
  },
  {
    id: "collections",
    webm: `${BASE}/06-how-to-see-collections.webm`,
    mp4: `${BASE}/06-how-to-see-collections.mp4`,
    poster: `${BASE}/06-how-to-see-collections.png`,
  },
] as const;

const SHOTS = {
  auction: "/landing/shot-type-auction.jpg",
  fixed: "/landing/shot-type-fixed.jpg",
  loan: "/landing/shot-type-loan.jpg",
  sacrifice: "/landing/shot-type-sacrifice.jpg",
  wheel: "/landing/shot-lucky-wheel.jpg",
} as const;

const TYPE_FRAMES = [SHOTS.auction, SHOTS.fixed, SHOTS.wheel, SHOTS.sacrifice, SHOTS.loan] as const;
const WHEEL_NAMES = ["Anita", "Ravi", "Sneha", "Priya", "Karan"] as const;
const WHEEL_COLORS = ["#2f6fed", "#0d9488", "#0f9f6e", "#1e56d8", "#0284c8"] as const;

/** Freestanding phone video — assets already include device chrome. No card wrapper. */
function DemoPhone({
  webm,
  mp4,
  poster,
  alt,
  size = "md",
  className = "",
  priority = false,
}: {
  webm: string;
  mp4: string;
  poster: string;
  alt: string;
  size?: "sm" | "md" | "lg";
  className?: string;
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
        if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
          void vid.play().catch(() => {});
        } else {
          vid.pause();
        }
      },
      { threshold: [0, 0.35, 0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`lp-demo-phone-wrap lp-demo-phone-${size} ${ready ? "is-ready" : ""} ${className}`.trim()}
    >
      <div className="lp-demo-phone-chrome" aria-hidden>
        <span className="lp-demo-phone-island" />
      </div>
      <video
        ref={ref}
        className="lp-demo-video"
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
              style={{ transform: `rotate(${i * a + a / 2}deg) translateY(-68px)` }}
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
  const { lang, t, langOpen, pendingLang, setPendingLang, applyLang, openLang } = useLandingLang();
  const [typeIdx, setTypeIdx] = useState(0);
  const [activeDemo, setActiveDemo] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    document.title = t.metaTitle;
    document.querySelector('meta[name="description"]')?.setAttribute("content", t.metaDescription);
    document.documentElement.lang = lang === "en" ? "en" : lang;
  }, [t, lang]);

  useEffect(() => {
    const c = window.setInterval(() => setTypeIdx((i) => (i + 1) % TYPE_FRAMES.length), 4200);
    return () => window.clearInterval(c);
  }, []);

  useEffect(() => {
    const c = window.setInterval(() => setActiveDemo((i) => (i + 1) % DEMOS.length), 9000);
    return () => window.clearInterval(c);
  }, []);

  function goAuth() {
    nav(user ? "/" : "/login");
  }

  const heroDemo = DEMOS[1]!;
  const demos = t.demos;

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
          <div className="lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-brand-hero">
                <img src="/brand/bhishi-mark-white.png?v=3" alt="" width={36} height={36} />
                {t.heroBrand}
              </p>
              <h1>
                {t.heroTitle} <em>{t.heroTitleAccent}</em>
              </h1>
              <p className="lp-lead">{t.heroSub}</p>
              <div className="lp-actions">
                <button type="button" className="lp-btn lp-btn-primary lp-btn-lg" onClick={goAuth}>
                  {t.heroCta} <ArrowRight size={16} />
                </button>
                <a className="lp-btn lp-btn-outline lp-btn-lg" href="#demos">
                  {t.heroSecondary}
                </a>
              </div>
              <p className="lp-meta">{t.heroTrust}</p>
            </div>
            <div className="lp-hero-visual">
              <DemoPhone
                webm={heroDemo.webm}
                mp4={heroDemo.mp4}
                poster={heroDemo.poster}
                alt={demos[1]?.title ?? "Award bhishi"}
                size="lg"
                className="lp-phone-main"
                priority
              />
            </div>
          </div>
          <div className="lp-hero-wash" aria-hidden />
        </section>

        <section className="lp-strip" aria-label={t.trustLabel}>
          <p>{t.trustLabel}</p>
          <div className="lp-strip-grid">
            {t.stats.map((s) => (
              <div key={s.label}>
                <strong>{s.value}</strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="lp-block lp-demos-block" id="demos">
          <div className="lp-block-head lp-block-head-center">
            <p className="lp-kicker">{t.demosEyebrow}</p>
            <h2>{t.demosTitle}</h2>
            <p>{t.demosSub}</p>
          </div>

          <div className="lp-demo-tabs" role="tablist" aria-label={t.demosTitle}>
            {demos.map((d, i) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={activeDemo === i}
                className={activeDemo === i ? "on" : ""}
                onClick={() => setActiveDemo(i)}
              >
                <span className="lp-demo-tab-num">{String(i + 1).padStart(2, "0")}</span>
                <span>{d.short}</span>
              </button>
            ))}
          </div>

          <div className="lp-demo-stage">
            <div className="lp-demo-stage-copy">
              <span className="lp-step">{String(activeDemo + 1).padStart(2, "0")}</span>
              <h3>{demos[activeDemo]!.title}</h3>
              <p>{demos[activeDemo]!.body}</p>
              <ul>
                {demos[activeDemo]!.points.map((p) => (
                  <li key={p}>
                    <Check size={14} /> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="lp-demo-stage-phone" key={DEMOS[activeDemo]!.id}>
              <DemoPhone
                webm={DEMOS[activeDemo]!.webm}
                mp4={DEMOS[activeDemo]!.mp4}
                poster={DEMOS[activeDemo]!.poster}
                alt={demos[activeDemo]!.title}
                size="lg"
                priority
              />
            </div>
          </div>
        </section>

        <section className="lp-block" id="types">
          <div className="lp-block-head">
            <p className="lp-kicker">{t.typesEyebrow}</p>
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
                    <li key={p}>
                      <Check size={14} /> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <Phone frames={TYPE_FRAMES} active={typeIdx} size="md" alt={t.types[typeIdx]!.title} />
            </div>
          </div>
        </section>

        <section className="lp-lucky" id="lucky">
          <div className="lp-lucky-copy">
            <p className="lp-kicker">{t.luckyEyebrow}</p>
            <h2>{t.luckyTitle}</h2>
            <p>{t.luckySub}</p>
            <ul>
              {t.luckyPoints.map((p) => (
                <li key={p}>
                  <Check size={14} /> {p}
                </li>
              ))}
            </ul>
            <button type="button" className="lp-btn lp-btn-primary" onClick={goAuth}>
              {t.luckyCta} <ArrowRight size={14} />
            </button>
          </div>
          <div className="lp-lucky-duo">
            <LuckyWheel winnerLabel={lang === "hi" || lang === "mr" ? "विजेता" : "Winner"} />
            <DemoPhone
              webm={DEMOS[1]!.webm}
              mp4={DEMOS[1]!.mp4}
              poster={DEMOS[1]!.poster}
              alt={demos[1]!.title}
              size="sm"
              className="lp-lucky-phone"
            />
          </div>
        </section>

        <section className="lp-block" id="features">
          <div className="lp-block-head">
            <p className="lp-kicker">{t.toolsEyebrow}</p>
            <h2>{t.toolsTitle}</h2>
            <p>{t.toolsSub}</p>
          </div>
          <div className="lp-feats">
            {t.tools.map((f, i) => {
              const Icon = [Wallet, MessageCircle, FileText, Languages, Users, Shield][i] || Sparkles;
              return (
                <article key={f.title}>
                  <span>
                    <Icon size={16} />
                  </span>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="lp-block" id="how">
          <div className="lp-block-head lp-block-head-center">
            <p className="lp-kicker">{t.howEyebrow}</p>
            <h2>{t.howTitle}</h2>
            <p>{t.howSub}</p>
          </div>
          <ol className="lp-how">
            {t.howSteps.map((step, i) => (
              <li key={step.title}>
                <span className="lp-how-num">{String(i + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-block" id="for-whom">
          <div className="lp-block-head lp-block-head-center">
            <p className="lp-kicker">{t.forWhomEyebrow}</p>
            <h2>{t.forWhomTitle}</h2>
            <p>{t.forWhomSub}</p>
          </div>
          <div className="lp-audience">
            {t.forWhom.map((item) => (
              <article key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="lp-block lp-compare-block" id="why">
          <div className="lp-block-head lp-block-head-center">
            <p className="lp-kicker">{t.compareEyebrow}</p>
            <h2>{t.compareTitle}</h2>
            <p>{t.compareSub}</p>
          </div>
          <div className="lp-compare">
            <div className="lp-compare-col lp-compare-before">
              <h3>{t.compareBeforeTitle}</h3>
              <ul>
                {t.compareBefore.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>
            <div className="lp-compare-col lp-compare-after">
              <h3>{t.compareAfterTitle}</h3>
              <ul>
                {t.compareAfter.map((line) => (
                  <li key={line}>
                    <Check size={14} /> {line}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="lp-block lp-faq-block" id="trust">
          <div className="lp-faq-grid">
            <div className="lp-block-head">
              <p className="lp-kicker">{t.faqEyebrow}</p>
              <h2>{t.faqTitle}</h2>
              <p>{t.faqSub}</p>
              <div className="lp-faq-stats">
                {t.stats.map((s) => (
                  <div key={`faq-${s.label}`}>
                    <strong>{s.value}</strong>
                    <span>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
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

        <section className="lp-cta">
          <img src="/brand/bhishi-mark-white.png?v=3" alt="" width={40} height={40} />
          <h2>{t.finalTitle}</h2>
          <p>{t.finalSub}</p>
          <button type="button" className="lp-btn lp-btn-yellow lp-btn-lg" onClick={goAuth}>
            {t.finalCta} <ArrowRight size={16} />
          </button>
        </section>
      </main>

      <LandingFooter t={t} />
    </div>
  );
}
