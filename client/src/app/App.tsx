import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@clerk/react";

import AppProviders from "./providers";
import { AppShell } from "@/components/layout/app-shell";
import { TransactionFormBridge } from "@/components/transactions/transaction-form-bridge";
import { PageTransition } from "@/components/common/page-transition";

const DashboardPage = lazy(() => import("@/pages/dashboard"));
const TransactionsPage = lazy(() => import("@/pages/transactions"));
const AnalyticsPage = lazy(() => import("@/pages/analytics"));
const SpacesPage = lazy(() => import("@/pages/spaces"));
const SpaceDetailPage = lazy(() => import("@/pages/space-detail"));
const SettingsPage = lazy(() => import("@/pages/settings"));
const SignInPage = lazy(() => import("@/pages/sign-in"));
const SignUpPage = lazy(() => import("@/pages/sign-up"));
const WelcomePage = lazy(() => import("@/pages/welcome"));
const PrivacyPolicyPage = lazy(() => import("@/pages/privacy-policy"));
const TermsOfServicePage = lazy(() => import("@/pages/terms-of-service"));
const DataDeletionPage = lazy(() => import("@/pages/data-deletion"));

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
    <PageTransition key={location.pathname}>
      <Outlet />
    </PageTransition>
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

function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/data-deletion" element={<DataDeletionPage />} />
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
              <Route path="/spaces/:id" element={<SpaceDetailPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/welcome" replace />} />
          </Routes>
        </Suspense>
      </AppProviders>
    </QueryClientProvider>
  );
}
