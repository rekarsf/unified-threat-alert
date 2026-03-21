import React, { useEffect, useState, useCallback } from 'react';
import { useS1GetAgents, useS1GetThreats, useS1GetAlerts } from '@workspace/api-client-react';
import { WorldMap } from '@/components/world-map';
import { CyberCard, CyberBadge } from '@/components/cyber-ui';
import { Shield, AlertTriangle, Server, Search, Filter, Activity, Maximize2, RotateCcw, Globe, Wifi, WifiOff, ChevronDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'wouter';

const STATUS_OPTIONS = ['All', 'healthy', 'warning', 'threat', 'offline'];

export default function S1Dashboard() {
  useEffect(() => { localStorage.setItem('soc_last_dashboard', '/s1'); }, []);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [search, setSearch] = useState('');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const { data: agentsData, isLoading: agentsLoading, refetch: refetchAgents } = useS1GetAgents({ limit: 1000 });
  const { data: threatsData } = useS1GetThreats({ limit: 50, resolved: false });
  const { data: alertsData } = useS1GetAlerts({ limit: 30 });

  const allEndpoints = agentsData?.data || [];
  const activeThreats = threatsData?.data || [];
  const alerts = alertsData?.data || [];

  // Filtered endpoints
  const endpoints = allEndpoints.filter(ep => {
    if (search && !ep.hostname.toLowerCase().includes(search.toLowerCase()) &&
        !ep.ip.includes(search) && !ep.country?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const countries = [...new Set(allEndpoints.map(e => e.country).filter(Boolean))].sort();

  const statusCounts = {
    healthy: allEndpoints.filter(e => e.status === 'healthy').length,
    warning: allEndpoints.filter(e => e.status === 'warning').length,
    threat: allEndpoints.filter(e => e.status === 'threat').length,
    offline: allEndpoints.filter(e => e.status === 'offline').length,
  };

  const stats = [
    { label: 'Total Nodes', value: allEndpoints.length, color: 'text-foreground', bg: 'bg-secondary' },
    { label: 'Threats', value: statusCounts.threat, color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
    { label: 'Warnings', value: statusCounts.warning, color: 'text-warning', bg: 'bg-warning/10 border-warning/30' },
    { label: 'Offline', value: statusCounts.offline, color: 'text-muted-foreground', bg: 'bg-secondary' },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Sub-header */}
      <div className="h-11 border-b border-border bg-card/60 flex items-center px-3 gap-3 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search hostname, IP, country..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-background border border-border rounded h-7 pl-8 pr-3 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s === 'All' ? '' : s)}
              className={`px-2.5 py-1 text-[10px] font-mono uppercase rounded transition-all ${
                (s === 'All' && !filterStatus) || filterStatus === s
                  ? s === 'threat' ? 'bg-destructive/20 text-destructive border border-destructive/50' :
                    s === 'warning' ? 'bg-warning/20 text-warning border border-warning/50' :
                    s === 'healthy' ? 'bg-healthy/20 text-healthy border border-healthy/50' :
                    s === 'offline' ? 'bg-muted text-muted-foreground border border-border' :
                    'bg-primary/20 text-primary border border-primary/50'
                  : 'text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Country filter */}
        <select
          value={filterCountry}
          onChange={e => setFilterCountry(e.target.value)}
          className="bg-background border border-border text-xs font-mono text-muted-foreground h-7 px-2 rounded focus:outline-none focus:border-primary/50"
        >
          <option value="">All Countries</option>
          {countries.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => refetchAgents()}
            className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-primary border border-border bg-background px-2.5 py-1 rounded transition-colors"
          >
            <RotateCcw className="w-3 h-3" /> Refresh
          </button>
          <Link href="/map" className="flex items-center gap-1.5 text-[10px] font-mono text-primary border border-primary/30 bg-primary/10 px-2.5 py-1 rounded hover:bg-primary/20 transition-colors">
            <Maximize2 className="w-3 h-3" /> Full Map
          </Link>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="w-60 border-r border-border bg-card/40 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-3 space-y-4">
            {/* Stats grid */}
            <div>
              <div className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase mb-2">Network Status</div>
              <div className="grid grid-cols-2 gap-1.5">
                {stats.map(s => (
                  <div key={s.label} className={`p-2.5 rounded border border-border text-center ${s.bg}`}>
                    <div className={`text-xl font-mono font-bold ${s.color} ${s.label === 'Threats' && s.value > 0 ? 'animate-pulse' : ''}`}>{s.value}</div>
                    <div className="text-[9px] text-muted-foreground uppercase mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Endpoint health bars */}
            <div>
              <div className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase mb-2">Endpoint Health</div>
              <div className="space-y-2">
                {[
                  { label: 'Healthy', count: statusCounts.healthy, color: 'bg-healthy', total: allEndpoints.length },
                  { label: 'Warning', count: statusCounts.warning, color: 'bg-warning', total: allEndpoints.length },
                  { label: 'Threat', count: statusCounts.threat, color: 'bg-destructive', total: allEndpoints.length },
                  { label: 'Offline', count: statusCounts.offline, color: 'bg-muted-foreground', total: allEndpoints.length },
                ].map(s => (
                  <div key={s.label}>
                    <div className="flex justify-between text-[10px] font-mono mb-0.5">
                      <span className="text-muted-foreground">{s.label}</span>
                      <span className="text-foreground">{s.count}</span>
                    </div>
                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${s.color} rounded-full transition-all duration-700`}
                        style={{ width: s.total > 0 ? `${(s.count / s.total) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Active threats */}
            {activeThreats.length > 0 && (
              <div>
                <div className="text-[9px] font-mono text-destructive tracking-widest uppercase mb-2 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Active Threats
                </div>
                <div className="space-y-2">
                  {activeThreats.slice(0, 6).map(threat => (
                    <div key={threat.id} className="p-2 bg-destructive/5 border border-destructive/20 rounded">
                      <div className="text-[10px] font-mono text-destructive font-bold truncate">{threat.name}</div>
                      <div className="flex justify-between mt-1 text-[9px] font-mono text-muted-foreground">
                        <span className="truncate">{threat.agentComputerName}</span>
                        <span className="shrink-0 ml-1 uppercase">{threat.severity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Country breakdown */}
            {countries.length > 0 && (
              <div>
                <div className="text-[9px] font-mono text-muted-foreground tracking-widest uppercase mb-2">By Country</div>
                <div className="space-y-1">
                  {countries.slice(0, 8).map(c => {
                    const count = allEndpoints.filter(e => e.country === c).length;
                    const threatCount = allEndpoints.filter(e => e.country === c && e.status === 'threat').length;
                    return (
                      <button
                        key={c}
                        onClick={() => setFilterCountry(filterCountry === c ? '' : c)}
                        className={`w-full flex items-center justify-between text-[10px] font-mono px-2 py-1 rounded transition-colors ${filterCountry === c ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
                      >
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3" /> {c}
                        </span>
                        <div className="flex items-center gap-1">
                          {threatCount > 0 && <span className="text-destructive font-bold">⚠{threatCount}</span>}
                          <span>{count}</span>
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
          <div className="flex-1 relative">
            <WorldMap
              endpoints={endpoints as any}
              threats={activeThreats as any}
              filterStatus={filterStatus || undefined}
              filterCountry={filterCountry || undefined}
            />
          </div>

          {/* Live ticker at the bottom of the map */}
          <LiveTicker alerts={alerts} />
        </div>

        {/* Right: Live Alert Feed */}
        <div className="w-64 border-l border-border bg-card/40 flex flex-col shrink-0">
          <div className="h-9 border-b border-border flex items-center px-3 bg-secondary/50 shrink-0">
            <h2 className="text-[10px] font-mono font-bold tracking-widest text-primary flex items-center gap-1.5 uppercase">
              <Activity className="w-3.5 h-3.5" /> Live Alert Feed
            </h2>
            <span className="ml-auto text-[9px] text-muted-foreground font-mono">{alerts.filter(a => a.status === 'active').length} active</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1.5">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-2.5 bg-secondary/50 rounded border transition-colors cursor-pointer group ${
                  alert.status === 'active' && (alert.severity === 'critical' || alert.severity === 'high')
                    ? 'border-destructive/40 hover:border-destructive/70'
                    : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <CyberBadge variant={
                    alert.severity === 'critical' ? 'threat' :
                    alert.severity === 'high' ? 'warning' : 'outline'
                  }>
                    {alert.severity}
                  </CyberBadge>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-xs font-mono text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                  {alert.name}
                </div>
                <div className="text-[9px] font-mono text-muted-foreground mt-1 flex items-center gap-1 truncate">
                  <Server className="w-2.5 h-2.5 shrink-0" />
                  {alert.endpointName || 'Unknown Host'}
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="text-xs font-mono text-muted-foreground text-center py-8">
                Monitoring system idle...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LiveTicker({ alerts }: { alerts: any[] }) {
  const [idx, setIdx] = useState(0);
  const activeAlerts = alerts.filter(a => a.status === 'active');

  useEffect(() => {
    if (activeAlerts.length <= 1) return;
    const t = setInterval(() => setIdx(i => (i + 1) % activeAlerts.length), 4000);
    return () => clearInterval(t);
  }, [activeAlerts.length]);

  if (activeAlerts.length === 0) return null;

  const current = activeAlerts[idx];
  return (
    <div className="h-8 bg-destructive/10 border-t border-destructive/30 flex items-center px-4 gap-3 shrink-0 overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        <span className="text-[10px] font-mono text-destructive font-bold uppercase tracking-widest">ALERT</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <div
          key={idx}
          className="text-[11px] font-mono text-foreground truncate animate-[fadeIn_0.4s_ease]"
          style={{ animation: 'fadeIn 0.4s ease' }}
        >
          [{current.severity?.toUpperCase()}] {current.name}
          {current.endpointName && <span className="text-muted-foreground ml-2">· {current.endpointName}</span>}
          <span className="text-muted-foreground/60 ml-2">· {formatDistanceToNow(new Date(current.timestamp), { addSuffix: true })}</span>
        </div>
      </div>
      <div className="text-[9px] font-mono text-muted-foreground shrink-0">
        {idx + 1}/{activeAlerts.length}
      </div>
    </div>
  );
}
