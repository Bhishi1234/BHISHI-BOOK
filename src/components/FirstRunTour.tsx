import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n";

const TARGETS = ["hapta", "hapta-cta", "chit-more", "nav-bhishi", "nav-collect", "nav-people", "nav-more"] as const;

type Box = { top: number; left: number; width: number; height: number; radius: number };

function radiusOf(el: Element, rect: DOMRect, pad: number) {
  const raw = getComputedStyle(el).borderRadius;
  const n = Math.max(0, ...raw.split(/\s+/).map((part) => parseFloat(part) || 0));
  const radius = (n || 14) + pad;
  return Math.min(radius, (rect.height + pad * 2) / 2, (rect.width + pad * 2) / 2);
}

export function FirstRunTour({ onDone }: { onDone: () => void }) {
  const { m } = useI18n();
  const copy = m.firstRun;
  const lines = [
    copy.tourHapta,
    copy.tourButton,
    copy.tourMore,
    copy.tourList,
    copy.tourCollect,
    copy.tourPeople,
    copy.tourNavMore,
  ];
  const [step, setStep] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [cardOnTop, setCardOnTop] = useState(false);
  const [glide, setGlide] = useState(false);
  const placed = useRef(false);
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
      const fixed = getComputedStyle(el).position === "fixed";
      if (!fixed) el.scrollIntoView({ block: "center", inline: "nearest" });
      const r = el.getBoundingClientRect();
      const pad = 8;
      setBox({
        top: r.top - pad,
        left: r.left - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
        radius: radiusOf(el, r, pad),
      });
      setCardOnTop(r.top > window.innerHeight * 0.5);
      if (placed.current) setGlide(true);
      placed.current = true;
    };
    place();
    const t = window.setTimeout(place, 80);
    window.addEventListener("resize", place);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", place);
    };
  }, [step, done]);

  return (
    <div className="tour-layer">
      <div className="tour-catch" />
      {box && !done ? (
        <div
          className={`tour-spot${glide ? " is-on" : ""}`}
          style={{ top: box.top, left: box.left, width: box.width, height: box.height, borderRadius: box.radius }}
        />
      ) : !done ? <div className="tour-dim" /> : null}
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
