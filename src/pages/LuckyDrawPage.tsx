import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { displayCycle, handLabel, isLuckyDrawChit } from "../lib/chitMath";
import { inr } from "../lib/format";
import { shareLuckyDrawResult, WHEEL_PALETTE } from "../lib/luckyDrawShare";
import { useStore } from "../store";
import type { AuctionRecord, ChitMember } from "../types";

type Phase = "ready" | "spinning" | "pending" | "done" | "error";

const SPIN_MS = 4800;

function memberKey(m: ChitMember) {
  return `${m.customerId}::${m.slot}`;
}

function isSameHand(m: ChitMember, winnerId: string, winnerSlot?: number) {
  if (m.customerId !== winnerId) return false;
  if (winnerSlot == null) return true;
  return m.slot === winnerSlot;
}

/** Bring segment center to 12 o'clock (fixed pointer). CSS rotate is clockwise. */
function landRotation(winnerIndex: number, count: number, fromDeg: number) {
  const seg = 360 / Math.max(count, 1);
  const landAt = (360 - (winnerIndex + 0.5) * seg + 360) % 360;
  const current = ((fromDeg % 360) + 360) % 360;
  let delta = (landAt - current + 360) % 360;
  if (delta < 40) delta += 360;
  return fromDeg + 360 * 5 + delta;
}

function conicFor(count: number) {
  if (count <= 0) return "conic-gradient(#2f6fed 0deg 360deg)";
  const seg = 360 / count;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const c = WHEEL_PALETTE[i % WHEEL_PALETTE.length]!;
    parts.push(`${c} ${i * seg}deg ${(i + 1) * seg}deg`);
  }
  return `conic-gradient(from 0deg, ${parts.join(", ")})`;
}

