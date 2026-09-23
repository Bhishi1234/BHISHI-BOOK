import { useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CalendarRange,
  PiggyBank,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PromptBox } from "../components/PromptBox";
import { AppShell } from "../layout/AppShell";
import {
  displayCycle,
  memberBalance,
  paidInCycle,
  paymentStatus,
  rawCycleDue,
} from "../lib/chitMath";
import { useI18n } from "../i18n";
import { initials, inr } from "../lib/format";
import { useStore } from "../store";
import { StatCard } from "../ui/StatCard";

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
  const ended = new Date(data.startDate);
  ended.setMonth(ended.getMonth() + data.duration);
  const monthFmt = { month: "short" as const, year: "numeric" as const };

  return (
    <AppShell crumb={m.nav.chits} crumb2={data.name}>
      <div className="page">
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
          <div className="chit-hero-divider" />
          <div className="chit-hero-grid">
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Users size={16} strokeWidth={2} /></div>
              <div>
                <span>{m.common.members}</span>
                <strong>{tx(m.chit.membersOf, { count: data.members.length, total: data.membersCount })}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Wallet size={16} strokeWidth={2} /></div>
              <div>
                <span>{m.chit.instalment}</span>
                <strong>{inr(data.instalment)}/{freqLabel(data.frequency) || data.frequency}</strong>
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
              <div className="chit-hero-icon"><UserRound size={16} strokeWidth={2} /></div>
              <div>
                <span>{m.common.you}</span>
                <strong>{selfName}</strong>
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
          <p className="chit-hero-note">{m.memberPassbook.subtitle}</p>
        </section>

        <div className="row-head" style={{ marginBottom: 12 }}>
          <Link className="btn ghost" to="/chits">{m.memberPassbook.allChits}</Link>
          {isRunning && (
            <button
              type="button"
              className="btn danger"
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
              {exitBusy ? m.memberPassbook.exiting : m.memberPassbook.exitGroup}
            </button>
          )}
        </div>

        {error && <p className="due">{error}</p>}

        <PromptBox tone="blue">{m.memberPassbook.exitHint}</PromptBox>

        {!user?.phone && (
          <PromptBox tone="rose">{m.memberPassbook.matchPhoneHint}</PromptBox>
        )}
        {user?.phone && !selfId && (
          <PromptBox tone="rose">{m.memberPassbook.phoneMatchFail}</PromptBox>
        )}

        <div className="stats four">
          <StatCard label={m.tracked.currentMonth} value={`${cycle} / ${data.duration}`} hint={m.memberPassbook.cycleProgress} tone="blue" icon={Calendar} />
          <StatCard label={m.memberPassbook.thisMonthDue} value={inr(monthDue)} hint={m.memberPassbook.yourShare} tone="amber" icon={Wallet} />
          <StatCard label={m.memberPassbook.paidThisMonth} value={inr(monthPaid)} hint={m.memberPassbook.alreadyPaid} tone="green" icon={PiggyBank} />
          <StatCard label={m.memberPassbook.outstanding} value={inr(bal.outstanding)} hint={m.customersPage.stillDue} tone="rose" icon={AlertCircle} />
        </div>

        <div className="card block">
          <div className="person" style={{ marginBottom: 12 }}>
            <div className="avatar tone-blue">{initials(selfName)}</div>
            <div>
              <strong>{selfName}</strong>
              <div className="muted">{user?.phone || "—"} · {tx(m.memberPassbook.monthStatus, { status: payStatusLabel(monthStatus) })}</div>
            </div>
          </div>
          <PromptBox tone="teal">{m.memberPassbook.organiserRecords}</PromptBox>
        </div>

        <div className="card flush block">
          <div className="card-pad"><h2>{m.memberPassbook.yourPassbook}</h2></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{m.memberPassbook.cycle}</th>
                  <th>{m.memberPassbook.due}</th>
                  <th>{m.memberPassbook.paid}</th>
                  <th>{m.memberPassbook.balance}</th>
                  <th>{m.memberPassbook.status}</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: cycle }, (_, i) => i + 1).map((cyc) => {
                  if (!selfId) return null;
                  const due = rawCycleDue(data, selfId, cyc);
                  const paid = paidInCycle(data, selfId, cyc);
                  const status = paymentStatus(data, selfId, cyc);
                  return (
                    <tr key={cyc}>
                      <td>{tx(m.memberPassbook.monthN, { n: cyc })}</td>
                      <td>{inr(due)}</td>
                      <td>{inr(paid)}</td>
                      <td>{paid >= due ? "—" : inr(due - paid)}</td>
                      <td><span className={`pill ${status}`}>{payStatusLabel(status)}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!!wins.length && (
          <div className="card flush block">
            <div className="card-pad"><h2>{m.memberPassbook.payoutsSoFar}</h2></div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{m.memberPassbook.cycle}</th>
                    <th>{m.memberPassbook.winner}</th>
                    <th>{m.memberPassbook.payout}</th>
                  </tr>
                </thead>
                <tbody>
                  {wins.map((a) => (
                    <tr key={`${a.cycle}-${a.winnerId}`}>
                      <td>{a.cycle}</td>
                      <td>{customers.find((c) => c.id === a.winnerId)?.name || m.common.member}</td>
                      <td>{inr(a.payout)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!!selfId && data.payments.filter((p) => p.memberId === selfId).length > 0 && (
          <div className="card flush block">
            <div className="card-pad"><h2>{m.memberPassbook.yourReceipts}</h2></div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{m.common.date}</th>
                    <th>{m.memberPassbook.cycle}</th>
                    <th>{m.memberPassbook.amount}</th>
                    <th>{m.memberPassbook.mode}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.payments]
                    .filter((p) => p.memberId === selfId)
                    .reverse()
                    .map((p) => (
                      <tr key={p.id}>
                        <td>{p.date ? new Date(p.date).toLocaleDateString(locale) : "—"}</td>
                        <td>{p.cycle}</td>
                        <td>{inr(p.amount)}</td>
                        <td>{modeLabel(p.mode || "cash")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
