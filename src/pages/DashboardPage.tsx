import { ArrowUpRight, CircleX, Layers, PiggyBank, Users, Wallet, AlertCircle, Route } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { chitProgress, collectedThisCycle, displayCycle, outstandingOf } from "../lib/chitMath";
import { TYPE_LABEL, chitPath, greeting, initials, inr, longDate } from "../lib/format";
import { useStore } from "../store";
import { StatCard, toneAt } from "../ui/StatCard";

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
  const activeCount = managed.filter((c) => c.status === "running").length;

  return (
    <AppShell crumb="Dashboard">
      <div className="page">
        <h1>{greeting()}, {user?.name}</h1>
        <p className="page-sub">{longDate()} · {managed.length} active chit{managed.length === 1 ? "" : "s"}</p>
        <div className="stats six">
          <StatCard label="Active chits" value={activeCount} hint="Running now" tone="green" icon={Layers} onClick={() => nav("/chits")} />
          <StatCard label="Bhishi managed" value={managed.length} hint="You organise" tone="blue" icon={PiggyBank} onClick={() => nav("/chits")} />
          <StatCard label="Members" value={members} hint="Across your chits" tone="violet" icon={Users} onClick={() => nav("/customers")} />
          <StatCard label="Collected this cycle" value={inr(collected)} hint="This month in" tone="teal" icon={Wallet} />
          <StatCard label="Outstanding" value={inr(outstanding)} hint="Still to collect" tone="rose" icon={AlertCircle} />
          <StatCard label="On track mode" value={tracking.length + shared.length} hint="Tracking + shared" tone="amber" icon={Route} onClick={() => nav("/chits")} />
        </div>
        <div className="row-head">
          <h2>Your chits</h2>
          <Link className="link" to="/chits">View all</Link>
        </div>
        {!!managed.length && (
          <div className="dash-chits block">
            {managed.map((c, i) => {
              const pct = chitProgress(c);
              const featured = i % 2 === 0;
              return (
                <article
                  key={c.id}
                  className={`dash-chit${featured ? " featured" : ""}`}
                  onClick={() => nav(chitPath(c))}
                >
                  <div className="dash-chit-top">
                    <div className={`dash-chit-avatar tone-${toneAt(i)}`}>{initials(c.name)}</div>
                    <div className="dash-chit-heading">
                      <strong>{c.name}</strong>
                      <span>{TYPE_LABEL[c.type]} · {c.members.length} members</span>
                    </div>
                    <div className="dash-chit-actions">
                      <span className={`dash-chit-status${c.status === "running" ? " live" : ""}`}>
                        {c.status === "running" ? "Active" : c.status}
                      </span>
                      <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                    </div>
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
            <div className="dash-chits block">
              {shared.map((c, i) => {
                const pct = chitProgress(c);
                const featured = i % 2 === 0;
                return (
                  <article
                    key={c.id}
                    className={`dash-chit${featured ? " featured" : ""}`}
                    onClick={() => nav(chitPath(c))}
                  >
                    <div className="dash-chit-top">
                      <div className={`dash-chit-avatar tone-${toneAt(i + 2)}`}>{initials(c.name)}</div>
                      <div className="dash-chit-heading">
                        <strong>{c.name}</strong>
                        <span>{TYPE_LABEL[c.type]} · {c.members.length} members</span>
                      </div>
                      <div className="dash-chit-actions">
                        <span className="dash-chit-status">Shared</span>
                        <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                      </div>
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
          </>
        )}
        <div className="dash-chits">
          {tracking.map((c, i) => {
            const pct = chitProgress(c);
            const paid = c.payments.filter((p) => p.kind === "full").length;
            const featured = i % 2 === 0;
            return (
              <article
                key={c.id}
                className={`dash-chit${featured ? " featured" : ""}`}
                onClick={() => nav(chitPath(c))}
              >
                <div className="dash-chit-top">
                  <div className={`dash-chit-avatar tone-${toneAt(i + 1)}`}>{initials(c.name)}</div>
                  <div className="dash-chit-heading">
                    <strong>{c.name}</strong>
                    <span>Tracking · {inr(c.instalment)}/mo · {c.duration} months</span>
                  </div>
                  <div className="dash-chit-actions">
                    <button
                      className="link"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void cancelChit(c.id); }}
                    >
                      <CircleX size={14} /> Cancel
                    </button>
                    <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                  </div>
                </div>
                <div className="dash-chit-divider" />
                {pct === 0 ? (
                  <div className="due" style={{ margin: "0 0 10px" }}>Payment due now</div>
                ) : (
                  <div className="dash-chit-meta">
                    <div>
                      <span>Paid</span>
                      <strong>{paid} / {c.duration}</strong>
                    </div>
                    <div>
                      <span>Progress</span>
                      <strong>{pct}%</strong>
                    </div>
                  </div>
                )}
                <div className="dash-chit-progress">
                  <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}
