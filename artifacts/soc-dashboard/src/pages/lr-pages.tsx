import React, { useState } from 'react';
import {
  useLrGetAlarms, useLrGetCases, useLrGetLogSources,
  useLrGetHosts, useLrGetNetworks, useLrGetEntities,
  useLrGetAgents, useLrGetLists
} from '@workspace/api-client-react';
import { Bell, Briefcase, Database, Server, Network, Building, Shield, Search, List, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function severityBar(val: number) {
  const pct = Math.min(100, (val / 10) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${val >= 9 ? 'bg-destructive' : val >= 7 ? 'bg-warning' : 'bg-healthy'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-mono text-xs text-foreground">{val}</span>
    </div>
  );
}

export function LrAlarmsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useLrGetAlarms({ limit: 100 });
  const alarms = data?.data || [];
  const filtered = alarms.filter(a =>
    !search || a.alarmName.toLowerCase().includes(search.toLowerCase()) ||
    a.entityName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4 flex items-center justify-between">
        <div>
          <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase flex items-center gap-2">
            <Bell className="w-5 h-5 text-warning" /> LR Alarms
          </h1>
          <div className="text-xs text-muted-foreground font-mono mt-0.5">{filtered.length} alarms</div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input type="text" placeholder="Search alarms..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-background border border-border rounded-md h-9 pl-9 pr-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 w-64" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>{['ID', 'Alarm Name', 'Entity', 'Severity', 'Status', 'Date'].map(h =>
              <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">Loading...</td></tr>
            : filtered.map((alarm, i) => (
              <tr key={alarm.alarmId} className={`border-b border-border hover:bg-secondary/50 ${alarm.alarmStatus === 'OpenAlarm' ? 'border-l-2 border-l-warning' : ''} ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{alarm.alarmId}</td>
                <td className="px-4 py-3 font-mono text-sm text-foreground font-bold">{alarm.alarmName}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{alarm.entityName || '—'}</td>
                <td className="px-4 py-3">{severityBar(alarm.severity)}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase ${alarm.alarmStatus === 'OpenAlarm' ? 'text-warning bg-warning/10 border-warning/40' : alarm.alarmStatus === 'Resolved' ? 'text-healthy bg-healthy/10 border-healthy/40' : 'text-muted-foreground bg-muted border-border'}`}>
                    {alarm.alarmStatus}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(alarm.alarmDate), { addSuffix: true })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LrCasesPage() {
  const { data, isLoading } = useLrGetCases({ limit: 50 });
  const cases = data?.data || [];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4">
        <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-primary" /> Cases
        </h1>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">{cases.length} cases</div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? <div className="flex items-center justify-center h-48 text-muted-foreground font-mono text-sm">Loading...</div> : (
          <div className="divide-y divide-border">
            {cases.map(c => (
              <div key={c.id} className="p-4 hover:bg-secondary/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-mono text-sm text-foreground font-bold">{c.name}</div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] font-mono text-muted-foreground">
                      <span>Owner: {c.owner?.name || 'Unassigned'}</span>
                      <span>Alarms: {c.alarmsCount}</span>
                      {c.dueDate && <span>Due: {new Date(c.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                      c.priority === 1 ? 'text-destructive bg-destructive/10 border-destructive/40' :
                      c.priority === 2 ? 'text-warning bg-warning/10 border-warning/40' :
                      'text-muted-foreground bg-muted border-border'
                    }`}>P{c.priority}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono ${
                      c.status.name === 'InProgress' ? 'text-primary bg-primary/10 border-primary/40' :
                      c.status.name === 'Completed' ? 'text-healthy bg-healthy/10 border-healthy/40' :
                      'text-muted-foreground bg-muted border-border'
                    }`}>{c.status.name}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function LrSourcesPage() {
  const { data, isLoading } = useLrGetLogSources();
  const sources = data?.data || [];

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4">
        <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> Log Sources
        </h1>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">{sources.length} sources</div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>{['ID', 'Name', 'Host', 'Type', 'Status', 'Records', 'Last Ingested'].map(h =>
              <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">Loading...</td></tr>
            : sources.map((src, i) => (
              <tr key={src.id} className={`border-b border-border hover:bg-secondary/50 ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">#{src.id}</td>
                <td className="px-4 py-3 font-mono text-sm text-foreground font-bold">{src.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{(src.host as any)?.name || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{(src.logSourceType as any)?.name || '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${src.status === 'Active' ? 'bg-healthy animate-pulse' : src.status === 'Warning' ? 'bg-warning' : 'bg-muted-foreground'}`} />
                    <span className={`text-xs font-mono ${src.status === 'Active' ? 'text-healthy' : src.status === 'Warning' ? 'text-warning' : 'text-muted-foreground'}`}>{src.status}</span>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{src.recordCount?.toLocaleString() || '—'}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {src.lastIngested ? formatDistanceToNow(new Date(src.lastIngested), { addSuffix: true }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SimpleListPage<T extends Record<string, unknown>>({
  title, icon, data, isLoading, columns,
}: {
  title: string; icon: React.ReactNode;
  data: T[]; isLoading: boolean;
  columns: { key: string; label: string; render?: (item: T) => React.ReactNode }[];
}) {
  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4">
        <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase flex items-center gap-2">
          {icon} {title}
        </h1>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">{data.length} items</div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>{columns.map(c => <th key={c.key} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {isLoading ? <tr><td colSpan={columns.length} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">Loading...</td></tr>
            : data.map((item, i) => (
              <tr key={i} className={`border-b border-border hover:bg-secondary/50 ${i % 2 === 0 ? '' : 'bg-secondary/10'}`}>
                {columns.map(c => (
                  <td key={c.key} className="px-4 py-3 font-mono text-xs text-foreground">
                    {c.render ? c.render(item) : String(item[c.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LrHostsPage() {
  const { data, isLoading } = useLrGetHosts();
  return <SimpleListPage title="Hosts" icon={<Server className="w-5 h-5 text-primary" />}
    data={data?.data || []} isLoading={isLoading}
    columns={[
      { key: 'id', label: 'ID', render: i => `#${i.id}` },
      { key: 'name', label: 'Name', render: i => <span className="font-bold text-foreground">{i.name as string}</span> },
      { key: 'status', label: 'Status', render: i => <span className={`${i.status === 'Active' ? 'text-healthy' : 'text-muted-foreground'}`}>{i.status as string}</span> },
      { key: 'hostZone', label: 'Zone' },
      { key: 'riskLevel', label: 'Risk', render: i => i.riskLevel ? <span className={`text-xs px-2 py-0.5 rounded ${i.riskLevel === 'High' ? 'text-destructive bg-destructive/10' : i.riskLevel === 'Medium' ? 'text-warning bg-warning/10' : 'text-healthy bg-healthy/10'}`}>{i.riskLevel as string}</span> : <span>—</span> },
      { key: 'location', label: 'Location' },
    ] as any} />;
}

export function LrNetworksPage() {
  const { data, isLoading } = useLrGetNetworks();
  return <SimpleListPage title="Networks" icon={<Network className="w-5 h-5 text-primary" />}
    data={data?.data || []} isLoading={isLoading}
    columns={[
      { key: 'id', label: 'ID', render: (i: any) => `#${i.id}` },
      { key: 'name', label: 'Name', render: (i: any) => <span className="font-bold text-foreground">{i.name}</span> },
      { key: 'bip', label: 'Start IP' },
      { key: 'eip', label: 'End IP' },
      { key: 'entityName', label: 'Entity' },
      { key: 'hostCount', label: 'Hosts', render: (i: any) => i.hostCount ?? '—' },
    ] as any} />;
}

export function LrEntitiesPage() {
  const { data, isLoading } = useLrGetEntities();
  return <SimpleListPage title="Entities" icon={<Building className="w-5 h-5 text-primary" />}
    data={data?.data || []} isLoading={isLoading}
    columns={[
      { key: 'id', label: 'ID', render: (i: any) => `#${i.id}` },
      { key: 'name', label: 'Name', render: (i: any) => <span className="font-bold text-foreground">{i.name}</span> },
      { key: 'fullName', label: 'Full Name' },
      { key: 'safeListAllowed', label: 'Safelist', render: (i: any) => i.safeListAllowed ? <span className="text-healthy">Yes</span> : <span className="text-muted-foreground">No</span> },
    ] as any} />;
}

export function LrAgentsPage() {
  const { data, isLoading } = useLrGetAgents();
  return <SimpleListPage title="LR Agents" icon={<Shield className="w-5 h-5 text-primary" />}
    data={data?.data || []} isLoading={isLoading}
    columns={[
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Name', render: (i: any) => <span className="font-bold text-foreground">{i.name}</span> },
      { key: 'host', label: 'Host' },
      { key: 'version', label: 'Version' },
      { key: 'status', label: 'Status', render: (i: any) => <span className={`flex items-center gap-1.5 ${i.status === 'active' ? 'text-healthy' : 'text-muted-foreground'}`}><span className={`w-2 h-2 rounded-full ${i.status === 'active' ? 'bg-healthy' : 'bg-muted-foreground'}`} />{i.status}</span> },
    ] as any} />;
}

export function LrListsPage() {
  const { data, isLoading } = useLrGetLists();
  return <SimpleListPage title="LR Lists" icon={<List className="w-5 h-5 text-primary" />}
    data={data?.data || []} isLoading={isLoading}
    columns={[
      { key: 'id', label: 'ID', render: (i: any) => `#${i.id}` },
      { key: 'name', label: 'Name', render: (i: any) => <span className="font-bold text-foreground">{i.name}</span> },
      { key: 'listType', label: 'Type', render: (i: any) => (i.listType as any)?.name || '—' },
      { key: 'status', label: 'Status', render: (i: any) => <span className={i.status === 'Active' ? 'text-healthy' : 'text-muted-foreground'}>{i.status || '—'}</span> },
      { key: 'entryCount', label: 'Entries', render: (i: any) => i.entryCount?.toLocaleString() || '—' },
    ] as any} />;
}

export function LrSearchPage() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4">
        <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase flex items-center gap-2">
          <Search className="w-5 h-5 text-primary" /> Log Search
        </h1>
      </div>
      <div className="p-4 border-b border-border">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder='e.g. "failed login" OR "privilege escalation" source:WinSec'
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setSubmitted(query)}
              className="w-full bg-background border border-border rounded-md h-10 pl-9 pr-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>
          <button
            onClick={() => setSubmitted(query)}
            className="px-6 h-10 bg-primary/20 border border-primary/40 text-primary font-mono text-sm rounded-md hover:bg-primary/30 transition-colors"
          >
            SEARCH
          </button>
        </div>
      </div>
      {submitted && (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          {[
            { ts: new Date().toISOString(), msg: `Authentication successful for user admin from 10.0.1.5`, src: 'Windows Security', sev: 'info' },
            { ts: new Date(Date.now() - 30000).toISOString(), msg: `Failed login attempt for user ${submitted} from 185.220.101.33`, src: 'Active Directory', sev: 'warning' },
            { ts: new Date(Date.now() - 60000).toISOString(), msg: `Suspicious process execution: cmd.exe /c whoami`, src: 'Windows Sysmon', sev: 'error' },
          ].map((log, i) => (
            <div key={i} className={`font-mono text-xs p-3 border-b border-border ${i % 2 === 0 ? '' : 'bg-secondary/20'}`}>
              <span className="text-muted-foreground">{new Date(log.ts).toISOString()} </span>
              <span className={`${log.sev === 'error' ? 'text-destructive' : log.sev === 'warning' ? 'text-warning' : 'text-healthy'} mr-2`}>[{log.sev.toUpperCase()}]</span>
              <span className="text-primary mr-2">{log.src}</span>
              <span className="text-foreground">{log.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
