import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PromptBox } from "../components/PromptBox";
import { AppShell } from "../layout/AppShell";
import {
  chitEndDate,
  cycleStartDate,
  displayCycle,
  memberBalance,
  paidInCycle,
  paymentStatus,
  rawCycleDue,
} from "../lib/chitMath";
import { useI18n } from "../i18n";
import { haptaDateOptions, haptaEveryLabel } from "../lib/haptaInterval";
import { initials, inr } from "../lib/format";
import { useStore } from "../store";

/** Read-only passbook for a chit the user belongs to via phone match. */
export function MemberChitPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { chits, customers, user, exitChitAsMember, error } = useStore();
  const { m, tx, typeLabel, freqLabel, modeLabel, payStatusLabel, statusLabel, locale } = useI18n();
  const data = chits.find((c) => c.id === id);
  const [exitBusy, setExitBusy] = useState(false);

  const selfId = useMemo(() => {
    if (!data || !user?.phone) return "";
    const byPhone = customers.find((c) => c.phone === user.phone);
    if (byPhone && data.members.some((mem) => mem.customerId === byPhone.id)) {
      return byPhone.id;
    }
    const match = data.members
      .map((mem) => customers.find((c) => c.id === mem.customerId))
      .find((c) => c && c.phone === user.phone);
    return match?.id || "";
  }, [customers, data, user?.phone]);

  if (!data || data.viewerRole !== "member") {
    return (
      <AppShell crumb={m.nav.chits}>
        <div className="page">
          <p>{m.memberPassbook.notFound}</p>
          <button className="btn ghost" onClick={() => nav("/chits")}>{m.memberPassbook.backToChits}</button>
        </div>
      </AppShell>
    );
  }

  const cycle = displayCycle(data);
  const selfName = customers.find((c) => c.id === selfId)?.name || m.common.you;
  const bal = selfId ? memberBalance(data, selfId) : { due: 0, paid: 0, outstanding: 0 };
  const monthDue = selfId ? rawCycleDue(data, selfId, cycle) : 0;
  const monthPaid = selfId ? paidInCycle(data, selfId, cycle) : 0;
  const monthStatus = selfId ? paymentStatus(data, selfId, cycle) : "due";
  const wins = data.auctions.filter((a) => a.method !== "settlement");
  const isRunning = data.status === "running";
  const ended = chitEndDate(data);
  const monthFmt = haptaDateOptions(data);

  return (
    <AppShell crumb={m.nav.chits} crumb2={data.name}>
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
                {typeLabel(data.type)} · {m.chitsPage.shared}
                {data.title ? ` · ${data.title}` : ""}
              </p>
            </div>
            <span className={`chit-hero-pill${isRunning ? " live" : ""}`}>
              {isRunning ? m.common.active : statusLabel(data.status)}
            </span>
          </div>
        </section>

        {error && <p className="due">{error}</p>}
        {!user?.phone && (
          <PromptBox tone="rose">{m.memberPassbook.matchPhoneHint}</PromptBox>
        )}
        {user?.phone && !selfId && (
          <PromptBox tone="rose">{m.memberPassbook.phoneMatchFail}</PromptBox>
        )}

        <div className="card block">
          <p className="owe-line" style={{ marginTop: 0 }}>
            {m.customerDetail.oweLead}{" "}
            <span className="neg">{inr(Math.max(0, monthDue - monthPaid))}</span>
          </p>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {m.memberPassbook.youPay} · {tx(m.customerDetail.haptaN, { n: cycle })} / {data.duration}
            {" · "}
            <span className={`pill ${monthStatus}`}>{monthPaid >= monthDue ? m.dash.paidHapta : m.memberPassbook.notPaidYet}</span>
          </p>
          <p className="muted" style={{ margin: "8px 0 0" }}>{m.memberPassbook.organiserMarks}</p>
        </div>

        <div className="card block">
          <h2>{m.memberPassbook.aboutGroup}</h2>
          <div className="kv"><span>{m.common.members}</span><strong>{tx(m.chit.membersOf, { count: data.members.length, total: data.membersCount })}</strong></div>
          <div className="kv"><span>{m.chit.instalment}</span><strong>{inr(data.instalment)} / {haptaEveryLabel(data, m.freq, tx, freqLabel(data.frequency) || data.frequency)}</strong></div>
          <div className="kv"><span>{m.chit.started}</span><strong>{cycleStartDate(data, 1).toLocaleDateString(locale, monthFmt)}</strong></div>
          <div className="kv"><span>{m.chit.ends}</span><strong>{ended.toLocaleDateString(locale, monthFmt)}</strong></div>
          <div className="kv"><span>{m.common.you}</span><strong>{selfName}</strong></div>
          <div className="kv"><span>{m.memberPassbook.outstanding}</span><strong>{inr(bal.outstanding)}</strong></div>
        </div>

        {!!wins.length && (
          <div className="card block">
            <h2>{m.memberPassbook.payoutsSoFar}</h2>
            {wins.map((a) => (
              <div key={`${a.cycle}-${a.winnerId}`} className="kv">
                <span>
                  {customers.find((c) => c.id === a.winnerId)?.name || m.common.member}
                  <div className="muted">{tx(m.customerDetail.haptaN, { n: a.cycle })}</div>
                </span>
                <strong>{inr(a.payout)}</strong>
              </div>
            ))}
          </div>
        )}

        <h2>{m.customerDetail.eachHaptaTitle}</h2>
        <div className="hapta-rows block">
          {Array.from({ length: cycle }, (_, i) => i + 1).map((cyc) => {
            if (!selfId) return null;
            const due = rawCycleDue(data, selfId, cyc);
            const paid = paidInCycle(data, selfId, cyc);
            const status = paymentStatus(data, selfId, cyc);
            const left = Math.max(0, due - paid);
            return (
              <div key={cyc} className="hapta-row">
                <strong>{tx(m.customerDetail.haptaN, { n: cyc })}</strong>
                <span className="hapta-row-mid">
                  {m.memberPassbook.due} {inr(due)}
                  {" · "}
                  {m.memberPassbook.paid}{" "}
                  <span className={left ? "neg" : ""}>{inr(paid)}</span>
                </span>
                <span className={`pill ${status}`}>{payStatusLabel(status)}</span>
              </div>
            );
          })}
        </div>

        {!!selfId && data.payments.filter((p) => p.memberId === selfId).length > 0 && (
          <div className="card block">
            <h2>{m.memberPassbook.yourReceipts}</h2>
            {[...data.payments]
              .filter((p) => p.memberId === selfId)
              .reverse()
              .map((p) => (
                <div key={p.id} className="kv">
                  <span>
                    {p.date ? new Date(p.date).toLocaleDateString(locale) : "—"}
                    <div className="muted">{tx(m.customerDetail.haptaN, { n: p.cycle })} · {modeLabel(p.mode || "cash")}</div>
                  </span>
                  <strong>{inr(p.amount)}</strong>
                </div>
              ))}
          </div>
        )}

        {isRunning && (
          <button
            type="button"
            className="quiet-link"
            disabled={exitBusy}
            onClick={() => {
              if (!window.confirm(m.memberPassbook.exitConfirm)) return;
              setExitBusy(true);
              void exitChitAsMember(data.id)
                .then(() => nav("/chits"))
                .catch(() => undefined)
                .finally(() => setExitBusy(false));
            }}
          >
            {exitBusy ? m.memberPassbook.exiting : m.memberPassbook.exitQuiet} · {m.memberPassbook.exitHint}
          </button>
        )}
      </div>
    </AppShell>
  );
}
