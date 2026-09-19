import type { FormEvent } from "react";
import { useState } from "react";
import { CircleX, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { chitProgress, memberBalance } from "../lib/chitMath";
import { TYPE_LABEL, chitPath, initials, inr } from "../lib/format";
import { useStore } from "../store";

export function ChitsPage() {
  const { chits, cancelChit } = useStore();
  const nav = useNavigate();
  const [tab, setTab] = useState<"active" | "completed">("active");
  const pool = chits.filter((c) => (tab === "active" ? c.status === "running" : c.status !== "running"));
  const managed = pool.filter((c) => c.mode === "organise" && c.members.length > 0);
  const tracking = pool.filter((c) => c.mode === "tracking");

  return (
    <AppShell crumb="Chits">
      <div className="page">
        <div className="row-head">
          <h1>Chits</h1>
          <Link className="btn" to="/chits/new"><Plus size={16} /> New chit</Link>
        </div>
        <div className="seg block">
          <button className={`chip ${tab === "active" ? "on" : ""}`} onClick={() => setTab("active")}>Active</button>
          <button className={`chip ${tab === "completed" ? "on" : ""}`} onClick={() => setTab("completed")}>Completed</button>
        </div>
        {!!managed.length && (
          <div className="card flush block">
            <table className="table">
              <thead><tr><th>Chit</th><th>Cycle</th><th>Per cycle</th><th>Collection</th><th>Status</th></tr></thead>
              <tbody>
                {managed.map((c) => {
                  const pct = chitProgress(c);
                  return (
                    <tr key={c.id} className="clickable" onClick={() => nav(chitPath(c))}>
                      <td>
                        <div className="person">
                          <div className="avatar">{initials(c.name)}</div>
                          <div>
                            <strong>{c.name}</strong>
                            <div className="muted">{TYPE_LABEL[c.type].toUpperCase()} · {c.members.length} members</div>
                          </div>
                        </div>
                      </td>
                      <td>{c.currentCycle} / {c.duration}</td>
                      <td>{inr(c.instalment)}/M</td>
                      <td><div className="progress"><i style={{ width: `${pct}%` }} /></div></td>
                      <td><span className="pill paid">{c.status === "running" ? "Active" : c.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="cards">
          {tracking.map((c) => {
            const pct = chitProgress(c);
            return (
              <article className="card clickable" key={c.id} onClick={() => nav(chitPath(c))}>
                <div className="card-top">
                  <div className="avatar">{initials(c.name)}</div>
                  <div className="grow">
                    <div><strong>{c.name}</strong><span className="badge">Tracking</span></div>
                    <div className="muted">{inr(c.instalment)}/Month · {c.duration} Months</div>
                  </div>
                  <button className="link" onClick={(e) => { e.stopPropagation(); void cancelChit(c.id); }}>
                    <CircleX size={14} /> Cancel
                  </button>
                </div>
                {pct === 0 ? <div className="due">Payment due now</div> : <div className="muted" style={{ margin: "12px 0" }}>{c.payments.length} / {c.duration} paid</div>}
                <div className="progress blue"><i style={{ width: `${pct}%` }} /></div>
                <div className="progress-row"><span /><span>{pct}%</span></div>
              </article>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

export function CustomersPage() {
  const { customers, chits, addCustomer } = useStore();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out" | "dues">("all");

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    if (!name) return;
    void addCustomer(name, phone);
    e.currentTarget.reset();
  }

  const rows = customers.map((c) => {
    const inChits = chits.filter((ch) => ch.members.some((m) => m.customerId === c.id) && ch.status !== "cancelled");
    const contributed = chits.reduce((s, ch) => s + ch.payments.filter((p) => p.memberId === c.id).reduce((a, p) => a + p.amount, 0), 0);
    const outstanding = chits.reduce((s, ch) => {
      if (!ch.members.some((m) => m.customerId === c.id)) return s;
      return s + memberBalance(ch, c.id).outstanding;
    }, 0);
    return { ...c, inChits, contributed, outstanding };
  }).filter((r) => {
    if (q && !r.name.toLowerCase().includes(q.toLowerCase()) && !r.phone.includes(q)) return false;
    if (filter === "in") return r.inChits.length > 0;
    if (filter === "out") return r.inChits.length === 0;
    if (filter === "dues") return r.outstanding > 0;
    return true;
  });

  const inActive = customers.filter((c) => chits.some((ch) => ch.status === "running" && ch.members.some((m) => m.customerId === c.id))).length;
  const collected = chits.reduce((s, c) => s + c.payments.reduce((a, p) => a + p.amount, 0), 0);
  const outstanding = rows.reduce((s, r) => s + r.outstanding, 0);

  return (
    <AppShell crumb="customers">
      <div className="page">
        <div className="row-head">
          <div>
            <h1>Customers</h1>
            <p className="page-sub">One record per person — add someone once, then map them into as many chits as you like.</p>
          </div>
        </div>
        <form className="toolbar" onSubmit={onAdd}>
          <input className="field" name="name" placeholder="Name" style={{ margin: 0, maxWidth: 200 }} />
          <input className="field" name="phone" placeholder="Phone" style={{ margin: 0, maxWidth: 160 }} />
          <button className="btn">Add customer</button>
        </form>
        <div className="stats four">
          <div className="stat"><span>People</span><strong>{customers.length}</strong><em>in your directory</em></div>
          <div className="stat"><span>In an active chit</span><strong>{inActive}</strong><em>{customers.length - inActive} not mapped yet</em></div>
          <div className="stat"><span>Collected from all</span><strong>{inr(collected)}</strong><em>lifetime</em></div>
          <div className="stat"><span>Outstanding</span><strong>{inr(outstanding)}</strong></div>
        </div>
        <div className="toolbar">
          <input className="field" placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: 0, maxWidth: 360 }} />
          <div className="seg">
            <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>All</button>
            <button className={`chip ${filter === "in" ? "on" : ""}`} onClick={() => setFilter("in")}>In a chit</button>
            <button className={`chip ${filter === "out" ? "on" : ""}`} onClick={() => setFilter("out")}>Not in a chit</button>
            <button className={`chip ${filter === "dues" ? "on" : ""}`} onClick={() => setFilter("dues")}>Has dues</button>
          </div>
        </div>
        <div className="card flush">
          <table className="table">
            <thead><tr><th>Person</th><th>Chits</th><th>Contributed</th><th>Outstanding</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td><div className="person"><div className="avatar">{initials(r.name)}</div>{r.name}</div></td>
                  <td>{r.inChits.length ? r.inChits.map((c) => c.name).join(", ") : "Not in any chit"}</td>
                  <td>{r.contributed ? inr(r.contributed) : "—"}</td>
                  <td>{r.outstanding ? inr(r.outstanding) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
