import { useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { TYPE_LABEL, inr } from "../lib/format";
import { useStore } from "../store";

export function SupportPage() {
  const { tickets, addTicket } = useStore();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  return (
    <AppShell crumb="Support">
      <div className="page">
        <div className="row-head">
          <h1>Support</h1>
          <button className="btn" onClick={() => setOpen(true)}>New</button>
        </div>
        <p className="page-sub">Select a conversation, or start a new one.</p>
        <div className="stack">
        {tickets.map((t) => (
          <div key={t.id} className="card">
            <strong>{t.subject}</strong>
            <div className="muted">{t.status} · {t.createdAt.slice(0, 10)}</div>
            <p>{t.message}</p>
          </div>
        ))}
        </div>
        {open && (
          <div className="modal-back" onClick={() => setOpen(false)}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={(e) => {
              e.preventDefault();
              if (!subject.trim() || !message.trim()) return;
              void addTicket(subject.trim(), message.trim());
              setSubject(""); setMessage(""); setOpen(false);
            }}>
              <h2>New conversation</h2>
              <input className="field" placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea className="field" rows={5} placeholder="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
              <button className="btn wide">Send</button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function UpgradePage() {
  const { user, setPlan } = useStore();
  const [tab, setTab] = useState<"payg" | "month" | "year">("payg");
  return (
    <AppShell crumb="Plan & billing">
      <div className="page">
        <h1>Upgrade</h1>
        <p className="page-sub">Current plan: {user?.plan.toUpperCase()}</p>
        <div className="seg center">
          <button className={`chip ${tab === "payg" ? "dark" : ""}`} onClick={() => setTab("payg")}>Pay as you go</button>
          <button className={`chip ${tab === "month" ? "on" : ""}`} onClick={() => setTab("month")}>Monthly</button>
          <button className={`chip ${tab === "year" ? "on" : ""}`} onClick={() => setTab("year")}>Yearly</button>
        </div>
        {tab === "payg" && (
          <div className="card">
            <h2>Pay as you go</h2>
            <p className="muted">Start a chit and pay for the months it runs. Nothing to subscribe to, and it stops when the chit closes.</p>
            <div className="kv"><span>Your first chit</span><strong>Free</strong></div>
            <div className="kv"><span>Every chit after that</span><strong>₹100 a month</strong></div>
            <p className="muted">Every Pro feature is included — nothing is locked behind a plan.</p>
          </div>
        )}
        {tab !== "payg" && (
          <div className="grid-2">
            <div className="card">
              <h2>Pro</h2>
              <p className="price">{tab === "month" ? "₹199 / month" : "₹1,999 / year"}</p>
              <ul><li>Up to 5 active chits</li><li>PDF ledger and passbooks</li><li>Payment reminders</li></ul>
              <button className="btn" onClick={() => void setPlan("pro")}>{user?.plan === "pro" ? "Current plan" : "Upgrade to Pro"}</button>
            </div>
            <div className="card">
              <h2>Power</h2>
              <p className="price">{tab === "month" ? "₹499 / month" : "₹4,999 / year"}</p>
              <ul><li>Unlimited chits</li><li>Custom member messages</li><li>Onboarding help</li></ul>
              <button className="btn" onClick={() => void setPlan("power")}>{user?.plan === "power" ? "Current plan" : "Upgrade to Power"}</button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function ProfilePage() {
  const { user, updateProfile, logout, deactivateAccount } = useStore();
  const [name, setName] = useState(user?.name || "");
  const [lang, setLang] = useState(user?.language || "en");
  const [edit, setEdit] = useState(false);
  return (
    <AppShell crumb="Profile">
      <div className="page">
        <h1 className="block">Profile</h1>
        <div className="stack">
        <div className="card">
          <label className="label">Name</label>
          {edit ? <input className="field" value={name} onChange={(e) => setName(e.target.value)} /> : <p><strong>{user?.name}</strong></p>}
          <label className="label">Email</label>
          <p>{user?.email || "—"}</p>
          {edit
            ? <button className="btn" onClick={() => { void updateProfile({ name, language: lang }); setEdit(false); }}>Save</button>
            : <button className="btn ghost" onClick={() => setEdit(true)}>Edit profile</button>}
          <p className="muted">Your email is used to sign in and can’t be changed here. Phone login will come later.</p>
        </div>
        <div className="card">
          <h2>Language</h2>
          <p className="muted">Used for SMS and push reminders. The mobile app also switches its own screens to this language.</p>
          <div className="seg">
            {[
              ["en", "English"],
              ["te", "తెలుగు · Telugu"],
              ["hi", "हिन्दी · Hindi"],
              ["ta", "தமிழ் · Tamil"],
            ].map(([id, label]) => (
              <button key={id} className={`chip ${lang === id ? "on" : ""}`} onClick={() => { setLang(id); void updateProfile({ language: id }); }}>{label}</button>
            ))}
          </div>
        </div>
        <div className="card center">
          <h2>Invite friends</h2>
          <p className="muted">Share Bhishi Book with friends and family</p>
          <button className="btn ghost" onClick={() => void navigator.clipboard.writeText(window.location.origin)}>Share</button>
        </div>
        <div className="card">
          <h2>Danger zone</h2>
          <p className="muted">Deactivate your account. Recoverable for 30 days.</p>
          <button className="btn danger" onClick={() => {
            if (window.confirm("Deactivate this account? You can recover it for 30 days by signing in again.")) {
              void deactivateAccount();
            }
          }}>Delete account</button>
          <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => void logout()}>Sign out</button>
        </div>
        </div>
      </div>
    </AppShell>
  );
}

export function SearchPage() {
  const { chits, customers } = useStore();
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const names = Object.fromEntries(customers.map((c) => [c.id, c.name]));

  const chitHits = chits.filter((c) =>
    !query
    || c.name.toLowerCase().includes(query)
    || (c.title || "").toLowerCase().includes(query)
    || (TYPE_LABEL[c.type] || c.type).toLowerCase().includes(query),
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
      .map((p) => ({ ...p, chitId: c.id, chitName: c.name, mode: c.mode })),
  ).slice(0, 20);

  return (
    <AppShell crumb="Search">
      <div className="page">
        <div className="modal-back" style={{ position: "relative", background: "transparent", padding: 0, display: "block" }}>
          <div className="search-pop" style={{ margin: "0 auto" }}>
            <h2>Search</h2>
            <p className="muted">Search chits, members, and receipts.</p>
            <input className="field" autoFocus placeholder="Search chits, members, receipts…" value={q} onChange={(e) => setQ(e.target.value)} />

            <p className="muted" style={{ marginTop: 16, marginBottom: 4 }}>Chits</p>
            {chitHits.length ? chitHits.map((c) => (
              <div key={c.id} className="search-hit">
                <Link to={c.mode === "tracking" ? `/tracked/${c.id}` : `/chits/${c.id}`}>{c.name}</Link>
                <span className="muted">{TYPE_LABEL[c.type] || c.type} · {c.mode}</span>
              </div>
            )) : <p className="muted">No chits match.</p>}

            <p className="muted" style={{ marginTop: 16, marginBottom: 4 }}>Members</p>
            {memberHits.length ? memberHits.slice(0, 12).map((c) => (
              <div key={c.id} className="search-hit">
                <Link to={`/customers/${c.id}`}>{c.name}</Link>
                <span className="muted">{c.phone}</span>
              </div>
            )) : <p className="muted">No members match.</p>}

            {!!query && (
              <>
                <p className="muted" style={{ marginTop: 16, marginBottom: 4 }}>Receipts</p>
                {receiptHits.length ? receiptHits.map((p) => (
                  <div key={p.id} className="search-hit">
                    <Link to={p.mode === "tracking" ? `/tracked/${p.chitId}` : `/chits/${p.chitId}`}>
                      {names[p.memberId] || "Member"} · {inr(p.amount)}
                    </Link>
                    <span className="muted">{p.chitName} · cycle {p.cycle}</span>
                  </div>
                )) : <p className="muted">No receipts match.</p>}
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
