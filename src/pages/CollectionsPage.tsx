import { useMemo, useState } from "react";
import { Banknote, FileText, Landmark, Receipt, Users, Wallet } from "lucide-react";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { initials, inr } from "../lib/format";
import { downloadDayBookPdf, downloadReceiptPdf } from "../lib/reportsPdf";
import { useStore } from "../store";
import type { PayMode } from "../types";
import { StatCard } from "../ui/StatCard";

export function CollectionsPage() {
  const { chits, customers } = useStore();
  const { m, modeLabel } = useI18n();
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
  const byMode = (modeId: PayMode) => receipts.filter((p) => (p.mode || "cash") === modeId).reduce((s, p) => s + p.amount, 0);
  const membersPaid = new Set(receipts.map((p) => p.memberId)).size;

  const byBhishi = useMemo(() => {
    const map = new Map<string, { chitId: string; chitName: string; rows: typeof receipts; total: number }>();
    for (const p of receipts) {
      const cur = map.get(p.chitId) || { chitId: p.chitId, chitName: p.chitName, rows: [], total: 0 };
      cur.rows.push(p);
      cur.total += p.amount;
      map.set(p.chitId, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total || a.chitName.localeCompare(b.chitName));
  }, [receipts]);

  function exportDayBook() {
    const title =
      range === "today" ? m.common.today
        : range === "week" ? m.common.thisWeek
          : range === "month" ? m.common.thisMonth
            : m.common.all;
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
    <AppShell crumb={m.collections.register}>
      <div className="page">
        <div className="row-head">
          <div>
            <h1>{m.collections.title}</h1>
            <p className="page-sub">{m.collections.subtitle}</p>
          </div>
          <button className="btn" onClick={exportDayBook} disabled={!receipts.length}>{m.collections.dayBook}</button>
        </div>
        <div className="toolbar">
          {(["today", "week", "month", "all"] as const).map((r) => (
            <button key={r} className={`chip ${range === r ? "on" : ""}`} onClick={() => setRange(r)}>
              {r === "all" ? m.common.all : r === "today" ? m.common.today : r === "week" ? m.common.thisWeek : m.common.thisMonth}
            </button>
          ))}
          <select className="field" style={{ margin: 0, maxWidth: 200 }} value={chitId} onChange={(e) => setChitId(e.target.value)}>
            <option value="all">{m.collections.allChits}</option>
            {owned.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="field" style={{ margin: 0, maxWidth: 180 }} value={mode} onChange={(e) => setMode(e.target.value as "all" | PayMode)}>
            <option value="all">{m.common.all}</option>
            {(["cash", "upi", "bank", "cheque", "adjusted"] as PayMode[]).map((k) => (
              <option key={k} value={k}>{modeLabel(k)}</option>
            ))}
          </select>
          <input className="field" style={{ margin: 0, maxWidth: 220 }} placeholder={m.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="stats four">
          <StatCard label={m.terms.collected} value={inr(collected)} hint={m.dash.collectedHint} tone="green" icon={Wallet} />
          <StatCard label={m.collections.register} value={receipts.length} hint={m.terms.hapta} tone="blue" icon={Receipt} />
          <StatCard label={m.collections.membersPaid} value={membersPaid} hint={m.collections.uniquePeople} tone="violet" icon={Users} />
          <StatCard label={modeLabel("cash")} value={inr(byMode("cash"))} hint={`UPI ${inr(byMode("upi"))}`} tone="amber" icon={Banknote} />
        </div>

        <div className="grid-2 block">
          <div className="stack">
            {!byBhishi.length && <div className="card"><p className="empty" style={{ margin: 0 }}>{m.chitsPage.empty}</p></div>}
            {byBhishi.map((group) => {
              const chit = owned.find((c) => c.id === group.chitId);
              return (
                <div key={group.chitId} className="card flush collections-bhishi-card">
                  <div className="card-pad collections-bhishi-head">
                    <div>
                      <strong>{group.chitName}</strong>
                      <div className="muted">
                        {group.rows.length} {group.rows.length === 1 ? "receipt" : "receipts"}
                      </div>
                    </div>
                    <strong className="num">{inr(group.total)}</strong>
                  </div>
                  <div className="collections-bhishi-body">
                    {group.rows
                      .slice()
                      .sort((a, b) => b.date.localeCompare(a.date) || b.cycle - a.cycle)
                      .map((p) => (
                        <div key={p.id} className="list-row">
                          <div className="avatar">{initials(names[p.memberId] || "?")}</div>
                          <div className="grow">
                            <strong>{names[p.memberId]}</strong>
                            <div className="muted">
                              {m.terms.haptaRound} {p.cycle}
                              {p.slot != null ? ` · ${m.terms.hand} ${p.slot}` : ""}
                              {" · "}{modeLabel(p.mode || "cash")}
                              {" · "}{new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
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
                      ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="card collections-mode-card">
            <h2>{m.terms.collection}</h2>
            <p className="muted" style={{ marginTop: 0 }}>{m.collections.subtitle}</p>
            {(["cash", "upi", "bank", "cheque", "adjusted"] as PayMode[]).map((payMode) => (
              <div className="kv" key={payMode}>
                <span className="collections-mode-label">
                  {payMode === "upi" ? <Landmark size={14} /> : payMode === "cash" ? <Banknote size={14} /> : <FileText size={14} />}
                  {modeLabel(payMode)}
                </span>
                <strong>{inr(byMode(payMode))}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
