import React, { useState } from 'react';
import { useS1GetAgents, useS1GetThreats, useS1GetAlerts } from '@workspace/api-client-react';
import { WorldMap } from '@/components/world-map';
import { Shield, AlertTriangle, Activity, Server, Globe, RotateCcw, Minimize2, Filter } from 'lucide-react';
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
  const [showOverlay, setShowOverlay] = useState(true);

  const { data: agentsData, refetch } = useS1GetAgents({ limit: 1000 });
  const { data: threatsData } = useS1GetThreats({ limit: 50, resolved: false });
  const { data: alertsData } = useS1GetAlerts({ limit: 10 });

  const endpoints = agentsData?.data || [];
  const activeThreats = threatsData?.data || [];
  const alerts = alertsData?.data || [];

  const countries = [...new Set(endpoints.map(e => e.country).filter(Boolean))].sort();

  const statusCounts = {
    total: endpoints.length,
    healthy: endpoints.filter(e => e.status === 'healthy').length,
    warning: endpoints.filter(e => e.status === 'warning').length,
    threat: endpoints.filter(e => e.status === 'threat').length,
    offline: endpoints.filter(e => e.status === 'offline').length,
  };

  return (
    <div className="h-full w-full relative bg-[hsl(210,22%,4%)] flex flex-col overflow-hidden">
      {/* Top HUD bar */}
      <div className="h-10 bg-card/80 backdrop-blur-sm border-b border-border flex items-center px-4 gap-4 z-30 shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="font-mono text-xs text-primary font-bold tracking-widest uppercase">Global Threat Map</span>
        </div>

        {/* Status filters */}
        <div className="flex gap-1 ml-4">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilterStatus(opt.value)}
              className={`px-2.5 py-0.5 text-[10px] font-mono uppercase rounded border transition-all ${
                filterStatus === opt.value
                  ? opt.value === 'threat' ? 'bg-destructive/20 text-destructive border-destructive/50' :
                    opt.value === 'warning' ? 'bg-warning/20 text-warning border-warning/50' :
                    opt.value === 'healthy' ? 'bg-healthy/20 text-healthy border-healthy/50' :
                    opt.value === 'offline' ? 'bg-muted text-muted-foreground border-border' :
                    'bg-primary/20 text-primary border-primary/50'
                  : 'text-muted-foreground border-border/50 hover:border-primary/30'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <select
          value={filterCountry}
          onChange={e => setFilterCountry(e.target.value)}
          className="bg-background/80 border border-border text-[10px] font-mono text-muted-foreground h-6 px-2 rounded focus:outline-none"
        >
          <option value="">All Countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-3">
          {/* Live stats HUD */}
          <div className="flex items-center gap-4 font-mono text-[10px]">
            <span className="text-foreground">{statusCounts.total} <span className="text-muted-foreground">nodes</span></span>
            <span className="text-destructive font-bold">{statusCounts.threat} <span className="text-muted-foreground font-normal">threats</span></span>
            <span className="text-warning">{statusCounts.warning} <span className="text-muted-foreground">warnings</span></span>
            <span className="text-muted-foreground">{statusCounts.offline} offline</span>
          </div>

          <button onClick={() => refetch()} className="text-[10px] font-mono text-muted-foreground hover:text-primary border border-border px-2 py-0.5 rounded transition-colors flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={() => setShowOverlay(o => !o)} className="text-[10px] font-mono text-muted-foreground hover:text-primary border border-border px-2 py-0.5 rounded transition-colors">
            {showOverlay ? 'Hide' : 'Show'} Panels
          </button>
          <Link href="/s1" className="text-[10px] font-mono text-primary border border-primary/30 bg-primary/10 px-2 py-0.5 rounded hover:bg-primary/20 transition-colors flex items-center gap-1">
            <Minimize2 className="w-3 h-3" /> Dashboard
          </Link>
        </div>
      </div>

      {/* Map takes remaining space */}
      <div className="flex-1 relative overflow-hidden">
        <WorldMap
          endpoints={endpoints as any}
          threats={activeThreats as any}
          filterStatus={filterStatus || undefined}
          filterCountry={filterCountry || undefined}
        />

        {/* Floating overlay panels */}
        {showOverlay && (
          <>
            {/* Top-left: active threats */}
            {activeThreats.length > 0 && (
              <div className="absolute top-4 left-4 z-20 bg-card/90 backdrop-blur-md border border-destructive/40 rounded-lg p-3 w-56">
                <div className="text-[10px] font-mono text-destructive uppercase tracking-widest mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Active Threats ({activeThreats.length})
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                  {activeThreats.slice(0, 8).map(t => (
                    <div key={t.id} className="text-[10px] font-mono">
                      <div className="text-destructive font-bold truncate">{t.name}</div>
                      <div className="text-muted-foreground flex justify-between">
                        <span className="truncate">{t.agentComputerName}</span>
                        <span className="uppercase ml-1">{t.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom-left: recent alerts ticker */}
            <div className="absolute bottom-4 left-4 z-20 bg-card/90 backdrop-blur-md border border-border rounded-lg w-72">
              <div className="text-[10px] font-mono text-primary uppercase tracking-widest p-2.5 border-b border-border flex items-center gap-1">
                <Activity className="w-3 h-3" /> Recent Alerts
              </div>
              <div className="divide-y divide-border max-h-40 overflow-y-auto custom-scrollbar">
                {alerts.map(a => (
                  <div key={a.id} className="p-2 flex items-start gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                      a.severity === 'critical' ? 'bg-destructive' :
                      a.severity === 'high' ? 'bg-orange-400' :
                      a.severity === 'medium' ? 'bg-warning' : 'bg-muted-foreground'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono text-foreground truncate">{a.name}</div>
                      <div className="text-[9px] font-mono text-muted-foreground">{formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top-right: country breakdown */}
            <div className="absolute top-4 right-[3.5rem] z-20 bg-card/90 backdrop-blur-md border border-border rounded-lg p-3 w-44">
              <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Countries
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                {countries.slice(0, 10).map(c => {
                  const cnt = endpoints.filter(e => e.country === c).length;
                  const thr = endpoints.filter(e => e.country === c && e.status === 'threat').length;
                  return (
                    <button
                      key={c}
                      onClick={() => setFilterCountry(filterCountry === c ? '' : c)}
                      className={`w-full flex items-center justify-between text-[10px] font-mono px-1.5 py-0.5 rounded transition-colors ${filterCountry === c ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      <span className="truncate">{c}</span>
                      <div className="flex items-center gap-1 ml-1 shrink-0">
                        {thr > 0 && <span className="text-destructive font-bold text-[9px]">⚠{thr}</span>}
                        <span>{cnt}</span>
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
      <div className="h-7 bg-card/80 border-t border-border flex items-center px-4 gap-4 z-30 shrink-0 overflow-hidden">
        <span className="text-[9px] font-mono text-primary font-bold uppercase tracking-widest shrink-0 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> LIVE
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-12 animate-[marquee_30s_linear_infinite]" style={{ whiteSpace: 'nowrap' }}>
            {[...alerts, ...alerts].map((a, i) => (
              <span key={i} className="text-[10px] font-mono text-muted-foreground">
                <span className={`${a.severity === 'critical' ? 'text-destructive' : a.severity === 'high' ? 'text-orange-400' : 'text-warning'} font-bold`}>
                  [{a.severity?.toUpperCase()}]
                </span>{' '}
                {a.name} · {a.endpointName} · {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                <span className="mx-6 text-border">|</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
