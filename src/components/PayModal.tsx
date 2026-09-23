import { useMemo, useState } from "react";
import { useI18n } from "../i18n";
import { inr } from "../lib/format";
import type { PayMode, PaymentKind } from "../types";

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
  const [notes, setNotes] = useState<Record<number, number>>({});
  const cashTotal = useMemo(
    () => NOTES.reduce((s, n) => s + n * (notes[n] || 0), 0),
    [notes],
  );
  const value = kind === "full" ? due : Number(amount) || 0;
  const cashOk = !cash || cashTotal === value;

  return (
    <div className="modal-back" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row-head" style={{ marginBottom: 8 }}>
          <h2 style={{ margin: 0 }}>{m.detail.recordPayment} — {name}</h2>
          <button type="button" className="btn ghost btn-sm" onClick={onClose} aria-label={m.common.close}>
            {m.common.cancel}
          </button>
        </div>
        <p className="muted">{m.terms.haptaRound} {cycle}</p>
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
              className="btn wide"
              disabled={!value || !cashOk}
              onClick={() => onSave(value, kind, mode)}
            >
              {m.common.save}
            </button>
          </>
        ) : (
          <>
            <div className="pay-row">
              <button className={`tab ${kind === "partial" ? "on" : ""}`} onClick={() => { setKind("partial"); setAmount(String(Math.max(0, Math.round(due / 2)))); }}>{payKindLabel("partial")}</button>
              <button className={`tab ${kind === "full" ? "on" : ""}`} onClick={() => { setKind("full"); setAmount(String(due)); }}>
                {inr(due)}
              </button>
              <button className={`tab ${kind === "advance" ? "on" : ""}`} onClick={() => { setKind("advance"); setAmount(String(due * 2)); }}>{payKindLabel("advance")}</button>
            </div>
            <label className="label">{m.payModal.mode}</label>
            <div className="seg" style={{ marginBottom: 12 }}>
              {(["cash", "upi", "bank", "cheque", "adjusted"] as PayMode[]).map((payModeId) => (
                <button key={payModeId} type="button" className={`chip ${mode === payModeId ? "on" : ""}`} onClick={() => setMode(payModeId)}>
                  {modeLabel(payModeId)}
                </button>
              ))}
            </div>
            <label className="label">{m.payModal.amount}</label>
            <input className="field" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={kind === "full"} />
            <label className="check">
              <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} />
              {m.payModal.countCash}
            </label>
            <button
              className="btn wide"
              disabled={!value || !cashOk}
              onClick={() => onSave(value, kind, mode)}
            >
              {m.common.save}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
