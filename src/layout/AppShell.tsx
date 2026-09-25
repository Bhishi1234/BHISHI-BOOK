import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
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
import { useI18n } from "../i18n";
import { useStore } from "../store";

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
  const { m } = useI18n();
  const nav = useNavigate();
  const loc = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const NAV = [
    { to: "/", label: m.nav.dashboard, icon: LayoutDashboard },
    { to: "/chits", label: m.nav.chits, icon: BookOpen },
    { to: "/collections", label: m.nav.collections, icon: Wallet },
    { to: "/customers", label: m.nav.customers, icon: Users },
    { to: "/support", label: m.nav.support, icon: Headset },
    { to: "/profile", label: m.nav.profile, icon: UserRound },
  ];

  const TAB_NAV = [
    { to: "/", label: m.nav.home, icon: LayoutDashboard },
    { to: "/chits", label: m.nav.chits, icon: BookOpen },
    { to: "/collections", label: m.nav.collect, icon: Wallet },
    { to: "/customers", label: m.nav.people, icon: Users },
  ];

  const MORE_NAV = [
    { to: "/search", label: m.nav.search, icon: Search, hint: m.moreHints.search },
    { to: "/chits/new", label: m.nav.newChit, icon: Plus, hint: m.moreHints.newChit },
    { to: "/support", label: m.nav.support, icon: Headset, hint: m.moreHints.support },
    { to: "/profile", label: m.nav.profile, icon: UserRound, hint: m.moreHints.profile },
  ];

  const title =
    crumb2 ||
    crumb ||
    NAV.find((n) => n.to === loc.pathname)?.label ||
    m.brand;

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

  // Highlight More for sheet destinations only — /chits/new stays under the Bhishi tab.
  const moreActive = MORE_NAV.some((n) => {
    if (n.to === "/chits/new" || n.to.startsWith("/chits/")) return false;
    return loc.pathname === n.to || (n.to !== "/" && loc.pathname.startsWith(`${n.to}/`));
  });

  const side = (
    <>
      <NavLink to="/" className="logo">
        <img className="logo-mark" src="/brand/bhishi-mark.png?v=3" alt="" width={28} height={28} decoding="async" />
        <span>{m.brand}</span>
      </NavLink>
      {NAV.map((n) => (
        <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `nav-btn${isActive ? " active" : ""}`}>
          <n.icon size={18} />
          {n.label}
        </NavLink>
      ))}
      <NavLink to="/chits/new" className="new-chit"><Plus size={16} /> {m.nav.newChit}</NavLink>
      <div className="sidebar-bottom">
        <div className="avatar">{(user?.name || "BC").slice(0, 2).toUpperCase()}</div>
        <div className="grow">
          <div>{user?.name}</div>
          {user?.phone ? <div className="muted">+91 {user.phone}</div> : null}
        </div>
        <button className="icon-btn" title={m.nav.signOut} onClick={() => { void logout().then(() => nav("/login")); }}>
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
          <div className="sheet" role="dialog" aria-modal="true" aria-label={m.nav.more}>
            <div className="sheet-handle" aria-hidden />
            <div className="sheet-head">
              <div>
                <strong>{m.nav.more}</strong>
                <p className="muted">{m.nav.moreHint}</p>
              </div>
              <button type="button" className="icon-btn" aria-label={m.common.close} onClick={() => setSheetOpen(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="sheet-user">
              <div className="avatar tone-blue">{(user?.name || "BC").slice(0, 2).toUpperCase()}</div>
              <div className="grow">
                <strong>{user?.name}</strong>
                <div className="muted">{user?.phone ? `+91 ${user.phone}` : m.common.notSet}</div>
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
              <LogOut size={16} /> {m.nav.signOut}
            </button>
          </div>
        </>
      )}
      <div className="main">
        <div className="topbar topbar-desktop">
          <div className="crumbs">
            {crumb && (crumb2 || crumb !== title) && (
              <>
                <Link
                  to={
                    crumb === "Chits" || crumb === m.nav.chits
                      ? "/chits"
                      : crumb === m.nav.customers
                        ? "/customers"
                        : "/"
                  }
                >
                  {crumb}
                </Link>
                <span>›</span>
              </>
            )}
            <strong>{title}</strong>
          </div>
          <button className="search" onClick={() => nav("/search")}>
            <Search size={16} />
            <span className="search-label">{m.searchPlaceholder}</span>
            <span className="search-kbd">⌘K</span>
          </button>
        </div>
        <div className="topbar topbar-mobile">
          <Link to="/" className="mobile-brand" aria-label={m.brand}>
            <img
              className="mobile-brand-mark"
              src="/brand/bhishi-mark-white.png?v=3"
              alt=""
              width={36}
              height={36}
              decoding="async"
            />
            <span className="mobile-brand-text">
              <strong>BhishiCircle</strong>
              <em>{m.brandTagline}</em>
            </span>
          </Link>
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
              <span>{m.nav.more}</span>
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
