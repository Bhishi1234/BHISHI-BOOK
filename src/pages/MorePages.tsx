import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { WhatsAppIcon } from "../components/InviteWhatsAppButton";
import { ModalPortal } from "../components/ModalPortal";
import { ReasonModal } from "../components/ReasonModal";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { customerOutstanding, displayCycle } from "../lib/chitMath";
import { chitPath, inr } from "../lib/format";
import { waMeUrl } from "../lib/share";
import { useStore } from "../store";

const SUPPORT_WHATSAPP = "9967966631";

export function SupportPage() {
  const { tickets, addTicket } = useStore();
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const whatsappHref = waMeUrl(SUPPORT_WHATSAPP, m.support.whatsappPrefill);
  return (
    <AppShell crumb={m.support.title}>
      <div className="page">
        <h1 className="block">{m.support.title}</h1>
        <div className="card support-card">
          <p className="page-sub" style={{ marginTop: 0 }}>{m.support.whatsappBody}</p>
          <a className="btn support-wa" href={whatsappHref} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon size={18} />
            WhatsApp · 99679 66631
          </a>
        </div>
        <div className="row-head">
          <h2>{m.support.yourMessages}</h2>
        </div>
        <div className="stack">
        {tickets.length === 0 && <p className="muted">{m.support.empty}</p>}
        {tickets.map((t) => (
          <div key={t.id} className="card">
            <div className="row-head" style={{ marginBottom: 6 }}>
              <strong>{t.subject}</strong>
              <span className={`pill ${t.status === "closed" ? "paid" : "advance"}`} style={{ textTransform: "capitalize" }}>{t.status}</span>
            </div>
            <div className="muted">{t.createdAt.slice(0, 10)}</div>
            <p style={{ marginBottom: 0 }}>{t.message}</p>
          </div>
        ))}
        </div>
        <button type="button" className="quiet-link" onClick={() => setOpen(true)}>{m.support.newMessage}</button>
        {open && (
          <ModalPortal>
            <div className="modal-back" onClick={() => setOpen(false)}>
              <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => {
                e.preventDefault();
                if (!subject.trim() || !message.trim()) return;
                void addTicket(subject.trim(), message.trim());
                setSubject(""); setMessage(""); setOpen(false);
              }}>
                <h2>{m.support.newConversation}</h2>
                <input className="field" placeholder={m.support.subject} value={subject} onChange={(e) => setSubject(e.target.value)} />
                <textarea className="field" rows={5} placeholder={m.support.message} value={message} onChange={(e) => setMessage(e.target.value)} />
                <button type="submit" className="btn wide">{m.support.send}</button>
              </form>
            </div>
          </ModalPortal>
        )}
      </div>
    </AppShell>
  );
}

export function ProfilePage() {
  const { user, updateProfile, logout, deactivateAccount, error } = useStore();
  const { m, setUiLang } = useI18n();
  const nav = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [lang, setLang] = useState(user?.language || "en");
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setName(user?.name || "");
    setLang(user?.language || "en");
  }, [user?.name, user?.language]);

  async function saveProfile() {
    setSaving(true);
    try {
      await updateProfile({ name: name.trim() || user?.name, language: lang });
      setEdit(false);
    } catch {
      /* store sets error */
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell crumb={m.profile.title}>
      <div className="page">
        <h1 className="block">{m.profile.title}</h1>
        <div className="stack">
        <div className="card">
          <label className="label">{m.profile.phone}</label>
          <p><strong>{user?.phone ? `+91 ${user.phone}` : m.common.notSet}</strong></p>
          <label className="label">{m.profile.name}</label>
          {edit ? <input className="field" value={name} onChange={(e) => setName(e.target.value)} /> : <p><strong>{user?.name}</strong></p>}
          {user?.email ? (
            <>
              <label className="label">{m.profile.email}</label>
              <p>{user.email}</p>
            </>
          ) : null}
          {edit
            ? (
              <div className="seg" style={{ marginTop: 12 }}>
                <button className="btn" disabled={saving} onClick={() => void saveProfile()}>
                  {saving ? m.profile.saving : m.common.save}
                </button>
                <button className="btn ghost" type="button" disabled={saving} onClick={() => {
                  setName(user?.name || "");
                  setEdit(false);
                }}>
                  {m.common.cancel}
                </button>
              </div>
            )
            : <button className="btn ghost" onClick={() => setEdit(true)}>{m.profile.editProfile}</button>}
          {error && edit && <p className="due" style={{ marginTop: 8 }}>{error}</p>}
          <p className="muted">
            {m.profile.phoneHint}
          </p>
        </div>
        <div className="card">
          <h2>{m.profile.language}</h2>
          <p className="muted">{m.profile.languageHint}</p>
          <div className="seg">
            {[
              ["en", "English"],
              ["hi", "हिन्दी · Hindi"],
              ["mr", "मराठी · Marathi"],
            ].map(([id, label]) => (
              <button key={id} className={`chip ${lang === id ? "on" : ""}`} onClick={() => { setLang(id); void updateProfile({ language: id }); setUiLang(id as "en" | "hi" | "mr"); }}>{label}</button>
            ))}
          </div>
        </div>
        <div className="card center">
          <h2>{m.profile.invite}</h2>
          <p className="muted">{m.profile.inviteHint}</p>
          <button className="btn ghost" onClick={() => void navigator.clipboard.writeText(window.location.origin)}>{m.profile.copyLink}</button>
        </div>
        <button className="btn ghost wide" type="button" onClick={() => void logout()}>{m.nav.signOut}</button>
        <button className="quiet-link" type="button" onClick={() => setDeleteOpen(true)}>
          {m.profile.deleteQuiet} · {m.profile.dangerHint}
        </button>
        </div>
      </div>

      <ReasonModal
        open={deleteOpen}
        title={m.profile.deleteReasonsTitle}
        hint={`${m.profile.deleteConfirm} ${m.profile.deleteReasonsHint}`}
        options={[
          { id: "tooComplex", label: m.profile.deleteReasons.tooComplex },
          { id: "notUsing", label: m.profile.deleteReasons.notUsing },
          { id: "switchedApp", label: m.profile.deleteReasons.switchedApp },
          { id: "privacy", label: m.profile.deleteReasons.privacy },
          { id: "bugs", label: m.profile.deleteReasons.bugs },
          { id: "other", label: m.profile.deleteReasons.other },
        ]}
        otherLabel={m.profile.deleteReasonOther}
        otherPlaceholder={m.profile.deleteReasonOtherPlaceholder}
        confirmLabel={m.profile.deleteSubmit}
        cancelLabel={m.common.cancel}
        multi
        danger
        busy={deleteBusy}
        onClose={() => setDeleteOpen(false)}
        onConfirm={async (reasons, note) => {
          setDeleteBusy(true);
          try {
            await deactivateAccount(reasons, note || undefined);
            setDeleteOpen(false);
            nav("/login");
          } catch {
            /* store sets error */
          } finally {
            setDeleteBusy(false);
          }
        }}
      />
    </AppShell>
  );
}

