import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { baseInstalment, paidInCycle } from "../lib/chitMath";
import { inr } from "../lib/format";
import { useStore } from "../store";

/** Personal “I'm in someone else's bhishi” ledger — matches ChitBook /tracked/:id */
export function TrackedChitPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { chits, customers, user, recordPayment, closeCycle, cancelChit, error } = useStore();
  const chit = chits.find((c) => c.id === id);
  const [logging, setLogging] = useState<number | null>(null);
  const [advancing, setAdvancing] = useState(false);

  const selfId = useMemo(() => {
    if (!chit) return "";
    if (chit.members[0]) return chit.members[0].customerId;
    const byPhone = customers.find((c) => c.phone && user?.phone && c.phone === user.phone);
    return byPhone?.id || customers[0]?.id || "";
  }, [chit, customers, user]);

  if (!chit) {
    return (
      <AppShell crumb="Chits">
        <div className="page"><p>Tracked chit not found.</p></div>
      </AppShell>
    );
  }

  const instalment = baseInstalment(chit);
  const paid = selfId
    ? chit.payments.filter((p) => p.memberId === selfId).reduce((s, p) => s + p.amount, 0)
    : chit.payments.reduce((s, p) => s + p.amount, 0);
  const totalDue = instalment * chit.duration;
  const left = Math.max(0, totalDue - paid);
  const cycle = Math.min(chit.currentCycle, chit.duration);
  const monthLogged = selfId ? paidInCycle(chit, selfId, cycle) >= instalment && instalment > 0 : false;
  const canAdvance = monthLogged && chit.status === "running" && cycle < chit.duration;

  async function logMonth(month: number) {
    if (!selfId) return;
    setLogging(month);
    try {
      const already = paidInCycle(chit!, selfId, month);
      const due = Math.max(0, instalment - already);
      if (due > 0) await recordPayment(chit!.id, selfId, due, "full", "cash");
    } finally {
      setLogging(null);
    }
  }

  return (
    <AppShell crumb="Chits" crumb2={chit.name}>
      <div className="page">
        <div className="row-head top">
          <div>
            <div className="title-row">
              <h1>{chit.name}</h1>
              <span className="badge">Tracking</span>
              <span className="pill paid">{chit.status === "running" ? "Active" : chit.status}</span>
            </div>
            <p className="page-sub">{inr(instalment)}/Month · {chit.duration} months · started {new Date(chit.startDate).toLocaleString("en-IN", { month: "short", year: "numeric" })}</p>
          </div>
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm("Cancel this tracked chit?")) {
                void cancelChit(chit.id).then(() => nav("/chits"));
              }
            }}
          >
            Cancel
          </button>
        </div>
        {error && <p className="due">{error}</p>}

        <div className="stats four">
          <div className="stat"><span>Current month</span><strong>{cycle} / {chit.duration}</strong></div>
          <div className="stat"><span>Paid so far</span><strong>{inr(paid)}</strong></div>
          <div className="stat"><span>Left to pay</span><strong>{inr(left)}</strong></div>
          <div className="stat"><span>Month {cycle} due</span><strong>{inr(instalment)}</strong></div>
        </div>

        <div className="card block">
          <button
            className="btn wide"
            disabled={!selfId || logging !== null || monthLogged || chit.status !== "running"}
            onClick={() => void logMonth(cycle)}
          >
            {logging === cycle ? "Logging…" : monthLogged ? "This month logged" : "Log this payment"}
          </button>
          {canAdvance && (
            <button
              className="btn ghost wide"
              style={{ marginTop: 8 }}
              disabled={advancing}
              onClick={() => {
                setAdvancing(true);
                void closeCycle(chit.id).finally(() => setAdvancing(false));
              }}
            >
              {advancing ? "Advancing…" : "Advance to next month"}
            </button>
          )}
          {!selfId && <p className="due">Add yourself as a customer first, then open this tracked chit again.</p>}
        </div>

        <div className="card flush">
          <div className="card-pad"><h2>Your payment log</h2></div>
          {Array.from({ length: chit.duration }, (_, i) => i + 1).map((month) => {
            const paidM = selfId ? paidInCycle(chit, selfId, month) : 0;
            const dueYet = month <= cycle;
            const logged = paidM >= instalment && instalment > 0;
            return (
              <div key={month} className="list-row">
                <div className="grow">
                  <strong>Month {month}</strong>
                  <div className="muted">
                    {!dueYet ? "Not due yet" : logged ? `Logged · ${inr(paidM)}` : paidM > 0 ? `Partial · ${inr(paidM)}` : "Not logged"}
                  </div>
                </div>
                {dueYet && !logged && chit.status === "running" ? (
                  <button className="btn ghost btn-sm" disabled={logging !== null} onClick={() => void logMonth(month)}>
                    {logging === month ? "…" : "Log"}
                  </button>
                ) : (
                  <span className="muted">{logged ? "✓" : "—"}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
