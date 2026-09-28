import { useEffect, useState } from "react";
import { useI18n } from "../i18n";

const TARGETS = ["hapta", "hapta-cta", "chit-more", "nav-bhishi"] as const;

type Box = { top: number; left: number; width: number; height: number };

export function FirstRunTour({ onDone }: { onDone: () => void }) {
  const { m } = useI18n();
  const copy = m.firstRun;
  const lines = [copy.tourHapta, copy.tourButton, copy.tourMore, copy.tourList];
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [cardOnTop, setCardOnTop] = useState(false);
  const done = step >= lines.length;

  useEffect(() => {
    if (done) return;
    const place = () => {
      const el = [...document.querySelectorAll(`[data-tour="${TARGETS[step]}"]`)].find((node) => {
        const r = node.getBoundingClientRect();
        return r.width > 8 && r.height > 8;
      });
      if (!el) {
        setBox(null);
        return;
      }
      el.scrollIntoView({ block: "center", inline: "nearest" });
      const r = el.getBoundingClientRect();
      setBox({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });
      setCardOnTop(r.top > window.innerHeight * 0.55);
    };
    place();
    const t = window.setTimeout(place, 80);
    window.addEventListener("resize", place);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", place);
    };
  }, [step, done]);

  const shades = box && !done
    ? [
        { top: 0, left: 0, width: "100%", height: box.top },
        { top: box.top, left: 0, width: box.left, height: box.height },
        { top: box.top, left: box.left + box.width, right: 0, height: box.height },
        { top: box.top + box.height, left: 0, right: 0, bottom: 0 },
      ]
    : null;

  return (
    <div className="tour-layer">
      {shades ? shades.map((style, i) => <div key={i} className="tour-shade" style={style} />) : <div className="tour-dim" />}
      {box && !done ? <div className="tour-hole" style={box} /> : null}
      <div className={`tour-card${cardOnTop && !done ? " is-top" : ""}`} role="dialog" aria-modal="true">
        {done ? (
          <>
            <h2>{copy.doneTitle}</h2>
            <p>{copy.doneBody}</p>
            <button type="button" className="btn wide" onClick={onDone}>{copy.goHapta}</button>
          </>
        ) : (
          <>
            <p className="tour-count">{step + 1} / {lines.length}</p>
            <p>{lines[step]}</p>
            <div className="tour-actions">
              <button type="button" className="hapta-text-btn" onClick={onDone}>{copy.skip}</button>
              <button type="button" className="btn" onClick={() => setStep((s) => s + 1)}>{copy.next}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
