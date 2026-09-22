import { useMemo } from "react";
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
  const { chits, customers, user } = useStore();
  const { m, typeLabel, freqLabel, modeLabel } = useI18n();
  const data = chits.find((c) => c.id === id);

  const selfId = useMemo(() => {
    if (!data || !user?.phone) return "";
    const byPhone = customers.find((c) => c.phone === user.phone);
    if (byPhone && data.members.some((m) => m.customerId === byPhone.id)) {
      return byPhone.id;
    }
    const match = data.members
      .map((m) => customers.find((c) => c.id === m.customerId))
      .find((c) => c && c.phone === user.phone);
    return match?.id || "";
  }, [customers, data, user?.phone]);

  if (!data || data.viewerRole !== "member") {
    return (
      <AppShell crumb="Chits">
        <div className="page">
          <p>Shared chit not found.</p>
          <button className="btn ghost" onClick={() => nav("/chits")}>Back to chits</button>
        </div>
      </AppShell>
    );
  }

  const cycle = displayCycle(data);
  const selfName = customers.find((c) => c.id === selfId)?.name || "You";
  const bal = selfId ? memberBalance(data, selfId) : { due: 0, paid: 0, outstanding: 0 };
  const monthDue = selfId ? rawCycleDue(data, selfId, cycle) : 0;
  const monthPaid = selfId ? paidInCycle(data, selfId, cycle) : 0;
  const monthStatus = selfId ? paymentStatus(data, selfId, cycle) : "due";
  const wins = data.auctions.filter((a) => a.method !== "settlement");
  const isRunning = data.status === "running";
  const ended = new Date(data.startDate);
  ended.setMonth(ended.getMonth() + data.duration);

  return (
    <AppShell crumb="Chits" crumb2={data.name}>
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
              {isRunning ? "Active" : data.status}
            </span>
          </div>
          <div className="chit-hero-divider" />
          <div className="chit-hero-grid">
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Users size={16} strokeWidth={2} /></div>
              <div>
                <span>Members</span>
                <strong>{data.members.length} of {data.membersCount}</strong>
              </div>
            </div>
            <div className="chit-hero-cell">
              <div className="chit-hero-icon"><Wallet size={16} strokeWidth={2} /></div>
              <div>
                <span>Instalment</span>
                <strong>{inr(data.instalment)}/{freqLabel(data.frequency) || data.frequency}</strong>
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
              <div className="chit-hero-icon"><UserRound size={16} strokeWidth={2} /></div>
              <div>
                <span>You</span>
                <strong>{selfName}</strong>
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
          <p className="chit-hero-note">Read-only passbook · organiser records collections</p>
        </section>

        <div className="row-head" style={{ marginBottom: 12 }}>
          <Link className="btn ghost" to="/chits">All chits</Link>
        </div>

        {!user?.phone && (
          <p className="due block">
            Add your phone on <Link to="/profile">Profile</Link> so we can match you to this group.
          </p>
        )}
        {user?.phone && !selfId && (
          <p className="due block">Could not match your phone to a member on this chit.</p>
        )}

        <div className="stats four">
          <StatCard label="Current month" value={`${cycle} / ${data.duration}`} hint="cycle progress" tone="blue" icon={Calendar} />
          <StatCard label="This month due" value={inr(monthDue)} hint="your share" tone="amber" icon={Wallet} />
          <StatCard label="Paid this month" value={inr(monthPaid)} hint="already paid" tone="green" icon={PiggyBank} />
          <StatCard label="Outstanding" value={inr(bal.outstanding)} hint="still due" tone="rose" icon={AlertCircle} />
        </div>

        <div className="card block">
          <div className="person" style={{ marginBottom: 12 }}>
            <div className="avatar tone-blue">{initials(selfName)}</div>
            <div>
              <strong>{selfName}</strong>
              <div className="muted">{user?.phone || "—"} · month status: {monthStatus}</div>
            </div>
          </div>
          <p className="muted">
            Collections are recorded by the organiser. Your receipts appear here once they mark you paid.
          </p>
        </div>

        <div className="card flush block">
          <div className="card-pad"><h2>Your passbook</h2></div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Cycle</th><th>Due</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
              </thead>
              <tbody>
                {Array.from({ length: cycle }, (_, i) => i + 1).map((cyc) => {
                  if (!selfId) return null;
                  const due = rawCycleDue(data, selfId, cyc);
                  const paid = paidInCycle(data, selfId, cyc);
                  const status = paymentStatus(data, selfId, cyc);
                  return (
                    <tr key={cyc}>
                      <td>Month {cyc}</td>
                      <td>{inr(due)}</td>
                      <td>{inr(paid)}</td>
                      <td>{paid >= due ? "—" : inr(due - paid)}</td>
                      <td><span className={`pill ${status}`}>{status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {!!wins.length && (
          <div className="card flush block">
            <div className="card-pad"><h2>Payouts so far</h2></div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Cycle</th><th>Winner</th><th>Payout</th></tr></thead>
                <tbody>
                  {wins.map((a) => (
                    <tr key={`${a.cycle}-${a.winnerId}`}>
                      <td>{a.cycle}</td>
                      <td>{customers.find((c) => c.id === a.winnerId)?.name || "Member"}</td>
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
            <div className="card-pad"><h2>Your receipts</h2></div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Date</th><th>Cycle</th><th>Amount</th><th>Mode</th></tr></thead>
                <tbody>
                  {[...data.payments]
                    .filter((p) => p.memberId === selfId)
                    .reverse()
                    .map((p) => (
                      <tr key={p.id}>
                        <td>{p.date ? new Date(p.date).toLocaleDateString("en-IN") : "—"}</td>
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
