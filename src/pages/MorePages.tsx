import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { chitPath, inr } from "../lib/format";
import { useStore } from "../store";

export function SupportPage() {
  const { tickets, addTicket } = useStore();
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  return (
    <AppShell crumb={m.support.title}>
      <div className="page">
        <div className="row-head">
          <h1>{m.support.title}</h1>
          <button className="btn" onClick={() => setOpen(true)}>{m.support.newTicket}</button>
        </div>
        <p className="page-sub">{m.support.selectOrStart}</p>
        <div className="stack">
        {tickets.length === 0 && <p className="muted">{m.support.empty}</p>}
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
              <h2>{m.support.newConversation}</h2>
              <input className="field" placeholder={m.support.subject} value={subject} onChange={(e) => setSubject(e.target.value)} />
              <textarea className="field" rows={5} placeholder={m.support.message} value={message} onChange={(e) => setMessage(e.target.value)} />
              <button className="btn wide">{m.support.send}</button>
            </form>
          </div>
        )}
      </div>
    </AppShell>
  );
}

export function UpgradePage() {
  const { user, setPlan, error } = useStore();
  const { m, tx, locale } = useI18n();
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
      setLocalError(e instanceof Error ? e.message : m.upgrade.checkoutFailed);
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell crumb={m.upgrade.crumb}>
      <div className="page">
        <h1>{m.upgrade.title}</h1>
        <p className="page-sub">
          {m.upgrade.currentPlan}: <strong>{user?.plan.toUpperCase()}</strong>
          {user?.planExpiresAt
            ? ` · ${tx(m.upgrade.renewsEnds, { date: new Date(user.planExpiresAt).toLocaleDateString(locale) })}`
            : ""}
        </p>
        {(localError || error) && <p className="due">{localError || error}</p>}
        <div className="seg center">
          <button className={`chip ${tab === "payg" ? "dark" : ""}`} onClick={() => setTab("payg")}>{m.upgrade.payAsYouGo}</button>
          <button className={`chip ${tab === "month" ? "on" : ""}`} onClick={() => setTab("month")}>{m.upgrade.monthly}</button>
          <button className={`chip ${tab === "year" ? "on" : ""}`} onClick={() => setTab("year")}>{m.upgrade.yearly}</button>
        </div>
        {tab === "payg" && (
          <div className="card">
            <h2>{m.upgrade.payAsYouGo}</h2>
            <p className="muted">{m.upgrade.paygBody}</p>
            <div className="kv"><span>{m.upgrade.firstChit}</span><strong>{m.upgrade.free}</strong></div>
            <div className="kv"><span>{m.upgrade.everyChitAfter}</span><strong>{m.upgrade.paygPrice}</strong></div>
            <p className="muted">{m.upgrade.paygLater}</p>
          </div>
        )}
        {tab !== "payg" && (
          <div className="grid-2">
            <div className="card">
              <h2>Pro</h2>
              <p className="price">{tab === "month" ? tx(m.upgrade.priceMonth, { n: "199" }) : tx(m.upgrade.priceYear, { n: "1,999" })}</p>
              <ul><li>{m.upgrade.proFeat1}</li><li>{m.upgrade.proFeat2}</li><li>{m.upgrade.proFeat3}</li></ul>
              <button
                className="btn"
                disabled={!!busy || user?.plan === "pro"}
                onClick={() => void startPaid("pro")}
              >
                {user?.plan === "pro" ? m.upgrade.currentPlan : busy === `pro-${tab}` ? m.upgrade.openingCashfree : m.upgrade.subscribePro}
              </button>
            </div>
            <div className="card">
              <h2>Power</h2>
              <p className="price">{tab === "month" ? tx(m.upgrade.priceMonth, { n: "499" }) : tx(m.upgrade.priceYear, { n: "4,999" })}</p>
              <ul><li>{m.upgrade.powerFeat1}</li><li>{m.upgrade.powerFeat2}</li><li>{m.upgrade.powerFeat3}</li></ul>
              <button
                className="btn"
                disabled={!!busy || user?.plan === "power"}
                onClick={() => void startPaid("power")}
              >
                {user?.plan === "power" ? m.upgrade.currentPlan : busy === `power-${tab}` ? m.upgrade.openingCashfree : m.upgrade.subscribePower}
              </button>
            </div>
          </div>
        )}
        <p className="muted" style={{ marginTop: 16 }}>
          {m.upgrade.cashfreeNote}
        </p>
      </div>
    </AppShell>
  );
}

export function ProfilePage() {
  const { user, updateProfile, logout, deactivateAccount, error } = useStore();
  const { m } = useI18n();
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
              <button key={id} className={`chip ${lang === id ? "on" : ""}`} onClick={() => { setLang(id); void updateProfile({ language: id }); }}>{label}</button>
            ))}
          </div>
        </div>
        <div className="card center">
          <h2>{m.profile.invite}</h2>
          <p className="muted">{m.profile.inviteHint}</p>
          <button className="btn ghost" onClick={() => void navigator.clipboard.writeText(window.location.origin)}>{m.common.share}</button>
        </div>
        <div className="card">
          <h2>{m.profile.danger}</h2>
          <p className="muted">{m.profile.dangerHint}</p>
          <button className="btn danger" onClick={() => {
            if (window.confirm(m.profile.deleteConfirm)) {
              void deactivateAccount();
            }
          }}>{m.profile.deleteAccount}</button>
          <button className="btn ghost" style={{ marginTop: 8 }} onClick={() => void logout()}>{m.nav.signOut}</button>
        </div>
        </div>
      </div>
    </AppShell>
  );
}

export function SearchPage() {
  const { chits, customers } = useStore();
  const { m, typeLabel } = useI18n();
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

  return (
    <AppShell crumb={m.nav.search}>
      <div className="page">
        <div className="modal-back" style={{ position: "relative", background: "transparent", padding: 0, display: "block" }}>
          <div className="search-pop" style={{ margin: "0 auto" }}>
            <h2>{m.nav.search}</h2>
            <p className="muted">{m.searchPlaceholder}</p>
            <input className="field" autoFocus placeholder={m.searchPlaceholder} value={q} onChange={(e) => setQ(e.target.value)} />

            <p className="muted" style={{ marginTop: 16, marginBottom: 4 }}>{m.nav.chits}</p>
            {chitHits.length ? chitHits.map((c) => (
              <div key={c.id} className="search-hit">
                <Link to={chitPath(c)}>{c.name}</Link>
                <span className="muted">{typeLabel(c.type)} · {c.viewerRole === "member" ? m.chitsPage.shared : c.mode}</span>
              </div>
            )) : <p className="muted">{m.chitsPage.empty}</p>}

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
