import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Crown,
  Headset,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  Plus,
  Search,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useStore } from "../store";

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

const MORE_NAV = [
  { to: "/search", label: "Search", icon: Search, hint: "Find chits & members" },
  { to: "/chits/new", label: "New chit", icon: Plus, hint: "Start a group" },
  { to: "/support", label: "Support", icon: Headset, hint: "Get help" },
  { to: "/upgrade", label: "Upgrade", icon: Crown, hint: "Plans & billing" },
  { to: "/profile", label: "Profile", icon: UserRound, hint: "Your account" },
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
  const { user, logout } = useStore();
  const nav = useNavigate();
  const loc = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const title =
    crumb2 ||
    crumb ||
    NAV.find((n) => n.to === loc.pathname)?.label ||
    "Bhishi Circle";

  useEffect(() => {
    setSheetOpen(false);
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
      if (sheetOpen) {
        e.preventDefault();
        setSheetOpen(false);
      }
    };
    window.addEventListener("bhishi:hardware-back", onBack);
    return () => window.removeEventListener("bhishi:hardware-back", onBack);
  }, [sheetOpen]);

  useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen]);

  const moreActive = MORE_NAV.some((n) => loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(n.to)));

  const side = (
    <>
      <NavLink to="/" className="logo">Bhishi Circle</NavLink>
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `nav-btn${isActive ? " active" : ""}`}>
          <n.icon size={18} />
          {n.label}
        </NavLink>
      ))}
      <NavLink to="/chits/new" className="new-chit"><Plus size={16} /> New chit</NavLink>
      <div className="sidebar-bottom">
        <div className="avatar">{(user?.name || "BC").slice(0, 2).toUpperCase()}</div>
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

  return (
    <div className="shell">
      <aside className="sidebar">{side}</aside>
      {sheetOpen && (
        <>
          <div className="sheet-back" onClick={() => setSheetOpen(false)} aria-hidden />
          <div className="sheet" role="dialog" aria-modal="true" aria-label="More">
            <div className="sheet-handle" aria-hidden />
            <div className="sheet-head">
              <div>
                <strong>More</strong>
                <p className="muted">Account, plans & shortcuts</p>
              </div>
              <button type="button" className="icon-btn" aria-label="Close" onClick={() => setSheetOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="sheet-user">
              <div className="avatar tone-blue">{(user?.name || "BC").slice(0, 2).toUpperCase()}</div>
              <div className="grow">
                <strong>{user?.name}</strong>
                <div className="muted">{user?.plan.toUpperCase()} plan{user?.phone ? ` · +91 ${user.phone}` : ""}</div>
              </div>
            </div>
            <div className="sheet-list">
              {MORE_NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) => `sheet-item${isActive ? " active" : ""}`}
                  onClick={() => setSheetOpen(false)}
                >
                  <span className="sheet-item-icon"><n.icon size={18} strokeWidth={2.2} /></span>
                  <span className="grow">
                    <strong>{n.label}</strong>
                    <span className="muted">{n.hint}</span>
                  </span>
                </NavLink>
              ))}
            </div>
            <button
              type="button"
              className="sheet-logout"
              onClick={() => { void logout().then(() => nav("/login")); }}
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </>
      )}
      <div className="main">
        <div className="topbar">
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
          <div className="bottom-tabs-inner">
            {TAB_NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) => `bottom-tab${isActive ? " active" : ""}`}
              >
                <n.icon size={20} strokeWidth={isActivePath(loc.pathname, n.to) ? 2.4 : 2} />
                <span>{n.label}</span>
              </NavLink>
            ))}
            <button
              type="button"
              className={`bottom-tab${moreActive || sheetOpen ? " active" : ""}`}
              onClick={() => setSheetOpen(true)}
            >
              <MoreHorizontal size={20} strokeWidth={moreActive || sheetOpen ? 2.4 : 2} />
              <span>More</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
}

function isActivePath(pathname: string, to: string) {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}
