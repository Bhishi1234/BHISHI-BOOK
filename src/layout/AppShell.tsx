import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Crown,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useStore } from "../store";
import { chitPath } from "../lib/format";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/chits", label: "Chits", icon: BookOpen },
  { to: "/collections", label: "Collections", icon: Wallet },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/support", label: "Support", icon: Headset },
  { to: "/upgrade", label: "Upgrade", icon: Crown },
  { to: "/profile", label: "Profile", icon: UserRound },
];

const TAB_NAV = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/chits", label: "Chits", icon: BookOpen },
  { to: "/collections", label: "Collect", icon: Wallet },
  { to: "/customers", label: "People", icon: Users },
];

export function AppShell({
  children,
  crumb,
  crumb2,
}: {
  children: ReactNode;
  crumb?: string;
  crumb2?: string;
}) {
  const { user, chits, logout } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const title =
    crumb2 ||
    crumb ||
    NAV.find((n) => n.to === loc.pathname)?.label ||
    "Bhishi Book";

  useEffect(() => {
    setOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        nav("/search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);

  useEffect(() => {
    const onBack = (e: Event) => {
      if (open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("bhishi:hardware-back", onBack);
    return () => window.removeEventListener("bhishi:hardware-back", onBack);
  }, [open]);

  const side = (
    <>
      <NavLink to="/" className="logo">Bhishi Book</NavLink>
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `nav-btn${isActive ? " active" : ""}`}>
          <n.icon size={18} />
          {n.label}
        </NavLink>
      ))}
      <div className="section-label">Your chits</div>
      {chits.filter((c) => c.status !== "cancelled").map((c) => (
        <NavLink key={c.id} to={chitPath(c)} className="chit-mini">
          <i className={`dot ${c.members.length && c.status === "running" ? "green" : "gray"}`} />
          {c.name}
        </NavLink>
      ))}
      <NavLink to="/chits/new" className="new-chit"><Plus size={16} /> New chit</NavLink>
      <div className="sidebar-bottom">
        <div className="avatar">{(user?.name || "BB").slice(0, 2).toUpperCase()}</div>
        <div className="grow">
          <div>{user?.name}</div>
          <div className="muted">{user?.plan.toUpperCase()} plan</div>
        </div>
        <button className="icon-btn" title="Log out" onClick={() => { void logout().then(() => nav("/login")); }}>
          <LogOut size={18} />
        </button>
      </div>
    </>
  );

  const moreActive = ["/support", "/upgrade", "/profile", "/search"].some((p) => loc.pathname.startsWith(p));

  return (
    <div className="shell">
      <aside className="sidebar">{side}</aside>
      {open && <div className="drawer"><button className="icon-btn drawer-close" onClick={() => setOpen(false)}><X size={18} /></button>{side}</div>}
      {open && <div className="drawer-back" onClick={() => setOpen(false)} />}
      <div className="main">
        <div className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <div className="crumbs">
            {crumb && <Link to={crumb === "Chits" ? "/chits" : crumb === "Plan & billing" ? "/upgrade" : "/"}>{crumb}</Link>}
            {crumb2 && <span>›</span>}
            <strong>{title}</strong>
          </div>
          <button className="search" onClick={() => nav("/search")}>
            <Search size={16} />
            <span className="search-label">Search chits, members, receipts</span>
            <span className="search-kbd">⌘K</span>
          </button>
        </div>
        <div className="main-scroll">{children}</div>
        <nav className="bottom-tabs" aria-label="Primary">
          {TAB_NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `bottom-tab${isActive ? " active" : ""}`}>
              <n.icon size={20} />
              <span>{n.label}</span>
            </NavLink>
          ))}
          <button
            type="button"
            className={`bottom-tab${moreActive || open ? " active" : ""}`}
            onClick={() => setOpen(true)}
          >
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
