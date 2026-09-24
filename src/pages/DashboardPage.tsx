import { ArrowUpRight, Layers, Wallet, AlertCircle, Share2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CancelChitButton } from "../components/CancelChitButton";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { chitProgress, collectedThisCycle, displayCycle, outstandingOf } from "../lib/chitMath";
import { chitPath, initials, inr } from "../lib/format";
import { useStore } from "../store";
import { StatCard, toneAt } from "../ui/StatCard";

export function DashboardPage() {
  const { user, chits } = useStore();
  const { m, typeLabel, statusLabel, greetingNow, longDateNow } = useI18n();
  const nav = useNavigate();
  const active = chits.filter((c) => c.status === "running");
  const managed = active.filter((c) => c.mode === "organise" && c.members.length > 0 && c.viewerRole !== "member");
  const tracking = active.filter((c) => c.mode === "tracking" && c.viewerRole !== "member");
  const shared = active.filter((c) => c.viewerRole === "member");
  const collected = managed.reduce((s, c) => s + collectedThisCycle(c), 0);
  const outstanding = managed.reduce((s, c) => s + outstandingOf(c), 0);
  const activeCount = managed.length;

  return (
    <AppShell crumb={m.dash.title}>
      <div className="page">
        <h1>{greetingNow()}, {user?.name}</h1>
        <p className="page-sub">{longDateNow()} · {managed.length} {m.dash.activeCount}</p>
        <div className="stats four home-stats">
          <StatCard label={m.dash.activeChits} value={activeCount} hint={m.dash.activeHint} tone="green" icon={Layers} onClick={() => nav("/chits")} />
          <StatCard label={m.dash.collectedCycle} value={inr(collected)} hint={m.dash.collectedHint} tone="teal" icon={Wallet} />
          <StatCard label={m.terms.outstanding} value={inr(outstanding)} hint={m.dash.outstandingHint} tone="rose" icon={AlertCircle} />
          <StatCard label={m.dash.sharedWithMe} value={shared.length} hint={m.dash.onTrackHint} tone="blue" icon={Share2} onClick={() => nav("/chits")} />
        </div>
        <div className="row-head">
          <h2>{m.dash.managed}</h2>
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
                  className={`dash-chit slim${featured ? " featured" : ""}`}
                  onClick={() => nav(chitPath(c))}
                >
                  <div className="dash-chit-top">
                    <div className={`dash-chit-avatar tone-${toneAt(i)}`}>{initials(c.name)}</div>
                    <div className="dash-chit-heading">
                      <strong>{c.name}</strong>
                      <span>
                        {typeLabel(c.type)}
                        {` · ${displayCycle(c)} / ${c.duration}`}
                      </span>
                    </div>
                    <div className="dash-chit-actions">
                      <span className="dash-chit-status live">
                        {statusLabel(c.status) || c.status}
                      </span>
                      <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
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
        {!managed.length && <p className="empty block">{m.chitsPage.empty}</p>}
        <div className="row-head">
          <h2>{m.dash.onTrack}</h2>
          <Link className="link" to="/chits">{m.common.viewAll}</Link>
        </div>
        <div className="dash-chits">
          {tracking.map((c, i) => {
            const pct = chitProgress(c);
            const featured = i % 2 === 0;
            return (
              <article
                key={c.id}
                className={`dash-chit slim${featured ? " featured" : ""}`}
                onClick={() => nav(chitPath(c))}
              >
                <div className="dash-chit-top">
                  <div className={`dash-chit-avatar tone-${toneAt(i + 1)}`}>{initials(c.name)}</div>
                  <div className="dash-chit-heading">
                    <strong>{c.name}</strong>
                    <span>{m.chitsPage.tracking} · {displayCycle(c)} / {c.duration}</span>
                  </div>
                  <div className="dash-chit-actions">
                    <CancelChitButton
                      chitId={c.id}
                      className="link"
                      label={m.common.cancel}
                    />
                    <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
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
          {!tracking.length && <p className="empty">{m.chitsPage.empty}</p>}
        </div>
      </div>
    </AppShell>
  );
}
