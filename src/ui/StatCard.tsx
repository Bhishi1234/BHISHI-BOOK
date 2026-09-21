import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight } from "lucide-react";

export type StatTone = "blue" | "green" | "rose" | "amber" | "violet" | "teal" | "slate";

const TONES: StatTone[] = ["green", "blue", "amber", "rose", "violet", "teal"];

export function toneAt(i: number): StatTone {
  return TONES[i % TONES.length];
}

type Props = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: StatTone;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
};

export function StatCard({
  label,
  value,
  hint,
  tone = "blue",
  icon: Icon,
  onClick,
  className = "",
}: Props) {
  const cls = `stat tone-${tone}${onClick ? " clickable" : ""}${className ? ` ${className}` : ""}`;
  const body = (
    <>
      <div className="stat-top">
        {Icon ? (
          <span className="stat-icon" aria-hidden>
            <Icon size={15} strokeWidth={2.25} />
          </span>
        ) : (
          <span className="stat-dot" aria-hidden />
        )}
        <span className="stat-label">{label}</span>
        <span className="go-btn" aria-hidden>
          <ArrowUpRight size={14} strokeWidth={2.4} />
        </span>
      </div>
      <strong>{value}</strong>
      {hint != null && hint !== "" ? <em>{hint}</em> : null}
    </>
  );
  if (onClick) {
    return (
      <button type="button" className={cls} onClick={onClick}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}
