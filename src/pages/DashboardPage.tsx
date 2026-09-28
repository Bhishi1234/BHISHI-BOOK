import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpRight, Layers, Wallet, Share2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CancelChitButton } from "../components/CancelChitButton";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import {
  chitProgress,
  collectedThisCycle,
  displayCycle,
  memberBalance,
  outstandingOf,
  paidInCycle,
  rawCycleDue,
} from "../lib/chitMath";
import { haptaEveryLabel } from "../lib/haptaInterval";
import { chitPath, initials, inr } from "../lib/format";
import { useStore } from "../store";
import { FirstRunWelcome } from "../components/FirstRunWelcome";
import { firstRunStage, setFirstRun } from "../lib/firstRun";
import { StatCard, toneAt } from "../ui/StatCard";
import type { Chit } from "../types";

export function DashboardPage() {
  const { user, chits, customers } = useStore();
  const { m, tx, typeLabel, freqLabel, statusLabel, greetingNow, longDateNow } = useI18n();
  const nav = useNavigate();
  const [welcome, setWelcome] = useState(false);
  useEffect(() => {
    const stage = user ? firstRunStage(user) : null;
    if (stage === "pending" || stage === "creating") setWelcome(true);
  }, [user]);
  const active = chits.filter((c) => c.status === "running");
  const managed = active.filter((c) => c.mode === "organise" && c.members.length > 0 && c.viewerRole !== "member");
  const tracking = active.filter((c) => c.mode === "tracking" && c.viewerRole !== "member");
  const shared = active.filter((c) => c.viewerRole === "member");
  const collected = managed.reduce((s, c) => s + collectedThisCycle(c), 0);
  const outstanding = managed.reduce((s, c) => s + outstandingOf(c), 0);
  const memberHome = managed.length === 0 && tracking.length === 0;

  function selfIn(c: Chit) {
    if (!user?.phone) return undefined;
    return customers.find((cu) => cu.phone === user.phone && c.members.some((mem) => mem.customerId === cu.id));
  }

  function sharedLine(c: Chit) {
    const self = selfIn(c);
    const cycle = displayCycle(c);
    const due = self ? rawCycleDue(c, self.id, cycle) : c.instalment;
    const paid = self ? paidInCycle(c, self.id, cycle) : 0;
    const soFar = self ? memberBalance(c, self.id).paid : 0;
    const prize = self
      ? c.auctions.find((a) => a.winnerId === self.id && a.method !== "settlement")
      : undefined;
    return { due, left: Math.max(0, due - paid), soFar, prize, cycle };
  }

  const sharedPay = shared.reduce((s, c) => s + sharedLine(c).left, 0);

  function groupCard(c: Chit, i: number, toneShift: number, extra: ReactNode, featured = i % 2 === 0) {
    const pct = chitProgress(c);
    return (
      <article
        key={c.id}
        className={`dash-chit slim${featured ? " featured" : ""}`}
        onClick={() => nav(chitPath(c))}
      >
        <div className="dash-chit-top">
          <div className={`dash-chit-avatar tone-${toneAt(i + toneShift)}`}>{initials(c.name)}</div>
          <div className="dash-chit-heading">
            <strong>{c.name}</strong>
            <span>
              {typeLabel(c.type)}
              {` · ${displayCycle(c)} / ${c.duration}`}
            </span>
          </div>
          <div className="dash-chit-actions">
            <span className={`dash-chit-status${c.viewerRole !== "member" && c.mode === "organise" ? " live" : ""}`}>
              {c.viewerRole === "member" ? m.chitsPage.shared : statusLabel(c.status) || c.status}
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
        {extra}
      </article>
    );
  }

  function sharedExtra(c: Chit, detailed: boolean) {
    const line = sharedLine(c);
    return (
      <>
        <div className={`dash-due-line${line.left ? "" : " clear"}`}>
          {tx(m.dash.youPayLine, { amount: inr(line.due) })}
          {" · "}
          {line.left ? m.dash.notPaidYet : m.dash.paidHapta}
        </div>
        {detailed && (
          <>
            <div className="dash-due-line soft">
              {c.members.length} {m.common.members}
              {" · "}
              {inr(c.instalment)} / {haptaEveryLabel(c, m.freq, tx, freqLabel(c.frequency) || c.frequency)}
            </div>
            <div className="dash-due-line soft">
              {tx(m.dash.paidSoFarLine, { amount: inr(line.soFar) })}
              {" · "}
              {line.prize ? tx(m.customerDetail.cyclePrized, { n: line.prize.cycle }) : m.customerDetail.noWinsYet}
            </div>
          </>
        )}
      </>
    );
  }

  return (
    <AppShell crumb={m.dash.title}>
      <div className="page">
        <h1>{greetingNow()}, {user?.name}</h1>
        <p className="page-sub">{longDateNow()}</p>

        {memberHome ? (
          <>
            <div className="lead-card">
              <p className="kicker">{m.dash.sharedWithMe}</p>
              <strong className="lead-figure">{inr(sharedPay)}</strong>
              <p>
                {m.memberPassbook.youPay}
                {" · "}
                {shared.some((c) => sharedLine(c).left > 0) ? m.dash.notPaidYet : m.dash.paidHapta}
              </p>
            </div>
            <div className="dash-chits">
              {shared.map((c, i) => groupCard(c, i, 2, sharedExtra(c, true), false))}
              {!shared.length && <p className="empty">{m.chitsPage.empty}</p>}
            </div>
          </>
        ) : (
          <>
            <div className="lead-card">
              <p className="kicker">{m.dash.stillToCollect}</p>
              <strong className="lead-figure">{inr(outstanding)}</strong>
              <p>{m.dash.stillToCollectHint}</p>
            </div>
            <div className="stats three home-stats">
              <StatCard label={m.dash.activeChits} value={managed.length} hint={m.dash.activeHint} tone="green" icon={Layers} onClick={() => nav("/chits")} />
              <StatCard label={m.dash.collectedCycle} value={inr(collected)} hint={m.dash.collectedHint} tone="teal" icon={Wallet} />
              <StatCard label={m.dash.sharedWithMe} value={shared.length} hint={m.dash.onTrackHint} tone="blue" icon={Share2} onClick={() => nav("/chits")} />
            </div>
            <div className="row-head">
              <h2>{m.dash.managed}</h2>
              <Link className="link" to="/chits">{m.common.viewAll}</Link>
            </div>
            {!!managed.length && (
              <div className="dash-chits block">
                {managed.map((c, i) => groupCard(
                  c,
                  i,
                  0,
                  <div className={`dash-due-line${outstandingOf(c) ? "" : " clear"}`}>
                    {outstandingOf(c)
                      ? tx(m.dash.stillDueLine, { amount: inr(outstandingOf(c)) })
                      : m.dash.paidHapta}
                  </div>,
                ))}
              </div>
            )}
            {!managed.length && <p className="empty block">{m.chitsPage.empty}</p>}
            {!!shared.length && (
              <>
                <div className="row-head">
                  <h2>{m.dash.sharedWithMe}</h2>
                  <Link className="link" to="/chits">{m.common.viewAll}</Link>
                </div>
                <div className="dash-chits block">
                  {shared.map((c, i) => groupCard(c, i, 2, sharedExtra(c, true), false))}
                </div>
              </>
            )}
            {!!tracking.length && (
              <>
                <div className="row-head">
                  <h2>{m.dash.trackingTitle}</h2>
                </div>
                <div className="dash-chits">
                  {tracking.map((c, i) => groupCard(
                    c,
                    i,
                    1,
                    <div className="dash-chit-actions" style={{ marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                      <CancelChitButton chitId={c.id} className="link" label={m.common.cancel} />
                    </div>,
                    false,
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
      {welcome && user && (
        <FirstRunWelcome
          onCreate={() => {
            setFirstRun(user, "creating");
          }}
        />
      )}
    </AppShell>
  );
}
