import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Shield, Activity, Database, AlertTriangle, Crosshair, Server, Users, Settings,
  LogOut, Menu, Bell, Monitor, Laptop, Network,
  Building, List, Search, FileText, Rss, Briefcase, Hash,
  ChevronDown, Globe, PanelLeftClose, PanelLeftOpen, Zap
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore, useAppStore } from '@/lib/store';
import { EndpointDetailPanel } from './panels';
import { format } from 'date-fns';

const APP_NAME = 'Unified Threat Alert';

export function TopBar() {
  const { user, clearAuth } = useAuthStore();
  const { notifications, toggleSidebar, sidebarOpen } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-14 border-b border-border bg-card/70 backdrop-blur-md flex items-center justify-between px-4 z-30 shrink-0 gap-4">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-base text-foreground tracking-tight hidden sm:block">
            {APP_NAME}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 ml-auto">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground font-mono bg-secondary/60 px-3 py-1 rounded-md border border-border hidden md:flex">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span>{format(time, 'HH:mm:ss')} UTC</span>
        </div>

        <button className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors ml-1">
          <Bell className="w-4.5 h-4.5 w-[18px] h-[18px]" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          )}
        </button>

        <div className="flex items-center gap-2.5 pl-3 ml-1 border-l border-border">
          <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center">
            <span className="text-xs font-semibold text-primary">
              {(user?.username || 'G').charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="hidden md:flex flex-col">
            <span className="text-sm font-medium text-foreground leading-none">{user?.username || 'Guest'}</span>
            <span className="text-xs text-primary capitalize leading-none mt-0.5">{user?.role || 'analyst'}</span>
          </div>
          <button
            onClick={() => clearAuth()}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}

interface NavItem { label: string; path: string; icon: React.ReactNode; badge?: number; }
interface NavGroup { title: string; icon: React.ReactNode; items: NavItem[]; color?: string; }

function SidebarItem({ item, active, sidebarOpen }: { item: NavItem; active: boolean; sidebarOpen: boolean }) {
  return (
    <Link
      href={item.path}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 group relative ${
        active
          ? 'bg-primary/12 text-primary'
          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
      }`}
      title={!sidebarOpen ? item.label : undefined}
    >
      <span className={`shrink-0 w-4 h-4 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'} transition-colors`}>
        {item.icon}
      </span>
      {sidebarOpen && (
        <span className="text-sm font-medium leading-none flex-1">{item.label}</span>
      )}
      {sidebarOpen && active && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
      )}
      {!sidebarOpen && active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-full" />
      )}
    </Link>
  );
}

