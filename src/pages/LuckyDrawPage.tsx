import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Share2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { displayCycle, handLabel, isLuckyDrawChit } from "../lib/chitMath";
import { inr } from "../lib/format";
import { shareLuckyDrawResult, WHEEL_PALETTE } from "../lib/luckyDrawShare";
import { useStore } from "../store";
import type { AuctionRecord, ChitMember } from "../types";

type Phase = "ready" | "spinning" | "done" | "error";

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
  const { chits, customers, luckyDraw } = useStore();
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
      .filter((m) => !m.prizedCycle)
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
  const [error, setError] = useState("");
  const [sharing, setSharing] = useState(false);
  const [drawnAt, setDrawnAt] = useState<Date | null>(null);
  /** Frozen list of hands on the wheel for this draw (survives store prize update). */
  const [pool, setPool] = useState<ChitMember[] | null>(null);
  const spunRef = useRef(false);
  const hydratedRef = useRef(false);

  const labelOf = (m: ChitMember) => {
    const hands = chit?.members.filter((x) => x.customerId === m.customerId).length || 1;
    return handLabel(names[m.customerId] || "Member", m.slot, hands);
  };

  // Revisit: already drawn this cycle — park on winner for share.
  useEffect(() => {
    if (!chit || !existingWin || hydratedRef.current || spunRef.current) return;
    hydratedRef.current = true;
    const winnerHand =
      chit.members.find((m) => isSameHand(m, existingWin.winnerId, existingWin.winnerSlot)) ||
      ({
        customerId: existingWin.winnerId,
        slot: existingWin.winnerSlot ?? 1,
        prizedCycle: cycle,
      } satisfies ChitMember);
    const rest = chit.members
      .filter((m) => !m.prizedCycle && !isSameHand(m, existingWin.winnerId, existingWin.winnerSlot))
      .sort((a, b) => a.slot - b.slot);
    const rebuilt = [winnerHand, ...rest];
    setPool(rebuilt);
    setResult(existingWin);
    setRotation(landRotation(0, rebuilt.length, 0));
    setPhase("done");
    setDrawnAt(new Date());
  }, [chit, existingWin, cycle]);

  const displayMembers = pool ?? eligible;

  const winnerName = useMemo(() => {
    if (!result || !chit) return "";
    const hands = chit.members.filter((x) => x.customerId === result.winnerId).length;
    return handLabel(names[result.winnerId] || "Winner", result.winnerSlot ?? 1, hands);
  }, [result, chit, names]);

  async function onSpin() {
    if (!chit || phase === "spinning" || spunRef.current) return;
    if (existingWin) {
      setResult(existingWin);
      setPhase("done");
      return;
    }
    if (eligible.length === 0) {
      setError("No eligible members left for this draw.");
      setPhase("error");
      return;
    }

    spunRef.current = true;
    setError("");
    setPhase("spinning");
    setAnimating(true);
    const snapshot = [...eligible];
    setPool(snapshot);

    try {
      const rec = await luckyDraw(chit.id);
      if (!rec) throw new Error("Draw did not return a winner");
      setResult(rec);
      setDrawnAt(new Date());

      const idx = snapshot.findIndex((m) => isSameHand(m, rec.winnerId, rec.winnerSlot));
      setRotation((prev) => landRotation(idx >= 0 ? idx : 0, snapshot.length, prev));

      window.setTimeout(() => {
        setAnimating(false);
        setPhase("done");
      }, SPIN_MS + 80);
    } catch (e) {
      spunRef.current = false;
      setPool(null);
      setAnimating(false);
      setError(e instanceof Error ? e.message : "Could not complete lucky draw");
      setPhase("error");
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
        winnerName,
        payout: result.payout,
        entrants: displayMembers.map(labelOf),
        drawnAt: drawnAt || new Date(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not share");
    } finally {
      setSharing(false);
    }
  }

  if (!chit) {
    return (
      <AppShell crumb="Chits">
        <div className="page">
          <p>Chit not found.</p>
          <button className="btn ghost" type="button" onClick={() => nav("/chits")}>
            Back
          </button>
        </div>
      </AppShell>
    );
  }

  const n = Math.max(displayMembers.length, 1);
  const seg = 360 / n;

  return (
    <AppShell crumb="Chits" crumb2={chit.name}>
      <div className="page ld-page">
        <div className="ld-topbar">
          <Link className="ld-back" to={`/chits/${chit.id}`}>
            <ArrowLeft size={18} /> Back
          </Link>
        </div>

        <header className="ld-header">
          <p className="ld-kicker">Bhishi Circle</p>
          <h1>Lucky Draw</h1>
          <p className="ld-sub">
            {chit.name} — Round {cycle}
            {isLuckyDrawChit(chit) ? "" : " · chitthi"}
          </p>
        </header>

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
            {displayMembers.map((m, i) => {
              const mid = i * seg + seg / 2;
              const label = labelOf(m);
              const maxLen = n > 10 ? 7 : n > 6 ? 10 : 14;
              const short = label.length > maxLen ? `${label.slice(0, maxLen - 1)}…` : label;
              return (
                <span
                  key={memberKey(m)}
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
          {/* Hub sits outside the rotating wheel so "BC" stays upright */}
          <div className="ld-hub" aria-hidden>
            <span>BC</span>
          </div>
        </div>

        {phase === "ready" && (
          <div className="ld-actions">
            <p className="ld-hint">
              {eligible.length} eligible member{eligible.length === 1 ? "" : "s"} in this draw
            </p>
            <button
              className="btn ld-spin-btn"
              type="button"
              disabled={eligible.length === 0}
              onClick={() => void onSpin()}
            >
              Spin the wheel
            </button>
          </div>
        )}

        {phase === "spinning" && (
          <div className="ld-actions">
            <p className="ld-hint ld-hint-pulse">
              <Loader2 size={16} className="spin" /> Drawing among {displayMembers.length}…
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="ld-actions">
            <p className="due">{error}</p>
            <button
              className="btn"
              type="button"
              onClick={() => {
                setPhase("ready");
                setError("");
              }}
            >
              Try again
            </button>
          </div>
        )}

        {phase === "done" && result && (
          <div className="ld-result" aria-live="polite">
            <div className="ld-result-card">
              <p className="ld-result-kicker">Winner</p>
              <h2>{winnerName}</h2>
              <p className="ld-result-amount">{inr(result.payout)}</p>
              <p className="ld-result-meta">
                Month {cycle} of {chit.duration}
                {drawnAt
                  ? ` · ${drawnAt.toLocaleString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}`
                  : ""}
              </p>
            </div>
            <div className="ld-verified">Verified random draw · Bhishi Circle</div>
            <div className="ld-actions row">
              <button
                className="btn ld-share-btn"
                type="button"
                disabled={sharing}
                onClick={() => void onShare()}
              >
                {sharing ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />}
                Share on WhatsApp
              </button>
              <button className="btn ghost" type="button" onClick={() => nav(`/chits/${chit.id}`)}>
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
