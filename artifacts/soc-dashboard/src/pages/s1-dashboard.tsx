import React, { useEffect, useState } from 'react';
import { useS1GetAgents, useS1GetThreats, useS1GetAlerts } from '@workspace/api-client-react';
import { useSettingsStore } from '@/lib/store';
import { WorldMap } from '@/components/world-map';
import { CyberBadge } from '@/components/cyber-ui';
import {
  Shield, AlertTriangle, Server, Search, Activity,
  Maximize2, RotateCcw, Globe, TrendingUp, Wifi, WifiOff
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';

const STATUS_FILTERS = ['All', 'healthy', 'warning', 'threat', 'offline'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function S1Dashboard() {
  useEffect(() => { localStorage.setItem('soc_last_dashboard', '/s1'); }, []);

  const [filterStatus, setFilterStatus] = useState<StatusFilter>('All');
  const [filterCountry, setFilterCountry] = useState('');
  const [search, setSearch] = useState('');

  const { data: agentsData, isLoading, refetch } = useS1GetAgents({ limit: 1000 });
  const { data: threatsData } = useS1GetThreats({ limit: 50, resolved: false });
  const { data: alertsData } = useS1GetAlerts({ limit: 30 });

  const allEndpoints = agentsData?.data || [];
  const activeThreats = threatsData?.data || [];
  const alerts = alertsData?.data || [];

  const endpoints = allEndpoints.filter(ep => {
    if (search) {
      const q = search.toLowerCase();
      if (!ep.hostname.toLowerCase().includes(q) && !ep.ip.includes(q) &&
          !ep.country?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const countries = [...new Set(allEndpoints.map(e => e.country).filter(Boolean))].sort() as string[];

  const counts = {
    healthy: allEndpoints.filter(e => e.status === 'healthy').length,
    warning: allEndpoints.filter(e => e.status === 'warning').length,
    threat: allEndpoints.filter(e => e.status === 'threat').length,
    offline: allEndpoints.filter(e => e.status === 'offline').length,
  };

  const activeAlerts = alerts.filter(a => a.status === 'active');

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search endpoints, IPs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-8 pl-9 pr-3 bg-secondary border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
          />
        </div>

        {/* Status pills */}
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map(s => {
            const active = filterStatus === s;
            const colorMap: Record<StatusFilter, string> = {
              All: active ? 'bg-primary/15 text-primary border-primary/40' : 'text-muted-foreground border-border hover:text-foreground hover:border-border/80',
              healthy: active ? 'bg-healthy/15 text-healthy border-healthy/40' : 'text-muted-foreground border-border hover:text-healthy',
              warning: active ? 'bg-warning/15 text-warning border-warning/40' : 'text-muted-foreground border-border hover:text-warning',
              threat: active ? 'bg-destructive/15 text-destructive border-destructive/40' : 'text-muted-foreground border-border hover:text-destructive',
              offline: active ? 'bg-muted text-foreground border-border' : 'text-muted-foreground border-border hover:text-foreground',
            };
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-2.5 h-7 text-xs font-medium rounded-md border transition-all capitalize ${colorMap[s]}`}
              >
                {s}
              </button>
            );
          })}
        </div>

        <select
          value={filterCountry}
          onChange={e => setFilterCountry(e.target.value)}
          className="h-8 px-2 bg-secondary border border-border rounded-lg text-sm text-muted-foreground focus:outline-none focus:border-primary/40 ml-auto hidden md:block"
        >
          <option value="">All Countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 h-8 px-3 text-sm text-muted-foreground bg-secondary border border-border rounded-lg hover:text-foreground hover:border-primary/30 transition-all"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
        <Link href="/map" className="flex items-center gap-1.5 h-8 px-3 text-sm font-medium text-primary bg-primary/10 border border-primary/25 rounded-lg hover:bg-primary/15 transition-all">
          <Maximize2 className="w-3.5 h-3.5" />
          Full Map
        </Link>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left panel */}
        <div className="w-56 border-r border-border bg-card/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-5">
            {/* Stats */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Overview</p>
              <div className="grid grid-cols-2 gap-2">
                <StatCard value={allEndpoints.length} label="Total" color="default" />
                <StatCard value={counts.threat} label="Threats" color="threat" pulse={counts.threat > 0} />
                <StatCard value={counts.warning} label="Warnings" color="warning" />
                <StatCard value={counts.offline} label="Offline" color="muted" />
              </div>
            </div>

            {/* Health bars */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Endpoint Health</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Healthy', count: counts.healthy, bar: 'bg-healthy' },
                  { label: 'Warning', count: counts.warning, bar: 'bg-warning' },
                  { label: 'Threat', count: counts.threat, bar: 'bg-destructive' },
                  { label: 'Offline', count: counts.offline, bar: 'bg-muted-foreground' },
                ].map(({ label, count, bar }) => (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium text-foreground tabular-nums">{count}</span>
                    </div>
                    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${bar} rounded-full transition-all duration-700`}
                        style={{ width: allEndpoints.length > 0 ? `${(count / allEndpoints.length) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active threats */}
            {activeThreats.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Active Threats
                </p>
                <div className="space-y-2">
                  {activeThreats.slice(0, 5).map(t => (
                    <div key={t.id} className="p-2.5 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <p className="text-sm font-medium text-destructive truncate">{t.name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground truncate">{t.agentComputerName}</p>
                        <span className="text-xs font-medium text-destructive uppercase shrink-0 ml-1">{t.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Countries */}
            {countries.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" /> By Country
                </p>
                <div className="space-y-0.5">
                  {countries.slice(0, 8).map(c => {
                    const total = allEndpoints.filter(e => e.country === c).length;
                    const threats = allEndpoints.filter(e => e.country === c && e.status === 'threat').length;
                    return (
                      <button
                        key={c}
                        onClick={() => setFilterCountry(filterCountry === c ? '' : c)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm transition-colors ${
                          filterCountry === c
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                        }`}
                      >
                        <span className="truncate">{c}</span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {threats > 0 && (
                            <span className="text-destructive font-semibold text-xs">⚠ {threats}</span>
                          )}
                          <span className="font-medium tabular-nums">{total}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Center: Map */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative min-h-0">
            <WorldMap
              endpoints={endpoints as any}
              threats={activeThreats as any}
              filterStatus={filterStatus !== 'All' ? filterStatus : undefined}
              filterCountry={filterCountry || undefined}
            />
          </div>
          <LiveTicker alerts={activeAlerts} />
        </div>

        {/* Right: Alert feed */}
        <div className="w-64 border-l border-border bg-card/30 flex flex-col shrink-0">
          <div className="h-12 border-b border-border flex items-center px-4 gap-2 shrink-0">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">Alert Feed</span>
            {activeAlerts.length > 0 && (
              <span className="ml-auto text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                {activeAlerts.length} active
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
            {alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
            {alerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Shield className="w-8 h-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No alerts</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">System monitoring active</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ value, label, color, pulse }: { value: number; label: string; color: string; pulse?: boolean }) {
  const styles: Record<string, string> = {
    default: 'bg-secondary border-border text-foreground',
    threat: 'bg-destructive/8 border-destructive/20 text-destructive',
    warning: 'bg-warning/8 border-warning/20 text-warning',
    muted: 'bg-secondary border-border text-muted-foreground',
  };
  return (
    <div className={`p-3 rounded-xl border text-center ${styles[color] || styles.default}`}>
      <p className={`text-2xl font-bold tabular-nums ${pulse && value > 0 ? 'animate-pulse' : ''}`}>{value}</p>
      <p className="text-xs font-medium mt-0.5 opacity-70">{label}</p>
    </div>
  );
}

function AlertCard({ alert }: { alert: any }) {
  const severityColors: Record<string, string> = {
    critical: 'border-l-destructive',
    high: 'border-l-orange-500',
    medium: 'border-l-warning',
    low: 'border-l-muted-foreground',
  };
  const badgeVariant: any = alert.severity === 'critical' ? 'threat' : alert.severity === 'high' ? 'warning' : 'outline';

  return (
    <div className={`p-3 bg-secondary/50 rounded-xl border border-border border-l-2 ${severityColors[alert.severity] || 'border-l-border'} hover:border-primary/30 transition-colors cursor-pointer group`}>
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <CyberBadge variant={badgeVariant}>{alert.severity}</CyberBadge>
        <span className="text-xs text-muted-foreground shrink-0">
          {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
        {alert.name}
      </p>
      {alert.endpointName && (
        <div className="flex items-center gap-1.5 mt-2">
          <Server className="w-3 h-3 text-muted-foreground shrink-0" />
          <span className="text-xs text-muted-foreground truncate">{alert.endpointName}</span>
        </div>
      )}
    </div>
  );
}

function LiveTicker({ alerts }: { alerts: any[] }) {
  const [idx, setIdx] = useState(0);
  const tickerSpeed = useSettingsStore(s => s.tickerSpeed);

  useEffect(() => {
    if (alerts.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % alerts.length), tickerSpeed);
    return () => clearInterval(t);
  }, [alerts.length, tickerSpeed]);

  if (alerts.length === 0) return null;

  const current = alerts[idx];
  return (
    <div className="h-9 border-t border-destructive/20 bg-destructive/5 flex items-center px-4 gap-3 shrink-0 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-xs font-semibold text-destructive uppercase tracking-wide">Live</span>
      </div>
      <div
        key={idx}
        className="flex-1 text-sm text-foreground/80 truncate"
        style={{ animation: 'fadeIn 0.35s ease' }}
      >
        <span className="font-medium text-foreground">[{current.severity?.toUpperCase()}]</span>
        {' '}{current.name}
        {current.endpointName && <span className="text-muted-foreground"> · {current.endpointName}</span>}
      </div>
      <span className="text-xs text-muted-foreground shrink-0 font-mono">
        {idx + 1}/{alerts.length}
      </span>
    </div>
  );
}