export function SearchPage() {
  const { chits, customers } = useStore();
  const { m, tx, typeLabel, modeLabel } = useI18n();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const names = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  const chitHits = chits.filter((c) =>
    !query
    || c.name.toLowerCase().includes(query)
    || (c.title || "").toLowerCase().includes(query)
    || typeLabel(c.type).toLowerCase().includes(query),
  );

  const memberHits = customers.filter((c) =>
    !query || c.name.toLowerCase().includes(query) || (c.phone || "").includes(query),
  );

  const receiptHits = !query ? [] : chits.flatMap((c) =>
    c.payments
      .filter((p) => {
        const name = (names[p.memberId] || "").toLowerCase();
        return name.includes(query)
          || c.name.toLowerCase().includes(query)
          || String(p.amount).includes(query)
          || (p.mode || "").toLowerCase().includes(query);
      })
      .map((p) => ({ ...p, chitId: c.id, chitName: c.name, path: chitPath(c) })),
  ).slice(0, 20);

  function closeSearch() {
    if (window.history.length > 1) nav(-1);
    else nav("/");
  }

  return (
    <AppShell crumb={m.nav.search}>
      <div className="page">
        <div className="search-panel">
          <div className="search-pop" style={{ margin: "0 auto" }}>
            <div className="row-head" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>{m.nav.search}</h2>
              <button type="button" className="btn ghost" onClick={closeSearch}>
                {m.common.cancel}
              </button>
            </div>
            <p className="muted">{m.searchPlaceholder}</p>
            <input className="field" autoFocus placeholder={m.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />

            {query ? (
              <>
                <section className="search-group">
                  <h2>{m.find.groups}</h2>
                  {chitHits.length ? chitHits.map((c) => {
                    const who = c.members
                      .map((mem) => customers.find((person) => person.id === mem.customerId))
                      .find((person) => person && person.name.toLowerCase().includes(query));
                    return (
                      <div key={c.id} className="search-hit">
                        <Link to={chitPath(c)}>{c.name}</Link>
                        <span className="muted">
                          {typeLabel(c.type)}
                          {who ? ` · ${tx(m.find.inGroup, { name: who.name })}` : ""}
                          {` · ${displayCycle(c)} / ${c.duration}`}
                        </span>
                      </div>
                    );
                  }) : <p className="muted">{m.find.noGroups}</p>}
                </section>
                <section className="search-group">
                  <h2>{m.find.people}</h2>
                  {memberHits.length ? memberHits.slice(0, 12).map((c) => (
                    <div key={c.id} className="search-hit">
                      <Link to={`/customers/${c.id}`}>{c.name}</Link>
                      <span className="muted">
                        {c.phone ? `+91 ${c.phone}` : m.customersPage.noPhone}
                        {" · "}
                        {tx(m.find.stillToPay, { amount: inr(customerOutstanding(chits, c.id)) })}
                      </span>
                    </div>
                  )) : <p className="muted">{m.find.noPeople}</p>}
                </section>
                <section className="search-group">
                  <h2>{m.find.receipts}</h2>
                  {receiptHits.length ? receiptHits.map((p) => (
                    <div key={p.id} className="search-hit">
                      <Link to={p.path}>
                        {names[p.memberId] || m.common.member} · {inr(p.amount)}
                      </Link>
                      <span className="muted">
                        {p.chitName} · {tx(m.customerDetail.haptaN, { n: p.cycle })} · {modeLabel(p.mode || "cash")} · {p.date?.slice(0, 10)}
                      </span>
                    </div>
                  )) : <p className="muted">{m.find.noReceipts}</p>}
                </section>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
