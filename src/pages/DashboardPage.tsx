import { CircleX, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { chitProgress, collectedThisCycle, displayCycle, outstandingOf } from "../lib/chitMath";
import { TYPE_LABEL, chitPath, greeting, initials, inr, longDate } from "../lib/format";
import { useStore } from "../store";

export function DashboardPage() {
  const { user, chits, cancelChit } = useStore();
  const nav = useNavigate();
  const live = chits.filter((c) => c.status !== "cancelled");
  const managed = live.filter((c) => c.mode === "organise" && c.members.length > 0 && c.viewerRole !== "member");
  const tracking = live.filter((c) => c.mode === "tracking" && c.viewerRole !== "member");
  const shared = live.filter((c) => c.viewerRole === "member");
  const members = new Set(managed.flatMap((c) => c.members.map((m) => m.customerId))).size;
  const collected = managed.reduce((s, c) => s + collectedThisCycle(c), 0);
  const outstanding = managed.reduce((s, c) => s + outstandingOf(c), 0);

  return (
    <AppShell crumb="Dashboard">
      <div className="page">
        <h1>{greeting()}, {user?.name}</h1>
        <p className="page-sub">{longDate()} · {managed.length} active chit{managed.length === 1 ? "" : "s"}</p>
        <div className="stats">
          <div className="stat"><span>Active chits</span><strong>{managed.length}</strong></div>
          <div className="stat"><span>Total chits</span><strong>{live.filter((c) => c.mode === "tracking" || c.members.length).length}</strong></div>
          <div className="stat"><span>Members</span><strong>{members}</strong></div>
          <div className="stat"><span>Collected this cycle</span><strong>{inr(collected)}</strong></div>
          <div className="stat"><span>Outstanding</span><strong>{inr(outstanding)}</strong></div>
        </div>
        <div className="row-head">
          <h2>Your chits</h2>
          <Link className="link" to="/chits">View all</Link>
        </div>
        {!!managed.length && (
          <div className="card flush block">
            <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>Chit</th><th>Cycle</th><th>Per cycle</th><th>Collection</th><th>Status</th></tr>
              </thead>
              <tbody>
                {managed.map((c) => {
                  const pct = chitProgress(c);
                  return (
                    <tr key={c.id} className="clickable" onClick={() => nav(chitPath(c))}>
                      <td>
                        <div className="person">
                          <div className="avatar">{initials(c.name)}</div>
                          <div className="grow">
                            <strong>{c.name}</strong>
                            <div className="muted">{TYPE_LABEL[c.type].toUpperCase()} · {c.members.length} members</div>
                          </div>
                        </div>
                      </td>
                      <td className="num">{displayCycle(c)} / {c.duration}</td>
                      <td className="num">{inr(c.instalment)}/M</td>
                      <td>
                        <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                        <div className="muted">{pct}%</div>
                      </td>
                      <td><span className="pill paid">Active</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
        {!!shared.length && (
          <>
            <div className="row-head">
              <h2>Shared with me</h2>
              <Link className="link" to="/chits">View all</Link>
            </div>
            <div className="cards">
              {shared.map((c) => {
                const pct = chitProgress(c);
                return (
                  <article className="card clickable" key={c.id} onClick={() => nav(chitPath(c))}>
                    <div className="card-top">
                      <div className="avatar"><User size={16} /></div>
                      <div className="grow">
                        <div><strong>{c.name}</strong><span className="badge">Shared</span></div>
                        <div className="muted">{TYPE_LABEL[c.type]} · {displayCycle(c)} / {c.duration}</div>
                      </div>
                    </div>
                    <div className="progress blue"><i style={{ width: `${pct}%` }} /></div>
                    <div className="progress-row"><span /><span>{pct}%</span></div>
                  </article>
                );
              })}
            </div>
          </>
        )}
        <div className="cards">
          {tracking.map((c) => {
            const pct = chitProgress(c);
            const paid = c.payments.filter((p) => p.kind === "full").length;
            return (
              <article className="card clickable" key={c.id} onClick={() => nav(chitPath(c))}>
                <div className="card-top">
                  <div className="avatar"><User size={16} /></div>
                  <div className="grow">
                    <div><strong>{c.name}</strong><span className="badge">Tracking</span></div>
                    <div className="muted">{inr(c.instalment)}/Month · {c.duration} Months</div>
                  </div>
                  <button className="link" onClick={(e) => { e.stopPropagation(); void cancelChit(c.id); }}>
                    <CircleX size={14} /> Cancel
                  </button>
                </div>
                {pct === 0 ? <div className="due">Payment due now</div> : <div className="muted" style={{ margin: "12px 0 8px" }}>{paid} / {c.duration} paid</div>}
                <div className="progress blue"><i style={{ width: `${pct}%` }} /></div>
                <div className="progress-row"><span /><span>{pct}%</span></div>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
