import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
  expectedThisCycle,
  interestCollected,
  moneyIn,
  outstandingOf,
  paidInCycle,
  paymentStatus,
  payoutsOf,
  settleWinner,
  treasuryOf,
} from "../lib/chitMath";
import { FREQ_LABEL, MODE_LABEL, TYPE_LABEL, initials, inr } from "../lib/format";
import { useStore } from "../store";
import type { PayMode, PaymentKind } from "../types";

export function ChitDetailPage() {
  const { id } = useParams();
  const {
    chits, customers, recordPayment, recordAllPayments, recordAuction, luckyDraw, closeCycle,
    cancelChit, addMember, undoPayment, updateChitSettings, error,
  } = useStore();
  const nav = useNavigate();
  const chit = chits.find((c) => c.id === id);
  const [tab, setTab] = useState<"overview" | "collections" | "monthly" | "cycles" | "members" | "settings">("overview");
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

  useEffect(() => {
    if (!chit) return;
    setVisible(Boolean(chit.memberVisible));
    setRemind(Boolean(chit.remindDays?.length));
    if (chit.type === "loan" || chit.type === "fixed") {
      setBid(String(chit.pot));
    }
  }, [chit]);

  const names = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c.name])), [customers]);

  if (!chit) {
    return <AppShell crumb="Chits"><div className="page"><p>Chit not found.</p></div></AppShell>;
  }

  const data = chit;
  const pending = data.members.filter((m) => paymentStatus(data, m.customerId, data.currentCycle) === "due").length;
  const lastWin = data.auctions.find((a) => a.cycle === data.currentCycle);
  const monthDate = new Date(data.startDate);
  monthDate.setMonth(monthDate.getMonth() + data.currentCycle - 1);
  const remainDue = data.members.filter((m) => {
    const due = cycleDue(data, m.customerId, data.currentCycle);
    return due - paidInCycle(data, m.customerId, data.currentCycle) > 0;
  }).length;
  const unprized = data.members.filter((m) => !m.prizedCycle);
  const expectedLife = data.instalment * data.duration * Math.max(1, data.members.length);
  const ended = new Date(data.startDate);
  ended.setMonth(ended.getMonth() + data.duration);

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
              {data.commissionKind === "amount" && data.commissionValue
                ? ` · commission ${inr(data.commissionValue)}`
                : ` · commission ${data.commissionPct}%`}
            </p>
          </div>
          <div className="toolbar" style={{ margin: 0 }}>
            <button className="btn ghost" onClick={() => window.print()}>Export</button>
            <button className="btn ghost" onClick={() => setTab("settings")}>Edit chit</button>
            <button className="btn" onClick={() => setPayPick(true)}>+ Record collection</button>
          </div>
        </div>
        {error && <p className="due">{error}</p>}
        <div className="stats six">
          <div className="stat"><span>Month</span><strong>{data.currentCycle} / {data.duration}</strong></div>
          <div className="stat"><span>Collected this month</span><strong>{inr(collectedThisCycle(data))}</strong><em>of {inr(expectedThisCycle(data))} expected</em></div>
          <div className="stat"><span>Outstanding</span><strong>{inr(outstandingOf(data))}</strong><em>{pending} members pending</em></div>
          <div className="stat"><span>Cash on hand</span><strong className={treasuryOf(data) < 0 ? "neg" : ""}>{inr(treasuryOf(data))}</strong></div>
          <div className="stat"><span>Commission earned</span><strong>{inr(commissionEarned(data))}</strong><em>{inr(data.auctions.find((a) => a.cycle === data.currentCycle)?.commission || 0)} this month</em></div>
          <div className="stat"><span>Members</span><strong>{data.members.length}</strong><em>of {data.membersCount} slots</em></div>
        </div>
        <div className="tabs">
          {(["overview", "collections", "monthly", "cycles", "members", "settings"] as const).map((t) => (
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
                <h2>Month {data.currentCycle} of {data.duration}</h2>
                <div className="progress blue" style={{ margin: "4px 0 12px" }}><i style={{ width: `${Math.round(((data.currentCycle - 1) / data.duration) * 100)}%` }} /></div>
                <p className="muted block">{inr(moneyIn(data))} collected of {inr(expectedLife)} expected</p>
                <div className="grid-2">
                  <div><div className="muted">Total paid out</div><strong className="num">{inr(payoutsOf(data))}</strong></div>
                  <div><div className="muted">Each member gets</div><strong className="num">{inr(Math.round(payoutsOf(data) / Math.max(1, data.members.length)))}</strong></div>
                </div>
                <p className="muted" style={{ marginTop: 10 }}>Payouts already recorded. Commission has already left cash on hand.</p>
              </div>
              <div className="card">
                <h2>You’ve earned</h2>
                <div className="kv"><span>Commission</span><strong>{inr(commissionEarned(data))}</strong></div>
                {data.type === "auction" && (
                  <div className="kv"><span>Dividend per member</span><strong>{inr(data.auctions.at(-1)?.dividend || 0)}</strong></div>
                )}
                {data.type === "loan" && (
                  <div className="kv"><span>Interest collected</span><strong>{inr(interestCollected(data))}</strong></div>
                )}
              </div>
            </div>
            <div className="card">
              <h2>Money in / out</h2>
              <div className="kv"><span>Money in</span><strong>{inr(moneyIn(data))}</strong></div>
              <div className="kv"><span>Payouts</span><strong>{inr(payoutsOf(data))}</strong></div>
              <div className="kv"><span>Commission taken</span><strong>{inr(commissionEarned(data))}</strong></div>
              <div className="kv"><span>On hand</span><strong className={treasuryOf(data) < 0 ? "neg" : ""}>{inr(treasuryOf(data))}</strong></div>
              <p className="muted" style={{ marginTop: 12 }}>Cash on hand is collections minus payouts minus your monthly commission.</p>
              <div className="grid-2" style={{ marginTop: 8 }}>
                <div className="kv"><span>Type</span><strong>{TYPE_LABEL[data.type].toUpperCase()}</strong></div>
                <div className="kv"><span>Frequency</span><strong>{FREQ_LABEL[data.frequency]}</strong></div>
                <div className="kv"><span>Contribution</span><strong>{inr(data.instalment)}</strong></div>
                <div className="kv"><span>Duration</span><strong>{data.duration} months</strong></div>
                {data.type === "loan" && (
                  <div className="kv"><span>Interest</span><strong>{data.interestRate ?? 0}%</strong></div>
                )}
                {data.type === "fixed" && data.premiumAmount != null && data.premiumAmount > 0 && (
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
                2. {data.type === "loan" ? "Give loan" : data.type === "fixed" ? "Award pot" : "Auction"}
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
                  <strong>Month {data.currentCycle}</strong>
                  <span className="muted"> {monthDate.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="pill paid">Open</span>
                  <div className="muted" style={{ marginTop: 6 }}>{collectedCount(data)} of {data.members.length} collected</div>
                </div>
                <div className="seg">
                  <button
                    className="btn"
                    disabled={!remainDue || busyAll}
                    onClick={() => {
                      setBusyAll(true);
                      void recordAllPayments(data.id).finally(() => setBusyAll(false));
                    }}
                  >
                    {busyAll ? "Recording…" : "Record all payments"}
                  </button>
                  <button className="btn ghost" type="button" disabled={!remainDue} onClick={() => setUnpaidNoted(true)}>
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
                      const due = cycleDue(data, m.customerId, data.currentCycle);
                      const paid = paidInCycle(data, m.customerId, data.currentCycle);
                      const status = paymentStatus(data, m.customerId, data.currentCycle);
                      const last = [...data.payments].reverse().find((p) => p.memberId === m.customerId && p.cycle === data.currentCycle);
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
                            {status === "due" || status === "partial" ? (
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
                    {data.type === "loan" ? "This month’s loan" : data.type === "fixed" ? "This month’s payout" : "This month’s auction"}
                  </h2>
                  <p className="muted">
                    {data.type === "loan"
                      ? "Collect first. Giving a loan this month is optional — close the month when the books look right."
                      : "Only after collections. Payout plus commission cannot exceed cash on hand."}
                  </p>
                </div>
                <button
                  className="btn green"
                  disabled={
                    data.mode === "organise" && data.type === "auction" && !lastWin
                      ? true
                      : data.mode === "organise" && data.type === "fixed" && !lastWin
                        ? true
                        : false
                  }
                  onClick={() => void closeCycle(data.id)}
                >
                  Close month
                </button>
              </div>
              {lastWin ? (
                <div style={{ marginTop: 12 }}>
                  <div className="kv">
                    <span>
                      {data.type === "loan"
                        ? "Borrower"
                        : lastWin.method === "lucky_draw"
                          ? "Lucky draw winner"
                          : data.type === "fixed"
                            ? "Awarded to"
                            : "Winner · Auction"}
                    </span>
                    <strong>{names[lastWin.winnerId]}</strong>
                  </div>
                  <div className="kv">
                    <span>{data.type === "loan" ? "Loan given" : "Payout"}</span>
                    <strong>{inr(lastWin.payout)}</strong>
                  </div>
                  <div className="kv"><span>Your commission</span><strong>{inr(lastWin.commission)}</strong></div>
                  {lastWin.dividend > 0 && (
                    <div className="kv"><span>Dividend next month / member</span><strong>{inr(lastWin.dividend)}</strong></div>
                  )}
                </div>
              ) : !canSettleCycle(data) ? (
                <p className="muted" style={{ margin: "12px 0 0" }}>
                  Collect at least one payment this month before {data.type === "loan" ? "giving a loan" : data.type === "fixed" ? "awarding the pot" : "recording the auction"}.
                </p>
              ) : (
                <div style={{ padding: "16px 0 0" }}>
                  {data.type === "auction" && (
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
                        const cashAfter = treasuryOf(data) - preview.payout - preview.commission;
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
                  {data.type === "loan" && (
                    <>
                      <div className="month-auction" style={{ padding: 0 }}>
                        <select className="field" value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                          <option value="">Borrower</option>
                          {unprized.map((m) => <option key={m.customerId} value={m.customerId}>{names[m.customerId]}</option>)}
                        </select>
                        <input className="field" placeholder="Loan amount" value={bid} onChange={(e) => setBid(e.target.value)} />
                        <button
                          className="btn"
                          disabled={!winnerId || !Number(bid)}
                          onClick={() => void recordAuction(data.id, winnerId, Number(bid) || data.pot, "fixed")}
                        >
                          Give loan
                        </button>
                      </div>
                      {winnerId && Number(bid) > 0 && (() => {
                        const preview = settleWinner(data, winnerId, Number(bid), "fixed");
                        const cashAfter = treasuryOf(data) - preview.payout - preview.commission;
                        const nextDue = Math.round(data.instalment + (data.instalment * (data.interestRate || 0)) / 100);
                        return (
                          <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                            <div className="kv"><span>Loan given</span><strong>{inr(preview.payout)}</strong></div>
                            <div className="kv"><span>Your commission</span><strong>{inr(preview.commission)}</strong></div>
                            <div className="kv"><span>Borrower’s due from next month</span><strong>{inr(nextDue)} ({data.interestRate || 0}% interest)</strong></div>
                            <div className="kv"><span>Cash on hand after</span><strong className={cashAfter < 0 ? "neg" : ""}>{inr(cashAfter)}</strong></div>
                          </div>
                        );
                      })()}
                      <p className="muted" style={{ marginTop: 12 }}>You can skip giving a loan this month and still close it after collections.</p>
                    </>
                  )}
                  {data.type === "fixed" && (
                    <>
                      <div className="month-auction" style={{ padding: 0, gridTemplateColumns: "1fr auto" }}>
                        <select className="field" value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                          <option value="">Award pot to</option>
                          {unprized.map((m) => <option key={m.customerId} value={m.customerId}>{names[m.customerId]}</option>)}
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
                        const cashAfter = treasuryOf(data) - preview.payout - preview.commission;
                        return (
                          <div className="card" style={{ marginTop: 12, background: "#f8fafc" }}>
                            <div className="kv"><span>Member receives</span><strong>{inr(preview.payout)}</strong></div>
                            <div className="kv"><span>Your commission</span><strong>{inr(preview.commission)}</strong></div>
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
                  {data.type === "auction" && <th>Dividend / member</th>}
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: data.currentCycle }, (_, i) => i + 1).reverse().map((cyc) => {
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
                const left = Math.max(0, data.instalment * data.duration - paid);
                return (
                  <div key={m.customerId} className="list-row">
                    <div className="avatar">{initials(names[m.customerId] || "?")}</div>
                    <div className="grow">
                      <button className="link" style={{ fontWeight: 600 }} onClick={() => nav(`/customers/${m.customerId}`)}>{names[m.customerId]}</button>
                      <div className="muted">Paid {inr(paid)}{m.prizedCycle ? ` · prized month ${m.prizedCycle}` : ""}</div>
                    </div>
                    <div className="num">{inr(left)} left to pay</div>
                  </div>
                );
              })}
            </div>
          </>
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
            </div>
            <div className="card">
              <h2>Reports</h2>
              <button className="btn ghost" onClick={() => window.print()}>Export</button>
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
              const due = cycleDue(data, m.customerId, data.currentCycle);
              const paid = paidInCycle(data, m.customerId, data.currentCycle);
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
          cycle={data.currentCycle}
          due={cycleDue(data, payFor, data.currentCycle) - paidInCycle(data, payFor, data.currentCycle)}
          onClose={() => setPayFor(null)}
          onSave={(amount: number, kind: PaymentKind, mode: PayMode) => {
            void recordPayment(data.id, payFor, amount, kind, mode).then(() => setPayFor(null));
          }}
        />
      )}
    </AppShell>
  );
}
