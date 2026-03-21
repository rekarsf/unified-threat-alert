import React, { useState } from 'react';
import { useS1GetAlerts } from '@workspace/api-client-react';
import { Alert } from '@workspace/api-client-react';
import { AlertTriangle, Shield, Clock, Search, Filter, CheckCircle, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function severityColor(s: string) {
  switch (s) {
    case 'critical': return 'text-destructive bg-destructive/10 border-destructive/40';
    case 'high': return 'text-orange-400 bg-orange-400/10 border-orange-400/40';
    case 'medium': return 'text-warning bg-warning/10 border-warning/40';
    default: return 'text-muted-foreground bg-muted border-border';
  }
}

function statusColor(s: string) {
  switch (s) {
    case 'active': return 'text-destructive';
    case 'acknowledged': return 'text-warning';
    case 'resolved': return 'text-healthy';
    default: return 'text-muted-foreground';
  }
}

function AlertRow({ alert }: { alert: Alert }) {
  return (
    <div className={`flex items-center gap-4 p-4 border-b border-border hover:bg-secondary/50 transition-colors ${
      alert.status === 'active' ? 'border-l-2 border-l-destructive' : ''
    }`}>
      <div className="shrink-0">
        <AlertTriangle className={`w-5 h-5 ${alert.severity === 'critical' || alert.severity === 'high' ? 'text-destructive' : 'text-warning'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm text-foreground font-bold truncate">{alert.name}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase ${severityColor(alert.severity)}`}>
            {alert.severity}
          </span>
        </div>
        {alert.description && (
          <div className="text-xs text-muted-foreground mt-0.5 truncate">{alert.description}</div>
        )}
        <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
          {alert.endpointName && <span className="flex items-center gap-1"><Shield className="w-3 h-3" />{alert.endpointName}</span>}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true })}</span>
          {alert.category && <span className="bg-secondary px-2 py-0.5 rounded">{alert.category}</span>}
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-3">
        <span className={`text-xs font-mono uppercase flex items-center gap-1 ${statusColor(alert.status)}`}>
          {alert.status === 'resolved' ? <CheckCircle className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {alert.status}
        </span>
        <span className="text-[10px] font-mono text-muted-foreground uppercase px-2 py-0.5 bg-secondary rounded border border-border">
          {alert.source}
        </span>
      </div>
    </div>
  );
}

function AlertsPage({ filter }: { filter?: 'active' | 'critical' | 'all' }) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useS1GetAlerts({ limit: 100 });
  const alerts = data?.data || [];

  const filtered = alerts.filter(a => {
    if (filter === 'active' && a.status !== 'active') return false;
    if (filter === 'critical' && a.severity !== 'critical') return false;
    if (search && !a.name.toLowerCase().includes(search.toLowerCase()) && 
        !a.endpointName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const title = filter === 'active' ? 'Active Alerts' : filter === 'critical' ? 'Critical Alerts' : 'Alert History';

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card/50 p-4 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase">{title}</h1>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">{filtered.length} alerts</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search alerts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-background border border-border rounded-md h-9 pl-9 pr-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 w-56"
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="border-b border-border bg-card/30 px-4 py-2 flex gap-6">
        {['active', 'acknowledged', 'resolved'].map(s => (
          <div key={s} className="flex items-center gap-2 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${s === 'active' ? 'bg-destructive animate-pulse' : s === 'acknowledged' ? 'bg-warning' : 'bg-healthy'}`} />
            <span className="text-muted-foreground capitalize">{s}:</span>
            <span className="text-foreground font-bold">{alerts.filter(a => a.status === s).length}</span>
          </div>
        ))}
        {['critical', 'high', 'medium', 'low'].map(sv => (
          <div key={sv} className="flex items-center gap-2 text-xs font-mono ml-auto">
            <span className={`font-bold ${sv === 'critical' ? 'text-destructive' : sv === 'high' ? 'text-orange-400' : sv === 'medium' ? 'text-warning' : 'text-muted-foreground'}`}>
              {sv.toUpperCase()}
            </span>
            <span className="text-muted-foreground">{alerts.filter(a => a.severity === sv).length}</span>
          </div>
        ))}
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground font-mono text-sm">
            Loading alerts...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground font-mono text-sm">
            No alerts found
          </div>
        ) : (
          filtered.map(alert => <AlertRow key={alert.id} alert={alert} />)
        )}
      </div>
    </div>
  );
}

export function ActiveAlertsPage() {
  return <AlertsPage filter="active" />;
}

export function CriticalAlertsPage() {
  return <AlertsPage filter="critical" />;
}

export function AlertHistoryPage() {
  return <AlertsPage filter="all" />;
}
