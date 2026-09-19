import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { PayModal } from "../components/PayModal";
import { AppShell } from "../layout/AppShell";
import {
  collectedThisCycle,
  commissionEarned,
  cycleDue,
  expectedThisCycle,
  moneyIn,
  moneyOut,
  outstandingOf,
  paidInCycle,
  paymentStatus,
  treasuryOf,
} from "../lib/chitMath";
import { FREQ_LABEL, MODE_LABEL, TYPE_LABEL, initials, inr } from "../lib/format";
import { useStore } from "../store";
import type { PayMode, PaymentKind } from "../types";

export function ChitDetailPage() {
  const { id } = useParams();
  const {
    chits, customers, recordPayment, recordAuction, luckyDraw, closeCycle,
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

  useEffect(() => {
    if (!chit) return;
    setVisible(Boolean(chit.memberVisible));
    setRemind(Boolean(chit.remindDays?.length));
  }, [chit]);

  const names = useMemo(() => Object.fromEntries(customers.map((c) => [c.id, c.name])), [customers]);

  if (!chit) {
    return <AppShell crumb="Chits"><div className="page"><p>Chit not found.</p></div></AppShell>;
  }

  const data = chit;
  const pending = data.members.filter((m) => paymentStatus(data, m.customerId, data.currentCycle) === "due").length;
  const paidN = data.members.length - pending;
  const lastWin = data.auctions.find((a) => a.cycle === data.currentCycle);
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
              {data.members.length} members · {inr(data.instalment)}/{data.frequency} · started {new Date(data.startDate).toLocaleString("en-IN", { month: "short", year: "numeric" })} · ends {ended.toLocaleString("en-IN", { month: "short", year: "numeric" })} · commission {data.commissionPct}%
            </p>
          </div>
          <div className="toolbar" style={{ margin: 0 }}>
            <button className="btn ghost" onClick={() => window.print()}>Export</button>
            <button className="btn ghost" onClick={() => setTab("settings")}>Edit chit</button>
            <button className="btn" onClick={() => setPayFor(data.members[0]?.customerId || null)}>+ Record collection</button>
          </div>
        </div>
        {error && <p className="due">{error}</p>}
        <div className="stats six">
          <div className="stat"><span>Month</span><strong>{data.currentCycle} / {data.duration}</strong></div>
          <div className="stat"><span>Collected this month</span><strong>{inr(collectedThisCycle(data))}</strong><em>of {inr(expectedThisCycle(data))} expected</em></div>
          <div className="stat"><span>Outstanding</span><strong>{inr(outstandingOf(data))}</strong><em>{pending} members pending</em></div>
          <div className="stat"><span>Cash on hand</span><strong>{inr(treasuryOf(data))}</strong></div>
          <div className="stat"><span>Commission earned</span><strong>{inr(commissionEarned(data))}</strong></div>
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
                  <div><div className="muted">Total pot</div><strong className="num">{inr(data.pot - commissionEarned(data))}</strong></div>
                  <div><div className="muted">Each member gets</div><strong className="num">{inr(Math.round((data.pot - commissionEarned(data)) / Math.max(1, data.membersCount)))}</strong></div>
                </div>
              </div>
              <div className="card">
                <h2>You’ve earned</h2>
                <div className="kv"><span>Commission</span><strong>{inr(commissionEarned(data))}</strong></div>
                <div className="kv"><span>Dividend per member</span><strong>{inr(data.auctions.at(-1)?.dividend || 0)}</strong></div>
              </div>
            </div>
            <div className="card">
              <h2>Money in / out</h2>
              <div className="kv"><span>Money in</span><strong>{inr(moneyIn(data))}</strong></div>
              <div className="kv"><span>Money out</span><strong>{inr(moneyOut(data))}</strong></div>
              <div className="kv"><span>On hand</span><strong>{inr(treasuryOf(data))}</strong></div>
              <p className="muted" style={{ marginTop: 12 }}>Of which {inr(commissionEarned(data))} is your commission.</p>
              <div className="grid-2" style={{ marginTop: 8 }}>
                <div className="kv"><span>Type</span><strong>{TYPE_LABEL[data.type].toUpperCase()}</strong></div>
                <div className="kv"><span>Frequency</span><strong>{FREQ_LABEL[data.frequency]}</strong></div>
                <div className="kv"><span>Contribution</span><strong>{inr(data.instalment)}</strong></div>
                <div className="kv"><span>Duration</span><strong>{data.duration} months</strong></div>
              </div>
            </div>
          </>
        )}

        {tab === "collections" && (
          <div className="card flush">
            <div className="card-pad">
              <div className="muted">Collected</div>
              <div className="hero-figure">{inr(moneyIn(data))}</div>
              <p className="muted">{data.payments.length} receipts from {data.members.length} members</p>
            </div>
            {data.payments.map((p) => (
              <div key={p.id} className="list-row">
                <div className="avatar">{initials(names[p.memberId] || "?")}</div>
                <div className="grow">
                  <strong>{names[p.memberId]}</strong>
                  <div className="muted">{MODE_LABEL[p.mode || "cash"]}</div>
                </div>
                <strong className="num">{inr(p.amount)}</strong>
                <button className="link" onClick={() => void undoPayment(data.id, p.id)}>Undo</button>
              </div>
            ))}
          </div>
        )}

        {tab === "monthly" && (
          <div className="grid-2">
            <div className="card flush">
              <div className="card-pad" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div><strong>Month {data.currentCycle}</strong> <span className="muted">{new Date(data.startDate).toLocaleDateString("en-IN")}</span> <span className="pill paid">Open</span></div>
                <div className="seg">
                  <button className="btn ghost" disabled={!!lastWin || !winnerId} onClick={() => void recordAuction(data.id, winnerId, Number(bid) || data.pot, "auction")}>Record auction</button>
                  <button className="btn ghost" disabled={!!lastWin} onClick={() => void luckyDraw(data.id)}>Lucky draw</button>
                  <button className="btn green" disabled={!lastWin && data.mode === "organise"} onClick={() => void closeCycle(data.id)}>Close month</button>
                </div>
              </div>
              {data.type === "auction" && !lastWin && (
                <div style={{ padding: "0 16px 12px" }} className="grid-2">
                  <select className="field" value={winnerId} onChange={(e) => setWinnerId(e.target.value)}>
                    <option value="">Winner</option>
                    {unprized.map((m) => <option key={m.customerId} value={m.customerId}>{names[m.customerId]}</option>)}
                  </select>
                  <input className="field" placeholder="Winning bid" value={bid} onChange={(e) => setBid(e.target.value)} />
                </div>
              )}
              <table className="table">
                <thead><tr><th>Member</th><th>Due</th><th>Paid</th><th>Balance</th><th>Mode</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {data.members.map((m) => {
                    const due = cycleDue(data, m.customerId, data.currentCycle);
                    const paid = paidInCycle(data, m.customerId, data.currentCycle);
                    const status = paymentStatus(data, m.customerId, data.currentCycle);
                    const last = [...data.payments].reverse().find((p) => p.memberId === m.customerId && p.cycle === data.currentCycle);
                    return (
                      <tr key={m.customerId}>
                        <td><div className="person"><div className="avatar">{initials(names[m.customerId] || "?")}</div>{names[m.customerId]}</div></td>
                        <td>{inr(due)}</td>
                        <td>{inr(paid)}</td>
                        <td>{paid >= due ? "—" : inr(due - paid)}</td>
                        <td>{last ? MODE_LABEL[last.mode || "cash"] : "—"}</td>
                        <td><span className={`pill ${status}`}>{status[0].toUpperCase() + status.slice(1)}</span></td>
                        <td><button className="link" onClick={() => setPayFor(m.customerId)}>Record</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h2>Cycle position</h2>
              <div className="kv"><span>Expected this cycle</span><strong>{inr(expectedThisCycle(data))}</strong></div>
              <div className="kv"><span>Collected</span><strong>{inr(collectedThisCycle(data))}</strong></div>
              <div className="kv"><span>Outstanding</span><strong>{inr(outstandingOf(data))}</strong></div>
              <div className="kv"><span>Cash on hand</span><strong>{inr(treasuryOf(data))}</strong></div>
              <p className="muted" style={{ marginTop: 12 }}>{paidN} of {data.members.length} collected</p>
            </div>
          </div>
        )}

        {tab === "cycles" && (
          <div className="card flush">
            <div className="card-pad"><h2>Monthly breakdown</h2></div>
            <table className="table">
              <thead><tr><th>Cycle</th><th>Collected</th><th>Payout</th><th>Commission</th><th>Dividend / member</th></tr></thead>
              <tbody>
                {Array.from({ length: data.currentCycle }, (_, i) => i + 1).map((cyc) => {
                  const a = data.auctions.find((x) => x.cycle === cyc);
                  const col = data.payments.filter((p) => p.cycle === cyc).reduce((s, p) => s + p.amount, 0);
                  return (
                    <tr key={cyc}>
                      <td>Cycle {cyc}</td>
                      <td>{inr(col)}</td>
                      <td>{inr(a?.payout || 0)}</td>
                      <td>{inr(a?.commission || 0)}</td>
                      <td>{inr(a?.dividend || 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                      <strong>{names[m.customerId]}</strong>
                      <div className="muted">Paid {inr(paid)}</div>
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

      {payFor && (
        <PayModal
          name={names[payFor] || payFor}
          cycle={data.currentCycle}
          due={cycleDue(data, payFor, data.currentCycle)}
          onClose={() => setPayFor(null)}
          onSave={(amount: number, kind: PaymentKind, mode: PayMode) => {
            void recordPayment(data.id, payFor, amount, kind, mode).then(() => setPayFor(null));
          }}
        />
      )}
    </AppShell>
  );
}
