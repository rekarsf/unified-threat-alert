import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Activity, ShieldAlert, Cpu, HardDrive, MapPin, Network, Info } from 'lucide-react';
import { Endpoint } from '@workspace/api-client-react';
import { useAppStore } from '@/lib/store';
import { CyberBadge, CyberButton } from './cyber-ui';

export function EndpointDetailPanel({ endpoint }: { endpoint: Endpoint | null }) {
  const setSelectedEndpoint = useAppStore(s => s.setSelectedEndpoint);

  return (
    <AnimatePresence>
      {endpoint && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEndpoint(null)}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[400px] max-w-[90vw] bg-secondary border-l border-primary/30 shadow-[-10px_0_30px_rgba(0,0,0,0.5)] z-50 flex flex-col cyber-glow"
          >
            {/* Header */}
            <div className="p-4 border-b border-border flex items-start justify-between bg-card">
              <div>
                <h2 className="text-lg font-display font-bold text-foreground flex items-center gap-2">
                  <Server className="w-5 h-5 text-primary" />
                  {endpoint.hostname}
                </h2>
                <div className="text-sm font-mono text-muted-foreground mt-1">{endpoint.ip}</div>
              </div>
              <button 
                onClick={() => setSelectedEndpoint(null)}
                className="p-1.5 text-muted-foreground hover:text-foreground bg-background rounded-md border border-border transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
              
              {/* Status Banner */}
              <div className={`p-4 rounded-lg border flex items-center justify-between ${
                endpoint.status === 'threat' ? 'bg-destructive/10 border-destructive/50 cyber-glow-destructive' :
                endpoint.status === 'warning' ? 'bg-warning/10 border-warning/50' :
                endpoint.status === 'healthy' ? 'bg-healthy/10 border-healthy/50' :
                'bg-muted border-border'
              }`}>
                <div className="flex items-center gap-3">
                  {endpoint.status === 'threat' ? <ShieldAlert className="w-6 h-6 text-destructive" /> : <Activity className="w-6 h-6 text-healthy" />}
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Current Status</div>
                    <div className="font-display font-bold text-lg capitalize">
                      {endpoint.status}
                    </div>
                  </div>
                </div>
                <CyberBadge variant={endpoint.status}>{endpoint.status}</CyberBadge>
              </div>

              {/* Threat Details (if any) */}
              {endpoint.threatName && (
                <div className="space-y-2">
                  <h3 className="font-display text-sm tracking-widest text-destructive flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" /> ACTIVE THREAT DETECTED
                  </h3>
                  <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-md">
                    <div className="font-mono text-sm text-foreground">{endpoint.threatName}</div>
                    <div className="text-xs text-muted-foreground mt-1">Severity: {endpoint.threatSeverity || 'Unknown'}</div>
                  </div>
                </div>
              )}

              {/* Specs Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Info className="w-3 h-3"/> OS</div>
                  <div className="font-mono text-sm truncate" title={endpoint.os}>{endpoint.os} {endpoint.osVersion}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Network className="w-3 h-3"/> Source</div>
                  <div className="font-mono text-sm uppercase">{endpoint.source}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Location</div>
                  <div className="font-mono text-sm truncate">{endpoint.city || 'Unknown'}, {endpoint.countryCode || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5"><Activity className="w-3 h-3"/> Last Seen</div>
                  <div className="font-mono text-sm truncate">{new Date(endpoint.lastSeen).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Telemetry */}
              <div className="space-y-4 pt-4 border-t border-border">
                <h3 className="font-display text-sm tracking-widest text-primary">LIVE TELEMETRY</h3>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="flex items-center gap-1"><Cpu className="w-3 h-3"/> CPU Usage</span>
                    <span className="text-primary">{endpoint.cpuUsage || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${endpoint.cpuUsage || 0}%` }} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="flex items-center gap-1"><HardDrive className="w-3 h-3"/> RAM Usage</span>
                    <span className="text-primary">{endpoint.memUsage || 0}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${endpoint.memUsage || 0}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-border bg-card grid grid-cols-2 gap-3">
              <CyberButton variant="secondary" className="w-full">Investigate</CyberButton>
              <CyberButton variant="destructive" className="w-full" disabled={endpoint.status === 'offline'}>Isolate Host</CyberButton>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
