import { type ReactNode, useEffect, useState } from "react";
import { NavLink, Navigate, useNavigate } from "react-router-dom";
import { adminReport, adminSignOut, adminToken } from "../../lib/adminApi";
import { inr } from "../../lib/format";
import "../../admin.css";

const NAV = [
  { to: "/adminbhishibookdashboard", label: "Overview" },
  { to: "/AdminBhishi", label: "Bhishi groups" },
  { to: "/memberBhishi", label: "Members" },
  { to: "/AdminCollections", label: "Collections" },
  { to: "/AdminAwards", label: "Awards" },
  { to: "/AdminOrganisers", label: "Organisers" },
  { to: "/WebsiteMetrics", label: "Website" },
  { to: "/AdminSupport", label: "Support" },
] as const;

export function AdminShell({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  const nav = useNavigate();
  if (!adminToken()) return <Navigate to="/adminbhishibook" replace />;

  return (
    <div className="owner-admin">
      <aside className="owner-side">
        <div className="owner-brand">
          <strong>Bhishi Circle</strong>
          <span>Owner</span>
        </div>
        <nav>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "on" : "")}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <button
          type="button"
          className="owner-out"
          onClick={() => {
            void adminSignOut().finally(() => nav("/adminbhishibook", { replace: true }));
          }}
        >
          Sign out
        </button>
      </aside>
      <main className="owner-main">
        <header className="owner-head">
          <div>
            <h1>{title}</h1>
            {hint && <p>{hint}</p>}
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}

export function useAdminReport<T>(section: string) {
  const nav = useNavigate();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancel = false;
    void adminReport<T>(section).then(
      (next) => {
        if (!cancel) setData(next);
      },
      (err: unknown) => {
        if (cancel) return;
        const message = err instanceof Error ? err.message : "Could not load";
        if (message === "Unauthorized") {
          nav("/adminbhishibook", { replace: true });
          return;
        }
        setError(message);
      },
    );
    return () => {
      cancel = true;
    };
  }, [section, nav]);

  return { data, error };
}

export function AdminStats({ items }: { items: { label: string; value: string; hint?: string }[] }) {
  return (
    <div className="owner-stats">
      {items.map((item) => (
        <article key={item.label}>
          <span>{item.label}</span>
          <strong>{item.value}</strong>
          {item.hint && <em>{item.hint}</em>}
        </article>
      ))}
    </div>
  );
}

export function AdminBars({ rows }: { rows: { label: string; count: number }[] }) {
  const max = Math.max(1, ...rows.map((row) => Number(row.count) || 0));
  if (!rows.length) return <p className="owner-empty">Nothing in this range yet.</p>;
  return (
    <div className="owner-bars">
      {rows.map((row) => (
        <div key={row.label}>
          <span>{row.label}</span>
          <i><b style={{ width: `${Math.max(4, (Number(row.count) / max) * 100)}%` }} /></i>
          <strong>{row.count}</strong>
        </div>
      ))}
    </div>
  );
}

export function money(value: number | string | null | undefined) {
  return inr(Number(value) || 0);
}

export function when(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function OwnerState({ error, ready }: { error: string; ready: boolean }) {
  if (error) return <p className="due">{error}</p>;
  if (!ready) return <p className="owner-empty">Loading the books…</p>;
  return null;
}
