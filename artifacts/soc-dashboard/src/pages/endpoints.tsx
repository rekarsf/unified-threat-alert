import React, { useState } from 'react';
import { useS1GetAgents } from '@workspace/api-client-react';
import { CyberCard, CyberBadge, CyberInput } from '@/components/cyber-ui';
import { Search, Filter, Server, Download, ShieldAlert } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function EndpointsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useS1GetAgents({ limit: 1000 });
  const setSelectedEndpoint = useAppStore(s => s.setSelectedEndpoint);

  const endpoints = data?.data || [];
  
  const filtered = endpoints.filter(ep => 
    ep.hostname.toLowerCase().includes(search.toLowerCase()) || 
    ep.ip.includes(search)
  );

  return (
    <div className="p-6 h-full flex flex-col max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground text-shadow-cyber flex items-center gap-3">
            <Server className="w-6 h-6 text-primary" />
            ASSET INVENTORY
          </h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Manage and monitor enrolled endpoints</p>
        </div>
        <div className="flex items-center gap-3">
          <CyberBadge variant="outline" className="px-3 py-1 text-sm"><ShieldAlert className="w-3 h-3 mr-2 inline"/> Protect Mode: Active</CyberBadge>
          <button className="p-2 bg-secondary text-muted-foreground hover:text-primary rounded border border-border transition-colors">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      <CyberCard className="flex-1 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-border bg-secondary/50 flex gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <CyberInput 
              placeholder="Search hostname, IP..." 
              className="pl-9 bg-background"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="flex items-center gap-2 text-sm font-mono text-foreground hover:text-primary px-3 py-2 rounded-md border border-border bg-background transition-colors">
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-secondary/90 backdrop-blur border-b border-primary/30 z-10">
              <tr>
                <th className="px-6 py-3 text-xs font-display tracking-widest uppercase text-muted-foreground">Hostname</th>
                <th className="px-6 py-3 text-xs font-display tracking-widest uppercase text-muted-foreground">Status</th>
                <th className="px-6 py-3 text-xs font-display tracking-widest uppercase text-muted-foreground">IP Address</th>
                <th className="px-6 py-3 text-xs font-display tracking-widest uppercase text-muted-foreground">OS</th>
                <th className="px-6 py-3 text-xs font-display tracking-widest uppercase text-muted-foreground">Last Seen</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground animate-pulse">Scanning network...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted-foreground">No endpoints found matching criteria.</td></tr>
              ) : (
                filtered.map((ep) => (
                  <tr 
                    key={ep.id} 
                    onClick={() => setSelectedEndpoint(ep)}
                    className="border-b border-border/50 hover:bg-primary/5 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4 text-foreground font-medium group-hover:text-primary transition-colors flex items-center gap-2">
                      {ep.hostname}
                    </td>
                    <td className="px-6 py-4">
                      <CyberBadge variant={ep.status}>{ep.status}</CyberBadge>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{ep.ip}</td>
                    <td className="px-6 py-4 text-muted-foreground">{ep.os}</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(ep.lastSeen).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CyberCard>
    </div>
  );
}
