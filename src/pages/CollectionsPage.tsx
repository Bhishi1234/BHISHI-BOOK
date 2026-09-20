import { useMemo, useState } from "react";
import { AppShell } from "../layout/AppShell";
import { MODE_LABEL, initials, inr } from "../lib/format";
import { downloadDayBookPdf, downloadReceiptPdf } from "../lib/reportsPdf";
import { useStore } from "../store";
import type { PayMode } from "../types";

export function CollectionsPage() {
  const { chits, customers } = useStore();
  const owned = useMemo(() => chits.filter((c) => c.viewerRole !== "member"), [chits]);
  const [range, setRange] = useState<"today" | "week" | "month" | "all">("all");
  const [chitId, setChitId] = useState("all");
  const [mode, setMode] = useState<"all" | PayMode>("all");
  const [q, setQ] = useState("");
  const names = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  const receipts = useMemo(() => {
    const now = new Date();
    return owned.flatMap((c) =>
      c.payments.map((p) => ({ ...p, chitId: c.id, chitName: c.name })),
    ).filter((p) => {
      if (chitId !== "all" && p.chitId !== chitId) return false;
      if (mode !== "all" && (p.mode || "cash") !== mode) return false;
      const d = new Date(p.date);
      if (range === "today" && d.toDateString() !== now.toDateString()) return false;
      if (range === "week" && now.getTime() - d.getTime() > 7 * 86400000) return false;
      if (range === "month" && (d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear())) return false;
      const name = names[p.memberId] || "";
      if (q && !name.toLowerCase().includes(q.toLowerCase()) && !p.chitName.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [owned, chitId, mode, range, q, names]);

  const collected = receipts.reduce((s, p) => s + p.amount, 0);
  const byMode = (m: PayMode) => receipts.filter((p) => (p.mode || "cash") === m).reduce((s, p) => s + p.amount, 0);
  const membersPaid = new Set(receipts.map((p) => p.memberId)).size;

  function exportDayBook() {
    const title =
      range === "today" ? "Today"
        : range === "week" ? "This week"
          : range === "month" ? "This month"
            : "All collections";
    downloadDayBookPdf(
      title,
      receipts,
      names,
      {
        collected,
        byMode: {
          cash: byMode("cash"),
          upi: byMode("upi"),
          bank: byMode("bank"),
          cheque: byMode("cheque"),
          adjusted: byMode("adjusted"),
        },
      },
    );
  }

  return (
    <AppShell crumb="Collections">
      <div className="page">
        <div className="row-head">
          <div>
            <h1>Collection register</h1>
            <p className="page-sub">Every receipt across your chits</p>
          </div>
          <button className="btn" onClick={exportDayBook} disabled={!receipts.length}>Day book PDF</button>
        </div>
        <div className="toolbar">
          {(["today", "week", "month", "all"] as const).map((r) => (
            <button key={r} className={`chip ${range === r ? "on" : ""}`} onClick={() => setRange(r)}>
              {r === "all" ? "All" : r === "today" ? "Today" : r === "week" ? "This week" : "This month"}
            </button>
          ))}
          <select className="field" style={{ margin: 0, maxWidth: 200 }} value={chitId} onChange={(e) => setChitId(e.target.value)}>
            <option value="all">All chits</option>
            {owned.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="field" style={{ margin: 0, maxWidth: 180 }} value={mode} onChange={(e) => setMode(e.target.value as "all" | PayMode)}>
            <option value="all">All modes</option>
            {Object.entries(MODE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="field" style={{ margin: 0, maxWidth: 220 }} placeholder="Find a member or chit" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="stats six">
          <div className="stat"><span>Collected</span><strong>{inr(collected)}</strong></div>
          <div className="stat"><span>Receipts</span><strong>{receipts.length}</strong></div>
          <div className="stat"><span>Members paid</span><strong>{membersPaid}</strong></div>
          <div className="stat"><span>Cash</span><strong>{inr(byMode("cash"))}</strong></div>
          <div className="stat"><span>UPI & bank</span><strong>{inr(byMode("upi") + byMode("bank"))}</strong></div>
          <div className="stat"><span>Adjusted from payouts</span><strong>{inr(byMode("adjusted"))}</strong></div>
        </div>
        <div className="grid-2">
          <div className="card flush">
            <div className="table-wrap">
            {receipts.map((p) => {
              const chit = owned.find((c) => c.id === p.chitId);
              return (
                <div key={p.id} className="list-row">
                  <div className="avatar">{initials(names[p.memberId] || "?")}</div>
                  <div className="grow">
                    <strong>{names[p.memberId]}</strong>
                    <div className="muted">
                      {p.chitName} · month {p.cycle}
                      {p.slot != null ? ` · slot ${p.slot}` : ""}
                      {" · "}{MODE_LABEL[p.mode || "cash"]}
                    </div>
                  </div>
                  <strong className="num">{inr(p.amount)}</strong>
                  {chit && (
                    <button
                      className="link"
                      type="button"
                      onClick={() => downloadReceiptPdf(chit, p, names)}
                    >
                      PDF
                    </button>
                  )}
                </div>
              );
            })}
            {!receipts.length && <p className="empty">No receipts in this range.</p>}
            </div>
          </div>
          <div className="card">
            <h2>Modes in this range</h2>
            {(Object.keys(MODE_LABEL) as PayMode[]).map((m) => (
              <div className="kv" key={m}><span>{MODE_LABEL[m]}</span><strong>{inr(byMode(m))}</strong></div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
