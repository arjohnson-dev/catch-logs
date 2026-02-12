import type { ComponentType } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Stats from "@/pages/stats";
import AuthPage from "@/pages/auth";
import Terms from "@/pages/terms";
import Privacy from "@/pages/privacy";
import Settings from "@/pages/settings";
import Support from "@/pages/support";
import JournalPage from "@/pages/journal";
import NewEntryPage from "@/pages/new-entry";

import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const AuthFallback = () => <AuthPage onAuthSuccess={() => window.location.reload()} />;
  const protectedRoute = (Component: ComponentType) =>
    isAuthenticated ? Component : AuthFallback;

  if (isLoading) {
    return (
      <div className="app-loading-shell">
        <div className="app-loading-panel">
          <div className="app-loading-spinner" />
          <p className="app-loading-text">Loading CatchLogs...</p>
        </div>
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/reset-password/:token" component={ResetPassword} />
      <Route path="/terms" component={Terms} />
      <Route path="/privacy" component={Privacy} />
      <Route path="/support" component={Support} />
      <Route path="/journal" component={protectedRoute(JournalPage)} />
      <Route path="/entries/new" component={protectedRoute(NewEntryPage)} />
      <Route path="/settings" component={protectedRoute(Settings)} />
      <Route path="/auth" component={protectedRoute(Dashboard)} />
      <Route path="/" component={protectedRoute(Dashboard)} />
      <Route path="/stats" component={protectedRoute(Stats)} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
