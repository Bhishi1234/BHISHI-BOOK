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
import { CancelChitButton } from "../components/CancelChitButton";
import { ModalPortal } from "../components/ModalPortal";
import { AppShell } from "../layout/AppShell";
import { baseInstalment, paidInCycle, chitEndDate } from "../lib/chitMath";
import { useI18n } from "../i18n";
import { initials, inr, todayIso } from "../lib/format";
import { useStore } from "../store";
import type { PayMode } from "../types";
import { StatCard } from "../ui/StatCard";

/** Personal “I'm in someone else's bhishi” ledger — matches ChitBook /tracked/:id */
export function TrackedChitPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { chits, customers, user, recordPayment, closeCycle, error } = useStore();
  const { m, tx, typeLabel, freqLabel, modeLabel, statusLabel, locale } = useI18n();
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
      <AppShell crumb={m.tracked.crumb}>
        <div className="page"><p>{m.tracked.notFound}</p></div>
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
  const ended = chitEndDate(data);
  const pct = totalDue > 0 ? Math.min(100, Math.round((paid / totalDue) * 100)) : 0;
  const monthFmt = { month: "short" as const, year: "numeric" as const };

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
    <AppShell crumb={m.tracked.crumb} crumb2={data.name}>
      <div className="page">
        <div className="page-back-row">
          <button type="button" className="page-back-btn" onClick={() => nav(-1)}>
            ← {m.common.back}
          </button>
        </div>
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
              {isRunning ? m.common.active : statusLabel(data.status)}
            </span>
          </div>
          <div className="chit-hero-divider" />
          <div className="chit-hero-grid">
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Wallet size={16} strokeWidth={2} /></div>
              <div>
                <span>{m.chit.instalment}</span>
                <strong>{inr(instalment)}/{freqLabel(data.frequency) || m.terms.haptaShort}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Calendar size={16} strokeWidth={2} /></div>
              <div>
                <span>{m.newChit.duration}</span>
                <strong>{tx(m.tracked.monthsCount, { n: data.duration })}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Calendar size={16} strokeWidth={2} /></div>
              <div>
                <span>{m.chit.started}</span>
                <strong>{new Date(data.startDate).toLocaleString(locale, monthFmt)}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><CalendarRange size={16} strokeWidth={2} /></div>
              <div>
                <span>{m.chit.ends}</span>
                <strong>{ended.toLocaleString(locale, monthFmt)}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Route size={16} strokeWidth={2} /></div>
              <div>
                <span>{m.tracked.progress}</span>
                <strong>{tx(m.tracked.pctPaid, { pct })}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Calendar size={16} strokeWidth={2} /></div>
              <div>
                <span>{m.chit.month}</span>
                <strong>{cycle} / {data.duration}</strong>
              </div>
            </div>
          </div>
          <p className="chit-hero-note">{m.tracked.subtitle}</p>
        </section>

        <div className="row-head" style={{ marginBottom: 12 }}>
          <CancelChitButton
            chitId={data.id}
            className="btn danger"
            label={m.tracked.cancelTracking}
            onDone={() => nav("/chits")}
          />
        </div>

        {error && <p className="due">{error}</p>}

        <div className="stats four">
          <StatCard label={m.tracked.currentMonth} value={`${cycle} / ${data.duration}`} hint={m.tracked.cycleProgress} tone="blue" icon={Calendar} />
          <StatCard label={m.tracked.paidSoFar} value={inr(paid)} hint={m.tracked.lifetimeLogged} tone="green" icon={PiggyBank} />
          <StatCard label={m.tracked.leftToPay} value={inr(left)} hint={m.tracked.remaining} tone="rose" icon={CircleDollarSign} />
          <StatCard label={tx(m.tracked.monthNDue, { n: cycle })} value={inr(instalment)} hint={m.tracked.thisInstalment} tone="amber" icon={Wallet} />
        </div>

        <div className="card block">
          <button
            className="btn wide"
            disabled={!selfId || logging || monthLogged || data.status !== "running"}
            onClick={() => openLog(cycle)}
          >
            {monthLogged ? m.tracked.monthLogged : m.tracked.logPayment}
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
              {advancing ? m.common.loading : m.tracked.advanceMonth}
            </button>
          )}
          {!selfId && <p className="due">{m.tracked.addSelfFirst}</p>}
        </div>

        <div className="card flush">
          <div className="card-pad"><h2>{m.tracked.paymentLog}</h2></div>
          {Array.from({ length: data.duration }, (_, i) => i + 1).map((month) => {
            const paidM = selfId ? paidInCycle(data, selfId, month) : 0;
            const dueYet = month <= cycle;
            const logged = paidM >= instalment && instalment > 0;
            return (
              <div key={month} className="list-row">
                <div className="grow">
                  <strong>{tx(m.tracked.monthN, { n: month })}</strong>
                  <div className="muted">
                    {!dueYet
                      ? m.tracked.notDueYet
                      : logged
                        ? tx(m.tracked.loggedAmount, { amount: inr(paidM) })
                        : paidM > 0
                          ? tx(m.tracked.partialAmount, { amount: inr(paidM) })
                          : m.tracked.notLogged}
                  </div>
                </div>
                {dueYet && !logged && data.status === "running" ? (
                  <button className="btn ghost btn-sm" disabled={logging} onClick={() => openLog(month)}>{m.tracked.log}</button>
                ) : (
                  <span className="muted">{logged ? "✓" : "—"}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {logMonth != null && (
        <ModalPortal>
          <div className="modal-back" onClick={() => setLogMonth(null)}>
            <form
              className="modal"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => { e.preventDefault(); void saveLog(); }}
            >
              <h2>{m.tracked.logPayment}</h2>
              <p className="muted">{tx(m.tracked.monthN, { n: logMonth })}</p>
              <label className="label">{m.payModal.amount}</label>
              <input className="field" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))} />
              <label className="label">{m.common.date}</label>
              <input className="field" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              <label className="label">{m.payModal.mode}</label>
              <div className="seg">
                {(["cash", "upi", "bank", "cheque"] as PayMode[]).map((payModeId) => (
                  <button key={payModeId} type="button" className={`chip ${payMode === payModeId ? "on" : ""}`} onClick={() => setPayMode(payModeId)}>
                    {modeLabel(payModeId)}
                  </button>
                ))}
              </div>
              <div className="seg modal-actions" style={{ marginTop: 16 }}>
                <button type="button" className="btn ghost" onClick={() => setLogMonth(null)}>{m.common.cancel}</button>
                <button type="submit" className="btn" disabled={logging || !Number(amount)}>{logging ? m.common.loading : m.common.save}</button>
              </div>
            </form>
          </div>
        </ModalPortal>
      )}
    </AppShell>
  );
}
