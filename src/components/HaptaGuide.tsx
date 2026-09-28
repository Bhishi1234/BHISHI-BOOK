import { Check } from "lucide-react";

export type HaptaStepId = "collect" | "award" | "close";

export type HaptaRailStep = {
  id: HaptaStepId;
  n: number;
  label: string;
  state: "done" | "on" | "wait";
};

export function HaptaRail({
  steps,
  onStep,
  label,
}: {
  steps: HaptaRailStep[];
  onStep: (id: HaptaStepId) => void;
  label: string;
}) {
  return (
    <div className="hapta-rail" role="tablist" aria-label={label}>
      {steps.map((step) => (
        <button
          key={step.id}
          type="button"
          role="tab"
          aria-selected={step.state === "on"}
          className={`hapta-rail-step ${step.state}`}
          onClick={() => onStep(step.id)}
        >
          <span className="hapta-rail-mark">
            {step.state === "done" ? <Check size={15} strokeWidth={2.8} /> : step.n}
          </span>
          <span className="hapta-rail-label">{step.label}</span>
        </button>
      ))}
    </div>
  );
}

export function HaptaGuide({
  kicker,
  title,
  note,
  lead,
  steps,
  onStep,
  stepsLabel,
  actionLabel,
  onAction,
  actionTone = "blue",
  potsTitle,
  pots,
}: {
  kicker?: string;
  title: string;
  note?: string;
  lead: string;
  steps?: HaptaRailStep[];
  onStep?: (id: HaptaStepId) => void;
  stepsLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionTone?: "blue" | "green" | "ghost";
  potsTitle?: string;
  pots?: { key: string; text: string }[];
}) {
  return (
    <section className="hapta-home" data-tour="hapta">
      {kicker ? <p className="hapta-kicker">{kicker}</p> : null}
      <h2>{title}</h2>
      {note ? <p className="hapta-note">{note}</p> : null}
      <p className="hapta-lead">{lead}</p>
      {steps && onStep && stepsLabel ? (
        <HaptaRail steps={steps} onStep={onStep} label={stepsLabel} />
      ) : null}
      {pots && pots.length > 0 ? (
        <div className="hapta-pots">
          {potsTitle ? <p className="hapta-pots-title">{potsTitle}</p> : null}
          <ol className="hapta-pot-list">
            {pots.map((row) => (
              <li key={row.key}>{row.text}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {actionLabel && onAction ? (
        <button
          type="button"
          data-tour="hapta-cta"
          className={`btn wide hapta-cta${actionTone === "green" ? " green" : ""}${actionTone === "ghost" ? " ghost" : ""}`}
          onClick={onAction}
        >
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
