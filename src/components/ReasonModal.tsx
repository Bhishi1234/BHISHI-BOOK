import { useState } from "react";

export type ReasonOption = { id: string; label: string };

type Props = {
  open: boolean;
  title: string;
  hint: string;
  options: ReasonOption[];
  otherLabel: string;
  otherPlaceholder: string;
  confirmLabel: string;
  cancelLabel: string;
  multi?: boolean;
  danger?: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: (reasons: string[], note: string) => void | Promise<void>;
};

/** Multiselect (or single) reason picker with optional free-text “Other”. */
export function ReasonModal({
  open,
  title,
  hint,
  options,
  otherLabel,
  otherPlaceholder,
  confirmLabel,
  cancelLabel,
  multi = true,
  danger = false,
  busy = false,
  onClose,
  onConfirm,
}: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");

  if (!open) return null;

  function toggle(id: string) {
    setPicked((prev) => {
      if (multi) {
        return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      }
      return prev.includes(id) ? [] : [id];
    });
  }

  const otherOn = picked.includes("other");
  const canSubmit = picked.length > 0 && (!otherOn || note.trim().length > 0);

  return (
    <div className="modal-back" role="dialog" aria-modal="true" aria-labelledby="reason-modal-title">
      <div className="modal reason-modal">
        <h2 id="reason-modal-title">{title}</h2>
        <p className="muted">{hint}</p>
        <div className="reason-list">
          {options.map((opt) => (
            <label key={opt.id} className={`reason-option${picked.includes(opt.id) ? " on" : ""}`}>
              <input
                type={multi ? "checkbox" : "radio"}
                name="reason"
                checked={picked.includes(opt.id)}
                onChange={() => toggle(opt.id)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        {otherOn && (
          <div style={{ marginTop: 10 }}>
            <label className="label">{otherLabel}</label>
            <textarea
              className="field"
              rows={3}
              value={note}
              placeholder={otherPlaceholder}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        )}
        <div className="seg" style={{ marginTop: 16 }}>
          <button
            type="button"
            className={danger ? "btn danger" : "btn"}
            disabled={!canSubmit || busy}
            onClick={() => {
              void onConfirm(picked, note.trim());
            }}
          >
            {busy ? "…" : confirmLabel}
          </button>
          <button
            type="button"
            className="btn ghost"
            disabled={busy}
            onClick={() => {
              setPicked([]);
              setNote("");
              onClose();
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
