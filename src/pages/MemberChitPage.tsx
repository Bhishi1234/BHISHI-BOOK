import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import {
  displayCycle,
  memberBalance,
  paidInCycle,
  paymentStatus,
  rawCycleDue,
} from "../lib/chitMath";
import { MODE_LABEL, TYPE_LABEL, initials, inr } from "../lib/format";
import { useStore } from "../store";

/** Read-only passbook for a chit the user belongs to via phone match. */
export function MemberChitPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { chits, customers, user } = useStore();
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

  return (
    <AppShell crumb="Chits" crumb2={data.name}>
      <div className="page">
        <div className="row-head top">
          <div>
            <div className="title-row">
              <h1>{data.name}</h1>
              <span className="badge">Shared</span>
              <span className="pill paid">{data.status === "running" ? "Active" : data.status}</span>
              <span className="badge">{TYPE_LABEL[data.type]}</span>
            </div>
            <p className="page-sub">
              Read-only view · {data.members.length} members · {inr(data.instalment)}/{data.frequency}
            </p>
          </div>
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
          <div className="stat"><span>Current month</span><strong>{cycle} / {data.duration}</strong></div>
          <div className="stat"><span>This month due</span><strong>{inr(monthDue)}</strong></div>
          <div className="stat"><span>Paid this month</span><strong>{inr(monthPaid)}</strong></div>
          <div className="stat"><span>Outstanding</span><strong>{inr(bal.outstanding)}</strong></div>
        </div>

        <div className="card block">
          <div className="person" style={{ marginBottom: 12 }}>
            <div className="avatar">{initials(selfName)}</div>
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
                        <td>{MODE_LABEL[p.mode || "cash"]}</td>
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
