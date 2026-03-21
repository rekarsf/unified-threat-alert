import React, { useEffect } from 'react';
import { useS1GetAgents, useS1GetThreats, useS1GetAlerts } from '@workspace/api-client-react';
import { WorldMap } from '@/components/world-map';
import { CyberCard, CyberBadge } from '@/components/cyber-ui';
import { Shield, AlertTriangle, Crosshair, Server, Search, Filter, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function S1Dashboard() {
  useEffect(() => {
    localStorage.setItem('soc_last_dashboard', '/s1');
  }, []);

  const { data: agentsData, isLoading: agentsLoading } = useS1GetAgents({ limit: 1000 });
  const { data: threatsData } = useS1GetThreats({ limit: 50, resolved: false });
  const { data: alertsData } = useS1GetAlerts({ limit: 20 });

  const endpoints = agentsData?.data || [];
  const activeThreats = threatsData?.data || [];
  const alerts = alertsData?.data || [];

  // Stats calc
  const statusCounts = {
    healthy: endpoints.filter(e => e.status === 'healthy').length,
    warning: endpoints.filter(e => e.status === 'warning').length,
    threat: endpoints.filter(e => e.status === 'threat').length,
    offline: endpoints.filter(e => e.status === 'offline').length,
  };

  return (
    <div className="h-full w-full flex flex-col bg-background">
      {/* Sub-header Filter Bar */}
      <div className="h-12 border-b border-border bg-secondary/50 flex items-center px-4 gap-4 shrink-0">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search endpoints, IPs, hashes..." 
            className="w-full bg-background border border-border rounded-md h-8 pl-9 pr-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
          />
        </div>
        <div className="flex gap-2 ml-auto">
          <button className="flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-primary border border-border bg-background px-3 py-1 rounded-md transition-colors">
            <Filter className="w-3 h-3" /> Status: All
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Stats Sidebar */}
        <div className="w-64 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-6">
            <div>
              <h2 className="text-xs font-display text-muted-foreground tracking-widest uppercase mb-3">Network Status</h2>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-secondary p-3 rounded border border-border text-center">
                  <div className="text-2xl font-mono text-foreground">{endpoints.length}</div>
                  <div className="text-[10px] text-muted-foreground uppercase">Total Nodes</div>
                </div>
                <div className="bg-destructive/10 p-3 rounded border border-destructive/30 text-center cyber-glow-destructive">
                  <div className="text-2xl font-mono text-destructive animate-pulse">{statusCounts.threat}</div>
                  <div className="text-[10px] text-destructive uppercase">Threats</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xs font-display text-muted-foreground tracking-widest uppercase mb-2">Endpoint Health</h2>
              {[
                { label: 'Healthy', count: statusCounts.healthy, color: 'bg-healthy' },
                { label: 'Warning', count: statusCounts.warning, color: 'bg-warning' },
                { label: 'Threat', count: statusCounts.threat, color: 'bg-destructive' },
                { label: 'Offline', count: statusCounts.offline, color: 'bg-muted-foreground' },
              ].map(stat => (
                <div key={stat.label} className="flex items-center justify-between text-sm font-mono">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${stat.color}`} />
                    <span className="text-foreground">{stat.label}</span>
                  </div>
                  <span className="text-muted-foreground">{stat.count}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <h2 className="text-xs font-display text-muted-foreground tracking-widest uppercase mb-2">Active Threat Vectors</h2>
              {activeThreats.slice(0, 5).map(threat => (
                <CyberCard key={threat.id} variant="destructive" className="p-3">
                  <div className="text-xs font-mono text-destructive font-bold truncate">{threat.name}</div>
                  <div className="flex justify-between mt-2 text-[10px] uppercase text-muted-foreground font-mono">
                    <span>{threat.agentComputerName}</span>
                    <span>{threat.severity}</span>
                  </div>
                </CyberCard>
              ))}
              {activeThreats.length === 0 && !agentsLoading && (
                <div className="text-sm font-mono text-muted-foreground text-center py-4 border border-dashed border-border rounded">
                  No active threats
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center Map */}
        <div className="flex-1 relative">
          <WorldMap endpoints={endpoints} threats={activeThreats} />
        </div>

        {/* Right Alert Feed */}
        <div className="w-72 border-l border-border bg-card/50 flex flex-col shrink-0">
          <div className="h-10 border-b border-border flex items-center px-4 bg-secondary">
            <h2 className="text-xs font-display font-bold tracking-widest text-primary flex items-center gap-2">
              <Activity className="w-4 h-4" /> LIVE ALERT FEED
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-2">
            {alerts.map(alert => (
              <div key={alert.id} className="p-3 bg-secondary rounded border border-border hover:border-primary/50 transition-colors cursor-pointer group">
                <div className="flex justify-between items-start mb-1">
                  <CyberBadge variant={alert.severity === 'critical' ? 'threat' : alert.severity === 'high' ? 'warning' : 'outline'}>
                    {alert.severity}
                  </CyberBadge>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-sm font-mono text-foreground font-medium line-clamp-2 mt-1 group-hover:text-primary transition-colors">
                  {alert.name}
                </div>
                <div className="text-xs font-mono text-muted-foreground mt-2 flex items-center gap-1">
                  <Server className="w-3 h-3" /> {alert.endpointName || 'Unknown Host'}
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
               <div className="text-sm font-mono text-muted-foreground text-center py-8">
                Monitoring system idle...
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
