import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { AnimatePresence } from "framer-motion";

import AppProviders from "./providers";
import DashboardPage from "@/pages/dashboard";
import TransactionsPage from "@/pages/transactions";
import AnalyticsPage from "@/pages/analytics";
import SpacesPage from "@/pages/spaces";
import SettingsPage from "@/pages/settings";
import SignInPage from "@/pages/sign-in";
import SignUpPage from "@/pages/sign-up";
import WelcomePage from "@/pages/welcome";
import { AppShell } from "@/components/layout/app-shell";
import { TransactionFormBridge } from "@/components/transactions/transaction-form-bridge";
import { PageTransition } from "@/components/common/page-transition";

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
    return <Navigate to="/welcome" state={{ from: location }} replace />;
  }

  return children;
}

function AnimatedOutlet() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={location.pathname}>
        <Outlet />
      </PageTransition>
    </AnimatePresence>
  );
}

function AppLayout() {
  return (
    <AppShell>
      <AnimatedOutlet />
      <TransactionFormBridge />
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Routes>
          <Route path="/welcome" element={<WelcomePage />} />
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
          <Route path="*" element={<Navigate to="/welcome" replace />} />
        </Routes>
      </AppProviders>
    </QueryClientProvider>
  );
}
