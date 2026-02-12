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
      <Route path="/journal" component={isAuthenticated ? JournalPage : () => <AuthPage onAuthSuccess={() => window.location.reload()} />} />
      <Route path="/entries/new" component={isAuthenticated ? NewEntryPage : () => <AuthPage onAuthSuccess={() => window.location.reload()} />} />
      <Route path="/settings" component={isAuthenticated ? Settings : () => <AuthPage onAuthSuccess={() => window.location.reload()} />} />
      <Route path="/auth" component={isAuthenticated ? Dashboard : () => <AuthPage onAuthSuccess={() => window.location.reload()} />} />
      <Route path="/" component={isAuthenticated ? Dashboard : () => <AuthPage onAuthSuccess={() => window.location.reload()} />} />
      <Route path="/stats" component={isAuthenticated ? Stats : () => <AuthPage onAuthSuccess={() => window.location.reload()} />} />
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
