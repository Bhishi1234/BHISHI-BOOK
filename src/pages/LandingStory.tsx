import { useEffect, useRef, useState } from "react";
import type { LandingCopy } from "../i18n/landing";

const BEAT_MS = [1800, 1600, 1800, 3400];

export function LandingStory({
  screens,
  tapLabel,
}: {
  screens: LandingCopy["storyScreens"];
  tapLabel: string;
}) {
  const [scene, setScene] = useState(0);
  const [beat, setBeat] = useState(0);
  const [aim, setAim] = useState({ x: 50, y: 70 });
  const simRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLDivElement>(null);
  const screen = screens[scene] ?? screens[0];

  useEffect(() => {
    const sim = simRef.current;
    const btn = btnRef.current;
    if (!sim || !btn) return;
    const place = () => {
      const sr = sim.getBoundingClientRect();
      const br = btn.getBoundingClientRect();
      if (!sr.width || !sr.height) return;
      setAim({
        x: ((br.right - 22 - sr.left) / sr.width) * 100,
        y: ((br.top + br.height / 2 - sr.top) / sr.height) * 100,
      });
    };
    place();
    const id = window.setTimeout(place, 80);
    return () => window.clearTimeout(id);
  }, [scene, screen]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setTimeout(() => {
      if (beat < 3) {
        setBeat(beat + 1);
        return;
      }
      setBeat(0);
      setScene((current) => (current + 1) % screens.length);
    }, BEAT_MS[beat] ?? 1800);
    return () => window.clearTimeout(id);
  }, [beat, scene, screens.length]);

  if (!screen) return null;

  return (
    <div className="lp-story">
      <div className="lp-story-steps" role="tablist">
        {screens.map((item, index) => (
          <button
            key={item.kicker}
            type="button"
            role="tab"
            aria-selected={index === scene}
            className={index === scene ? "is-on" : ""}
            onClick={() => {
              setScene(index);
              setBeat(0);
            }}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.kicker}
          </button>
        ))}
      </div>
      <div className="lp-story-progress" aria-hidden>
        <i key={`${scene}-${beat}`} style={{ animationDuration: `${(BEAT_MS[beat] ?? 1800) / 1000}s` }} />
      </div>

      <div className={`lp-sim-phone lp-sim-beat-${beat}`} aria-hidden>
        <div className="lp-sim-island" />
        <div className="lp-sim" key={scene} ref={simRef}>
          <div className="lp-sim-top">
            <img src="/brand/bhishi-mark.png?v=3" alt="" width={22} height={22} />
            <span>Bhishi Circle</span>
          </div>
          <p className="lp-sim-kicker">{screen.kicker}</p>
          <h3>{screen.title}</h3>
          <ul className="lp-sim-lines">
            {screen.lines.map((line, index) => (
              <li key={line} className={index === 0 && beat === 3 ? "is-done-row" : ""}>
                {line}
              </li>
            ))}
          </ul>
          <div ref={btnRef} className={`lp-sim-btn${beat >= 1 ? " is-hot" : ""}${beat === 2 ? " is-pressed" : ""}`}>
            {screen.button}
          </div>
          <p className={`lp-sim-done${beat === 3 ? " is-in" : ""}`}>{screen.done}</p>
          <span
            className={`lp-cursor${beat >= 1 ? " is-on" : ""}${beat === 2 ? " is-press" : ""}${beat === 3 ? " is-gone" : ""}`}
            style={beat >= 1 ? { left: `${aim.x}%`, top: `${aim.y}%` } : undefined}
          >
            <i />
            <em>{tapLabel}</em>
          </span>
        </div>
      </div>
    </div>
  );
}
