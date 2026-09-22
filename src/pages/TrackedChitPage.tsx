import { useMemo, useState } from "react";
import {
  Calendar,
  CalendarRange,
  CircleDollarSign,
  PiggyBank,
  Route,
  Wallet,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { baseInstalment, paidInCycle } from "../lib/chitMath";
import { useI18n } from "../i18n";
import { initials, inr, todayIso } from "../lib/format";
import { useStore } from "../store";
import type { PayMode } from "../types";
import { StatCard } from "../ui/StatCard";

/** Personal “I'm in someone else's bhishi” ledger — matches ChitBook /tracked/:id */
export function TrackedChitPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { chits, customers, user, recordPayment, closeCycle, cancelChit, error } = useStore();
  const { m, typeLabel, freqLabel, modeLabel } = useI18n();
  const chit = chits.find((c) => c.id === id);
  const [logging, setLogging] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [logMonth, setLogMonth] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayIso());
  const [payMode, setPayMode] = useState<PayMode>("cash");

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

  const data = chit;

  const instalment = baseInstalment(data);
  const paid = selfId
    ? data.payments.filter((p) => p.memberId === selfId).reduce((s, p) => s + p.amount, 0)
    : data.payments.reduce((s, p) => s + p.amount, 0);
  const totalDue = instalment * data.duration;
  const left = Math.max(0, totalDue - paid);
  const cycle = Math.min(data.currentCycle, data.duration);
  const monthLogged = selfId ? paidInCycle(data, selfId, cycle) >= instalment && instalment > 0 : false;
  const canAdvance = monthLogged && data.status === "running" && cycle < data.duration;
  const isRunning = data.status === "running";
  const ended = new Date(data.startDate);
  ended.setMonth(ended.getMonth() + data.duration);
  const pct = totalDue > 0 ? Math.min(100, Math.round((paid / totalDue) * 100)) : 0;

  function openLog(month: number) {
    const already = selfId ? paidInCycle(data, selfId, month) : 0;
    setAmount(String(Math.max(0, instalment - already) || instalment));
    setDate(todayIso());
    setPayMode("cash");
    setLogMonth(month);
  }

  async function saveLog() {
    if (!selfId || logMonth == null) return;
    const n = Number(amount);
    if (!n) return;
    setLogging(true);
    try {
      await recordPayment(data.id, selfId, n, n >= instalment ? "full" : "partial", payMode);
      setLogMonth(null);
    } finally {
      setLogging(false);
    }
  }

  return (
    <AppShell crumb="Chits" crumb2={data.name}>
      <div className="page">
        <section className="chit-hero">
          <div className="chit-hero-top">
            <div className="chit-hero-avatar">{initials(data.name)}</div>
            <div className="chit-hero-heading">
              <h1>{data.name}</h1>
              <p>
                {typeLabel(data.type) || m.nav.chits} · {m.chitsPage.tracking}
                {data.title ? ` · ${data.title}` : ""}
              </p>
            </div>
            <span className={`chit-hero-pill${isRunning ? " live" : ""}`}>
              {isRunning ? "Active" : data.status}
            </span>
          </div>
          <div className="chit-hero-divider" />
          <div className="chit-hero-grid">
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Wallet size={16} strokeWidth={2} /></div>
              <div>
                <span>Instalment</span>
                <strong>{inr(instalment)}/{freqLabel(data.frequency) || m.terms.haptaShort}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Calendar size={16} strokeWidth={2} /></div>
              <div>
                <span>Duration</span>
                <strong>{data.duration} months</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Calendar size={16} strokeWidth={2} /></div>
              <div>
                <span>Started</span>
                <strong>{new Date(data.startDate).toLocaleString("en-IN", { month: "short", year: "numeric" })}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><CalendarRange size={16} strokeWidth={2} /></div>
              <div>
                <span>Ends</span>
                <strong>{ended.toLocaleString("en-IN", { month: "short", year: "numeric" })}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Route size={16} strokeWidth={2} /></div>
              <div>
                <span>Progress</span>
                <strong>{pct}% paid</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Calendar size={16} strokeWidth={2} /></div>
              <div>
                <span>Month</span>
                <strong>{cycle} / {data.duration}</strong>
              </div>
            </div>
          </div>
          <p className="chit-hero-note">Personal tracking · log what you pay each month</p>
        </section>

        <div className="row-head" style={{ marginBottom: 12 }}>
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm("Cancel this tracked chit?")) {
                void cancelChit(data.id).then(() => nav("/chits"));
              }
            }}
          >
            Cancel tracking
          </button>
        </div>

        {error && <p className="due">{error}</p>}

        <div className="stats four">
          <StatCard label="Current month" value={`${cycle} / ${data.duration}`} hint="cycle progress" tone="blue" icon={Calendar} />
          <StatCard label="Paid so far" value={inr(paid)} hint="lifetime logged" tone="green" icon={PiggyBank} />
          <StatCard label="Left to pay" value={inr(left)} hint="remaining" tone="rose" icon={CircleDollarSign} />
          <StatCard label={`Month ${cycle} due`} value={inr(instalment)} hint="this instalment" tone="amber" icon={Wallet} />
        </div>

        <div className="card block">
          <button
            className="btn wide"
            disabled={!selfId || logging || monthLogged || data.status !== "running"}
            onClick={() => openLog(cycle)}
          >
            {monthLogged ? "This month logged" : "Log this payment"}
          </button>
          {canAdvance && (
            <button
              className="btn ghost wide"
              style={{ marginTop: 8 }}
              disabled={advancing}
              onClick={() => {
                setAdvancing(true);
                void closeCycle(data.id).finally(() => setAdvancing(false));
              }}
            >
              {advancing ? "Advancing…" : "Advance to next month"}
            </button>
          )}
          {!selfId && <p className="due">Add yourself as a customer first, then open this tracked chit again.</p>}
        </div>

        <div className="card flush">
          <div className="card-pad"><h2>Your payment log</h2></div>
          {Array.from({ length: data.duration }, (_, i) => i + 1).map((month) => {
            const paidM = selfId ? paidInCycle(data, selfId, month) : 0;
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
                {dueYet && !logged && data.status === "running" ? (
                  <button className="btn ghost btn-sm" disabled={logging} onClick={() => openLog(month)}>Log</button>
                ) : (
                  <span className="muted">{logged ? "✓" : "—"}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {logMonth != null && (
        <div className="modal-back" onClick={() => setLogMonth(null)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => { e.preventDefault(); void saveLog(); }}
          >
            <h2>Log this payment</h2>
            <p className="muted">Month {logMonth}</p>
            <label className="label">Amount</label>
            <input className="field" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
            <label className="label">Date</label>
            <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <label className="label">Payment mode</label>
            <div className="seg">
              {(["cash", "upi", "bank", "cheque"] as PayMode[]).map((payModeId) => (
                <button key={payModeId} type="button" className={`chip ${payMode === payModeId ? "on" : ""}`} onClick={() => setPayMode(payModeId)}>
                  {modeLabel(payModeId)}
                </button>
              ))}
            </div>
            <div className="toolbar" style={{ marginTop: 16 }}>
              <button type="button" className="btn ghost" onClick={() => setLogMonth(null)}>Cancel</button>
              <button className="btn" disabled={logging || !Number(amount)}>{logging ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
