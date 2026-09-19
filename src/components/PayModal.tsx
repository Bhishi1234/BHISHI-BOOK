import { useMemo, useState } from "react";
import { inr } from "../lib/format";
import type { PayMode, PaymentKind } from "../types";
import { MODE_LABEL } from "../lib/format";

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
        <h2>Record a payment — {name}</h2>
        <p className="muted">Cycle {cycle}. Money stays outside the app.</p>
        <div className="pay-row">
          <button className={`tab ${kind === "partial" ? "on" : ""}`} onClick={() => { setKind("partial"); setAmount(String(Math.max(0, Math.round(due / 2)))); }}>Partial</button>
          <button className={`tab ${kind === "full" ? "on" : ""}`} onClick={() => { setKind("full"); setAmount(String(due)); }}>
            {inr(due)}
          </button>
          <button className={`tab ${kind === "advance" ? "on" : ""}`} onClick={() => { setKind("advance"); setAmount(String(due * 2)); }}>Advance</button>
        </div>
        <label className="label">Mode</label>
        <div className="seg" style={{ marginBottom: 12 }}>
          {(Object.keys(MODE_LABEL) as PayMode[]).map((m) => (
            <button key={m} type="button" className={`chip ${mode === m ? "on" : ""}`} onClick={() => setMode(m)}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>
        <label className="label">Amount</label>
        <input className="field" value={amount} onChange={(e) => setAmount(e.target.value)} disabled={kind === "full"} />
        <label className="check">
          <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} />
          Count cash denominations
        </label>
        {cash && (
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
            <p className={cashOk ? "muted" : "due"}>Counted {inr(cashTotal)} · must equal {inr(value)}</p>
          </div>
        )}
        <button
          className="btn wide"
          disabled={!value || !cashOk}
          onClick={() => onSave(value, kind, mode)}
        >
          Save receipt
        </button>
      </div>
    </div>
  );
}
