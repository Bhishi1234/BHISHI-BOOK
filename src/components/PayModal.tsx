import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "../i18n";
import { inr } from "../lib/format";
import type { PayMode, PaymentKind } from "../types";
import { ModalPortal } from "./ModalPortal";

const NOTES = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export function PayModal({
  name,
  cycle,
  due,
  onClose,
  onSave,
}: {
  name: string;
  cycle: number;
  due: number;
  onClose: () => void;
  onSave: (amount: number, kind: PaymentKind, mode: PayMode) => void;
}) {
  const { m, tx, modeLabel, payKindLabel } = useI18n();
  const [kind, setKind] = useState<PaymentKind>("full");
  const [mode, setMode] = useState<PayMode>("cash");
  const [amount, setAmount] = useState(String(due));
  const [cash, setCash] = useState(false);
  const [moreWays, setMoreWays] = useState(false);
  const [notes, setNotes] = useState<Record<number, number>>({});
  const cashTotal = useMemo(
    () => NOTES.reduce((s, n) => s + n * (notes[n] || 0), 0),
    [notes],
  );
  const value = kind === "full" ? due : Number(amount) || 0;
  const cashOk = !cash || cashTotal === value;

  return (
    <ModalPortal>
      <div
        className="modal-back"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="modal pay-modal"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`${m.detail.recordPayment} — ${name}`}
        >
          <div className="modal-head-row">
            <div className="modal-head-copy">
              <h2>{name}</h2>
              <p className="muted pay-modal-sub">
                {m.terms.haptaRound} {cycle}
              </p>
              <p className="pay-due-figure">{inr(due)}</p>
            </div>
            <button type="button" className="modal-close-x" onClick={onClose} aria-label={m.common.close}>
              <X size={18} strokeWidth={2.4} />
            </button>
          </div>
          {cash ? (
            <>
              <div className="row-head" style={{ marginBottom: 8 }}>
                <strong>{m.payModal.countCash}</strong>
                <button
                  type="button"
                  className="btn ghost btn-sm"
                  onClick={() => { setCash(false); setNotes({}); }}
                >
                  {m.common.back}
                </button>
              </div>
              <div className="cash-grid">
                {NOTES.map((n) => (
                  <label key={n} className="cash-row">
                    <span>₹{n}</span>
                    <input
                      className="field"
                      inputMode="numeric"
                      value={notes[n] || ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [n]: Number(e.target.value) || 0 }))}
                    />
                  </label>
                ))}
                <p className={cashOk ? "muted" : "due"}>
                  {tx(m.payModal.countedMustEqual, { counted: inr(cashTotal), amount: inr(value) })}
                </p>
              </div>
              <button
                type="button"
                className="btn wide"
                disabled={!value || !cashOk}
                onClick={() => onSave(value, kind, mode)}
              >
                {m.common.save}
              </button>
            </>
          ) : (
            <>
              <div className="pay-choices">
                <button
                  type="button"
                  className={`pay-choice${mode === "cash" && kind === "full" ? " on" : ""}`}
                  onClick={() => { setKind("full"); setMode("cash"); setAmount(String(due)); }}
                >
                  {modeLabel("cash")}
                </button>
                <button
                  type="button"
                  className={`pay-choice${mode === "upi" && kind === "full" ? " on" : ""}`}
                  onClick={() => { setKind("full"); setMode("upi"); setAmount(String(due)); }}
                >
                  {modeLabel("upi")}
                </button>
                <button
                  type="button"
                  className={`pay-choice${kind === "partial" ? " on" : ""}`}
                  onClick={() => { setKind("partial"); setAmount(String(Math.max(0, Math.round(due / 2)))); }}
                >
                  {m.payModal.partPayment}
                </button>
              </div>
              {kind !== "full" && (
                <>
                  <label className="label">{m.payModal.amount}</label>
                  <input className="field" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </>
              )}
              <button type="button" className="hapta-text-btn" onClick={() => setMoreWays((v) => !v)}>
                {m.payModal.otherWays}
              </button>
              {moreWays && (
                <>
                  <div className="seg" style={{ marginBottom: 12 }}>
                    {(["bank", "cheque", "adjusted"] as PayMode[]).map((payModeId) => (
                      <button
                        key={payModeId}
                        type="button"
                        className={`chip ${mode === payModeId ? "on" : ""}`}
                        onClick={() => setMode(payModeId)}
                      >
                        {modeLabel(payModeId)}
                      </button>
                    ))}
                    <button
                      type="button"
                      className={`chip ${kind === "advance" ? "on" : ""}`}
                      onClick={() => { setKind("advance"); setAmount(String(due * 2)); }}
                    >
                      {payKindLabel("advance")}
                    </button>
                  </div>
                  <label className="check">
                    <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} />
                    {m.payModal.countCash}
                  </label>
                </>
              )}
              <button
                type="button"
                className="btn wide hapta-cta"
                disabled={!value || !cashOk}
                onClick={() => onSave(value, kind, mode)}
              >
                {m.payModal.markPaid}
              </button>
            </>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
