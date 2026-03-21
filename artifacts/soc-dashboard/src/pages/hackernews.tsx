import React, { useState } from 'react';
import { useGetHackerNews } from '@workspace/api-client-react';
import { ExternalLink, MessageCircle, ThumbsUp, Clock, Search, Rss } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SECURITY_QUERIES = [
  'security vulnerability exploit',
  'ransomware attack',
  'zero-day CVE',
  'malware analysis',
  'APT threat actor',
];

export default function HackerNewsPage() {
  const [query, setQuery] = useState(SECURITY_QUERIES[0]);
  const [customQuery, setCustomQuery] = useState('');
  const { data, isLoading, refetch } = useGetHackerNews({ query });
  const hits = data?.hits || [];

  const handleSearch = () => {
    if (customQuery.trim()) setQuery(customQuery.trim());
  };

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-border bg-card/50 p-4">
        <h1 className="font-mono text-lg font-bold text-foreground tracking-widest uppercase flex items-center gap-2">
          <Rss className="w-5 h-5 text-orange-400" /> Threat Intel Feed — Hacker News
        </h1>
        <div className="text-xs text-muted-foreground font-mono mt-0.5">
          Security-relevant posts from Hacker News — {hits.length} results for "{query}"
        </div>
      </div>

      {/* Quick filter pills */}
      <div className="border-b border-border bg-card/30 p-3 flex flex-wrap gap-2 items-center">
        {SECURITY_QUERIES.map(q => (
          <button
            key={q}
            onClick={() => setQuery(q)}
            className={`text-xs font-mono px-3 py-1.5 rounded-full border transition-all ${
              query === q
                ? 'text-primary bg-primary/20 border-primary/50'
                : 'text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
            }`}
          >
            {q}
          </button>
        ))}
        <div className="flex gap-2 ml-auto">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
            <input
              type="text"
              placeholder="Custom search..."
              value={customQuery}
              onChange={e => setCustomQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              className="bg-background border border-border rounded-md h-8 pl-8 pr-3 text-xs font-mono text-foreground focus:outline-none focus:border-primary/50 w-48"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-3 h-8 bg-primary/20 border border-primary/40 text-primary font-mono text-xs rounded-md hover:bg-primary/30 transition-colors"
          >
            GO
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground font-mono text-sm">
            Fetching threat intelligence...
          </div>
        ) : hits.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground font-mono text-sm">
            No results found for "{query}"
          </div>
        ) : hits.map((item: any) => (
          <div key={item.objectID} className="p-4 hover:bg-secondary/30 transition-colors">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded-lg bg-orange-400/10 border border-orange-400/20 font-mono text-xs text-orange-400 font-bold">
                {String(item.points || 0)}
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={item.url || `https://news.ycombinator.com/item?id=${item.objectID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-foreground hover:text-primary transition-colors font-bold flex items-center gap-1 group"
                >
                  {item.title}
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                </a>
                {item.url && (
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                    {(() => { try { return new URL(item.url).hostname; } catch { return item.url; }})()}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-1.5 text-[10px] font-mono text-muted-foreground">
                  <span className="text-primary">{item.author}</span>
                  <span className="flex items-center gap-1">
                    <ThumbsUp className="w-3 h-3" /> {item.points || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> {item.num_comments || 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: true }) : '—'}
                  </span>
                  <a
                    href={`https://news.ycombinator.com/item?id=${item.objectID}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-400/60 hover:text-orange-400 transition-colors"
                  >
                    HN Discussion
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
