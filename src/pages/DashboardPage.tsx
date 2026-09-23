import { ArrowUpRight, Layers, PiggyBank, Users, Wallet, AlertCircle, Route } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CancelChitButton } from "../components/CancelChitButton";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { chitProgress, collectedThisCycle, displayCycle, outstandingOf } from "../lib/chitMath";
import { chitPath, initials, inr } from "../lib/format";
import { useStore } from "../store";
import type { Chit } from "../types";
import { StatCard, toneAt } from "../ui/StatCard";

function endMonth(chit: Chit) {
  const d = new Date(chit.startDate);
  d.setMonth(d.getMonth() + chit.duration);
  return d;
}

function commissionText(chit: Chit, formatInr: (n: number) => string) {
  if (chit.commissionKind === "amount" && chit.commissionValue) return formatInr(chit.commissionValue);
  return `${chit.commissionPct}%`;
}

export function DashboardPage() {
  const { user, chits } = useStore();
  const { m, typeLabel, statusLabel, greetingNow, longDateNow, freqLabel, locale } = useI18n();
  const nav = useNavigate();
  const active = chits.filter((c) => c.status === "running");
  const managed = active.filter((c) => c.mode === "organise" && c.members.length > 0 && c.viewerRole !== "member");
  const tracking = active.filter((c) => c.mode === "tracking" && c.viewerRole !== "member");
  const members = new Set(managed.flatMap((c) => c.members.map((m) => m.customerId))).size;
  const collected = managed.reduce((s, c) => s + collectedThisCycle(c), 0);
  const outstanding = managed.reduce((s, c) => s + outstandingOf(c), 0);
  const activeCount = managed.length;

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
          <StatCard label={m.dash.onTrack} value={tracking.length} hint={m.dash.onTrackHint} tone="amber" icon={Route} onClick={() => nav("/chits")} />
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
              const ends = endMonth(c);
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
                      <span>
                        {typeLabel(c.type)}
                        {c.title ? ` · ${c.title}` : ""}
                        {` · ${c.members.length} ${m.common.members}`}
                      </span>
                    </div>
                    <div className="dash-chit-actions">
                      <span className="dash-chit-status live">
                        {statusLabel(c.status) || c.status}
                      </span>
                      <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                    </div>
                  </div>
                  <div className="dash-chit-divider" />
                  <div className="dash-chit-grid">
                    <div>
                      <span>{m.nav.customers}</span>
                      <strong>{c.members.length} / {c.membersCount}</strong>
                    </div>
                    <div>
                      <span>{m.terms.perHapta}</span>
                      <strong>{inr(c.instalment)}/{freqLabel(c.frequency) || c.frequency}</strong>
                    </div>
                    <div>
                      <span>{m.chit.started}</span>
                      <strong>{new Date(c.startDate).toLocaleString(locale, { month: "short", year: "numeric" })}</strong>
                    </div>
                    <div>
                      <span>{m.chit.ends}</span>
                      <strong>{ends.toLocaleString(locale, { month: "short", year: "numeric" })}</strong>
                    </div>
                    <div>
                      <span>{m.terms.commission}</span>
                      <strong>{commissionText(c, inr)}</strong>
                    </div>
                    <div>
                      <span>{m.terms.haptaRound}</span>
                      <strong>{displayCycle(c)} / {c.duration}</strong>
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
                    <CancelChitButton
                      chitId={c.id}
                      className="link"
                      label={m.common.cancel}
                    />
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
          {!tracking.length && <p className="empty">{m.chitsPage.empty}</p>}
        </div>
      </div>
    </AppShell>
  );
}
