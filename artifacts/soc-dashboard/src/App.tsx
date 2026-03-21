import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useAuthStore } from "./lib/store";
import { AppLayout } from "./components/layout";

// Pages
import Login from "./pages/login";
import S1Dashboard from "./pages/s1-dashboard";
import LrDashboard from "./pages/lr-dashboard";
import { EndpointsPage, ServersPage, WorkstationsPage, VulnAppsPage, RoguesPage } from "./pages/assets";
import { ActiveAlertsPage, CriticalAlertsPage, AlertHistoryPage } from "./pages/alerts";
import IocPage from "./pages/iocs";
import { LrAlarmsPage, LrCasesPage, LrSourcesPage, LrSearchPage, LrListsPage, LrEntitiesPage, LrHostsPage, LrNetworksPage, LrAgentsPage } from "./pages/lr-pages";
import HackerNewsPage from "./pages/hackernews";
import AdminPage from "./pages/admin";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    }
  }
});

// Setup Global Fetch Interceptor for JWT Auth
const originalFetch = window.fetch;
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const token = localStorage.getItem('soc_token');
  
  let url = '';
  if (typeof input === 'string') url = input;
  else if (input instanceof URL) url = input.toString();
  else if (input instanceof Request) url = input.url;

  if (token && url.includes('/api/')) {
    init = init || {};
    init.headers = {
      ...init.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  
  const response = await originalFetch(input, init);
  
  if (response.status === 401 && !url.includes('/api/auth/login')) {
    localStorage.removeItem('soc_token');
    window.location.href = `${import.meta.env.BASE_URL}login`;
  }
  
  return response;
};

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated } = useAuthStore();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login');
    }
  }, [isAuthenticated, setLocation]);

  if (!isAuthenticated) return null;

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function HomeRedirect() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      setLocation('/login');
    } else {
      const last = localStorage.getItem('soc_last_dashboard') || '/s1';
      setLocation(last);
    }
  }, [isAuthenticated, setLocation]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={HomeRedirect} />
      
      {/* SentinelOne */}
      <Route path="/s1"><ProtectedRoute component={S1Dashboard} /></Route>
      <Route path="/assets/endpoints"><ProtectedRoute component={EndpointsPage} /></Route>
      <Route path="/assets/servers"><ProtectedRoute component={ServersPage} /></Route>
      <Route path="/assets/workstations"><ProtectedRoute component={WorkstationsPage} /></Route>
      <Route path="/assets/vuln-apps"><ProtectedRoute component={VulnAppsPage} /></Route>
      <Route path="/assets/rogues"><ProtectedRoute component={RoguesPage} /></Route>
      <Route path="/alerts/active"><ProtectedRoute component={ActiveAlertsPage} /></Route>
      <Route path="/alerts/critical"><ProtectedRoute component={CriticalAlertsPage} /></Route>
      <Route path="/alerts/history"><ProtectedRoute component={AlertHistoryPage} /></Route>
      <Route path="/iocs"><ProtectedRoute component={IocPage} /></Route>
      
      {/* LogRhythm */}
      <Route path="/lr"><ProtectedRoute component={LrDashboard} /></Route>
      <Route path="/lr/alarms"><ProtectedRoute component={LrAlarmsPage} /></Route>
      <Route path="/lr/cases"><ProtectedRoute component={LrCasesPage} /></Route>
      <Route path="/lr/search"><ProtectedRoute component={LrSearchPage} /></Route>
      <Route path="/lr/sources"><ProtectedRoute component={LrSourcesPage} /></Route>
      <Route path="/lr/lists"><ProtectedRoute component={LrListsPage} /></Route>
      <Route path="/lr/entities"><ProtectedRoute component={LrEntitiesPage} /></Route>
      <Route path="/lr/hosts"><ProtectedRoute component={LrHostsPage} /></Route>
      <Route path="/lr/networks"><ProtectedRoute component={LrNetworksPage} /></Route>
      <Route path="/lr/agents"><ProtectedRoute component={LrAgentsPage} /></Route>
      
      {/* Threat Intelligence */}
      <Route path="/feeds/hackernews"><ProtectedRoute component={HackerNewsPage} /></Route>
      
      {/* Admin */}
      <Route path="/admin"><ProtectedRoute component={AdminPage} /></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
