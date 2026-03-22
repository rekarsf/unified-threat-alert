import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import {
  Rss, Shield, AlertTriangle, ExternalLink, Clock, Search, RefreshCw,
  Bug, Link2, Package, Globe, Hash, ChevronRight, Activity, Eye,
  Database, Server, Info, Key, CheckCircle, XCircle, Zap, FileCode,
  ThumbsUp, MessageCircle
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

type Source = 'overview' | 'hackernews' | 'cisa-kev' | 'nvd' | 'otx' | 'threatfox' | 'urlhaus' | 'malwarebazaar' | 'circl' | 'virustotal' | 'shodan' | 'abuseipdb' | 'reddit';

interface Tab { id: Source; label: string; icon: React.ReactNode; color: string; }

const TABS: Tab[] = [
  { id: 'overview',     label: 'Overview',       icon: <Activity className="w-3.5 h-3.5" />,  color: 'text-primary' },
  { id: 'hackernews',   label: 'Hacker News',    icon: <Rss className="w-3.5 h-3.5" />,       color: 'text-orange-400' },
  { id: 'cisa-kev',     label: 'CISA KEV',       icon: <Shield className="w-3.5 h-3.5" />,    color: 'text-red-400' },
  { id: 'nvd',          label: 'NVD',            icon: <Database className="w-3.5 h-3.5" />,  color: 'text-blue-400' },
  { id: 'otx',          label: 'OTX',            icon: <Globe className="w-3.5 h-3.5" />,     color: 'text-purple-400' },
  { id: 'threatfox',    label: 'ThreatFox',      icon: <Bug className="w-3.5 h-3.5" />,       color: 'text-red-400' },
  { id: 'urlhaus',      label: 'URLHaus',        icon: <Link2 className="w-3.5 h-3.5" />,     color: 'text-yellow-400' },
  { id: 'malwarebazaar',label: 'Malware Bazaar', icon: <Package className="w-3.5 h-3.5" />,   color: 'text-pink-400' },
  { id: 'circl',        label: 'CIRCL',          icon: <FileCode className="w-3.5 h-3.5" />,  color: 'text-cyan-400' },
  { id: 'virustotal',   label: 'VirusTotal',     icon: <Eye className="w-3.5 h-3.5" />,       color: 'text-green-400' },
  { id: 'shodan',       label: 'Shodan',         icon: <Server className="w-3.5 h-3.5" />,    color: 'text-amber-400' },
  { id: 'abuseipdb',    label: 'AbuseIPDB',      icon: <Hash className="w-3.5 h-3.5" />,      color: 'text-red-400' },
  { id: 'reddit',       label: 'Reddit',         icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'text-orange-500' },
];

const SOURCE_DOCS: Record<string, { url: string; desc: string }> = {
  hackernews:    { url: 'https://hn.algolia.com/api', desc: 'Security-relevant stories from the Hacker News community indexed by Algolia.' },
  'cisa-kev':   { url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog', desc: 'CISA catalog of vulnerabilities actively exploited in the wild. No API key required.' },
  nvd:           { url: 'https://nvd.nist.gov/developers/vulnerabilities', desc: 'NIST National Vulnerability Database — comprehensive CVE database. No API key required.' },
  otx:           { url: 'https://otx.alienvault.com', desc: 'AlienVault Open Threat Exchange — community-driven threat intelligence. API key required.' },
  threatfox:     { url: 'https://threatfox.abuse.ch', desc: 'abuse.ch ThreatFox IOC database. No API key required.' },
  urlhaus:       { url: 'https://urlhaus.abuse.ch', desc: 'abuse.ch URLHaus — malicious URL sharing. No API key required.' },
  malwarebazaar: { url: 'https://bazaar.abuse.ch', desc: 'abuse.ch Malware Bazaar — malware sample repository. No API key required.' },
  circl:         { url: 'https://cve.circl.lu', desc: 'CIRCL CVE Search — enriched CVE data by CIRCL Luxembourg. No API key required.' },
  virustotal:    { url: 'https://www.virustotal.com/gui/home', desc: 'Multi-engine malware scanning and threat intelligence. API key required (free tier available).' },
  shodan:        { url: 'https://www.shodan.io', desc: 'Internet-wide scanner for exposed services and vulnerabilities. API key required.' },
  abuseipdb:     { url: 'https://www.abuseipdb.com', desc: 'Crowdsourced IP address abuse database. API key required (free tier available).' },
  reddit:        { url: 'https://www.reddit.com/r/netsec', desc: 'Security communities on Reddit: r/netsec, r/cybersecurity, r/blueteamsec, r/Malware.' },
};

function useTI(source: string, params: Record<string, string> = {}, enabled = true) {
  const { token } = useAuthStore();
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE}/api/threatintel/${source}${qs ? '?' + qs : ''}`;
  return useQuery({
    queryKey: [url],
    queryFn: async () => {
      const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error(`${r.status}`);
      return r.json();
    },
    staleTime: 120_000,
    enabled,
  });
}

// ── Shared UI atoms ──────────────────────────────────────────────────────────

function SevBadge({ sev }: { sev?: string }) {
  const s = (sev || 'INFO').toUpperCase();
  const cls: Record<string, string> = {
    CRITICAL: 'bg-red-500/20 text-red-400 border-red-500/30',
    HIGH:     'bg-orange-500/20 text-orange-400 border-orange-500/30',
    MEDIUM:   'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    LOW:      'bg-green-500/20 text-green-400 border-green-500/30',
    NONE:     'bg-gray-500/20 text-gray-400 border-gray-500/30',
    INFO:     'bg-blue-500/20 text-blue-400 border-blue-500/30',
  };
  return <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${cls[s] || cls.INFO}`}>{s}</span>;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return null;
  const color = score >= 9 ? 'text-red-400 border-red-500/30 bg-red-500/10' : score >= 7 ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' : score >= 4 ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10' : 'text-green-400 border-green-500/30 bg-green-500/10';
  return <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${color}`}>{score.toFixed(1)}</span>;
}

function Tag({ label }: { label: string }) {
  return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/60 text-muted-foreground border border-border">{label}</span>;
}

function LoadingRow() {
  return (
    <div className="flex items-center justify-center h-40 text-muted-foreground font-mono text-sm gap-2">
      <RefreshCw className="w-4 h-4 animate-spin" /> Fetching threat intelligence...
    </div>
  );
}

function RequiresKey({ source, keyName }: { source: string; keyName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-8">
      <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
        <Key className="w-6 h-6 text-yellow-400" />
      </div>
      <div>
        <p className="text-sm font-mono font-bold text-foreground">API Key Required</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs">
          {SOURCE_DOCS[source]?.desc}
        </p>
      </div>
      <div className="bg-secondary/60 border border-border rounded-lg px-4 py-3 font-mono text-xs text-left w-full max-w-sm">
        <div className="text-muted-foreground mb-1">Add to Settings → Threat Intel Keys:</div>
        <div className="text-primary">{keyName} = <span className="text-muted-foreground italic">your-api-key</span></div>
      </div>
      <a href={SOURCE_DOCS[source]?.url} target="_blank" rel="noopener noreferrer"
        className="text-xs text-primary hover:underline flex items-center gap-1">
        Get API key from {source} <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}

function SourceHeader({ source, count, isMock, onRefresh, isLoading }: { source: string; count?: number; isMock?: boolean; onRefresh: () => void; isLoading: boolean }) {
  const tab = TABS.find(t => t.id === source);
  const doc = SOURCE_DOCS[source];
  return (
    <div className="border-b border-border bg-card/40 px-5 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`${tab?.color || 'text-primary'}`}>{tab?.icon}</div>
        <div className="min-w-0">
          <span className="font-mono text-sm font-bold text-foreground">{tab?.label}</span>
          {count != null && <span className="text-muted-foreground text-xs font-mono ml-2">{count} items</span>}
        </div>
        {isMock && <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 shrink-0">MOCK DATA</span>}
      </div>
      <div className="flex items-center gap-2">
        {doc && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"><ExternalLink className="w-3 h-3" /> Docs</a>}
        <button onClick={onRefresh} disabled={isLoading}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}

// ── Overview tab ─────────────────────────────────────────────────────────────

const OVERVIEW_SOURCE_CONFIG: { id: string; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'cisa-kev',    label: 'CISA KEV',       icon: <Shield className="w-3.5 h-3.5" />,    color: 'border-red-500/20 bg-red-500/5' },
  { id: 'threatfox',   label: 'ThreatFox',      icon: <Bug className="w-3.5 h-3.5" />,       color: 'border-red-400/20 bg-red-400/5' },
  { id: 'urlhaus',     label: 'URLHaus',        icon: <Link2 className="w-3.5 h-3.5" />,     color: 'border-yellow-500/20 bg-yellow-500/5' },
  { id: 'malwarebazaar',label:'Malware Bazaar', icon: <Package className="w-3.5 h-3.5" />,   color: 'border-pink-500/20 bg-pink-500/5' },
  { id: 'hackernews',  label: 'Hacker News',    icon: <Rss className="w-3.5 h-3.5" />,       color: 'border-orange-500/20 bg-orange-500/5' },
  { id: 'reddit',      label: 'Reddit',         icon: <MessageCircle className="w-3.5 h-3.5" />, color: 'border-orange-400/20 bg-orange-400/5' },
];

function OverviewTab({ onNavigate }: { onNavigate: (src: Source) => void }) {
  const { token } = useAuthStore();
  const { data, isLoading, refetch } = useQuery({
    queryKey: [`${BASE}/api/threatintel/overview`],
    queryFn: async () => {
      const r = await fetch(`${BASE}/api/threatintel/overview`, { headers: { Authorization: `Bearer ${token}` } });
      return r.json();
    },
    staleTime: 120_000,
  });

  const sources = data?.sources || {};

  const stats = [
    { label: 'CISA KEV', value: sources['cisa-kev']?.count ?? '—', color: 'text-red-400', ok: sources['cisa-kev']?.ok },
    { label: 'ThreatFox', value: sources['threatfox']?.count ?? '—', color: 'text-red-300', ok: sources['threatfox']?.ok },
    { label: 'URLHaus', value: sources['urlhaus']?.count ?? '—', color: 'text-yellow-400', ok: sources['urlhaus']?.ok },
    { label: 'Malware Bazaar', value: sources['malwarebazaar']?.count ?? '—', color: 'text-pink-400', ok: sources['malwarebazaar']?.ok },
    { label: 'Hacker News', value: sources['hackernews']?.count ?? '—', color: 'text-orange-400', ok: sources['hackernews']?.ok },
    { label: 'Reddit', value: sources['reddit']?.count ?? '—', color: 'text-orange-500', ok: sources['reddit']?.ok },
  ];

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="border-b border-border bg-card/40 px-5 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm font-bold text-foreground">Threat Intelligence Overview</h2>
          {data?.timestamp && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Last updated: {format(new Date(data.timestamp), 'HH:mm:ss')}</p>}
        </div>
        <button onClick={() => refetch()} disabled={isLoading}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? <LoadingRow /> : (
        <div className="p-5 space-y-6">
          {/* Status pills */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {stats.map(s => (
              <div key={s.label} className="bg-card/60 border border-border rounded-lg p-3 text-center">
                <div className={`text-xl font-mono font-bold ${s.color}`}>{s.value}</div>
                <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{s.label}</div>
                <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1.5 ${s.ok ? 'bg-green-400' : 'bg-red-400'}`} />
              </div>
            ))}
          </div>

          {/* Feed columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {OVERVIEW_SOURCE_CONFIG.map(cfg => {
              const src = sources[cfg.id];
              const items: any[] = src?.items || [];
              return (
                <div key={cfg.id} className={`rounded-xl border ${cfg.color} overflow-hidden`}>
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
                    <div className="flex items-center gap-2 text-sm font-mono font-bold text-foreground">
                      {cfg.icon} {cfg.label}
                    </div>
                    <button onClick={() => onNavigate(cfg.id as Source)}
                      className="text-[10px] font-mono text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                      View all <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="divide-y divide-border/40">
                    {items.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-muted-foreground font-mono">No data</div>
                    ) : items.map((item: any, i: number) => (
                      <a key={i} href={item.url} target="_blank" rel="noopener noreferrer"
                        className="block px-4 py-2.5 hover:bg-white/[0.02] transition-colors group">
                        <div className="flex items-start gap-2">
                          <SevBadge sev={item.severity} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-mono text-foreground line-clamp-2 group-hover:text-primary transition-colors">{item.title}</p>
                            {item.subtitle && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.subtitle}</p>}
                            {item.date && (
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                {formatDistanceToNow(new Date(item.date), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* API-key sources status */}
          <div>
            <p className="text-xs font-mono text-muted-foreground mb-3 uppercase tracking-wider">API-Key Sources</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['otx','virustotal','shodan','abuseipdb'] as Source[]).map(id => {
                const tab = TABS.find(t => t.id === id);
                return (
                  <button key={id} onClick={() => onNavigate(id)}
                    className="bg-card/60 border border-border rounded-lg p-3 flex items-center gap-3 hover:border-primary/30 transition-colors text-left">
                    <div className={`${tab?.color}`}>{tab?.icon}</div>
                    <div>
                      <p className="text-xs font-mono font-bold text-foreground">{tab?.label}</p>
                      <p className="text-[10px] text-yellow-400 font-mono flex items-center gap-1 mt-0.5"><Key className="w-2.5 h-2.5" /> Key required</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── HackerNews tab ───────────────────────────────────────────────────────────

const HN_QUERIES = ['security vulnerability', 'ransomware attack', 'zero-day CVE', 'malware analysis', 'APT threat'];

function HackerNewsTab() {
  const [query, setQuery] = useState(HN_QUERIES[0]);
  const [custom, setCustom] = useState('');
  const { data, isLoading, refetch } = useTI('hackernews', { query });
  const hits: any[] = data?.hits || [];
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <SourceHeader source="hackernews" count={hits.length} isMock={data?.mock} onRefresh={refetch} isLoading={isLoading} />
      <div className="border-b border-border bg-card/20 px-4 py-2.5 flex flex-wrap gap-2 items-center">
        {HN_QUERIES.map(q => (
          <button key={q} onClick={() => setQuery(q)}
            className={`text-[11px] font-mono px-2.5 py-1 rounded-full border transition-all ${query === q ? 'text-primary bg-primary/20 border-primary/50' : 'text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'}`}>
            {q}
          </button>
        ))}
        <div className="flex gap-1.5 ml-auto">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === 'Enter' && custom.trim() && setQuery(custom.trim())}
              placeholder="Custom search..." className="bg-background border border-border rounded-md h-7 pl-7 pr-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 w-40" />
          </div>
          <button onClick={() => custom.trim() && setQuery(custom.trim())}
            className="px-2.5 h-7 bg-primary/20 border border-primary/40 text-primary font-mono text-xs rounded-md hover:bg-primary/30">GO</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
        {isLoading ? <LoadingRow /> : hits.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground font-mono text-sm">No results for "{query}"</div>
        ) : hits.map((item: any) => (
          <div key={item.objectID} className="p-4 hover:bg-secondary/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg bg-orange-400/10 border border-orange-400/20 font-mono text-xs text-orange-400 font-bold">{String(item.points || 0)}</div>
              <div className="flex-1 min-w-0">
                <a href={item.url || `https://news.ycombinator.com/item?id=${item.objectID}`} target="_blank" rel="noopener noreferrer"
                  className="font-mono text-sm text-foreground hover:text-primary transition-colors font-bold flex items-center gap-1 group">
                  {item.title} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                </a>
                {item.url && <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{(() => { try { return new URL(item.url).hostname; } catch { return item.url; }})()}</div>}
                <div className="flex items-center gap-4 mt-1.5 text-[10px] font-mono text-muted-foreground">
                  <span className="text-primary">{item.author}</span>
                  <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" />{item.points || 0}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{item.num_comments || 0}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CISA KEV tab ─────────────────────────────────────────────────────────────

function CisaKevTab() {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useTI('cisa-kev');
  const items: any[] = (data?.data || []).filter((v: any) =>
    !search || v.cveId?.toLowerCase().includes(search.toLowerCase()) ||
    v.vulnerabilityName?.toLowerCase().includes(search.toLowerCase()) ||
    v.vendorProject?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <SourceHeader source="cisa-kev" count={data?.total} isMock={data?.mock} onRefresh={refetch} isLoading={isLoading} />
      <div className="border-b border-border bg-card/20 px-4 py-2.5 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by CVE ID, vendor, or name..."
          className="flex-1 bg-transparent text-xs font-mono text-foreground focus:outline-none placeholder:text-muted-foreground/50" />
        {search && <button onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground text-xs">×</button>}
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
        {isLoading ? <LoadingRow /> : items.map((v: any) => (
          <div key={v.id} className="p-4 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                <SevBadge sev={v.ransomware ? 'CRITICAL' : 'HIGH'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`https://nvd.nist.gov/vuln/detail/${v.cveId}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    {v.cveId} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <span className="text-xs font-mono text-foreground">{v.vulnerabilityName}</span>
                  {v.ransomware && <Tag label="Ransomware" />}
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-mono"><span className="text-foreground/70">{v.vendorProject}</span> — {v.product}</p>
                <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-2">{v.shortDescription}</p>
                <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Added: {v.dateAdded}</span>
                  <span className="flex items-center gap-1 text-red-400/80"><Zap className="w-3 h-3" /> Due: {v.dueDate}</span>
                </div>
                {v.requiredAction && <p className="text-[10px] text-yellow-400/70 mt-1 font-mono line-clamp-1">→ {v.requiredAction}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── NVD tab ──────────────────────────────────────────────────────────────────

const NVD_SEVERITIES = ['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

function NvdTab() {
  const [keyword, setKeyword] = useState('');
  const [severity, setSeverity] = useState('');
  const [activeKeyword, setActiveKeyword] = useState('');
  const { data, isLoading, refetch } = useTI('nvd', { keyword: activeKeyword, severity });
  const items: any[] = data?.data || [];
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <SourceHeader source="nvd" count={data?.total} isMock={data?.mock} onRefresh={refetch} isLoading={isLoading} />
      <div className="border-b border-border bg-card/20 px-4 py-2.5 flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <input value={keyword} onChange={e => setKeyword(e.target.value)} onKeyDown={e => e.key === 'Enter' && setActiveKeyword(keyword)}
            placeholder="Search CVE keyword..." className="flex-1 bg-transparent text-xs font-mono text-foreground focus:outline-none placeholder:text-muted-foreground/50" />
        </div>
        <div className="flex gap-1.5">
          {NVD_SEVERITIES.map(s => (
            <button key={s} onClick={() => setSeverity(s)}
              className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-all ${severity === s ? 'text-primary bg-primary/20 border-primary/50' : 'text-muted-foreground border-border hover:border-primary/30'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>
        <button onClick={() => setActiveKeyword(keyword)} className="px-2.5 h-7 bg-primary/20 border border-primary/40 text-primary font-mono text-xs rounded-md hover:bg-primary/30">GO</button>
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
        {isLoading ? <LoadingRow /> : items.map((v: any) => (
          <div key={v.id} className="p-4 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <SevBadge sev={v.severity} />
                <ScoreBadge score={v.score} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a href={`https://nvd.nist.gov/vuln/detail/${v.cveId}`} target="_blank" rel="noopener noreferrer"
                    className="font-mono text-xs font-bold text-primary hover:underline flex items-center gap-1">
                    {v.cveId} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  {v.weaknesses?.map((w: string) => <Tag key={w} label={w} />)}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{v.description}</p>
                <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{v.published ? format(new Date(v.published), 'yyyy-MM-dd') : '—'}</span>
                  {v.vectorString && <span className="text-[10px] text-muted-foreground/60 truncate max-w-[200px]">{v.vectorString}</span>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ThreatFox tab ────────────────────────────────────────────────────────────

function ThreatFoxTab() {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useTI('threatfox');
  const items: any[] = (data?.data || []).filter((d: any) =>
    !search || d.value?.includes(search) || d.malware?.toLowerCase().includes(search.toLowerCase())
  );
  const typeIcon: Record<string, string> = { 'ip:port': '🌐', domain: '🔗', 'sha256_hash': '#️⃣', url: '🔗', md5_hash: '#️⃣' };
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <SourceHeader source="threatfox" count={data?.total} isMock={data?.mock} onRefresh={refetch} isLoading={isLoading} />
      <div className="border-b border-border bg-card/20 px-4 py-2.5 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter IOC or malware family..."
          className="flex-1 bg-transparent text-xs font-mono focus:outline-none placeholder:text-muted-foreground/50 text-foreground" />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
        {isLoading ? <LoadingRow /> : items.map((d: any) => (
          <div key={d.id} className="p-3.5 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className="text-sm shrink-0 mt-0.5">{typeIcon[d.type] || '🔍'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="text-xs font-mono text-red-400 break-all">{d.value}</code>
                  <SevBadge sev={d.confidence > 80 ? 'HIGH' : d.confidence > 50 ? 'MEDIUM' : 'LOW'} />
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {d.malware && <span className="text-xs font-mono text-orange-400">{d.malware}</span>}
                  <span className="text-[10px] font-mono text-muted-foreground">{d.type}</span>
                  {d.confidence != null && <span className="text-[10px] font-mono text-muted-foreground">Confidence: {d.confidence}%</span>}
                  {d.tags?.map((t: string) => <Tag key={t} label={t} />)}
                </div>
                {d.firstSeen && <p className="text-[10px] font-mono text-muted-foreground/60 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(d.firstSeen), { addSuffix: true })}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── URLHaus tab ──────────────────────────────────────────────────────────────

function URLHausTab() {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useTI('urlhaus');
  const items: any[] = (data?.data || []).filter((u: any) =>
    !search || u.url?.includes(search) || u.host?.includes(search)
  );
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <SourceHeader source="urlhaus" count={data?.total} isMock={data?.mock} onRefresh={refetch} isLoading={isLoading} />
      <div className="border-b border-border bg-card/20 px-4 py-2.5 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter URL or host..."
          className="flex-1 bg-transparent text-xs font-mono focus:outline-none placeholder:text-muted-foreground/50 text-foreground" />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
        {isLoading ? <LoadingRow /> : items.map((u: any) => (
          <div key={u.id} className="p-3.5 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${u.status === 'online' ? 'bg-red-400 animate-pulse' : 'bg-gray-500'}`} />
              <div className="flex-1 min-w-0">
                <code className="text-xs font-mono text-yellow-400 break-all">{u.url}</code>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className={`text-[10px] font-mono font-bold ${u.status === 'online' ? 'text-red-400' : 'text-gray-400'}`}>{u.status?.toUpperCase()}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{u.host}</span>
                  {u.threat && <Tag label={u.threat} />}
                  {u.tags?.map((t: string) => <Tag key={t} label={t} />)}
                </div>
                {u.dateAdded && <p className="text-[10px] font-mono text-muted-foreground/60 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(u.dateAdded), { addSuffix: true })}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Malware Bazaar tab ───────────────────────────────────────────────────────

function MalwareBazaarTab() {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useTI('malwarebazaar');
  const items: any[] = (data?.data || []).filter((m: any) =>
    !search || m.fileName?.toLowerCase().includes(search.toLowerCase()) || m.malwareName?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <SourceHeader source="malwarebazaar" count={data?.total} isMock={data?.mock} onRefresh={refetch} isLoading={isLoading} />
      <div className="border-b border-border bg-card/20 px-4 py-2.5 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter filename or malware family..."
          className="flex-1 bg-transparent text-xs font-mono focus:outline-none placeholder:text-muted-foreground/50 text-foreground" />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
        {isLoading ? <LoadingRow /> : items.map((m: any) => (
          <div key={m.id} className="p-3.5 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-foreground font-bold">{m.fileName || 'Unknown'}</span>
                  {m.malwareName && <span className="text-xs font-mono text-pink-400">{m.malwareName}</span>}
                  {m.fileType && <Tag label={m.fileType} />}
                </div>
                <div className="mt-1 space-y-0.5">
                  <div className="flex items-center gap-2 text-[10px] font-mono text-muted-foreground">
                    <span className="text-muted-foreground/50">SHA256</span>
                    <a href={`https://bazaar.abuse.ch/sample/${m.sha256}/`} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline truncate max-w-[200px] block">{m.sha256?.slice(0, 16)}…</a>
                  </div>
                  {m.fileSize && <span className="text-[10px] font-mono text-muted-foreground">{(m.fileSize / 1024).toFixed(1)} KB</span>}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {m.tags?.map((t: string) => <Tag key={t} label={t} />)}
                </div>
                {m.firstSeen && <p className="text-[10px] font-mono text-muted-foreground/60 mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{formatDistanceToNow(new Date(m.firstSeen), { addSuffix: true })}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CIRCL tab ────────────────────────────────────────────────────────────────

function CirclTab() {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useTI('circl');
  const items: any[] = (data?.data || []).filter((c: any) =>
    !search || c.cveId?.toLowerCase().includes(search.toLowerCase()) || c.description?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <SourceHeader source="circl" count={data?.total} isMock={data?.mock} onRefresh={refetch} isLoading={isLoading} />
      <div className="border-b border-border bg-card/20 px-4 py-2.5 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by CVE ID or description..."
          className="flex-1 bg-transparent text-xs font-mono focus:outline-none placeholder:text-muted-foreground/50 text-foreground" />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
        {isLoading ? <LoadingRow /> : items.map((c: any) => (
          <div key={c.id} className="p-4 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className="shrink-0 flex flex-col gap-1">
                {c.cvss3 != null ? <ScoreBadge score={c.cvss3} /> : c.cvss != null ? <ScoreBadge score={c.cvss} /> : null}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <a href={`https://cve.circl.lu/cve/${c.cveId}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-mono font-bold text-primary hover:underline flex items-center gap-1">
                    {c.cveId} <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  {c.cwe && <Tag label={c.cwe} />}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 line-clamp-3">{c.description}</p>
                {c.published && <p className="text-[10px] font-mono text-muted-foreground/60 mt-1.5 flex items-center gap-1"><Clock className="w-3 h-3" />{format(new Date(c.published), 'yyyy-MM-dd')}</p>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Reddit tab ───────────────────────────────────────────────────────────────

function RedditTab() {
  const [search, setSearch] = useState('');
  const { data, isLoading, refetch } = useTI('reddit');
  const items: any[] = (data?.data || []).filter((p: any) =>
    !search || p.title?.toLowerCase().includes(search.toLowerCase()) || p.subreddit?.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <SourceHeader source="reddit" count={data?.total} isMock={data?.mock} onRefresh={refetch} isLoading={isLoading} />
      <div className="border-b border-border bg-card/20 px-4 py-2.5 flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by title or subreddit..."
          className="flex-1 bg-transparent text-xs font-mono focus:outline-none placeholder:text-muted-foreground/50 text-foreground" />
      </div>
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
        {isLoading ? <LoadingRow /> : items.map((p: any) => (
          <div key={p.id} className="p-4 hover:bg-secondary/20 transition-colors">
            <div className="flex items-start gap-3">
              <div className="shrink-0 text-center">
                <div className="font-mono text-sm font-bold text-orange-500">{p.score}</div>
                <div className="text-[9px] text-muted-foreground font-mono">pts</div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <a href={p.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm font-mono text-foreground hover:text-primary transition-colors font-bold group flex items-center gap-1">
                    {p.title} <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 shrink-0" />
                  </a>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-muted-foreground">
                  <span className="text-primary">r/{p.subreddit}</span>
                  <span>u/{p.author}</span>
                  <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{p.numComments}</span>
                  {p.flair && <Tag label={p.flair} />}
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{p.created ? formatDistanceToNow(new Date(p.created), { addSuffix: true }) : '—'}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── API-key-required tabs ────────────────────────────────────────────────────

function ApiKeyTab({ source }: { source: string }) {
  const { data, isLoading, refetch } = useTI(source as any);
  if (isLoading) return <div className="flex flex-col flex-1 overflow-hidden"><SourceHeader source={source} onRefresh={refetch} isLoading={isLoading} /><LoadingRow /></div>;
  if (data?.requiresKey) return <div className="flex flex-col flex-1 overflow-hidden"><SourceHeader source={source} onRefresh={refetch} isLoading={isLoading} /><RequiresKey source={source} keyName={data.keyName} /></div>;

  const items: any[] = data?.data || [];
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <SourceHeader source={source} count={data?.total} onRefresh={refetch} isLoading={isLoading} />
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
        {items.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground font-mono text-sm">No data available</div>
        ) : items.map((item: any, i: number) => (
          <div key={item.id || i} className="p-4 hover:bg-secondary/20 transition-colors">
            <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function ThreatIntelPage() {
  const [active, setActive] = useState<Source>('overview');

  const renderTab = () => {
    switch (active) {
      case 'overview':     return <OverviewTab onNavigate={setActive} />;
      case 'hackernews':   return <HackerNewsTab />;
      case 'cisa-kev':     return <CisaKevTab />;
      case 'nvd':          return <NvdTab />;
      case 'otx':          return <ApiKeyTab source="otx" />;
      case 'threatfox':    return <ThreatFoxTab />;
      case 'urlhaus':      return <URLHausTab />;
      case 'malwarebazaar':return <MalwareBazaarTab />;
      case 'circl':        return <CirclTab />;
      case 'virustotal':   return <ApiKeyTab source="virustotal" />;
      case 'shodan':       return <ApiKeyTab source="shodan" />;
      case 'abuseipdb':    return <ApiKeyTab source="abuseipdb" />;
      case 'reddit':       return <RedditTab />;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="border-b border-border bg-card/70 flex items-center px-2 overflow-x-auto custom-scrollbar shrink-0" style={{ scrollbarWidth: 'none' }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActive(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-3 text-xs font-mono whitespace-nowrap border-b-2 transition-all shrink-0 ${
              active === tab.id
                ? `border-primary text-primary bg-primary/5`
                : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/40'
            }`}>
            <span className={active === tab.id ? 'text-primary' : 'text-muted-foreground'}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {renderTab()}
      </div>
    </div>
  );
}
