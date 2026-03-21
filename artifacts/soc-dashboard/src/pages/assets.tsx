import React, { useState } from 'react';
import { useS1GetAgents } from '@workspace/api-client-react';
import { Endpoint } from '@workspace/api-client-react';
import { Server, Monitor, Laptop, Search, AlertTriangle, Clock, MapPin, Cpu } from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { EndpointDetailPanel } from '@/components/panels';

function statusBg(s: string) {
  switch (s) {
    case 'threat': return 'bg-destructive/10 border-l-2 border-l-destructive';
    case 'warning': return 'bg-warning/5';
    case 'offline': return 'opacity-60';
    default: return '';
  }
}

function statusDot(s: string) {
  switch (s) {
    case 'healthy': return 'bg-healthy';
    case 'warning': return 'bg-warning animate-pulse';
    case 'threat': return 'bg-destructive animate-pulse';
    default: return 'bg-muted-foreground';
  }
}

interface EndpointTableProps {
  title: string;
  filterFn?: (e: Endpoint) => boolean;
}

export function EndpointTable({ title, filterFn }: EndpointTableProps) {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useS1GetAgents({ limit: 200 });
  const { selectedEndpoint, setSelectedEndpoint } = useAppStore();
  const allEndpoints = data?.data || [];

  const filtered = allEndpoints.filter(e => {
    if (filterFn && !filterFn(e)) return false;
    if (search) {
      const q = search.toLowerCase();
      return e.hostname.toLowerCase().includes(q) ||
        e.ip.includes(q) ||
        e.os.toLowerCase().includes(q) ||
        e.country?.toLowerCase().includes(q) ||
        e.status.includes(q);
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase">{title}</h1>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">{filtered.length} devices</div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by hostname, IP, OS..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-background border border-border rounded-md h-9 pl-9 pr-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 w-72"
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="border-b border-border bg-card/30 px-4 py-2 flex gap-6">
        {[
          { label: 'Healthy', count: filtered.filter(e => e.status === 'healthy').length, color: 'bg-healthy' },
          { label: 'Warning', count: filtered.filter(e => e.status === 'warning').length, color: 'bg-warning' },
          { label: 'Threat', count: filtered.filter(e => e.status === 'threat').length, color: 'bg-destructive' },
          { label: 'Offline', count: filtered.filter(e => e.status === 'offline').length, color: 'bg-muted-foreground' },
        ].map(s => (
          <div key={s.label} className="flex items-center gap-2 text-xs font-mono">
            <span className={`w-2 h-2 rounded-full ${s.color}`} />
            <span className="text-muted-foreground">{s.label}:</span>
            <span className="text-foreground font-bold">{s.count}</span>
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>
              {['Status', 'Hostname', 'IP Address', 'OS', 'Location', 'Agent', 'Last Seen'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">Loading endpoints...</td></tr>
            ) : filtered.map((ep, i) => (
              <tr
                key={ep.id}
                onClick={() => setSelectedEndpoint(ep)}
                className={`border-b border-border hover:bg-primary/5 cursor-pointer transition-colors ${statusBg(ep.status)} ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}
              >
                <td className="px-4 py-3">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${statusDot(ep.status)}`} />
                </td>
                <td className="px-4 py-3">
                  <div className="font-mono text-sm text-foreground font-bold">{ep.hostname}</div>
                  {ep.domain && <div className="text-[10px] text-muted-foreground">{ep.domain}</div>}
                  {ep.threatName && (
                    <div className="text-[10px] text-destructive flex items-center gap-1 mt-0.5">
                      <AlertTriangle className="w-3 h-3" />{ep.threatName}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ep.ip}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    {ep.os.toLowerCase().includes('windows') ? <Monitor className="w-3 h-3 text-blue-400" /> :
                     ep.os.toLowerCase().includes('mac') ? <Laptop className="w-3 h-3 text-gray-400" /> :
                     <Server className="w-3 h-3 text-green-400" />}
                    <span className="text-xs font-mono text-foreground">{ep.os}</span>
                  </div>
                  {ep.osVersion && <div className="text-[10px] text-muted-foreground">{ep.osVersion}</div>}
                </td>
                <td className="px-4 py-3">
                  {ep.city || ep.country ? (
                    <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      {[ep.city, ep.country].filter(Boolean).join(', ')}
                    </div>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ep.agentVersion || '—'}</td>
                <td className="px-4 py-3 text-xs font-mono text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(ep.lastSeen), { addSuffix: true })}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="flex items-center justify-center h-48 text-muted-foreground font-mono text-sm">No endpoints found</div>
        )}
      </div>

      <EndpointDetailPanel endpoint={selectedEndpoint} />
    </div>
  );
}

export function EndpointsPage() {
  return <EndpointTable title="All Endpoints" />;
}

export function ServersPage() {
  return <EndpointTable title="Servers" filterFn={e => 
    e.os.toLowerCase().includes('server') || 
    e.os.toLowerCase().includes('ubuntu') || 
    e.os.toLowerCase().includes('rhel') ||
    e.os.toLowerCase().includes('linux')
  } />;
}

export function WorkstationsPage() {
  return <EndpointTable title="Workstations" filterFn={e => 
    e.os.toLowerCase().includes('windows') && !e.os.toLowerCase().includes('server') ||
    e.os.toLowerCase().includes('mac')
  } />;
}

export function VulnAppsPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4">
        <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase">Vulnerable Applications</h1>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">Risk-scored application inventory</div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>
              {['Application', 'Version', 'CVE Count', 'Risk Score', 'Affected Endpoints'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { name: 'Adobe Acrobat Reader', version: '11.0.0', cveCount: 12, riskScore: 9.1, affected: 8 },
              { name: 'Oracle Java SE', version: '1.8.0_202', cveCount: 8, riskScore: 8.5, affected: 15 },
              { name: 'OpenSSL', version: '1.0.2k', cveCount: 7, riskScore: 9.8, affected: 6 },
              { name: 'WinRAR', version: '5.61', cveCount: 5, riskScore: 7.8, affected: 4 },
              { name: 'Mozilla Firefox', version: '88.0', cveCount: 3, riskScore: 6.2, affected: 22 },
            ].map((app, i) => (
              <tr key={i} className={`border-b border-border hover:bg-secondary/50 ${i % 2 === 0 ? '' : 'bg-secondary/20'}`}>
                <td className="px-4 py-3 font-mono text-sm text-foreground font-bold">{app.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{app.version}</td>
                <td className="px-4 py-3 font-mono text-xs text-destructive font-bold">{app.cveCount}</td>
                <td className="px-4 py-3">
                  <span className={`font-mono text-sm font-bold ${app.riskScore >= 9 ? 'text-destructive' : app.riskScore >= 7 ? 'text-warning' : 'text-healthy'}`}>
                    {app.riskScore.toFixed(1)}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{app.affected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function RoguesPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4">
        <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase">Rogue Devices</h1>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">Unauthorized devices detected on network</div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>
              {['IP Address', 'MAC Address', 'Network', 'Risk Level', 'First Seen', 'Last Seen'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { ip: '10.0.99.45', mac: '00:11:22:33:44:55', network: 'Office WiFi', risk: 'high', first: '2h ago', last: '10m ago' },
              { ip: '192.168.100.77', mac: 'AA:BB:CC:DD:EE:FF', network: 'Guest Network', risk: 'medium', first: '1d ago', last: '2h ago' },
            ].map((rogue, i) => (
              <tr key={i} className="border-b border-border hover:bg-secondary/50">
                <td className="px-4 py-3 font-mono text-sm text-foreground">{rogue.ip}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{rogue.mac}</td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{rogue.network}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase ${rogue.risk === 'high' ? 'text-destructive bg-destructive/10 border-destructive/40' : 'text-warning bg-warning/10 border-warning/40'}`}>
                    {rogue.risk}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{rogue.first}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{rogue.last}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
