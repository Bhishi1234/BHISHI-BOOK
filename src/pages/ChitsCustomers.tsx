import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { ArrowUpRight, BookUser, ChevronRight, Plus, UserRound, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CancelChitButton } from "../components/CancelChitButton";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { scrollPageToTop } from "../layout/ScrollToTop";
import { chitProgress, displayCycle, customerOutstanding } from "../lib/chitMath";
import { contactsPickerAvailable, pickContactsFromBook } from "../lib/contacts";
import { chitPath, initials, inr } from "../lib/format";
import { inviteMemberWhatsAppMessage, tryPhone10 } from "../lib/share";
import { InviteWhatsAppButton } from "../components/InviteWhatsAppButton";
import { usePhonesOnApp } from "../lib/usePhonesOnApp";
import { useStore } from "../store";
import { StatCard, toneAt } from "../ui/StatCard";

export function ChitsPage() {
  const { chits, user } = useStore();
  const { m, typeLabel, statusLabel, tx } = useI18n();
  const nav = useNavigate();
  const [tab, setTab] = useState<"active" | "completed">("active");

  useEffect(() => {
    scrollPageToTop();
  }, [tab]);

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
          <p className="muted block">{tab === "active" ? m.chit.emptyActive : m.chit.emptyCompleted}</p>
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
            {m.chit.sharedEmpty}
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
                        <span>{tx(m.chit.trackingMeta, { instalment: inr(c.instalment), months: c.duration })}</span>
                      </div>
                      <div className="dash-chit-actions">
                        <CancelChitButton
                          chitId={c.id}
                          className="link"
                          label={m.common.cancel}
                        />
                        <span className="go-btn" aria-hidden><ArrowUpRight size={14} strokeWidth={2.4} /></span>
                      </div>
                    </div>
                    <div className="dash-chit-divider" />
                    {pct === 0 ? (
                      <div className="due" style={{ margin: "0 0 10px" }}>{m.chit.paymentDueNow}</div>
                    ) : (
                      <div className="dash-chit-meta">
                        <div>
                          <span>Paid</span>
                          <strong>{c.payments.length} / {c.duration}</strong>
                        </div>
                        <div>
                          <span>{m.chit.progressLabel}</span>
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
  const { m, tx } = useI18n();
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
    const inChits = chits.filter((ch) => ch.members.some((mem) => mem.customerId === c.id) && ch.status !== "cancelled");
    const outstanding = customerOutstanding(chits, c.id);
    return { ...c, inChits, outstanding };
  }).filter((r) => {
    if (q && !r.name.toLowerCase().includes(q.toLowerCase()) && !r.phone.includes(q)) return false;
    if (filter === "in") return r.inChits.length > 0;
    if (filter === "out") return r.inChits.length === 0;
    if (filter === "dues") return r.outstanding > 0;
    return true;
  });

  const inActive = customers.filter((c) => chits.some((ch) => ch.status === "running" && ch.members.some((mem) => mem.customerId === c.id))).length;

  return (
    <AppShell crumb={m.nav.customers}>
      <div className="page">
        <div className="row-head">
          <div>
            <h1>{m.nav.customers}</h1>
            <p className="page-sub">{m.customersPage.subtitle}</p>
          </div>
        </div>
        <form className="toolbar" onSubmit={onAdd}>
          <input className="field" name="name" placeholder={m.profile.name} style={{ margin: 0, maxWidth: 200 }} />
          <input className="field" name="phone" placeholder={m.profile.phone} style={{ margin: 0, maxWidth: 160 }} />
          <button className="btn">{m.customersPage.addCustomer}</button>
          {canPick && (
            <button className="btn ghost" type="button" disabled={picking} onClick={() => void fromContacts()}>
              <BookUser size={15} /> {picking ? m.newChitExtra.opening : m.chit.fromContacts}
            </button>
          )}
        </form>
        <div className="stats two">
          <StatCard label={m.customersPage.people} value={customers.length} hint={m.customersPage.inDirectory} tone="blue" icon={UserRound} />
          <StatCard label={m.customersPage.inActiveChit} value={inActive} hint={tx(m.customersPage.notMappedYet, { n: customers.length - inActive })} tone="green" icon={Users} />
        </div>
        <div className="toolbar">
          <input className="field" placeholder={m.customersPage.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} style={{ margin: 0, maxWidth: 360 }} />
          <div className="seg">
            <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")}>{m.common.all}</button>
            <button className={`chip ${filter === "in" ? "on" : ""}`} onClick={() => setFilter("in")}>{m.customersPage.filterIn}</button>
            <button className={`chip ${filter === "out" ? "on" : ""}`} onClick={() => setFilter("out")}>{m.customersPage.filterOut}</button>
            <button className={`chip ${filter === "dues" ? "on" : ""}`} onClick={() => setFilter("dues")}>{m.customersPage.filterDues}</button>
          </div>
        </div>
        <div className="card flush people-list-card">
          {!rows.length && (
            <p className="empty" style={{ margin: 0, padding: "20px 14px" }}>{m.customersPage.emptyList}</p>
          )}
          {rows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              className="people-list-row"
              onClick={() => nav(`/customers/${r.id}`)}
            >
              <div className={`avatar tone-${toneAt(i)}`}>{initials(r.name)}</div>
              <div className="grow people-list-body">
                <div className="people-list-name-row">
                  <strong className="people-list-name">{r.name}</strong>
                  {r.phone && !isOnApp(r.phone) ? (
                    <span
                      className="people-list-wa"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <InviteWhatsAppButton
                        phone={r.phone}
                        message={inviteMemberWhatsAppMessage({
                          memberName: r.name,
                          phone: r.phone,
                          organiserName: user?.name,
                        })}
                      />
                    </span>
                  ) : null}
                </div>
                <div className="muted people-list-meta">
                  {r.phone || m.customersPage.noPhone}
                  {" · "}
                  {r.inChits.length
                    ? tx(m.customersPage.groupsMeta, { n: r.inChits.length })
                    : m.customersPage.notInAny}
                </div>
              </div>
              {r.outstanding > 0 ? (
                <span className="people-due-chip" title={m.terms.outstanding}>
                  {inr(r.outstanding)}
                </span>
              ) : null}
              <ChevronRight className="people-list-chevron" size={18} strokeWidth={2.2} aria-hidden />
            </button>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
