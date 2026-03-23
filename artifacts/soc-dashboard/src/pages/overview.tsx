import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { WorldMap } from '@/components/world-map';
import { Link } from 'wouter';
import {
  Shield, Database, Activity, Globe, AlertTriangle, Check, X,
  ExternalLink, Settings, Rss, Bug, Link2, Package, FileCode,
  Eye, Hash, MessageCircle, Search as SearchIcon, Zap, Server,
  Radio, Lock
} from 'lucide-react';

interface Solution {
  id: string;
  name: string;
  category: string;
  configured: boolean;
  icon: string;
}

interface TiFeed {
  id: string;
  name: string;
  configured: boolean;
  requiresKey: boolean;
}

const SOLUTION_META: Record<string, { icon: React.ReactNode; color: string; description: string; path: string }> = {
  s1: { icon: <Shield className="w-5 h-5" />, color: 'text-blue-400', description: 'Endpoint Detection & Response', path: '/s1' },
  lr: { icon: <Database className="w-5 h-5" />, color: 'text-emerald-400', description: 'SIEM Log Management', path: '/lr' },
};

const TI_ICONS: Record<string, React.ReactNode> = {
  'cisa-kev': <Shield className="w-3.5 h-3.5" />,
  'nvd': <Database className="w-3.5 h-3.5" />,
  'threatfox': <Bug className="w-3.5 h-3.5" />,
  'urlhaus': <Link2 className="w-3.5 h-3.5" />,
  'malwarebazaar': <Package className="w-3.5 h-3.5" />,
  'circl': <FileCode className="w-3.5 h-3.5" />,
  'feodo': <Radio className="w-3.5 h-3.5" />,
  'ghsa': <Zap className="w-3.5 h-3.5" />,
  'reddit': <MessageCircle className="w-3.5 h-3.5" />,
  'epss': <Activity className="w-3.5 h-3.5" />,
  'shodan': <SearchIcon className="w-3.5 h-3.5" />,
  'virustotal': <Eye className="w-3.5 h-3.5" />,
  'abuseipdb': <Hash className="w-3.5 h-3.5" />,
  'otx': <Globe className="w-3.5 h-3.5" />,
};

function useConnectionStatus() {
  const { token } = useAuthStore();
  return useQuery({
    queryKey: ['/api/admin/connection-status'],
    queryFn: async () => {
      const r = await fetch('/api/admin/connection-status', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!r.ok) return { solutions: [], tiFeeds: [] };
      return r.json() as Promise<{ solutions: Solution[]; tiFeeds: TiFeed[] }>;
    },
    staleTime: 30_000,
    enabled: !!token,
  });
}

function SolutionCard({ solution }: { solution: Solution }) {
  const meta = SOLUTION_META[solution.id] || { icon: <Server className="w-5 h-5" />, color: 'text-muted-foreground', description: '', path: '#' };

  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${
      solution.configured
        ? 'border-primary/30 bg-primary/5 hover:bg-primary/8'
        : 'border-border bg-card/50 hover:bg-card/80'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            solution.configured ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'
          }`}>
            {meta.icon}
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{solution.name}</h3>
            <p className="text-xs text-muted-foreground">{meta.description}</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          solution.configured
            ? 'bg-healthy/15 text-healthy'
            : 'bg-muted text-muted-foreground'
        }`}>
          {solution.configured ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
          {solution.configured ? 'Connected' : 'Not Configured'}
        </div>
      </div>
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <span className="text-xs text-muted-foreground uppercase tracking-wider">{solution.category.toUpperCase()}</span>
        {solution.configured ? (
          <Link href={meta.path} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
            Open Dashboard <ExternalLink className="w-3 h-3" />
          </Link>
        ) : (
          <Link href="/settings" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            Configure <Settings className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

function TiFeedRow({ feed }: { feed: TiFeed }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-2.5">
        <span className={feed.configured ? 'text-primary' : 'text-muted-foreground/50'}>
          {TI_ICONS[feed.id] || <Rss className="w-3.5 h-3.5" />}
        </span>
        <span className={`text-sm ${feed.configured ? 'text-foreground' : 'text-muted-foreground'}`}>
          {feed.name}
        </span>
        {feed.requiresKey && (
          <Lock className="w-3 h-3 text-muted-foreground/50" />
        )}
      </div>
      <div className={`w-2 h-2 rounded-full ${feed.configured ? 'bg-healthy' : 'bg-muted-foreground/30'}`} />
    </div>
  );
}

export default function OverviewPage() {
  const { data, isLoading } = useConnectionStatus();

  const solutions = data?.solutions || [];
  const tiFeeds = data?.tiFeeds || [];
  const connectedSolutions = solutions.filter(s => s.configured).length;
  const connectedFeeds = tiFeeds.filter(f => f.configured).length;
  const openFeeds = tiFeeds.filter(f => f.configured && !f.requiresKey).length;
  const keyFeeds = tiFeeds.filter(f => f.configured && f.requiresKey).length;

  return (
    <div className="h-full w-full flex flex-col bg-background">
      <div className="h-12 border-b border-border bg-card/50 backdrop-blur-sm flex items-center px-4 gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Overview</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full bg-healthy" />
            <span className="text-muted-foreground">{connectedSolutions} Solutions</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-muted-foreground">{connectedFeeds} TI Feeds</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative">
          <WorldMap endpoints={[]} onSelect={() => {}} />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-background/60 via-transparent to-background/60" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent to-background/80" />
        </div>

        <div className="w-[380px] border-l border-border bg-card/30 backdrop-blur-sm overflow-y-auto custom-scrollbar shrink-0">
          <div className="p-4 space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Solutions</h2>
                <span className="text-xs text-muted-foreground ml-auto">
                  {connectedSolutions}/{solutions.length} active
                </span>
              </div>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <div key={i} className="h-28 rounded-xl bg-muted/30 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {solutions.map(s => <SolutionCard key={s.id} solution={s} />)}
                </div>
              )}
            </div>

            <div className="h-px bg-border/50" />

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Threat Intel Feeds</h2>
                <span className="text-xs text-muted-foreground ml-auto">
                  {connectedFeeds}/{tiFeeds.length} active
                </span>
              </div>

              {openFeeds > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-muted-foreground font-medium px-3 py-1.5 uppercase tracking-wider">Open Feeds</p>
                  {tiFeeds.filter(f => !f.requiresKey).map(f => (
                    <TiFeedRow key={f.id} feed={f} />
                  ))}
                </div>
              )}

              {tiFeeds.some(f => f.requiresKey) && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground font-medium px-3 py-1.5 uppercase tracking-wider">API Key Required</p>
                  {tiFeeds.filter(f => f.requiresKey).map(f => (
                    <TiFeedRow key={f.id} feed={f} />
                  ))}
                </div>
              )}

              {!isLoading && tiFeeds.some(f => f.requiresKey && !f.configured) && (
                <Link href="/settings" className="flex items-center justify-center gap-1.5 mt-3 py-2 px-3 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors">
                  <Settings className="w-3 h-3" />
                  Configure API keys in Settings
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
