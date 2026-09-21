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
        <div className="stats six">
          <div className="stat"><span>Active chits</span><strong>{managed.filter((c) => c.status === "running").length}</strong></div>
          <div className="stat"><span>Bhishi managed by</span><strong>{managed.length}</strong></div>
          <div className="stat"><span>Members</span><strong>{members}</strong></div>
          <div className="stat"><span>Collected this cycle</span><strong>{inr(collected)}</strong></div>
          <div className="stat"><span>Outstanding</span><strong>{inr(outstanding)}</strong></div>
          <div className="stat"><span>Bhishi on track mode</span><strong>{tracking.length + shared.length}</strong></div>
        </div>
        <div className="row-head">
          <h2>Your chits</h2>
          <Link className="link" to="/chits">View all</Link>
        </div>
        {!!managed.length && (
          <div className="dash-chits block">
            {managed.map((c, i) => {
              const pct = chitProgress(c);
              const featured = i === 0;
              return (
                <article
                  key={c.id}
                  className={`dash-chit${featured ? " featured" : ""}`}
                  onClick={() => nav(chitPath(c))}
                >
                  <div className="dash-chit-top">
                    <div className="dash-chit-avatar">{initials(c.name)}</div>
                    <div className="dash-chit-heading">
                      <strong>{c.name}</strong>
                      <span>{TYPE_LABEL[c.type]} · {c.members.length} members</span>
                    </div>
                    <span className={`dash-chit-status${c.status === "running" ? " live" : ""}`}>
                      {c.status === "running" ? "Active" : c.status}
                    </span>
                  </div>
                  <div className="dash-chit-divider" />
                  <div className="dash-chit-meta">
                    <div>
                      <span>Cycle</span>
                      <strong>{displayCycle(c)} / {c.duration}</strong>
                    </div>
                    <div>
                      <span>Per cycle</span>
                      <strong>{inr(c.instalment)}</strong>
                    </div>
                  </div>
                  <div className="dash-chit-progress">
                    <div className="dash-chit-progress-head">
                      <span>Collection</span>
                      <strong>{pct}%</strong>
                    </div>
                    <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                  </div>
                </article>
              );
            })}
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
