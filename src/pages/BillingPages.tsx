import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../layout/AppShell";
import { fetchBillingStatus } from "../lib/billing";
import { isSupabaseConfigured } from "../lib/supabase";
import { useStore } from "../store";

export function BillingSuccessPage() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user, refresh } = useStore();
  const subId = params.get("sub_id") || params.get("cf_subscriptionId") || "";
  const [msg, setMsg] = useState("Confirming your payment…");
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setMsg("Supabase is not configured.");
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
          setMsg(`You’re on ${String(st.plan).toUpperCase()}. Access is active.`);
          setDone(true);
          await refresh();
          setTimeout(() => nav("/upgrade", { replace: true }), 1600);
          return;
        }
        if (tries >= 20) {
          setMsg(
            "Payment is still processing. If you were charged, your plan will activate within a minute — refresh Upgrade.",
          );
          setFailed(true);
          return;
        }
        setMsg(`Waiting for Cashfree confirmation… (${tries}/20)`);
        setTimeout(() => void tick(), 1500);
      } catch (e) {
        if (!alive) return;
        setMsg(e instanceof Error ? e.message : "Could not confirm payment");
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
    <AppShell crumb="Plan & billing" crumb2="Payment">
      <div className="page">
        <h1>{done ? "Subscription active" : failed ? "Still confirming" : "Almost there"}</h1>
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
              Back to plans
            </Link>
            <Link className="btn ghost" to="/">
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export function BillingFailedPage() {
  return (
    <AppShell crumb="Plan & billing" crumb2="Payment">
      <div className="page">
        <h1>Payment not completed</h1>
        <p className="page-sub">No charge was kept, or authorisation was cancelled. You can try again anytime.</p>
        <Link className="btn" to="/upgrade">
          Try again
        </Link>
      </div>
    </AppShell>
  );
}
