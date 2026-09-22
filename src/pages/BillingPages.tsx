import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useI18n } from "../i18n";
import { AppShell } from "../layout/AppShell";
import { fetchBillingStatus } from "../lib/billing";
import { isSupabaseConfigured } from "../lib/supabase";
import { useStore } from "../store";

export function BillingSuccessPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user, refresh } = useStore();
  const { m, tx } = useI18n();
  const subId = params.get("sub_id") || params.get("cf_subscriptionId") || "";
  const [msg, setMsg] = useState(m.billing.confirming);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setMsg(m.billing.notConfigured);
      setFailed(true);
      return;
    }
    let tries = 0;
    let alive = true;
    const tick = async () => {
      tries += 1;
      try {
        const st = await fetchBillingStatus(subId || undefined);
        if (!alive) return;
        if (st.active) {
          setMsg(m.billing.success);
          setDone(true);
          await refresh();
          setTimeout(() => nav("/upgrade", { replace: true }), 1600);
          return;
        }
        if (tries >= 20) {
          setMsg(m.billing.processing);
          setFailed(true);
          return;
        }
        setMsg(tx(m.billing.waiting, { n: tries }));
        setTimeout(() => void tick(), 1500);
      } catch (e) {
        if (!alive) return;
        setMsg(e instanceof Error ? e.message : m.billing.failed);
        if (tries < 8) setTimeout(() => void tick(), 2000);
        else setFailed(true);
      }
    };
    void tick();
    return () => {
      alive = false;
    };
    // Intentionally only when subId changes — avoid restarting poll after profile refresh
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId, nav]);

  return (
    <AppShell crumb={m.nav.upgrade} crumb2={m.billing.confirming}>
      <div className="page">
        <h1>{done ? m.billing.success : failed ? m.billing.processing : m.billing.confirming}</h1>
        <p className="page-sub">{msg}</p>
        <div className="card">
          <p className="muted">
            Signed in as <strong>{user?.email || user?.phone || "you"}</strong>
            {subId ? (
              <>
                <br />
                Ref: <code>{subId}</code>
              </>
            ) : null}
          </p>
          <div className="seg" style={{ marginTop: 16 }}>
            <Link className="btn" to="/upgrade">
              {m.billing.backUpgrade}
            </Link>
            <Link className="btn ghost" to="/">
              {m.nav.dashboard}
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export function BillingFailedPage() {
  const { m } = useI18n();
  return (
    <AppShell crumb={m.nav.upgrade} crumb2={m.billing.failed}>
      <div className="page">
        <h1>{m.billing.failed}</h1>
        <p className="page-sub">{m.billing.processing}</p>
        <Link className="btn" to="/upgrade">
          {m.billing.backUpgrade}
        </Link>
      </div>
    </AppShell>
  );
}
