import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  Shield, Activity, Database, AlertTriangle, Crosshair, Server, Users, Settings,
  LogOut, ChevronLeft, ChevronRight, Menu, Bell, Monitor, Laptop, Network,
  Building, List, Search, FileText, Rss, Briefcase, Hash, ChevronDown, ChevronRight as ChevronRightSm
} from 'lucide-react';
import { useAuthStore, useAppStore } from '@/lib/store';
import { EndpointDetailPanel } from './panels';
import { format } from 'date-fns';

export function TopBar() {
  const { user, clearAuth } = useAuthStore();
  const { notifications, toggleSidebar } = useAppStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 z-30 relative cyber-glow shrink-0">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="p-2 text-muted-foreground hover:text-primary transition-colors lg:hidden">
          <Menu className="w-5 h-5" />
        </button>
        <h1 className="font-display font-bold text-xl tracking-widest text-primary text-shadow-cyber hidden sm:block">
          SOC_MAP_CENTER
        </h1>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center">
        <span className="font-mono text-xs text-muted-foreground uppercase">Global Sync</span>
        <span className="font-mono text-sm text-foreground tracking-widest bg-secondary/50 px-3 py-1 rounded border border-border">
          UTC {format(time, 'yyyy-MM-dd HH:mm:ss')}
        </span>
      </div>

      <div className="flex items-center gap-6">
        <div className="relative cursor-pointer group">
          <Bell className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-3 border-l border-border pl-6">
          <div className="text-right hidden md:block">
            <div className="text-sm font-bold text-foreground font-display tracking-wide">{user?.username || 'GUEST'}</div>
            <div className="text-xs text-primary font-mono uppercase">{user?.role || 'ANALYST'}</div>
          </div>
          <button 
            onClick={() => clearAuth()}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            title="Disconnect"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

interface NavGroup {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
}

function SidebarGroup({ group, sidebarOpen, location }: { group: NavGroup; sidebarOpen: boolean; location: string }) {
  const hasActive = group.items.some(item => location === item.path || location.startsWith(item.path + '/'));
  const [expanded, setExpanded] = useState(hasActive || true);

  return (
    <div className="px-2">
      {sidebarOpen && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between gap-2 px-3 mb-1 text-xs font-display tracking-widest text-muted-foreground uppercase hover:text-foreground transition-colors py-1"
        >
          <div className="flex items-center gap-2">
            {group.icon}
            <span>{group.title}</span>
          </div>
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRightSm className="w-3 h-3" />}
        </button>
      )}
      {(expanded || !sidebarOpen) && (
        <ul className="space-y-0.5">
          {group.items.map((item) => {
            const active = location === item.path;
            return (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 group ${
                    active
                      ? 'bg-primary/10 text-primary border border-primary/30'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground'
                  }`}
                >
                  <span className={`shrink-0 ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
                    {item.icon}
                  </span>
                  {sidebarOpen && <span className="font-mono text-xs leading-tight">{item.label}</span>}
                  {sidebarOpen && active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary animate-pulse shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  const navGroups: NavGroup[] = [
    {
      title: "SentinelOne EDR",
      icon: <Shield className="w-3.5 h-3.5" />,
      items: [
        { label: "S1 Dashboard", path: "/s1", icon: <Activity className="w-4 h-4" /> },
        { label: "Endpoints", path: "/assets/endpoints", icon: <Server className="w-4 h-4" /> },
        { label: "Servers", path: "/assets/servers", icon: <Server className="w-4 h-4" /> },
        { label: "Workstations", path: "/assets/workstations", icon: <Monitor className="w-4 h-4" /> },
        { label: "Vuln Apps", path: "/assets/vuln-apps", icon: <AlertTriangle className="w-4 h-4" /> },
        { label: "Rogues", path: "/assets/rogues", icon: <Laptop className="w-4 h-4" /> },
      ]
    },
    {
      title: "Alerts",
      icon: <AlertTriangle className="w-3.5 h-3.5" />,
      items: [
        { label: "Active Alerts", path: "/alerts/active", icon: <AlertTriangle className="w-4 h-4" /> },
        { label: "Critical", path: "/alerts/critical", icon: <AlertTriangle className="w-4 h-4" /> },
        { label: "Alert History", path: "/alerts/history", icon: <FileText className="w-4 h-4" /> },
        { label: "Threat IOCs", path: "/iocs", icon: <Crosshair className="w-4 h-4" /> },
      ]
    },
    {
      title: "LogRhythm SIEM",
      icon: <Database className="w-3.5 h-3.5" />,
      items: [
        { label: "LR Dashboard", path: "/lr", icon: <Activity className="w-4 h-4" /> },
        { label: "Alarms", path: "/lr/alarms", icon: <Bell className="w-4 h-4" /> },
        { label: "Cases", path: "/lr/cases", icon: <Briefcase className="w-4 h-4" /> },
        { label: "Log Search", path: "/lr/search", icon: <Search className="w-4 h-4" /> },
        { label: "Log Sources", path: "/lr/sources", icon: <Database className="w-4 h-4" /> },
        { label: "Lists", path: "/lr/lists", icon: <List className="w-4 h-4" /> },
        { label: "Entities", path: "/lr/entities", icon: <Building className="w-4 h-4" /> },
        { label: "Hosts", path: "/lr/hosts", icon: <Server className="w-4 h-4" /> },
        { label: "Networks", path: "/lr/networks", icon: <Network className="w-4 h-4" /> },
        { label: "LR Agents", path: "/lr/agents", icon: <Shield className="w-4 h-4" /> },
      ]
    },
    {
      title: "Threat Intel",
      icon: <Hash className="w-3.5 h-3.5" />,
      items: [
        { label: "HackerNews Feed", path: "/feeds/hackernews", icon: <Rss className="w-4 h-4" /> },
      ]
    },
    {
      title: "Administration",
      icon: <Settings className="w-3.5 h-3.5" />,
      items: [
        { label: "Admin Panel", path: "/admin", icon: <Settings className="w-4 h-4" /> },
      ]
    }
  ];

  return (
    <aside 
      className={`bg-sidebar border-r border-sidebar-border transition-all duration-300 flex flex-col relative z-20 ${sidebarOpen ? 'w-56' : 'w-14'} overflow-hidden shrink-0`}
    >
      <div className="h-16 flex items-center justify-center border-b border-sidebar-border shrink-0">
        <Shield className="w-8 h-8 text-primary cyber-glow rounded-full p-1" />
      </div>

      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4 custom-scrollbar">
        {navGroups.map((group, i) => (
          <SidebarGroup key={i} group={group} sidebarOpen={sidebarOpen} location={location} />
        ))}
      </div>

      <button 
        onClick={toggleSidebar}
        className="h-12 border-t border-sidebar-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors shrink-0"
      >
        {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
      </button>
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
