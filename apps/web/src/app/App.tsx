import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/react";

import AppProviders from "./providers";
import DashboardPage from "@/pages/dashboard";
import TransactionsPage from "@/pages/transactions";
import AnalyticsPage from "@/pages/analytics";
import SpacesPage from "@/pages/spaces";
import SettingsPage from "@/pages/settings";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import { AppShell } from "@/components/layout/app-shell";
import { TransactionFormBridge } from "@/components/transactions/transaction-form-bridge";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Protected({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();

  if (!isLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return children;
}

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
      <TransactionFormBridge />
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Routes>
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route
            element={
              <Protected>
                <AppLayout />
              </Protected>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/spaces" element={<SpacesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProviders>
    </QueryClientProvider>
  );
}
