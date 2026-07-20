import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { AppShell } from "./components/layout/AppShell";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { FlaskConical } from "lucide-react";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ExperimentsPage from "./pages/ExperimentsPage";
import CreateExperimentPage from "./pages/CreateExperimentPage";
import ExperimentDetailPage from "./pages/ExperimentDetailPage";
import ComparePage from "./pages/ComparePage";
import MetricsGuidePage from "./pages/MetricsGuidePage";

function FullScreenLoader() {
  return (
    <div className="grid h-screen place-items-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="grid size-14 animate-pulse place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-glow">
          <FlaskConical className="size-7 text-white" />
        </div>
        <div className="text-sm text-muted-foreground">Loading ExperimentOS…</div>
      </div>
    </div>
  );
}

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return (
    <AppShell>
      <ErrorBoundary>{children}</ErrorBoundary>
    </AppShell>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={loading ? <FullScreenLoader /> : user ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route path="/" element={<Protected><DashboardPage /></Protected>} />
      <Route path="/experiments" element={<Protected><ExperimentsPage /></Protected>} />
      <Route path="/experiments/new" element={<Protected><CreateExperimentPage /></Protected>} />
      <Route path="/experiments/:id" element={<Protected><ExperimentDetailPage /></Protected>} />
      <Route path="/compare" element={<Protected><ComparePage /></Protected>} />
      <Route path="/metrics" element={<Protected><MetricsGuidePage /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
