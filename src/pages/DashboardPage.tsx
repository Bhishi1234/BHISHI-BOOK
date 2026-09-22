import { ArrowUpRight, CircleX, Layers, PiggyBank, Users, Wallet, AlertCircle, Route } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { chitProgress, collectedThisCycle, displayCycle, outstandingOf } from "../lib/chitMath";
import { chitPath, initials, inr } from "../lib/format";
import { useStore } from "../store";
import { StatCard, toneAt } from "../ui/StatCard";

export function DashboardPage() {
  const { user, chits, cancelChit } = useStore();
  const { m, typeLabel, statusLabel, greetingNow, longDateNow } = useI18n();
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
    <AppShell crumb={m.dash.title}>
      <div className="page">
        <h1>{greetingNow()}, {user?.name}</h1>
        <p className="page-sub">{longDateNow()} · {managed.length} {m.dash.activeCount}</p>
        <div className="stats six">
          <StatCard label={m.dash.activeChits} value={activeCount} hint={m.dash.activeHint} tone="green" icon={Layers} onClick={() => nav("/chits")} />
          <StatCard label={m.dash.managed} value={managed.length} hint={m.dash.managedHint} tone="blue" icon={PiggyBank} onClick={() => nav("/chits")} />
          <StatCard label={m.nav.customers} value={members} hint={m.dash.membersHint} tone="violet" icon={Users} onClick={() => nav("/customers")} />
          <StatCard label={m.dash.collectedCycle} value={inr(collected)} hint={m.dash.collectedHint} tone="teal" icon={Wallet} />
          <StatCard label={m.terms.outstanding} value={inr(outstanding)} hint={m.dash.outstandingHint} tone="rose" icon={AlertCircle} />
          <StatCard label={m.dash.onTrack} value={tracking.length + shared.length} hint={m.dash.onTrackHint} tone="amber" icon={Route} onClick={() => nav("/chits")} />
        </div>
        <div className="row-head">
          <h2>{m.dash.yourChits}</h2>
          <Link className="link" to="/chits">{m.common.viewAll}</Link>
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
                      <span>{typeLabel(c.type)} · {c.members.length} {m.common.members}</span>
                    </div>
                    <div className="dash-chit-actions">
                      <span className={`dash-chit-status${c.status === "running" ? " live" : ""}`}>
                        {statusLabel(c.status) || c.status}
                      </span>
                      <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                    </div>
                  </div>
                  <div className="dash-chit-divider" />
                  <div className="dash-chit-meta">
                    <div>
                      <span>{m.terms.haptaRound}</span>
                      <strong>{displayCycle(c)} / {c.duration}</strong>
                    </div>
                    <div>
                      <span>{m.terms.perHapta}</span>
                      <strong>{inr(c.instalment)}</strong>
                    </div>
                  </div>
                  <div className="dash-chit-progress">
                    <div className="dash-chit-progress-head">
                      <span>{m.terms.collection}</span>
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
              <h2>{m.dash.sharedWithMe}</h2>
              <Link className="link" to="/chits">{m.common.viewAll}</Link>
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
                        <span>{typeLabel(c.type)} · {c.members.length} {m.common.members}</span>
                      </div>
                      <div className="dash-chit-actions">
                        <span className="dash-chit-status">{m.chitsPage.shared}</span>
                        <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                      </div>
                    </div>
                    <div className="dash-chit-divider" />
                    <div className="dash-chit-meta">
                      <div>
                        <span>{m.terms.haptaRound}</span>
                        <strong>{displayCycle(c)} / {c.duration}</strong>
                      </div>
                      <div>
                        <span>{m.terms.perHapta}</span>
                        <strong>{inr(c.instalment)}</strong>
                      </div>
                    </div>
                    <div className="dash-chit-progress">
                      <div className="dash-chit-progress-head">
                        <span>{m.terms.collection}</span>
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
                    <span>{m.chitsPage.tracking} · {inr(c.instalment)}/{m.terms.haptaShort} · {c.duration}</span>
                  </div>
                  <div className="dash-chit-actions">
                    <button
                      className="link"
                      type="button"
                      onClick={(e) => { e.stopPropagation(); void cancelChit(c.id); }}
                    >
                      <CircleX size={14} /> {m.common.cancel}
                    </button>
                    <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                  </div>
                </div>
                <div className="dash-chit-divider" />
                {pct === 0 ? (
                  <div className="due" style={{ margin: "0 0 10px" }}>{m.terms.outstanding}</div>
                ) : (
                  <div className="dash-chit-meta">
                    <div>
                      <span>{m.terms.collected}</span>
                      <strong>{paid} / {c.duration}</strong>
                    </div>
                    <div>
                      <span>{m.terms.collection}</span>
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
