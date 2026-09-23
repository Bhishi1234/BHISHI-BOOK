import type { ReactNode } from "react";

type Tone = "amber" | "blue" | "rose" | "teal" | "green";

/** Colored instruction / prompt box — replaces hard-to-read grey muted hints. */
export function PromptBox({
  children,
  tone = "amber",
  title,
  className = "",
}: {
  children: ReactNode;
  tone?: Tone;
  title?: string;
  className?: string;
}) {
  return (
    <div className={`prompt-box tone-${tone}${className ? ` ${className}` : ""}`} role="note">
      {title ? <strong className="prompt-box-title">{title}</strong> : null}
      <div className="prompt-box-body">{children}</div>
    </div>
  );
}
