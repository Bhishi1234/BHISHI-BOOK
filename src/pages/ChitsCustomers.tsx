import type { FormEvent } from "react";
import { useState } from "react";
import { AlertCircle, ArrowUpRight, BookUser, CircleX, PiggyBank, Plus, UserRound, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { chitProgress, displayCycle, memberBalance } from "../lib/chitMath";
import { contactsPickerAvailable, pickContactsFromBook } from "../lib/contacts";
import { chitPath, initials, inr } from "../lib/format";
import { inviteMemberWhatsAppMessage, tryPhone10 } from "../lib/share";
import { InviteWhatsAppButton } from "../components/InviteWhatsAppButton";
import { usePhonesOnApp } from "../lib/usePhonesOnApp";
import { useStore } from "../store";
import { StatCard, toneAt } from "../ui/StatCard";

export function ChitsPage() {
  const { chits, cancelChit, user } = useStore();
  const { m, typeLabel, statusLabel } = useI18n();
  const nav = useNavigate();
  const [tab, setTab] = useState<"active" | "completed">("active");
  const pool = chits.filter((c) => (tab === "active" ? c.status === "running" : c.status !== "running"));
  const managed = pool.filter((c) => c.mode === "organise" && c.viewerRole !== "member");
  const tracking = pool.filter((c) => c.mode === "tracking" && c.viewerRole !== "member");
  const shared = pool.filter((c) => c.viewerRole === "member");

  return (
    <AppShell crumb={m.nav.chits}>
      <div className="page">
        <div className="row-head">
          <h1>{m.chitsPage.title}</h1>
          <Link className="btn" to="/chits/new"><Plus size={16} /> {m.nav.newChit}</Link>
        </div>
        <p className="page-sub">{m.chitsPage.subtitle}</p>
        <div className="seg block">
          <button className={`chip ${tab === "active" ? "on" : ""}`} onClick={() => setTab("active")}>{m.common.active}</button>
          <button className={`chip ${tab === "completed" ? "on" : ""}`} onClick={() => setTab("completed")}>{m.status.completed}</button>
        </div>
        {!!managed.length && (
          <div className="dash-chits block">
            {managed.map((c, i) => {
              const pct = chitProgress(c);
              const featured = i % 2 === 0;
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
                      <span>{typeLabel(c.type)} · {c.members.length} {m.common.members}</span>
                    </div>
                    <div className="dash-chit-actions">
                      <span className={`dash-chit-status${c.status === "running" ? " live" : ""}`}>
                        {statusLabel(c.status) || c.status}
                      </span>
                      <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                    </div>
                  </div>
                  <div className="dash-chit-divider" />
                  <div className="dash-chit-meta">
                    <div>
                      <span>{m.terms.haptaRound}</span>
                      <strong>{displayCycle(c)} / {c.duration}</strong>
                    </div>
                    <div>
                      <span>{m.terms.perHapta}</span>
                      <strong>{inr(c.instalment)}</strong>
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
        {!managed.length && (
          <p className="muted block">{tab === "active" ? "No active chits yet." : "No completed chits yet."}</p>
        )}

        <div className="row-head" style={{ marginTop: managed.length ? 8 : 0 }}>
          <h2>{m.dash.sharedWithMe}</h2>
        </div>
        {!user?.phone && (
          <p className="muted block">
            Set your phone on <Link to="/profile">Profile</Link> to see chits where an organiser added you.
          </p>
        )}
        {user?.phone && !shared.length && (
          <p className="muted block">
            No shared chits yet. Ask your organiser to turn on Member visibility for the group.
          </p>
        )}
        {!!shared.length && (
          <div className="dash-chits block">
            {shared.map((c, i) => {
              const pct = chitProgress(c);
              const featured = i % 2 === 0;
              return (
                <article
                  key={c.id}
                  className={`dash-chit${featured ? " featured" : ""}`}
                  onClick={() => nav(chitPath(c))}
                >
                  <div className="dash-chit-top">
                    <div className={`dash-chit-avatar tone-${toneAt(i + 2)}`}>{initials(c.name)}</div>
                    <div className="dash-chit-heading">
                      <strong>{c.name}</strong>
                      <span>{typeLabel(c.type)} · {c.members.length} {m.common.members}</span>
                    </div>
                    <div className="dash-chit-actions">
                      <span className="dash-chit-status">Shared</span>
                      <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                    </div>
                  </div>
                  <div className="dash-chit-divider" />
                  <div className="dash-chit-meta">
                    <div>
                      <span>{m.terms.haptaRound}</span>
                      <strong>{displayCycle(c)} / {c.duration}</strong>
                    </div>
                    <div>
                      <span>{m.terms.perHapta}</span>
                      <strong>{inr(c.instalment)}</strong>
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

        {!!tracking.length && (
          <>
            <div className="row-head" style={{ marginTop: 8 }}>
              <h2>Tracking</h2>
            </div>
            <div className="dash-chits block">
              {tracking.map((c, i) => {
                const pct = chitProgress(c);
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
                        <span>Tracking · {inr(c.instalment)}/mo · {c.duration} months</span>
                      </div>
                      <div className="dash-chit-actions">
                        <button
                          className="link"
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void cancelChit(c.id); }}
                        >
                          <CircleX size={14} /> Cancel
                        </button>
                        <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                      </div>
                    </div>
                    <div className="dash-chit-divider" />
                    {pct === 0 ? (
                      <div className="due" style={{ margin: "0 0 10px" }}>Payment due now</div>
                    ) : (
                      <div className="dash-chit-meta">
                        <div>
                          <span>Paid</span>
                          <strong>{c.payments.length} / {c.duration}</strong>
                        </div>
                        <div>
                          <span>Progress</span>
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
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export function CustomersPage() {
  const { customers, chits, addCustomer, user } = useStore();
  const { m } = useI18n();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "in" | "out" | "dues">("all");
  const [picking, setPicking] = useState(false);
  const canPick = contactsPickerAvailable();
  const { isOnApp } = usePhonesOnApp(customers.map((c) => c.phone));

  function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const phone = String(fd.get("phone") || "").trim();
    if (!name) return;
    void addCustomer(name, phone);
    e.currentTarget.reset();
  }

  async function fromContacts() {
    setPicking(true);
    try {
      const rows = await pickContactsFromBook({ multiple: true });
      for (const row of rows) {
        const phone = tryPhone10(row.phone);
        if (!phone) continue;
        if (customers.some((c) => c.phone === phone)) continue;
        await addCustomer(row.name.trim() || "Member", phone);
      }
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Could not open contacts");
    } finally {
      setPicking(false);
    }
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
    <AppShell crumb={m.nav.customers}>
      <div className="page">
        <div className="row-head">
          <div>
            <h1>{m.nav.customers}</h1>
            <p className="page-sub">One record per person — add someone once, then map them into as many chits as you like.</p>
          </div>
        </div>
        <form className="toolbar" onSubmit={onAdd}>
          <input className="field" name="name" placeholder="Name" style={{ margin: 0, maxWidth: 200 }} />
          <input className="field" name="phone" placeholder="Phone" style={{ margin: 0, maxWidth: 160 }} />
          <button className="btn">Add customer</button>
          {canPick && (
            <button className="btn ghost" type="button" disabled={picking} onClick={() => void fromContacts()}>
              <BookUser size={15} /> {picking ? "Opening…" : "From contacts"}
            </button>
          )}
        </form>
        <div className="stats four">
          <StatCard label="People" value={customers.length} hint="in your directory" tone="blue" icon={UserRound} />
          <StatCard label="In an active chit" value={inActive} hint={`${customers.length - inActive} not mapped yet`} tone="green" icon={Users} />
          <StatCard label="Collected from all" value={inr(collected)} hint="lifetime" tone="teal" icon={PiggyBank} />
          <StatCard label="Outstanding" value={inr(outstanding)} hint="still due" tone="rose" icon={AlertCircle} />
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
          <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Person</th><th>Chits</th><th>Contributed</th><th>Outstanding</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="clickable" onClick={() => nav(`/customers/${r.id}`)}>
                  <td>
                    <div className="person">
                      <div className="avatar">{initials(r.name)}</div>
                      <div>
                        <div className="member-name-row">
                          <strong>{r.name}</strong>
                          {r.phone && !isOnApp(r.phone) ? (
                            <InviteWhatsAppButton
                              phone={r.phone}
                              message={inviteMemberWhatsAppMessage({
                                memberName: r.name,
                                phone: r.phone,
                                organiserName: user?.name,
                              })}
                            />
                          ) : null}
                        </div>
                        <div className="muted">{r.phone || "No phone"}</div>
                      </div>
                    </div>
                  </td>
                  <td>{r.inChits.length ? r.inChits.map((c) => c.name).join(", ") : "Not in any chit"}</td>
                  <td>{r.contributed ? inr(r.contributed) : "—"}</td>
                  <td>{r.outstanding ? inr(r.outstanding) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
