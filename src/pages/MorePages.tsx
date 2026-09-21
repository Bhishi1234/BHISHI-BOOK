import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { TYPE_LABEL, chitPath, inr } from "../lib/format";
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
  const { user, setPlan, error } = useStore();
  const [tab, setTab] = useState<"payg" | "month" | "year">("month");
  const [busy, setBusy] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  async function startPaid(plan: "pro" | "power") {
    if (tab === "payg") return;
    setLocalError(null);
    setBusy(`${plan}-${tab}`);
    try {
      const { createBillingSubscription, openSubscriptionCheckout } = await import("../lib/billing");
      const { isSupabaseConfigured } = await import("../lib/supabase");
      if (!isSupabaseConfigured()) {
        // Local mock / no Supabase: keep demo behaviour
        await setPlan(plan);
        return;
      }
      const session = await createBillingSubscription(plan, tab);
      sessionStorage.setItem("bhishi_billing_sub", session.merchantSubscriptionId);
      await openSubscriptionCheckout(session.subscriptionSessionId, session.cashfreeEnv);
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell crumb="Plan & billing">
      <div className="page">
        <h1>Upgrade</h1>
        <p className="page-sub">
          Current plan: <strong>{user?.plan.toUpperCase()}</strong>
          {user?.planExpiresAt
            ? ` · renews / ends ${new Date(user.planExpiresAt).toLocaleDateString("en-IN")}`
            : ""}
        </p>
        {(localError || error) && <p className="due">{localError || error}</p>}
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
            <p className="muted">Per-chit Cashfree charging will follow in a later release. Subscribe to Pro/Power for unlimited organised capacity now.</p>
          </div>
        )}
        {tab !== "payg" && (
          <div className="grid-2">
            <div className="card">
              <h2>Pro</h2>
              <p className="price">{tab === "month" ? "₹199 / month" : "₹1,999 / year"}</p>
              <ul><li>Up to 5 active chits</li><li>PDF ledger and passbooks</li><li>Payment reminders</li></ul>
              <button
                className="btn"
                disabled={!!busy || user?.plan === "pro"}
                onClick={() => void startPaid("pro")}
              >
                {user?.plan === "pro" ? "Current plan" : busy === `pro-${tab}` ? "Opening Cashfree…" : "Subscribe to Pro"}
              </button>
            </div>
            <div className="card">
              <h2>Power</h2>
              <p className="price">{tab === "month" ? "₹499 / month" : "₹4,999 / year"}</p>
              <ul><li>Unlimited chits</li><li>Custom member messages</li><li>Onboarding help</li></ul>
              <button
                className="btn"
                disabled={!!busy || user?.plan === "power"}
                onClick={() => void startPaid("power")}
              >
                {user?.plan === "power" ? "Current plan" : busy === `power-${tab}` ? "Opening Cashfree…" : "Subscribe to Power"}
              </button>
            </div>
          </div>
        )}
        <p className="muted" style={{ marginTop: 16 }}>
          Payments are processed by Cashfree. Your plan activates after webhook confirmation (not only the success redirect).
        </p>
      </div>
    </AppShell>
  );
}

export function ProfilePage() {
  const { user, updateProfile, logout, deactivateAccount, error } = useStore();
  const [name, setName] = useState(user?.name || "");
  const [lang, setLang] = useState(user?.language || "en");
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);

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
    <AppShell crumb="Profile">
      <div className="page">
        <h1 className="block">Profile</h1>
        <div className="stack">
        <div className="card">
          <label className="label">Phone</label>
          <p><strong>{user?.phone ? `+91 ${user.phone}` : "Not set"}</strong></p>
          <label className="label">Name</label>
          {edit ? <input className="field" value={name} onChange={(e) => setName(e.target.value)} /> : <p><strong>{user?.name}</strong></p>}
          {user?.email ? (
            <>
              <label className="label">Email</label>
              <p>{user.email}</p>
            </>
          ) : null}
          {edit
            ? (
              <div className="seg" style={{ marginTop: 12 }}>
                <button className="btn" disabled={saving} onClick={() => void saveProfile()}>
                  {saving ? "Saving…" : "Save"}
                </button>
                <button className="btn ghost" type="button" disabled={saving} onClick={() => {
                  setName(user?.name || "");
                  setEdit(false);
                }}>
                  Cancel
                </button>
              </div>
            )
            : <button className="btn ghost" onClick={() => setEdit(true)}>Edit profile</button>}
          {error && edit && <p className="due" style={{ marginTop: 8 }}>{error}</p>}
          <p className="muted">
            You sign in with this phone number via SMS OTP. Use the same number your organiser saved when adding you to a chit — then shared groups appear under Chits.
          </p>
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
      .map((p) => ({ ...p, chitId: c.id, chitName: c.name, path: chitPath(c) })),
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
                <Link to={chitPath(c)}>{c.name}</Link>
                <span className="muted">{TYPE_LABEL[c.type] || c.type} · {c.viewerRole === "member" ? "shared" : c.mode}</span>
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
                    <Link to={p.path}>
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
