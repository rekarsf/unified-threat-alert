import React, { useEffect } from 'react';
import { useLrGetAlarms, useLrGetLogSources } from '@workspace/api-client-react';
import { CyberCard, CyberBadge } from '@/components/cyber-ui';
import { Database, AlertTriangle, Server, Search, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function LrDashboard() {
  useEffect(() => {
    localStorage.setItem('soc_last_dashboard', '/lr');
  }, []);

  const { data: alarmsData, isLoading: alarmsLoading } = useLrGetAlarms({ limit: 50 });
  const { data: sourcesData } = useLrGetLogSources();

  const alarms = alarmsData?.data || [];
  const sources = sourcesData?.data || [];

  const criticalAlarms = alarms.filter(a => a.severity >= 80);

  return (
    <div className="h-full w-full flex flex-col bg-background p-6 overflow-y-auto custom-scrollbar max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground text-shadow-cyber flex items-center gap-3">
            <Database className="w-6 h-6 text-primary" />
            SIEM OPERATIONS
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">SIEM Correlation & Analysis</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <CyberCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-2">Total Alarms (24h)</div>
              <div className="text-4xl font-mono text-foreground">{alarms.length}</div>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
        </CyberCard>
        
        <CyberCard className="p-6" variant={criticalAlarms.length > 0 ? 'destructive' : 'default'}>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-2">Critical Alarms</div>
              <div className={`text-4xl font-mono ${criticalAlarms.length > 0 ? 'text-destructive' : 'text-foreground'}`}>
                {criticalAlarms.length}
              </div>
            </div>
            <div className={`p-3 rounded-lg ${criticalAlarms.length > 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </CyberCard>

        <CyberCard className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-2">Active Log Sources</div>
              <div className="text-4xl font-mono text-foreground">{sources.filter(s => s.status === 'Active').length}</div>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg text-primary">
              <Server className="w-6 h-6" />
            </div>
          </div>
        </CyberCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
        {/* Recent Alarms */}
        <CyberCard className="flex flex-col">
          <div className="p-4 border-b border-border bg-secondary/50 flex justify-between items-center">
            <h2 className="font-display tracking-widest text-sm text-foreground uppercase">Recent Alarms</h2>
            <button className="text-xs font-mono text-primary hover:underline">View All</button>
          </div>
          <div className="flex-1 overflow-auto p-2 custom-scrollbar">
            {alarmsLoading ? (
               <div className="text-center py-8 text-muted-foreground font-mono animate-pulse">Querying indexes...</div>
            ) : alarms.length === 0 ? (
               <div className="text-center py-8 text-muted-foreground font-mono">No recent alarms.</div>
            ) : (
              <div className="space-y-2">
                {alarms.map(alarm => (
                  <div key={alarm.alarmId} className="p-3 rounded border border-border bg-background hover:border-primary/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <CyberBadge variant={alarm.severity >= 80 ? 'threat' : alarm.severity >= 50 ? 'warning' : 'outline'}>
                          Score: {alarm.severity}
                        </CyberBadge>
                        <span className="text-xs font-mono text-muted-foreground">ID: {alarm.alarmId}</span>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {formatDistanceToNow(new Date(alarm.alarmDate), { addSuffix: true })}
                      </span>
                    </div>
                    <div className="font-mono text-sm text-foreground">{alarm.alarmName}</div>
                    {alarm.entityName && (
                      <div className="mt-2 text-xs font-mono text-muted-foreground">Entity: {alarm.entityName}</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CyberCard>

        {/* Log Sources Status */}
        <CyberCard className="flex flex-col">
           <div className="p-4 border-b border-border bg-secondary/50 flex justify-between items-center">
            <h2 className="font-display tracking-widest text-sm text-foreground uppercase">Log Source Health</h2>
          </div>
          <div className="flex-1 overflow-auto p-4 custom-scrollbar">
             <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border/50 text-xs font-mono text-muted-foreground uppercase">
                    <th className="pb-2 font-normal">Source Name</th>
                    <th className="pb-2 font-normal">Status</th>
                    <th className="pb-2 font-normal text-right">Records</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-mono text-foreground">
                  {sources.slice(0, 15).map(source => (
                    <tr key={source.id} className="border-b border-border/20 last:border-0">
                      <td className="py-3 truncate max-w-[200px]">{source.name}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 ${source.status === 'Active' ? 'text-healthy' : 'text-muted-foreground'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${source.status === 'Active' ? 'bg-healthy shadow-[0_0_5px_#2dd4a0]' : 'bg-muted-foreground'}`} />
                          {source.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-muted-foreground">{source.recordCount?.toLocaleString() || 0}</td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </CyberCard>
      </div>
    </div>
  );
}
