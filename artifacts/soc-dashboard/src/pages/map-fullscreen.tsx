import React, { useState } from 'react';
import { useS1GetAgents, useS1GetThreats, useS1GetAlerts } from '@workspace/api-client-react';
import { WorldMap } from '@/components/world-map';
import { AlertTriangle, Activity, Globe, RotateCcw, ChevronLeft, Filter, Layers } from 'lucide-react';
import { Link } from 'wouter';
import { formatDistanceToNow } from 'date-fns';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'healthy', label: 'Healthy' },
  { value: 'warning', label: 'Warning' },
  { value: 'threat', label: 'Threat' },
  { value: 'offline', label: 'Offline' },
];

export default function MapFullscreenPage() {
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [showPanels, setShowPanels] = useState(true);

  const { data: agentsData, refetch } = useS1GetAgents({ limit: 1000 });
  const { data: threatsData } = useS1GetThreats({ limit: 50, resolved: false });
  const { data: alertsData } = useS1GetAlerts({ limit: 12 });

  const endpoints = agentsData?.data || [];
  const activeThreats = threatsData?.data || [];
  const alerts = alertsData?.data || [];

  const countries = [...new Set(endpoints.map(e => e.country).filter(Boolean))].sort() as string[];

  const counts = {
    total: endpoints.length,
    healthy: endpoints.filter(e => e.status === 'healthy').length,
    warning: endpoints.filter(e => e.status === 'warning').length,
    threat: endpoints.filter(e => e.status === 'threat').length,
    offline: endpoints.filter(e => e.status === 'offline').length,
  };

  return (
    <div className="h-full w-full relative bg-[hsl(222,24%,4%)] flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="h-12 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-3 z-30 shrink-0">
        <Link href="/s1" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mr-1">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>

        <div className="w-px h-5 bg-border" />

        <Globe className="w-4 h-4 text-primary shrink-0" />
        <span className="text-sm font-semibold text-foreground">Global Threat Map</span>

        {/* Status filters */}
        <div className="flex gap-1 ml-3">
          {STATUS_OPTIONS.map(opt => {
            const active = filterStatus === opt.value;
            const colorMap: Record<string, string> = {
              '': active ? 'bg-primary/15 text-primary border-primary/40' : 'text-muted-foreground border-border hover:text-foreground',
              healthy: active ? 'bg-healthy/15 text-healthy border-healthy/40' : 'text-muted-foreground border-border hover:text-healthy',
              warning: active ? 'bg-warning/15 text-warning border-warning/40' : 'text-muted-foreground border-border hover:text-warning',
              threat: active ? 'bg-destructive/15 text-destructive border-destructive/40' : 'text-muted-foreground border-border hover:text-destructive',
              offline: active ? 'bg-muted text-foreground border-border' : 'text-muted-foreground border-border hover:text-foreground',
            };
            return (
              <button
                key={opt.value}
                onClick={() => setFilterStatus(opt.value)}
                className={`h-7 px-2.5 text-xs font-medium rounded-md border transition-all ${colorMap[opt.value]}`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {/* Stats HUD */}
        <div className="hidden md:flex items-center gap-4 ml-auto text-sm">
          <span className="text-foreground font-medium tabular-nums">{counts.total} <span className="text-muted-foreground font-normal">nodes</span></span>
          <span className="text-destructive font-semibold tabular-nums">{counts.threat} <span className="font-normal text-muted-foreground">threats</span></span>
          <span className="text-warning tabular-nums">{counts.warning} <span className="text-muted-foreground">warnings</span></span>
        </div>

        <button onClick={() => refetch()} className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors" title="Refresh">
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowPanels(p => !p)}
          className={`p-1.5 rounded-md transition-colors ${showPanels ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}
          title="Toggle panels"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative overflow-hidden">
        <WorldMap
          endpoints={endpoints as any}
          threats={activeThreats as any}
          filterStatus={filterStatus || undefined}
          filterCountry={filterCountry || undefined}
        />

        {/* Floating panels */}
        {showPanels && (
          <>
            {/* Top-left: active threats */}
            {activeThreats.length > 0 && (
              <div className="absolute top-4 left-4 z-20 glass border border-destructive/25 rounded-xl p-4 w-56">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-semibold text-foreground">Active Threats</span>
                  <span className="ml-auto text-xs font-medium text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">{activeThreats.length}</span>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar">
                  {activeThreats.slice(0, 6).map(t => (
                    <div key={t.id} className="text-sm">
                      <p className="font-medium text-destructive truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground flex justify-between">
                        <span className="truncate">{t.agentComputerName}</span>
                        <span className="uppercase ml-1 shrink-0">{t.severity}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom-left: alerts */}
            <div className="absolute bottom-4 left-4 z-20 glass border border-border rounded-xl w-72 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Activity className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">Recent Alerts</span>
              </div>
              <div className="max-h-40 overflow-y-auto custom-scrollbar divide-y divide-border/50">
                {alerts.map(a => (
                  <div key={a.id} className="flex items-start gap-2.5 p-3">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      a.severity === 'critical' ? 'bg-destructive' :
                      a.severity === 'high' ? 'bg-orange-400' :
                      a.severity === 'medium' ? 'bg-warning' : 'bg-muted-foreground'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate">{a.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top-right: countries (account for zoom control at 3.5rem from right) */}
            <div className="absolute top-4 right-[3.5rem] z-20 glass border border-border rounded-xl p-4 w-44">
              <div className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold text-foreground">Countries</span>
              </div>
              <div className="space-y-0.5 max-h-44 overflow-y-auto custom-scrollbar">
                {countries.slice(0, 10).map(c => {
                  const total = endpoints.filter(e => e.country === c).length;
                  const threats = endpoints.filter(e => e.country === c && e.status === 'threat').length;
                  return (
                    <button
                      key={c}
                      onClick={() => setFilterCountry(filterCountry === c ? '' : c)}
                      className={`w-full flex items-center justify-between py-1 px-2 rounded-lg text-sm transition-colors ${
                        filterCountry === c
                          ? 'bg-primary/12 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{c}</span>
                      <div className="flex items-center gap-1.5 shrink-0 ml-1">
                        {threats > 0 && <span className="text-destructive font-semibold text-xs">⚠{threats}</span>}
                        <span className="font-medium tabular-nums">{total}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom ticker */}
      {alerts.length > 0 && (
        <div className="h-8 bg-card/80 border-t border-border flex items-center px-4 gap-3 z-30 shrink-0 overflow-hidden">
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-semibold text-primary uppercase tracking-wide">Live</span>
          </div>
          <div className="flex-1 overflow-hidden">
            <div className="flex gap-12 whitespace-nowrap" style={{ animation: 'marquee 40s linear infinite' }}>
              {[...alerts, ...alerts].map((a, i) => (
                <span key={i} className="text-sm text-muted-foreground">
                  <span className={`font-semibold ${
                    a.severity === 'critical' ? 'text-destructive' :
                    a.severity === 'high' ? 'text-orange-400' : 'text-warning'
                  }`}>
                    {a.severity?.toUpperCase()}
                  </span>
                  {' · '}{a.name}
                  {a.endpointName && <span className="text-muted-foreground/60"> · {a.endpointName}</span>}
                  <span className="mx-8 text-border">|</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
