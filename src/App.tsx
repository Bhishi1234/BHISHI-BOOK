import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useStore } from "./store";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ChitsPage, CustomersPage } from "./pages/ChitsCustomers";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { NewChitPage } from "./pages/NewChitPage";
import { ChitDetailPage } from "./pages/ChitDetailPage";
import { LuckyDrawPage } from "./pages/LuckyDrawPage";
import { TrackedChitPage } from "./pages/TrackedChitPage";
import { MemberChitPage } from "./pages/MemberChitPage";
import { CollectionsPage } from "./pages/CollectionsPage";
import {
  ProfilePage,
  SearchPage,
  SupportPage,
  UpgradePage,
} from "./pages/MorePages";
import { BillingFailedPage, BillingSuccessPage } from "./pages/BillingPages";

function Boot({ children }: { children: ReactNode }) {
  const { ready } = useStore();
  if (!ready) return <div className="login-wrap">Loading…</div>;
  return children;
}

function Guard({ children }: { children: ReactNode }) {
  const { user, ready } = useStore();
  if (!ready) return <div className="login-wrap">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RootEntry() {
  const { user, ready } = useStore();
  if (!ready) return <div className="login-wrap">Loading…</div>;
  if (user) return <DashboardPage />;
  return <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootEntry />} />
      <Route path="/welcome" element={<Boot><LandingPage /></Boot>} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<Boot><ForgotPasswordPage /></Boot>} />
      <Route path="/chits" element={<Guard><ChitsPage /></Guard>} />
      <Route path="/chits/new" element={<Guard><NewChitPage /></Guard>} />
      <Route path="/chits/:id" element={<Guard><ChitDetailPage /></Guard>} />
      <Route path="/chits/:id/lucky-draw" element={<Guard><LuckyDrawPage /></Guard>} />
      <Route path="/tracked/:id" element={<Guard><TrackedChitPage /></Guard>} />
      <Route path="/member/:id" element={<Guard><MemberChitPage /></Guard>} />
      <Route path="/collections" element={<Guard><CollectionsPage /></Guard>} />
      <Route path="/customers" element={<Guard><CustomersPage /></Guard>} />
      <Route path="/customers/:id" element={<Guard><CustomerDetailPage /></Guard>} />
      <Route path="/support" element={<Guard><SupportPage /></Guard>} />
      <Route path="/upgrade" element={<Guard><UpgradePage /></Guard>} />
      <Route path="/billing/success" element={<Guard><BillingSuccessPage /></Guard>} />
      <Route path="/billing/failed" element={<Guard><BillingFailedPage /></Guard>} />
      <Route path="/profile" element={<Guard><ProfilePage /></Guard>} />
      <Route path="/search" element={<Guard><SearchPage /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
