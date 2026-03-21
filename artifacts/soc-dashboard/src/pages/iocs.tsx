import React, { useState } from 'react';
import { useS1GetIocs } from '@workspace/api-client-react';
import { Crosshair, Globe, Hash, Link as LinkIcon, Mail, Search } from 'lucide-react';

function typeIcon(type: string) {
  switch (type) {
    case 'ip': return <Globe className="w-4 h-4 text-primary" />;
    case 'domain': return <Globe className="w-4 h-4 text-orange-400" />;
    case 'hash': return <Hash className="w-4 h-4 text-purple-400" />;
    case 'url': return <LinkIcon className="w-4 h-4 text-warning" />;
    case 'email': return <Mail className="w-4 h-4 text-blue-400" />;
    default: return <Crosshair className="w-4 h-4 text-muted-foreground" />;
  }
}

function severityBadge(s: string) {
  switch (s) {
    case 'critical': return 'text-destructive bg-destructive/10 border-destructive/40';
    case 'high': return 'text-orange-400 bg-orange-400/10 border-orange-400/40';
    case 'medium': return 'text-warning bg-warning/10 border-warning/40';
    default: return 'text-muted-foreground bg-muted border-border';
  }
}

export default function IocPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const { data, isLoading } = useS1GetIocs();
  const iocs = data?.data || [];

  const counts = {
    ip: iocs.filter(i => i.type === 'ip').length,
    domain: iocs.filter(i => i.type === 'domain').length,
    hash: iocs.filter(i => i.type === 'hash').length,
    url: iocs.filter(i => i.type === 'url').length,
    email: iocs.filter(i => i.type === 'email').length,
  };

  const filtered = iocs.filter(i => {
    if (typeFilter && i.type !== typeFilter) return false;
    if (search && !i.value.toLowerCase().includes(search.toLowerCase()) &&
        !i.description?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4">
        <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase flex items-center gap-2">
          <Crosshair className="w-5 h-5 text-primary" /> Indicators of Compromise
        </h1>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">{iocs.length} total IOCs</div>
      </div>

      {/* Type summary cards */}
      <div className="border-b border-border bg-card/20 p-4 grid grid-cols-5 gap-3">
        {Object.entries(counts).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? '' : type)}
            className={`flex flex-col items-center p-3 rounded-lg border transition-all ${
              typeFilter === type ? 'border-primary/50 bg-primary/10' : 'border-border bg-secondary/50 hover:border-primary/30'
            }`}
          >
            {typeIcon(type)}
            <div className="text-xl font-mono font-bold text-foreground mt-1">{count}</div>
            <div className="text-[10px] text-muted-foreground uppercase font-mono">{type}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="border-b border-border bg-card/30 px-4 py-2 flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search IOCs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-background border border-border rounded-md h-8 pl-9 pr-3 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 w-72"
          />
        </div>
        {typeFilter && (
          <button
            onClick={() => setTypeFilter('')}
            className="text-xs font-mono text-primary border border-primary/30 bg-primary/10 px-2 py-1 rounded"
          >
            ×&nbsp;{typeFilter}
          </button>
        )}
      </div>

      {/* IOC Table */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-card border-b border-border">
            <tr>
              {['Type', 'Value', 'Source', 'Severity', 'Hits', 'Added'].map(h => (
                <th key={h} className="text-left px-4 py-2 text-[10px] font-mono text-muted-foreground uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-mono text-sm">Loading...</td></tr>
            ) : filtered.map((ioc, i) => (
              <tr key={ioc.id} className={`border-b border-border hover:bg-secondary/50 transition-colors ${i % 2 === 0 ? '' : 'bg-secondary/20'}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {typeIcon(ioc.type)}
                    <span className="text-xs font-mono text-muted-foreground uppercase">{ioc.type}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs text-foreground truncate max-w-64" title={ioc.value}>{ioc.value}</div>
                  {ioc.description && <div className="text-[10px] text-muted-foreground truncate max-w-64">{ioc.description}</div>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{ioc.source}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono uppercase ${severityBadge(ioc.severity)}`}>
                    {ioc.severity}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-foreground">{ioc.hits ?? 0}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {new Date(ioc.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!isLoading && filtered.length === 0 && (
          <div className="flex items-center justify-center h-48 text-muted-foreground font-mono text-sm">No IOCs found</div>
        )}
      </div>
    </div>
  );
}