export function LuckyDrawPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { chits, customers, recordAuction, replaceCycleAward } = useStore();
  const { m: copy, tx, locale } = useI18n();
  const chit = chits.find((c) => c.id === id);

  const names = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of customers) map[c.id] = c.name;
    return map;
  }, [customers]);

  const cycle = chit ? displayCycle(chit) : 1;

  const eligible = useMemo(() => {
    if (!chit) return [] as ChitMember[];
    return [...chit.members]
      .filter((mem) => !mem.prizedCycle)
      .sort((a, b) => a.slot - b.slot);
  }, [chit]);

  const existingWin = useMemo(() => {
    if (!chit) return null;
    return chit.auctions.find((a) => a.cycle === cycle && a.method === "lucky_draw") || null;
  }, [chit, cycle]);

  const [phase, setPhase] = useState<Phase>("ready");
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [result, setResult] = useState<AuctionRecord | null>(null);
  const [pendingKey, setPendingKey] = useState("");
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [drawnAt, setDrawnAt] = useState<Date | null>(null);
  /** Wheel land — kept when admin later allots to someone else. */
  const [spinWinnerKey, setSpinWinnerKey] = useState<string | null>(null);
  /** Frozen list of hands on the wheel for this draw (survives store prize update). */
  const [pool, setPool] = useState<ChitMember[] | null>(null);
  const spunRef = useRef(false);
  const hydratedRef = useRef(false);

  const labelOf = (mem: ChitMember) => {
    const hands = chit?.members.filter((x) => x.customerId === mem.customerId).length || 1;
    return handLabel(names[mem.customerId] || "Member", mem.slot, hands);
  };

  const pickList = pool ?? eligible;

  // Already awarded this cycle — show result, allow change.
  useEffect(() => {
    if (!chit || !existingWin || hydratedRef.current || spunRef.current) return;
    hydratedRef.current = true;
    const winnerHand =
      chit.members.find((mem) => isSameHand(mem, existingWin.winnerId, existingWin.winnerSlot)) ||
      ({
        customerId: existingWin.winnerId,
        slot: existingWin.winnerSlot ?? 1,
        prizedCycle: cycle,
      } satisfies ChitMember);
    const rest = chit.members
      .filter((mem) => !isSameHand(mem, existingWin.winnerId, existingWin.winnerSlot))
      .sort((a, b) => a.slot - b.slot);
    const rebuilt = [winnerHand, ...rest.filter((m) => !m.prizedCycle || isSameHand(m, existingWin.winnerId, existingWin.winnerSlot))];
    setPool(rebuilt.length ? rebuilt : [winnerHand]);
    setResult(existingWin);
    setPendingKey(memberKey(winnerHand));
    setRotation(landRotation(0, Math.max(rebuilt.length, 1), 0));
    setPhase("done");
    setDrawnAt(new Date());
  }, [chit, existingWin, cycle]);

  // Last member remaining: award directly (no wheel).
  useEffect(() => {
    if (!chit || existingWin || hydratedRef.current || eligible.length !== 1) return;
    hydratedRef.current = true;
    const only = eligible[0]!;
    setPool([only]);
    setPendingKey(memberKey(only));
    setPhase("pending");
  }, [chit, existingWin, eligible]);

  const displayMembers = pool ?? eligible;

  const labelForKey = (key: string) => {
    if (!chit) return "";
    const [cid, slotStr] = key.split("::");
    const slot = Number(slotStr) || 1;
    const hands = chit.members.filter((x) => x.customerId === cid).length;
    return handLabel(names[cid || ""] || copy.luckyDraw.winner, slot, hands);
  };

  const allottedName = useMemo(() => {
    if (!result || !chit) return "";
    const hands = chit.members.filter((x) => x.customerId === result.winnerId).length;
    return handLabel(names[result.winnerId] || copy.luckyDraw.winner, result.winnerSlot ?? 1, hands);
  }, [result, chit, names, copy.luckyDraw.winner]);

  /** Drawn winner stays on share card; allotted is who actually received the pot. */
  const drawnWinnerName = spinWinnerKey ? labelForKey(spinWinnerKey) : allottedName;
  const shareAllottedName =
    spinWinnerKey && result && `${result.winnerId}::${result.winnerSlot ?? 1}` !== spinWinnerKey
      ? allottedName
      : undefined;

  const pendingMember = pickList.find((m) => memberKey(m) === pendingKey) || pickList[0];

  function onSpin() {
    if (!chit || phase === "spinning" || spunRef.current) return;
    if (existingWin) {
      setResult(existingWin);
      setPhase("done");
      return;
    }
    if (eligible.length === 0) {
      setError(copy.luckyDraw.notFound);
      setPhase("error");
      return;
    }
    if (eligible.length === 1) {
      setPool([...eligible]);
      setPendingKey(memberKey(eligible[0]!));
      setPhase("pending");
      return;
    }

    spunRef.current = true;
    setError("");
    setPhase("spinning");
    setAnimating(true);
    const snapshot = [...eligible];
    setPool(snapshot);
    const idx = Math.floor(Math.random() * snapshot.length);
    const picked = snapshot[idx]!;
    const key = memberKey(picked);
    setPendingKey(key);
    setSpinWinnerKey(key);
    setRotation((prev) => landRotation(idx, snapshot.length, prev));

    window.setTimeout(() => {
      setAnimating(false);
      setPhase("pending");
      spunRef.current = false;
    }, SPIN_MS + 80);
  }

  function startPick() {
    if (!eligible.length) return;
    setPool([...eligible]);
    setPendingKey(memberKey(eligible[0]!));
    setPhase("pending");
    setError("");
  }

  function startChange() {
    const base = eligible.length
      ? [...eligible]
      : (pool || []).filter((m) => !m.prizedCycle || (result && isSameHand(m, result.winnerId, result.winnerSlot)));
    const list = base.length ? base : pickList;
    setPool(list);
    setPendingKey(result ? `${result.winnerId}::${result.winnerSlot ?? 1}` : memberKey(list[0]!));
    setPhase("pending");
    setError("");
  }

  async function onConfirm() {
    if (!chit || !pendingMember) return;
    setSaving(true);
    setError("");
    try {
      const rec = existingWin
        ? await replaceCycleAward(chit.id, pendingMember.customerId, chit.pot, "lucky_draw", pendingMember.slot)
        : await recordAuction(chit.id, pendingMember.customerId, chit.pot, "lucky_draw", pendingMember.slot);
      if (!rec) throw new Error("Could not award winner");
      setResult(rec);
      setDrawnAt(new Date());
      setPhase("done");
      hydratedRef.current = true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not confirm winner");
      setPhase("error");
    } finally {
      setSaving(false);
    }
  }

  async function onShare() {
    if (!chit || !result) return;
    setSharing(true);
    try {
      await shareLuckyDrawResult({
        chitName: chit.name,
        cycle,
        duration: chit.duration,
        winnerName: drawnWinnerName,
        allottedName: shareAllottedName,
        payout: result.payout,
        entrants: displayMembers.map(labelOf),
        drawnAt: drawnAt || new Date(),
        labels: {
          brand: copy.brand,
          title: copy.luckyDraw.title,
          winner: copy.luckyDraw.winner,
          allotted: copy.luckyDraw.allottedTo,
          adminAllotted: copy.luckyDraw.adminAllotted,
          monthOf: copy.luckyDraw.monthOf,
          verified: copy.luckyDraw.verified,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not share");
    } finally {
      setSharing(false);
    }
  }

  if (!chit) {
    return (
      <AppShell crumb={copy.nav.chits}>
        <div className="page">
          <p>{copy.luckyDraw.notFound}</p>
          <button className="btn ghost" type="button" onClick={() => nav("/chits")}>
            {copy.luckyDraw.back}
          </button>
        </div>
      </AppShell>
    );
  }

  const n = Math.max(displayMembers.length, 1);
  const seg = 360 / n;
  const lastOnly = eligible.length === 1 && !existingWin;

  return (
    <AppShell crumb={copy.nav.chits} crumb2={chit.name}>
      <div className="page ld-page">
        <div className="ld-topbar">
          <Link className="ld-back" to={`/chits/${chit.id}`}>
            <ArrowLeft size={18} /> {copy.luckyDraw.back}
          </Link>
        </div>

        <header className="ld-header">
          <p className="ld-kicker">{copy.brand}</p>
          <h1>{copy.luckyDraw.title}</h1>
          <p className="ld-sub">
            {chit.name} — {copy.terms.haptaRound} {cycle}
            {isLuckyDrawChit(chit) ? "" : ` · ${copy.luckyDraw.chitthi}`}
          </p>
        </header>

        {!lastOnly && (
          <div className="ld-stage">
            <div className="ld-pointer" aria-hidden />
            <div
              className={`ld-wheel ${animating ? "is-spinning" : ""}`}
              style={{
                background: conicFor(n),
                transform: `rotate(${rotation}deg)`,
                transition: animating
                  ? `transform ${SPIN_MS}ms cubic-bezier(0.08, 0.82, 0.08, 1)`
                  : "none",
              }}
            >
              {displayMembers.map((mem, i) => {
                const mid = i * seg + seg / 2;
                const label = labelOf(mem);
                const maxLen = n > 10 ? 7 : n > 6 ? 10 : 14;
                const short = label.length > maxLen ? `${label.slice(0, maxLen - 1)}…` : label;
                return (
                  <span
                    key={memberKey(mem)}
                    className="ld-seg-label"
                    style={{
                      transform: `rotate(${mid}deg)`,
                      fontSize: n > 14 ? 10 : n > 10 ? 11 : n > 6 ? 12 : 13,
                    }}
                  >
                    <span className="ld-seg-label-text">{short}</span>
                  </span>
                );
              })}
            </div>
            <div className="ld-hub" aria-hidden>
              <span>BC</span>
            </div>
          </div>
        )}

        {phase === "ready" && (
          <div className="ld-actions">
            <p className="ld-hint">
              {lastOnly
                ? copy.luckyDraw.awardLast
                : tx(copy.luckyDraw.eligible, { n: eligible.length })}
            </p>
            <p className="ld-hint">{copy.luckyDraw.spinOrPick}</p>
            {lastOnly ? (
              <button className="btn ld-spin-btn" type="button" onClick={startPick}>
                {copy.luckyDraw.awardLast}
              </button>
            ) : (
              <>
                <button
                  className="btn ld-spin-btn"
                  type="button"
                  disabled={eligible.length === 0}
                  onClick={() => onSpin()}
                >
                  {copy.luckyDraw.spin}
                </button>
                <button
                  className="btn ghost"
                  type="button"
                  style={{ marginTop: 10 }}
                  disabled={eligible.length === 0}
                  onClick={startPick}
                >
                  {copy.luckyDraw.pickWinner}
                </button>
              </>
            )}
          </div>
        )}

        {phase === "spinning" && (
          <div className="ld-actions">
            <p className="ld-hint ld-hint-pulse">
              <Loader2 size={16} className="spin" /> {tx(copy.luckyDraw.drawing, { n: displayMembers.length })}
            </p>
          </div>
        )}

        {phase === "pending" && (
          <div className="ld-actions">
            <p className="ld-hint">{lastOnly ? copy.luckyDraw.awardLast : copy.luckyDraw.pendingHint}</p>
            <label className="label">{copy.luckyDraw.winner}</label>
            <select
              className="field"
              value={pendingKey}
              onChange={(e) => setPendingKey(e.target.value)}
              disabled={saving || (lastOnly && pickList.length === 1)}
            >
              {pickList.map((mem) => (
                <option key={memberKey(mem)} value={memberKey(mem)}>
                  {labelOf(mem)}
                </option>
              ))}
            </select>
            <button
              className="btn ld-spin-btn"
              type="button"
              style={{ marginTop: 12 }}
              disabled={!pendingMember || saving}
              onClick={() => void onConfirm()}
            >
              {saving ? copy.common.loading : copy.luckyDraw.confirmWinner}
            </button>
            {!lastOnly && !existingWin && (
              <button className="btn ghost" type="button" style={{ marginTop: 8 }} disabled={saving} onClick={() => { setPool(null); setPhase("ready"); }}>
                {copy.common.back}
              </button>
            )}
          </div>
        )}

        {phase === "error" && (
          <div className="ld-actions">
            <p className="due">{error}</p>
            <button className="btn" type="button" onClick={() => { setPhase(existingWin ? "done" : "ready"); setError(""); }}>
              {copy.luckyDraw.tryAgain}
            </button>
          </div>
        )}

        {phase === "done" && result && (
          <div className="ld-actions">
            <div className="ld-result">
              <p className="ld-result-kicker">{copy.luckyDraw.winner}</p>
              <h2>{drawnWinnerName}</h2>
              {shareAllottedName ? (
                <p className="muted" style={{ marginTop: 6 }}>
                  {tx(copy.luckyDraw.adminAllotted, { name: shareAllottedName })}
                </p>
              ) : null}
              <p className="ld-result-amt">{inr(result.payout)}</p>
              <p className="muted">
                {drawnAt
                  ? drawnAt.toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                  : ""}
              </p>
            </div>
            <div className="ld-verified">{copy.luckyDraw.verified}</div>
            <div className="ld-done-row">
              <button className="btn" type="button" disabled={sharing} onClick={() => void onShare()}>
                <Share2 size={16} /> {copy.luckyDraw.shareWhatsApp}
              </button>
              <button className="btn ghost" type="button" onClick={startChange}>
                {copy.luckyDraw.changeWinner}
              </button>
              <Link className="btn ghost" to={`/chits/${chit.id}`}>
                {copy.luckyDraw.done}
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
