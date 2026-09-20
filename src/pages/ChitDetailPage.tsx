import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { PayModal } from "../components/PayModal";
import { AppShell } from "../layout/AppShell";
import {
  balanceAfterCycle,
  canSettleCycle,
  collectedThisCycle,
  collectedCount,
  commissionEarned,
  cycleDue,
  cycleLedger,
  displayCycle,
  dividendsDistributed,
  expectedLifeCollections,
  expectedThisCycle,
  interestCollected,
  isFixedLike,
  isLastAuctionCycle,
  loanPrincipalOf,
  loansThisCycle,
  memberDividendTotal,
  memberLedgerRows,
  moneyIn,
  moneyOut,
  nextBySlot,
  outstandingOf,
  paidInCycle,
  paymentStatus,
  memberBalance,
  settlementsOf,
  settleWinner,
  treasuryOf,
} from "../lib/chitMath";
import { downloadChitCsv } from "../lib/exportCsv";
import { FREQ_LABEL, MODE_LABEL, TYPE_LABEL, initials, inr } from "../lib/format";
import { useStore } from "../store";
import type { PayMode, PaymentKind } from "../types";

export function ChitDetailPage() {
  const { id } = useParams();
  const {
    chits, customers, recordPayment, recordAllPayments, recordAuction, settleBooksEqually, luckyDraw, closeCycle,
    cancelChit, addMember, undoPayment, updateChitSettings, error,
  } = useStore();
  const nav = useNavigate();
  const chit = chits.find((c) => c.id === id);
  const [tab, setTab] = useState<"overview" | "collections" | "monthly" | "cycles" | "members" | "settlement" | "settings">("overview");
  const [payFor, setPayFor] = useState<string | null>(null);
  const [bid, setBid] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [newMemberId, setNewMemberId] = useState("");
  const [visible, setVisible] = useState(true);
  const [remind, setRemind] = useState(true);
  const [payPick, setPayPick] = useState(false);
  const [unpaidNoted, setUnpaidNoted] = useState(false);
  const [colRange, setColRange] = useState<"today" | "week" | "all">("all");
  const [busyAll, setBusyAll] = useState(false);
  const [busySettle, setBusySettle] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (!chit) return;
    setVisible(Boolean(chit.memberVisible));
    setRemind(Boolean(chit.remindDays?.length));
    setEditName(chit.name);
    setEditTitle(chit.title || "");
  }, [chit?.id, chit?.memberVisible, chit?.remindDays, chit?.name, chit?.title]);

  useEffect(() => {
    if (!chit) return;
    // Only seed the amount when opening a chit — never overwrite what the user typed
    setBid(chit.type === "loan" || isFixedLike(chit) ? String(chit.pot) : "");
    const next = isFixedLike(chit) ? nextBySlot(chit)?.customerId || "" : "";
    setWinnerId(next);
  }, [chit?.id, chit?.currentCycle, chit?.auctions?.length]);

  const names = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c.name])), [customers]);

  if (!chit) {
    return <AppShell crumb="Chits"><div className="page"><p>Chit not found.</p></div></AppShell>;
  }

  if (chit.viewerRole === "member") {
    return <Navigate to={`/member/${chit.id}`} replace />;
  }

  const data = chit;
  const cycle = displayCycle(data);
  const isRunning = data.status === "running";
  const pending = data.members.filter((m) => paymentStatus(data, m.customerId, cycle) === "due").length;
  const lastWin = data.auctions.find((a) => a.cycle === cycle && a.method !== "settlement");
  const monthLoans = loansThisCycle(data);
  const cashOnHand = treasuryOf(data);
  const showSettlement = data.type === "loan" || cycle >= data.duration || data.status === "completed";
  const monthDate = new Date(data.startDate);
  monthDate.setMonth(monthDate.getMonth() + cycle - 1);
  const remainDue = isRunning
    ? data.members.filter((m) => {
        const due = cycleDue(data, m.customerId, cycle);
        return due - paidInCycle(data, m.customerId, cycle) > 0;
      }).length
    : 0;
  const unprized = [...data.members].filter((m) => !m.prizedCycle).sort((a, b) => a.slot - b.slot);
  const expectedLife = expectedLifeCollections(data);
  const ended = new Date(data.startDate);
  ended.setMonth(ended.getMonth() + data.duration);
  const fixedLike = isFixedLike(data);
  const nextSlot = nextBySlot(data);
  const lastAuctionMonth = data.type === "auction" && isLastAuctionCycle(data);
  const lastMember = lastAuctionMonth ? unprized[0] : undefined;

  return (
    <AppShell crumb="Chits" crumb2={data.name}>
      <div className="page">
        <div className="row-head top">
          <div>
            <div className="title-row">
              <h1>{data.name}</h1>
              <span className="pill paid">{data.status === "running" ? "Active" : data.status}</span>
              <span className="badge">{TYPE_LABEL[data.type]}</span>
            </div>
            <p className="page-sub">
              {data.members.length} members · {inr(data.instalment)}/{data.frequency} · started {new Date(data.startDate).toLocaleString("en-IN", { month: "short", year: "numeric" })} · ends {ended.toLocaleString("en-IN", { month: "short", year: "numeric" })}
              {data.type === "loan" && data.interestRate != null ? ` · interest ${data.interestRate}%` : ""}
              {data.type === "loan" && data.repaymentTenure ? ` · repay ${data.repaymentTenure} mo` : ""}
              {data.commissionKind === "amount" && data.commissionValue
                ? ` · commission ${inr(data.commissionValue)}`
                : ` · commission ${data.commissionPct}%`}
            </p>
          </div>
          <div className="toolbar" style={{ margin: 0 }}>
            <button className="btn ghost" onClick={() => downloadChitCsv(data, names)}>Export</button>
            <button className="btn ghost" onClick={() => { setEditName(data.name); setEditTitle(data.title || ""); setEditOpen(true); }}>Edit chit</button>
            <button className="btn" disabled={!isRunning} onClick={() => setPayPick(true)}>+ Record collection</button>
          </div>
        </div>
        {error && <p className="due">{error}</p>}
        {!isRunning && (
          <p className="muted block">This chit is {data.status}. Collections and monthly payouts are closed.</p>
        )}
        <div className="stats six">
          <div className="stat"><span>Month</span><strong>{cycle} / {data.duration}</strong></div>
          <div className="stat"><span>Collected this month</span><strong>{inr(collectedThisCycle(data))}</strong><em>of {inr(expectedThisCycle(data))} expected</em></div>
          <div className="stat"><span>Outstanding</span><strong>{inr(outstandingOf(data))}</strong><em>{pending} members pending</em></div>
          <div className="stat"><span>Cash on hand</span><strong className={treasuryOf(data) < 0 ? "neg" : ""}>{inr(treasuryOf(data))}</strong></div>
          <div className="stat"><span>Commission earned</span><strong>{inr(commissionEarned(data))}</strong><em>{inr(data.auctions.find((a) => a.cycle === cycle)?.commission || 0)} this month</em></div>
          <div className="stat"><span>Members</span><strong>{data.members.length}</strong><em>of {data.membersCount} slots</em></div>
        </div>
        <div className="tabs">
          {(["overview", "collections", "monthly", "cycles", "members", ...(showSettlement ? ["settlement" as const] : []), "settings"] as const).map((t) => (
            <button key={t} className={`tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <p className="muted block">The books · every figure below comes from one ledger derivation</p>
            <div className="card block">
              <div className="muted">Cash on hand · as on today</div>
              <div className="hero-figure">{inr(treasuryOf(data))}</div>
            </div>
            <div className="grid-2 block">
              <div className="card">
                <h2>Month {cycle} of {data.duration}</h2>
                <div className="progress blue" style={{ margin: "4px 0 12px" }}><i style={{ width: `${Math.round((cycle / data.duration) * 100)}%` }} /></div>
                <p className="muted block">{inr(moneyIn(data))} collected of {inr(expectedLife)} expected</p>
                {data.type !== "auction" && (
                  <div className="grid-2">
                    <div><div className="muted">Total paid out</div><strong className="num">{inr(moneyOut(data) - commissionEarned(data))}</strong></div>
                    <div><div className="muted">Payouts recorded</div><strong className="num">{inr(data.auctions.filter((a) => a.method !== "settlement").length)}</strong></div>
                  </div>
                )}
                {data.type === "auction" && (
                  <p className="muted" style={{ marginTop: 4 }}>
                    Member-by-member paid vs received is below — early winners take less; the last member takes the full remaining pot.
                  </p>
                )}
              </div>
              <div className="card">
                <h2>You’ve earned</h2>
                <div className="kv"><span>Commission</span><strong>{inr(commissionEarned(data))}</strong></div>
                {data.type === "auction" && (
                  <>
                    <div className="kv"><span>Dividends to members (each)</span><strong>{inr(memberDividendTotal(data))}</strong></div>
                    <div className="kv"><span>Dividends distributed (all)</span><strong>{inr(dividendsDistributed(data))}</strong></div>
                  </>
                )}
                {data.type === "loan" && (
                  <div className="kv"><span>Interest collected</span><strong>{inr(interestCollected(data))}</strong></div>
                )}
              </div>
            </div>
            {data.type === "auction" && (
              <div className="card flush block">
                <div className="card-pad">
                  <h2>Member ledger</h2>
                  <p className="muted">What each person paid in, what they took from the pot, and dividends credited to their dues.</p>
                </div>
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Paid in</th>
                        <th>Got from pot</th>
                        <th>Dividends</th>
                        <th>Net</th>
                      </tr>
                    </thead>
                    <tbody>
                      {memberLedgerRows(data).map((row) => (
                        <tr key={row.customerId}>
                          <td>
                            <strong>{names[row.customerId] || "Member"}</strong>
                            {row.prizedCycle ? <div className="muted">Prized month {row.prizedCycle}</div> : null}
                          </td>
                          <td>{inr(row.paid)}</td>
                          <td>{inr(row.received)}</td>
                          <td>{inr(row.dividend)}</td>
                          <td className={row.net < 0 ? "neg" : ""}>{inr(row.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div className="card">
              <h2>Money in / out</h2>
              <div className="kv"><span>Money in</span><strong>{inr(moneyIn(data))}</strong></div>
              <div className="kv"><span>Money out</span><strong>{inr(moneyOut(data))}</strong></div>
              <div className="kv"><span>On hand</span><strong className={treasuryOf(data) < 0 ? "neg" : ""}>{inr(treasuryOf(data))}</strong></div>
              <p className="muted" style={{ marginTop: 12 }}>Of which {inr(commissionEarned(data))} is your commission.</p>
              <div className="grid-2" style={{ marginTop: 8 }}>
                <div className="kv"><span>Type</span><strong>{TYPE_LABEL[data.type].toUpperCase()}</strong></div>
                <div className="kv"><span>Frequency</span><strong>{FREQ_LABEL[data.frequency]}</strong></div>
                <div className="kv"><span>Contribution</span><strong>{inr(data.instalment)}</strong></div>
                <div className="kv"><span>Duration</span><strong>{data.duration} months</strong></div>
                {data.type === "loan" && (
                  <>
                    <div className="kv"><span>Interest</span><strong>{data.interestRate ?? 0}%</strong></div>
                    <div className="kv"><span>Repayment tenure</span><strong>{data.repaymentTenure ? `${data.repaymentTenure} months` : "Rest of chit"}</strong></div>
                  </>
                )}
                {fixedLike && data.premiumAmount != null && data.premiumAmount > 0 && (
                  <div className="kv"><span>Premium after prized</span><strong>{inr(data.premiumAmount)}</strong></div>
                )}
                <div className="kv"><span>Commission / month</span><strong>{
                  data.commissionKind === "amount" && data.commissionValue
                    ? inr(data.commissionValue)
                    : `${data.commissionPct}%`
                }</strong></div>
              </div>
            </div>
          </>
        )}

        {tab === "collections" && (() => {
          const now = new Date();
          const receipts = data.payments.filter((p) => {
            const d = new Date(p.date);
            if (colRange === "today") return d.toDateString() === now.toDateString();
            if (colRange === "week") return now.getTime() - d.getTime() <= 7 * 86400000;
            return true;
          });
          const total = receipts.reduce((s, p) => s + p.amount, 0);
          const people = new Set(receipts.map((p) => p.memberId)).size;
          return (
            <div className="card flush">
              <div className="card-pad">
                <div className="seg" style={{ marginBottom: 16 }}>
                  <button className={`chip ${colRange === "today" ? "on" : ""}`} onClick={() => setColRange("today")}>Today</button>
                  <button className={`chip ${colRange === "week" ? "on" : ""}`} onClick={() => setColRange("week")}>This week</button>
                  <button className={`chip ${colRange === "all" ? "on" : ""}`} onClick={() => setColRange("all")}>All</button>
                </div>
                <div className="muted">Collected</div>
                <div className="hero-figure">{inr(total)}</div>
                <p className="muted">{receipts.length} receipts from {people} members</p>
                <button
                  className="btn"
                  style={{ marginTop: 12 }}
                  disabled={!remainDue || busyAll}
                  onClick={() => {
                    setBusyAll(true);
                    void recordAllPayments(data.id).finally(() => setBusyAll(false));
                  }}
                >
                  {busyAll ? "Recording…" : "Record all payments"}
                </button>
              </div>
              {receipts.map((p) => (
                <div key={p.id} className="list-row">
                  <div className="avatar">{initials(names[p.memberId] || "?")}</div>
                  <div className="grow">
                    <strong>{names[p.memberId]}</strong>
                    <div className="muted">{MODE_LABEL[p.mode || "cash"]} · {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
                  </div>
                  <strong className="num">{inr(p.amount)}</strong>
                  <button className="link" onClick={() => void undoPayment(data.id, p.id)}>Undo</button>
                </div>
              ))}
              {!receipts.length && <p className="empty">No collections in this range.</p>}
            </div>
          );
        })()}

        {tab === "monthly" && (
          <div className="stack">
            <div className="month-steps">
              <span className={`month-step ${!lastWin && collectedThisCycle(data) === 0 ? "on" : "done"}`}>1. Collect</span>
              <span className={`month-step ${!lastWin && canSettleCycle(data) ? "on" : lastWin ? "done" : ""}`}>
                2. {data.type === "loan" ? "Give loan" : fixedLike ? "Award pot" : "Auction"}
              </span>
              <span className={`month-step ${lastWin || (data.type === "loan" && canSettleCycle(data)) ? "on" : ""}`}>3. Close month</span>
            </div>
            <div className="stats four">
              <div className="stat"><span>Expected this cycle</span><strong>{inr(expectedThisCycle(data))}</strong></div>
              <div className="stat"><span>Collected</span><strong>{inr(collectedThisCycle(data))}</strong></div>
              <div className="stat"><span>Outstanding</span><strong>{inr(outstandingOf(data))}</strong></div>
              <div className="stat"><span>Cash on hand</span><strong className={treasuryOf(data) < 0 ? "neg" : ""}>{inr(treasuryOf(data))}</strong></div>
            </div>
            <div className="card flush">
              <div className="card-pad month-head">
                <div>
                  <strong>Month {cycle}</strong>
                  <span className="muted"> {monthDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className={`pill ${isRunning ? "paid" : "partial"}`}>{isRunning ? "Open" : "Closed"}</span>
                  <div className="muted" style={{ marginTop: 6 }}>{collectedCount(data)} of {data.members.length} collected</div>
                </div>
                <div className="seg">
                  <button
                    className="btn"
                    disabled={!isRunning || !remainDue || busyAll}
                    onClick={() => {
                      setBusyAll(true);
                      void recordAllPayments(data.id).finally(() => setBusyAll(false));
                    }}
                  >
                    {busyAll ? "Recording…" : "Record all payments"}
                  </button>
                  <button className="btn ghost" type="button" disabled={!isRunning || !remainDue} onClick={() => setUnpaidNoted(true)}>
                    Mark all unpaid
                  </button>
                </div>
              </div>
              {!canSettleCycle(data) && !lastWin && (
                <p className="month-hint">Record collections first — individually or with Record all payments. Auction stays locked so cash on hand cannot go negative.</p>
              )}
              {unpaidNoted && remainDue > 0 && (
                <p className="month-hint">Remaining members stay unpaid for this month. Collect later from the Record button; auction still needs at least one receipt.</p>
              )}
              <div className="table-wrap">
                <table className="table month-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Due</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Mode</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.members.map((m) => {
                      const due = cycleDue(data, m.customerId, cycle);
                      const paid = paidInCycle(data, m.customerId, cycle);
                      const status = paymentStatus(data, m.customerId, cycle);
                      const last = [...data.payments].reverse().find((p) => p.memberId === m.customerId && p.cycle === cycle);
                      const label = status === "due" && unpaidNoted ? "Unpaid" : status[0].toUpperCase() + status.slice(1);
                      return (
                        <tr key={m.customerId}>
                          <td><div className="person"><div className="avatar">{initials(names[m.customerId] || "?")}</div><span className="ellipsis">{names[m.customerId]}</span></div></td>
                          <td>{inr(due)}</td>
                          <td>{inr(paid)}</td>
                          <td>{paid >= due ? "—" : inr(due - paid)}</td>
                          <td>{last ? MODE_LABEL[last.mode || "cash"] : "—"}</td>
                          <td>{last ? new Date(last.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—"}</td>
                          <td><span className={`pill ${status}`}>{label}</span></td>
                          <td>
                            {isRunning && (status === "due" || status === "partial") ? (
                              <button className="btn ghost btn-sm" onClick={() => setPayFor(m.customerId)}>Record</button>
                            ) : (
                              <span className="muted">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="month-head" style={{ padding: 0 }}>
                <div>
                  <h2 style={{ margin: 0 }}>
                    {data.type === "loan" ? "This month’s loan" : fixedLike ? "This month’s payout" : "This month’s auction"}
                  </h2>
                  <p className="muted">
                    {data.type === "loan"
                      ? "Collect first. Giving a loan this month is optional — close the month when the books look right."
                      : fixedLike
                        ? nextSlot
                          ? `Next by slot order: ${names[nextSlot.customerId]} (slot ${nextSlot.slot}). Award after collections.`
                          : "All slots have been prized."
                        : "Only after collections. Payout plus commission cannot exceed cash on hand."}
                  </p>
                </div>
                <button
                  className="btn green"
                  disabled={
                    !isRunning
                      ? true
                      : data.mode === "organise" && data.type === "auction" && !lastWin
                        ? true
                        : data.mode === "organise" && fixedLike && !lastWin
                          ? true
                          : false
                  }
                  onClick={() => void closeCycle(data.id)}
                >
                  Close month
                </button>
              </div>
              {!isRunning ? (
                <p className="muted" style={{ margin: "12px 0 0" }}>
                  This chit is {data.status}. Monthly collections and payouts are closed.
                </p>
              ) : lastWin && data.type !== "loan" ? (
                <div style={{ marginTop: 12 }}>
                  <div className="kv">
                    <span>
                      {lastWin.method === "lucky_draw"
                        ? "Lucky draw winner"
                        : fixedLike
                          ? "Awarded to"
                          : "Winner · Auction"}
                    </span>
                    <strong>{names[lastWin.winnerId]}</strong>
                  </div>
                  <div className="kv"><span>Payout</span><strong>{inr(lastWin.payout)}</strong></div>
                  <div className="kv"><span>Your commission</span><strong>{inr(lastWin.commission)}</strong></div>
                  {lastWin.dividend > 0 && (
                    <div className="kv"><span>Dividend next month / member</span><strong>{inr(lastWin.dividend)}</strong></div>
                  )}
                </div>
              ) : !canSettleCycle(data) ? (
                <p className="muted" style={{ margin: "12px 0 0" }}>
                  Collect at least one payment this month before {data.type === "loan" ? "giving a loan" : fixedLike ? "awarding the pot" : "recording the auction"}.
                </p>
              ) : (
                <div style={{ padding: "16px 0 0" }}>
                  {data.type === "auction" && (
                    <>
                      {lastAuctionMonth ? (
                        <>
                          <p className="muted" style={{ marginBottom: 12 }}>
                            Last cycle — no auction. The remaining member takes the full cash on hand ({inr(cashOnHand)}), then you can close the chit.
                          </p>
                          <div className="month-auction" style={{ padding: 0 }}>
                            <select
                              className="field"
                              value={winnerId || lastMember?.customerId || ""}
                              onChange={(e) => setWinnerId(e.target.value)}
                            >
                              <option value="">Last member</option>
                              {unprized.map((m) => (
                                <option key={m.customerId} value={m.customerId}>{names[m.customerId]}</option>
                              ))}
                            </select>
                            <button
                              className="btn"
                              disabled={!(winnerId || lastMember?.customerId) || cashOnHand <= 0}
                              onClick={() => {
                                const who = winnerId || lastMember?.customerId || "";
                                void recordAuction(data.id, who, cashOnHand, "auction");
                              }}
                            >
                              Award full pot
                            </button>
                          </div>
                          {(winnerId || lastMember) && (() => {
                            const who = winnerId || lastMember!.customerId;
                            const preview = settleWinner(data, who, cashOnHand, "auction");
                            const cashAfter = cashOnHand - preview.payout - preview.commission;
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>Winner takes</span><strong>{inr(preview.payout)}</strong></div>
                                <div className="kv"><span>Your commission</span><strong>{inr(preview.commission)}</strong></div>
                                <div className="kv"><span>Cash on hand after</span><strong>{inr(cashAfter)}</strong></div>
                              </div>
                            );
                          })()}
                        </>
                      ) : (
                        <>
                          <div className="month-auction" style={{ padding: 0 }}>
                            <select className="field" value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                              <option value="">Winner</option>
                              {unprized.map((m) => <option key={m.customerId} value={m.customerId}>{names[m.customerId]}</option>)}
                            </select>
                            <input className="field" placeholder="Winning bid (amount winner takes)" value={bid} onChange={(e) => setBid(e.target.value)} />
                            <button
                              className="btn"
                              disabled={!winnerId || !bid}
                              onClick={() => void recordAuction(data.id, winnerId, Number(bid), "auction")}
                            >
                              Record auction
                            </button>
                          </div>
                          {winnerId && Number(bid) > 0 && (() => {
                            const preview = settleWinner(data, winnerId, Number(bid), "auction");
                            const cashAfter = cashOnHand - preview.payout - preview.commission;
                            return (
                              <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                                <div className="kv"><span>Winner takes</span><strong>{inr(preview.payout)}</strong></div>
                                <div className="kv"><span>Your commission (leaves the till)</span><strong>{inr(preview.commission)}</strong></div>
                                <div className="kv"><span>Dividend / member next month</span><strong>{inr(preview.dividend)}</strong></div>
                                <div className="kv"><span>Cash on hand after</span><strong className={cashAfter < 0 ? "neg" : ""}>{inr(cashAfter)}</strong></div>
                              </div>
                            );
                          })()}
                          <button className="btn ghost" style={{ marginTop: 12 }} onClick={() => void luckyDraw(data.id)}>Lucky draw</button>
                        </>
                      )}
                    </>
                  )}
                  {data.type === "loan" && (
                    <>
                      {!!monthLoans.length && (
                        <div className="card" style={{ marginBottom: 12, background: "#f8fafc" }}>
                          <strong>Loans this month</strong>
                          {monthLoans.map((l, i) => (
                            <div className="kv" key={l.id || `${l.winnerId}-${i}`}>
                              <span>{names[l.winnerId]}</span>
                              <strong>{inr(l.payout)}{l.commission ? ` · commission ${inr(l.commission)}` : ""}</strong>
                            </div>
                          ))}
                          <div className="kv"><span>Total loaned this month</span><strong>{inr(monthLoans.reduce((s, l) => s + l.payout, 0))}</strong></div>
                          <div className="kv"><span>Cash still on hand</span><strong>{inr(cashOnHand)}</strong></div>
                        </div>
                      )}
                      <p className="muted" style={{ marginBottom: 10 }}>
                        Enter any amount up to cash on hand — e.g. ₹2,00,000 even if the monthly pot is ₹1,00,000. You can give more than one loan this month.
                      </p>
                      <div className="month-auction" style={{ padding: 0 }}>
                        <select className="field" value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                          <option value="">Borrower</option>
                          {data.members.map((m) => (
                            <option key={m.customerId} value={m.customerId}>
                              {names[m.customerId]}
                              {loanPrincipalOf(data, m.customerId) ? ` · already borrowed ${inr(loanPrincipalOf(data, m.customerId))}` : ""}
                            </option>
                          ))}
                        </select>
                        <input
                          className="field"
                          inputMode="numeric"
                          placeholder="Loan amount"
                          value={bid}
                          onChange={(e) => setBid(e.target.value.replace(/[^\d]/g, ""))}
                        />
                        <button
                          className="btn"
                          disabled={!winnerId || !Number(bid) || Number(bid) > cashOnHand}
                          onClick={() => {
                            const amount = Number(bid);
                            void recordAuction(data.id, winnerId, amount, "fixed").then(() => {
                              setBid(String(data.pot));
                              setWinnerId("");
                            });
                          }}
                        >
                          Give loan
                        </button>
                      </div>
                      <div className="quick" style={{ marginTop: 8 }}>
                        {[data.pot, data.pot * 2, data.pot * 3, cashOnHand].filter((v, i, arr) => v > 0 && arr.indexOf(v) === i).map((v) => (
                          <button key={v} type="button" className={`chip ${bid === String(v) ? "on" : ""}`} onClick={() => setBid(String(v))}>
                            {inr(v)}{v === cashOnHand ? " · all cash" : ""}
                          </button>
                        ))}
                      </div>
                      {winnerId && Number(bid) > 0 && (() => {
                        const preview = settleWinner(data, winnerId, Number(bid), "fixed");
                        const cashAfter = cashOnHand - preview.payout - preview.commission;
                        const start = cycle;
                        const tenure = data.repaymentTenure || Math.max(1, data.duration - start);
                        const share = Math.ceil(Number(bid) / tenure);
                        const interest = Math.round((Number(bid) * (data.interestRate || 0)) / 100);
                        return (
                          <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                            <div className="kv"><span>Loan given now</span><strong>{inr(preview.payout)}</strong></div>
                            <div className="kv"><span>Your commission</span><strong>{inr(preview.commission)}</strong></div>
                            <div className="kv"><span>From next month · deposit</span><strong>{inr(data.instalment)}</strong></div>
                            <div className="kv"><span>Interest / month</span><strong>{inr(interest)} ({data.interestRate || 0}% of principal)</strong></div>
                            <div className="kv"><span>Principal share / month</span><strong>{inr(share)} over {tenure} mo</strong></div>
                            <div className="kv"><span>Cash on hand after</span><strong className={cashAfter < 0 ? "neg" : ""}>{inr(cashAfter)}</strong></div>
                            {cashAfter < 0 && <p className="due">Not enough cash on hand for this loan.</p>}
                          </div>
                        );
                      })()}
                      <p className="muted" style={{ marginTop: 12 }}>You can skip giving a loan this month and still close it after collections. On the last cycle, open the Settlement tab to return leftover cash.</p>
                    </>
                  )}
                  {fixedLike && !lastWin && (
                    <>
                      <p className="muted" style={{ marginBottom: 10 }}>
                        Payout order follows member slots. You can override and award a different unprized member.
                      </p>
                      <div className="month-auction" style={{ padding: 0, gridTemplateColumns: "1fr auto" }}>
                        <select className="field" value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                          <option value="">Award pot to</option>
                          {unprized.map((m) => (
                            <option key={m.customerId} value={m.customerId}>
                              Slot {m.slot} · {names[m.customerId]}
                              {nextSlot?.customerId === m.customerId ? " · next" : ""}
                            </option>
                          ))}
                        </select>
                        <button
                          className="btn"
                          disabled={!winnerId}
                          onClick={() => void recordAuction(data.id, winnerId, data.pot, "fixed")}
                        >
                          Award pot
                        </button>
                      </div>
                      {winnerId && (() => {
                        const preview = settleWinner(data, winnerId, data.pot, "fixed");
                        const cashAfter = cashOnHand - preview.payout - preview.commission;
                        return (
                          <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                            <div className="kv"><span>Member receives</span><strong>{inr(preview.payout)}</strong></div>
                            <div className="kv"><span>Your commission</span><strong>{inr(preview.commission)}</strong></div>
                            {data.premiumAmount ? (
                              <div className="kv"><span>Their due from next month</span><strong>{inr(data.premiumAmount)} premium</strong></div>
                            ) : null}
                            <div className="kv"><span>Cash on hand after</span><strong className={cashAfter < 0 ? "neg" : ""}>{inr(cashAfter)}</strong></div>
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "cycles" && (
          <div className="card flush">
            <div className="card-pad"><h2>Monthly breakdown</h2></div>
            <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Cycle</th>
                  <th>Collected</th>
                  <th>{data.type === "loan" ? "Loan given" : "Payout"}</th>
                  <th>Commission</th>
                  {data.type === "auction" && <th>Dividend generated</th>}
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: cycle }, (_, i) => i + 1).reverse().map((cyc) => {
                  const row = cycleLedger(data, cyc);
                  const when = new Date(data.startDate);
                  when.setMonth(when.getMonth() + cyc - 1);
                  return (
                    <tr key={cyc}>
                      <td>{when.toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                      <td>{inr(row.collected)}</td>
                      <td>{inr(row.payout)}</td>
                      <td>{inr(row.commission)}</td>
                      {data.type === "auction" && <td>{inr(row.dividend)}</td>}
                      <td className={balanceAfterCycle(data, cyc) < 0 ? "neg" : ""}>{inr(balanceAfterCycle(data, cyc))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}

        {tab === "members" && (
          <>
            <div className="toolbar">
              <select className="field" style={{ margin: 0, maxWidth: 260 }} value={newMemberId} onChange={(e) => setNewMemberId(e.target.value)}>
                <option value="">Add member</option>
                {customers.filter((c) => !data.members.some((m) => m.customerId === c.id)).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <button className="btn" disabled={!newMemberId} onClick={() => void addMember(data.id, newMemberId).then(() => setNewMemberId(""))}>Add member</button>
            </div>
            <div className="card flush">
              {data.members.map((m) => {
                const paid = data.payments.filter((p) => p.memberId === m.customerId).reduce((s, p) => s + p.amount, 0);
                const principal = loanPrincipalOf(data, m.customerId);
                const received = data.auctions
                  .filter((a) => a.winnerId === m.customerId)
                  .reduce((s, a) => s + a.payout, 0);
                const left = Math.max(0, memberBalance(data, m.customerId).outstanding);
                return (
                  <div key={m.customerId} className="list-row">
                    <div className="avatar">{initials(names[m.customerId] || "?")}</div>
                    <div className="grow">
                      <button className="link" style={{ fontWeight: 600 }} onClick={() => nav(`/customers/${m.customerId}`)}>{names[m.customerId]}</button>
                      <div className="muted">
                        {fixedLike ? `Slot ${m.slot} · ` : ""}
                        Paid {inr(paid)}
                        {data.type === "auction" ? ` · got ${inr(received)}` : ""}
                        {data.type === "auction" ? ` · dividends ${inr(memberDividendTotal(data))}` : ""}
                        {principal ? ` · loan ${inr(principal)}` : ""}
                        {m.prizedCycle ? ` · prized month ${m.prizedCycle}` : ""}
                      </div>
                    </div>
                    <div className="num">{inr(left)} left to pay</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {tab === "settlement" && (
          <div className="stack">
            <div className="stats four">
              <div className="stat"><span>Cash on hand</span><strong className={cashOnHand < 0 ? "neg" : ""}>{inr(cashOnHand)}</strong></div>
              <div className="stat"><span>Loans disbursed</span><strong>{inr(data.auctions.filter((a) => a.method === "fixed").reduce((s, a) => s + a.payout, 0))}</strong></div>
              <div className="stat"><span>Interest collected</span><strong>{inr(interestCollected(data))}</strong></div>
              <div className="stat"><span>Already settled out</span><strong>{inr(settlementsOf(data).reduce((s, a) => s + a.payout, 0))}</strong></div>
            </div>
            <div className="card">
              <h2>Final settlement</h2>
              <p className="muted block">
                At the end of a loan bhishi, leftover cash on hand is returned to members. This does not mark anyone as prized — it only clears the till so cash on hand becomes ₹0, the way ChitBook closes the books.
              </p>
              <div className="kv"><span>Cash available to return</span><strong>{inr(Math.max(0, cashOnHand))}</strong></div>
              <div className="kv"><span>Equal share / member</span><strong>{inr(data.members.length ? Math.floor(Math.max(0, cashOnHand) / data.members.length) : 0)}</strong></div>
              <button
                className="btn"
                style={{ marginTop: 16 }}
                disabled={cashOnHand <= 0 || busySettle || !data.members.length}
                onClick={() => {
                  setBusySettle(true);
                  void settleBooksEqually(data.id).finally(() => setBusySettle(false));
                }}
              >
                {busySettle ? "Settling…" : "Settle equally to all members"}
              </button>
            </div>
            <div className="card flush">
              <div className="card-pad"><h2>Loan positions</h2></div>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Member</th><th>Loan taken</th><th>Paid in</th><th>This month due</th></tr></thead>
                  <tbody>
                    {data.members.map((m) => (
                      <tr key={m.customerId}>
                        <td>{names[m.customerId]}</td>
                        <td>{loanPrincipalOf(data, m.customerId) ? inr(loanPrincipalOf(data, m.customerId)) : "—"}</td>
                        <td>{inr(data.payments.filter((p) => p.memberId === m.customerId).reduce((s, p) => s + p.amount, 0))}</td>
                        <td>{inr(cycleDue(data, m.customerId, cycle))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {!!settlementsOf(data).length && (
              <div className="card flush">
                <div className="card-pad"><h2>Settlement history</h2></div>
                {settlementsOf(data).map((s, i) => (
                  <div className="list-row" key={s.id || i}>
                    <div className="grow"><strong>{names[s.winnerId]}</strong><div className="muted">Cycle {s.cycle}</div></div>
                    <strong className="num">{inr(s.payout)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "settings" && (
          <div className="stack">
            <div className="card">
              <h2>Visibility & reminders</h2>
              <label className="check"><input type="checkbox" checked={visible} onChange={(e) => {
                const next = e.target.checked;
                setVisible(next);
                void updateChitSettings(data.id, { memberVisible: next });
              }} /> Member visibility — let members see this chit’s details in the app.</label>
              <label className="check"><input type="checkbox" checked={remind} onChange={(e) => {
                const next = e.target.checked;
                setRemind(next);
                void updateChitSettings(data.id, { remindDays: next ? (data.remindDays?.length ? data.remindDays : [3]) : [] });
              }} /> Payment reminders — automatically remind members before a contribution is due.</label>
              {remind && (
                <div className="seg" style={{ marginTop: 8 }}>
                  {[1, 2, 3, 5, 7].map((d) => (
                    <button
                      key={d}
                      type="button"
                      className={`chip ${(data.remindDays || []).includes(d) ? "on" : ""}`}
                      onClick={() => {
                        const cur = data.remindDays || [];
                        const next = cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort((a, b) => a - b);
                        void updateChitSettings(data.id, { remindDays: next.length ? next : [3] });
                      }}
                    >
                      {d} day{d > 1 ? "s" : ""} before
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="card">
              <h2>Reports</h2>
              <p className="muted block">This chit’s books as a CSV table you can open in Excel.</p>
              <button className="btn ghost" onClick={() => downloadChitCsv(data, names)}>Export</button>
            </div>
            <div className="card">
              <h2>Edit chit</h2>
              <p className="muted block">Rename this chit. Type, pot and duration stay fixed after create.</p>
              <button className="btn ghost" onClick={() => { setEditName(data.name); setEditTitle(data.title || ""); setEditOpen(true); }}>Edit name</button>
            </div>
            <div className="danger-box">
              <div className="row-head" style={{ margin: 0 }}>
                <div>
                  <strong>Cancel this chit</strong>
                  <p className="muted">Moves the chit to Cancelled and stops its reminders. Records stay readable, but this can’t be undone.</p>
                </div>
                <button className="btn danger" onClick={() => { void cancelChit(data.id); nav("/chits"); }}>Cancel chit</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {editOpen && (
        <div className="modal-back" onClick={() => setEditOpen(false)}>
          <form
            className="modal"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => {
              e.preventDefault();
              if (!editName.trim()) return;
              setEditSaving(true);
              void updateChitSettings(data.id, { name: editName.trim(), title: editTitle.trim() })
                .finally(() => { setEditSaving(false); setEditOpen(false); });
            }}
          >
            <h2>Edit chit</h2>
            <label className="label">Name</label>
            <input className="field" value={editName} onChange={(e) => setEditName(e.target.value)} />
            <label className="label">Title (optional)</label>
            <input className="field" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            <div className="toolbar" style={{ marginTop: 12 }}>
              <button type="button" className="btn ghost" onClick={() => setEditOpen(false)}>Cancel</button>
              <button className="btn" disabled={editSaving || !editName.trim()}>{editSaving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}

      {payPick && !payFor && (
        <div className="modal-back" onClick={() => setPayPick(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Record collection</h2>
            <p className="muted">Record one member, or mark every remaining due as paid in cash.</p>
            <button
              className="btn wide"
              style={{ margin: "12px 0 16px" }}
              disabled={!remainDue || busyAll}
              onClick={() => {
                setBusyAll(true);
                void recordAllPayments(data.id).finally(() => {
                  setBusyAll(false);
                  setPayPick(false);
                });
              }}
            >
              {busyAll ? "Recording…" : "Record all payments"}
            </button>
            {data.members.map((m) => {
              const due = cycleDue(data, m.customerId, cycle);
              const paid = paidInCycle(data, m.customerId, cycle);
              const left = Math.max(0, due - paid);
              return (
                <button
                  key={m.customerId}
                  className="chooser-row"
                  disabled={!left}
                  onClick={() => { setPayPick(false); setPayFor(m.customerId); }}
                >
                  <div className="avatar">{initials(names[m.customerId] || "?")}</div>
                  <div className="grow">
                    <strong>{names[m.customerId]}</strong>
                    <div className="muted">{left ? `${inr(left)} due` : "Paid"}</div>
                  </div>
                  {left ? <span className="link">Record</span> : <span className="muted">—</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {payFor && (
        <PayModal
          name={names[payFor] || payFor}
          cycle={cycle}
          due={cycleDue(data, payFor, cycle) - paidInCycle(data, payFor, cycle)}
          onClose={() => setPayFor(null)}
          onSave={(amount: number, kind: PaymentKind, mode: PayMode) => {
            void recordPayment(data.id, payFor, amount, kind, mode).then(() => setPayFor(null));
          }}
        />
      )}
    </AppShell>
  );
}
