import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useStore } from "./store";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ChitsPage, CustomersPage } from "./pages/ChitsCustomers";
import { CustomerDetailPage } from "./pages/CustomerDetailPage";
import { NewChitPage } from "./pages/NewChitPage";
import { ChitDetailPage } from "./pages/ChitDetailPage";
import { TrackedChitPage } from "./pages/TrackedChitPage";
import { MemberChitPage } from "./pages/MemberChitPage";
import { CollectionsPage } from "./pages/CollectionsPage";
import {
  ProfilePage,
  SearchPage,
  SupportPage,
  UpgradePage,
} from "./pages/MorePages";

function Guard({ children }: { children: ReactNode }) {
  const { user, ready } = useStore();
  if (!ready) return <div className="login-wrap">Loading ledger…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<Guard><DashboardPage /></Guard>} />
      <Route path="/chits" element={<Guard><ChitsPage /></Guard>} />
      <Route path="/chits/new" element={<Guard><NewChitPage /></Guard>} />
      <Route path="/chits/:id" element={<Guard><ChitDetailPage /></Guard>} />
      <Route path="/tracked/:id" element={<Guard><TrackedChitPage /></Guard>} />
      <Route path="/member/:id" element={<Guard><MemberChitPage /></Guard>} />
      <Route path="/collections" element={<Guard><CollectionsPage /></Guard>} />
      <Route path="/customers" element={<Guard><CustomersPage /></Guard>} />
      <Route path="/customers/:id" element={<Guard><CustomerDetailPage /></Guard>} />
      <Route path="/support" element={<Guard><SupportPage /></Guard>} />
      <Route path="/upgrade" element={<Guard><UpgradePage /></Guard>} />
      <Route path="/profile" element={<Guard><ProfilePage /></Guard>} />
      <Route path="/search" element={<Guard><SearchPage /></Guard>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