function SidebarGroup({ group, sidebarOpen, location }: { group: NavGroup; sidebarOpen: boolean; location: string }) {
  const hasActive = group.items.some(item => location === item.path || location.startsWith(item.path + '/'));
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      {sidebarOpen && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors rounded-md"
        >
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground/70">{group.icon}</span>
            <span>{group.title}</span>
          </div>
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
        </button>
      )}
      {!sidebarOpen && <div className="h-px bg-border/50 mx-2 my-1" />}
      {(expanded || !sidebarOpen) && (
        <ul className="space-y-0.5 mt-0.5">
          {group.items.map((item) => (
            <li key={item.path}>
              <SidebarItem
                item={item}
                active={location === item.path}
                sidebarOpen={sidebarOpen}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function useVendorNames() {
  const { token } = useAuthStore();
  const { data } = useQuery({
    queryKey: ['/api/admin/vendors'],
    queryFn: async () => {
      const r = await fetch('/api/admin/vendors', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) return { vendors: [] };
      return r.json();
    },
    staleTime: 60_000,
    enabled: !!token,
  });
  const vendors: { category: string; displayName: string; enabled: boolean }[] = data?.vendors || [];
  const first = (cat: string) => vendors.find(v => v.category === cat && v.enabled)?.displayName ?? null;
  return {
    edrName: first('edr'),
    xdrName: first('xdr'),
    siemName: first('siem'),
    soarName: first('soar'),
  };
}

export function Sidebar() {
  const [location] = useLocation();
  const { sidebarOpen } = useAppStore();
  const { edrName, xdrName, siemName, soarName } = useVendorNames();

  const navGroups: NavGroup[] = [
    ...(edrName ? [{
      title: edrName,
      icon: <Shield className="w-3.5 h-3.5" />,
      items: [
        { label: "Dashboard", path: "/s1", icon: <Activity className="w-4 h-4" /> },
        { label: "Global Map", path: "/map", icon: <Globe className="w-4 h-4" /> },
        { label: "Endpoints", path: "/assets/endpoints", icon: <Server className="w-4 h-4" /> },
        { label: "Servers", path: "/assets/servers", icon: <Server className="w-4 h-4" /> },
        { label: "Workstations", path: "/assets/workstations", icon: <Monitor className="w-4 h-4" /> },
        { label: "Vuln Apps", path: "/assets/vuln-apps", icon: <AlertTriangle className="w-4 h-4" /> },
        { label: "Rogues", path: "/assets/rogues", icon: <Laptop className="w-4 h-4" /> },
      ]
    }] : []),
    ...(xdrName ? [{
      title: xdrName,
      icon: <Zap className="w-3.5 h-3.5" />,
      items: [
        { label: "Dashboard", path: "/s1", icon: <Activity className="w-4 h-4" /> },
      ]
    }] : []),
    {
      title: "Alerts",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      items: [
        { label: "Active Alerts", path: "/alerts/active", icon: <AlertTriangle className="w-4 h-4" /> },
        { label: "Critical", path: "/alerts/critical", icon: <Zap className="w-4 h-4" /> },
        { label: "History", path: "/alerts/history", icon: <FileText className="w-4 h-4" /> },
        { label: "Threat IOCs", path: "/iocs", icon: <Crosshair className="w-4 h-4" /> },
      ]
    },
    ...(siemName ? [{
      title: siemName,
      icon: <Database className="w-3.5 h-3.5" />,
      items: [
        { label: "Dashboard", path: "/lr", icon: <Activity className="w-4 h-4" /> },
        { label: "Alarms", path: "/lr/alarms", icon: <Bell className="w-4 h-4" /> },
        { label: "Cases", path: "/lr/cases", icon: <Briefcase className="w-4 h-4" /> },
        { label: "Log Search", path: "/lr/search", icon: <Search className="w-4 h-4" /> },
        { label: "Log Sources", path: "/lr/sources", icon: <Database className="w-4 h-4" /> },
        { label: "Lists", path: "/lr/lists", icon: <List className="w-4 h-4" /> },
        { label: "Entities", path: "/lr/entities", icon: <Building className="w-4 h-4" /> },
        { label: "Hosts", path: "/lr/hosts", icon: <Server className="w-4 h-4" /> },
        { label: "Networks", path: "/lr/networks", icon: <Network className="w-4 h-4" /> },
        { label: "Agents", path: "/lr/agents", icon: <Shield className="w-4 h-4" /> },
      ]
    }] : []),
    ...(soarName ? [{
      title: soarName,
      icon: <Settings className="w-3.5 h-3.5" />,
      items: [
        { label: "Playbooks", path: "/lr/cases", icon: <FileText className="w-4 h-4" /> },
      ]
    }] : []),
    {
      title: "Threat Intel",
      icon: <Hash className="w-3.5 h-3.5" />,
      items: [
        { label: "HackerNews Feed", path: "/feeds/hackernews", icon: <Rss className="w-4 h-4" /> },
      ]
    },
    {
      title: "System",
      icon: <Settings className="w-3.5 h-3.5" />,
      items: [
        { label: "Admin Panel", path: "/admin", icon: <Shield className="w-4 h-4" /> },
        { label: "Settings", path: "/settings", icon: <Settings className="w-4 h-4" /> },
      ]
    }
  ];

  return (
    <aside
      className={`bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-250 ease-in-out shrink-0 ${sidebarOpen ? 'w-56' : 'w-[52px]'} overflow-hidden`}
    >
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4 custom-scrollbar">
        {navGroups.map((group, i) => (
          <SidebarGroup key={i} group={group} sidebarOpen={sidebarOpen} location={location} />
        ))}
      </div>
    </aside>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { selectedEndpoint } = useAppStore();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
      <EndpointDetailPanel endpoint={selectedEndpoint} />
    </div>
  );
}
