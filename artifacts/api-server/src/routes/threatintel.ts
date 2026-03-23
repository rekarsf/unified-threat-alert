import { Router } from "express";
import { requireAuth, requireScope } from "../middlewares/requireAuth.js";
import { getAuthData, saveAuthData } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireScope("threatintel.view"));

async function safeFetch(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response | null> {
  const { default: nodeFetch } = await import("node-fetch");
  try {
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), timeoutMs);
    const resp = await (nodeFetch as unknown as typeof fetch)(url, { ...options, signal: controller.signal });
    clearTimeout(tid);
    return resp;
  } catch {
    return null;
  }
}

// Maps our short source name → the key field name saved by the Settings page
const SETTINGS_KEY_MAP: Record<string, string> = {
  otx:        "otxApiKey",
  virustotal: "vtApiKey",
  shodan:     "shodanApiKey",
  abuseipdb:  "abuseipdbApiKey",
  greynoise:  "greynoiseApiKey",
  censys:     "censysApiId",
};

// ─── Source registry ────────────────────────────────────────────────────────
interface SourceMeta {
  id: string; name: string; category: string; keyRequired: boolean; docsUrl: string;
  testUrl?: string; testHeaders?: (key: string) => Record<string, string>;
}

const SOURCE_REGISTRY: SourceMeta[] = [
  { id: "hackernews",    name: "Hacker News",       category: "Community",    keyRequired: false, docsUrl: "https://hn.algolia.com/api",              testUrl: "https://hn.algolia.com/api/v1/search?query=security&hitsPerPage=1" },
  { id: "cisa-kev",      name: "CISA KEV",           category: "Vulnerability", keyRequired: false, docsUrl: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog", testUrl: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json" },
  { id: "nvd",           name: "NVD CVE",            category: "Vulnerability", keyRequired: false, docsUrl: "https://nvd.nist.gov/developers/vulnerabilities", testUrl: "https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=1" },
  { id: "threatfox",     name: "ThreatFox",          category: "IOC",          keyRequired: false, docsUrl: "https://threatfox.abuse.ch",              testUrl: "https://threatfox-api.abuse.ch/api/v1/" },
  { id: "urlhaus",       name: "URLHaus",            category: "IOC",          keyRequired: false, docsUrl: "https://urlhaus.abuse.ch",                testUrl: "https://urlhaus-api.abuse.ch/v1/urls/recent/" },
  { id: "malwarebazaar", name: "Malware Bazaar",     category: "Malware",      keyRequired: false, docsUrl: "https://bazaar.abuse.ch",                 testUrl: "https://mb-api.abuse.ch/api/v1/" },
  { id: "circl",         name: "CIRCL CVE",          category: "Vulnerability", keyRequired: false, docsUrl: "https://cve.circl.lu",                    testUrl: "https://cve.circl.lu/api/last/1" },
  { id: "reddit",        name: "Reddit Security",    category: "Community",    keyRequired: false, docsUrl: "https://www.reddit.com/r/netsec",          testUrl: "https://www.reddit.com/r/netsec/top.json?limit=1&t=week" },
  { id: "feodo",         name: "Feodo Tracker",      category: "IOC",          keyRequired: false, docsUrl: "https://feodotracker.abuse.ch",            testUrl: "https://feodotracker.abuse.ch/downloads/ipblocklist.json" },
  { id: "ghsa",          name: "GitHub Advisories",  category: "Vulnerability", keyRequired: false, docsUrl: "https://github.com/advisories",           testUrl: "https://api.github.com/advisories?per_page=1" },
  { id: "epss",          name: "EPSS Scores",        category: "Vulnerability", keyRequired: false, docsUrl: "https://www.first.org/epss",              testUrl: "https://api.first.org/data/v1/epss?limit=1" },
  { id: "otx",           name: "OTX AlienVault",     category: "Threat Intel", keyRequired: true,  docsUrl: "https://otx.alienvault.com/api",          testUrl: "https://otx.alienvault.com/api/v1/user/me", testHeaders: (k) => ({ "X-OTX-API-KEY": k }) },
  { id: "virustotal",    name: "VirusTotal",         category: "Malware",      keyRequired: true,  docsUrl: "https://developers.virustotal.com/reference", testUrl: "https://www.virustotal.com/api/v3/ip_addresses/8.8.8.8", testHeaders: (k) => ({ "x-apikey": k }) },
  { id: "shodan",        name: "Shodan",             category: "Exposure",     keyRequired: true,  docsUrl: "https://developer.shodan.io/api",         testUrl: "https://api.shodan.io/api-info?key=KEY", testHeaders: () => ({}) },
  { id: "abuseipdb",     name: "AbuseIPDB",          category: "Reputation",   keyRequired: true,  docsUrl: "https://www.abuseipdb.com/api",           testUrl: "https://api.abuseipdb.com/api/v2/check?ipAddress=8.8.8.8&maxAgeInDays=7", testHeaders: (k) => ({ Key: k, Accept: "application/json" }) },
  { id: "greynoise",     name: "GreyNoise",          category: "Reputation",   keyRequired: true,  docsUrl: "https://developer.greynoise.io",          testUrl: "https://api.greynoise.io/v3/community/8.8.8.8", testHeaders: (k) => ({ key: k }) },
  { id: "censys",        name: "Censys",             category: "Exposure",     keyRequired: true,  docsUrl: "https://search.censys.io/api",            testUrl: "https://search.censys.io/api/v2/metadata", testHeaders: (k) => ({ Authorization: `Basic ${Buffer.from(k + ":").toString("base64")}` }) },
];

async function getApiKey(name: string): Promise<string | null> {
  try {
    const data = getAuthData() as any;
    // 1. Check dedicated threatintelKeys store (set via /api/threatintel/keys)
    const tiKeys: Record<string, string> = data.threatintelKeys || {};
    if (tiKeys[name]) return tiKeys[name];
    // 2. Check main settings (set via Settings → Integration Settings)
    const settings: Record<string, string> = data.settings || {};
    const settingsKey = SETTINGS_KEY_MAP[name];
    if (settingsKey && settings[settingsKey]) return settings[settingsKey];
    // 3. Fall back to environment variable
    return process.env[`THREATINTEL_${name.toUpperCase()}_KEY`] || null;
  } catch {
    return null;
  }
}

// ─── HackerNews ────────────────────────────────────────────────────────────
router.get("/hackernews", async (req, res) => {
  const query = encodeURIComponent((req.query.query as string) || "security vulnerability exploit");
  const resp = await safeFetch(`https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=25`);
  if (resp?.ok) {
    const data = await resp.json() as { hits?: unknown[]; nbHits?: number };
    res.json({ hits: data.hits ?? [], total: data.nbHits ?? 0, source: "hackernews" });
    return;
  }
  res.json({ hits: [], total: 0, source: "hackernews" });
});

// ─── CISA KEV ──────────────────────────────────────────────────────────────
router.get("/cisa-kev", async (req, res) => {
  const period = parseInt((req.query.period as string) || "7", 10);
  const cutoff = new Date(Date.now() - period * 86400000).toISOString().slice(0, 10);
  const resp = await safeFetch("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json");
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const all = raw.vulnerabilities || [];
    const sorted = [...all].sort((a: any, b: any) => b.dateAdded.localeCompare(a.dateAdded));
    const filtered = sorted.filter((v: any) => v.dateAdded >= cutoff);
    const items = (filtered.length > 0 ? filtered : sorted.slice(0, 50)).map((v: any) => ({
      id: v.cveID,
      cveId: v.cveID,
      vendorProject: v.vendorProject,
      product: v.product,
      vulnerabilityName: v.vulnerabilityName,
      dateAdded: v.dateAdded,
      shortDescription: v.shortDescription,
      requiredAction: v.requiredAction,
      dueDate: v.dueDate,
      ransomware: v.knownRansomwareCampaignUse === "Known",
    }));
    res.json({ data: items, source: "cisa-kev", total: all.length, period });
    return;
  }
  res.json({ data: [], source: "cisa-kev", total: 0, error: "upstream_unavailable" });
});

// ─── NVD CVEs ───────────────────────────────────────────────────────────────
router.get("/nvd", async (req, res) => {
  const keyword = (req.query.keyword as string) || "";
  const severity = (req.query.severity as string) || "";
  const period = parseInt((req.query.period as string) || "7", 10);
  const startDate = new Date(Date.now() - period * 86400000);
  let url = `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20`;
  url += `&pubStartDate=${startDate.toISOString()}`;
  if (keyword) url += `&keywordSearch=${encodeURIComponent(keyword)}`;
  if (severity) url += `&cvssV3Severity=${severity.toUpperCase()}`;

  const resp = await safeFetch(url, {}, 10000);
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const items = (raw.vulnerabilities || []).map((v: any) => {
      const cve = v.cve;
      const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0] || cve.metrics?.cvssMetricV2?.[0];
      return {
        id: cve.id,
        cveId: cve.id,
        description: cve.descriptions?.find((d: any) => d.lang === "en")?.value || "",
        published: cve.published,
        lastModified: cve.lastModified,
        severity: metrics?.cvssData?.baseSeverity || "N/A",
        score: metrics?.cvssData?.baseScore || null,
        vectorString: metrics?.cvssData?.vectorString || "",
        references: (cve.references || []).slice(0, 3).map((r: any) => r.url),
        weaknesses: (cve.weaknesses || []).flatMap((w: any) => w.description?.map((d: any) => d.value)).filter(Boolean).slice(0, 3),
      };
    });
    res.json({ data: items, source: "nvd", total: raw.totalResults || items.length, period });
    return;
  }
  res.json({ data: [], source: "nvd", total: 0, error: "upstream_unavailable" });
});

// ─── ThreatFox ─────────────────────────────────────────────────────────────
router.get("/threatfox", async (req, res) => {
  const period = parseInt((req.query.period as string) || "7", 10);
  const resp = await safeFetch("https://threatfox-api.abuse.ch/api/v1/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "get_iocs", days: period }),
  });
  if (resp?.ok) {
    const data = await resp.json() as any;
    const items = (data.data ?? []).slice(0, 100).map((d: any) => ({
      id: d.id, type: d.ioc_type, value: d.ioc, malware: d.malware,
      confidence: d.confidence_level, firstSeen: d.first_seen, tags: d.tags ?? [],
    }));
    res.json({ data: items, source: "threatfox", total: items.length, period });
    return;
  }
  res.json({ data: [], source: "threatfox", total: 0, error: "upstream_unavailable" });
});

// ─── URLHaus ────────────────────────────────────────────────────────────────
router.get("/urlhaus", async (req, res) => {
  const period = parseInt((req.query.period as string) || "7", 10);
  const limit = period <= 1 ? 30 : period <= 7 ? 50 : 100;
  const resp = await safeFetch("https://urlhaus-api.abuse.ch/v1/urls/recent/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `limit=${limit}`,
  });
  if (resp?.ok) {
    const data = await resp.json() as any;
    const items = (data.urls ?? []).map((u: any) => ({
      id: u.id, url: u.url, status: u.url_status, host: u.host,
      dateAdded: u.date_added, tags: u.tags ?? [], threat: u.threat,
    }));
    res.json({ data: items, source: "urlhaus", total: items.length, period });
    return;
  }
  res.json({ data: [], source: "urlhaus", total: 0, error: "upstream_unavailable" });
});

// ─── Malware Bazaar ─────────────────────────────────────────────────────────
router.get("/malwarebazaar", async (req, res) => {
  const period = parseInt((req.query.period as string) || "7", 10);
  const selector = period <= 1 ? 50 : period <= 7 ? 100 : 200;
  const resp = await safeFetch("https://mb-api.abuse.ch/api/v1/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `query=get_recent&selector=${selector}`,
  });
  if (resp?.ok) {
    const data = await resp.json() as any;
    const items = (data.data ?? []).slice(0, 100).map((m: any) => ({
      id: m.sha256_hash,
      sha256: m.sha256_hash,
      md5: m.md5_hash,
      sha1: m.sha1_hash,
      fileName: m.file_name,
      fileType: m.file_type,
      fileSize: m.file_size,
      malwareName: m.signature,
      tags: m.tags ?? [],
      firstSeen: m.first_seen,
      lastSeen: m.last_seen,
      reporter: m.reporter,
    }));
    res.json({ data: items, source: "malwarebazaar", total: items.length, period });
    return;
  }
  res.json({ data: [], source: "malwarebazaar", total: 0, error: "upstream_unavailable" });
});

// ─── CIRCL CVE ──────────────────────────────────────────────────────────────
router.get("/circl", async (req, res) => {
  const period = parseInt((req.query.period as string) || "7", 10);
  const count = period <= 1 ? 20 : period <= 7 ? 30 : period <= 14 ? 50 : 100;
  const resp = await safeFetch(`https://cve.circl.lu/api/last/${count}`, {}, 10000);
  if (resp?.ok) {
    const raw = await resp.json() as any[];
    const items = raw.slice(0, count).map((c: any) => ({
      id: c.id || c.CVE_data_meta?.ID,
      cveId: c.id || c.CVE_data_meta?.ID,
      description: c.summary || c.description?.description_data?.[0]?.value || "",
      published: c.Published || c.publishedDate,
      modified: c.Modified || c.lastModifiedDate,
      cvss: c.cvss,
      cvss3: c.cvss3,
      cwe: c.cwe,
      references: (c.references || []).slice(0, 3),
    }));
    res.json({ data: items, source: "circl", total: items.length, period });
    return;
  }
  res.json({ data: [], source: "circl", total: 0, error: "upstream_unavailable" });
});

// ─── Reddit Security ────────────────────────────────────────────────────────
router.get("/reddit", async (req, res) => {
  const period = parseInt((req.query.period as string) || "7", 10);
  const timeFilter = period <= 1 ? "day" : period <= 7 ? "week" : "month";
  const limit = period <= 1 ? 20 : period <= 7 ? 30 : 50;
  const subs = "netsec+cybersecurity+blueteamsec+Malware+netsecstudents";
  const resp = await safeFetch(`https://www.reddit.com/r/${subs}/top.json?t=${timeFilter}&limit=${limit}`, {
    headers: { "User-Agent": "UnifiedThreatAlert/1.0" },
  });
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const posts = (raw.data?.children || []).map((c: any) => c.data);
    const items = posts.map((p: any) => ({
      id: p.id,
      title: p.title,
      url: p.url,
      author: p.author,
      subreddit: p.subreddit,
      score: p.score,
      numComments: p.num_comments,
      created: new Date(p.created_utc * 1000).toISOString(),
      selftext: (p.selftext || "").slice(0, 200),
      flair: p.link_flair_text,
    }));
    res.json({ data: items, source: "reddit", total: items.length, period });
    return;
  }
  res.json({ data: [], source: "reddit", total: 0, error: "upstream_unavailable" });
});

// ─── OTX (AlienVault) ───────────────────────────────────────────────────────
router.get("/otx", async (_req, res) => {
  const key = await getApiKey("otx");
  if (!key) {
    res.json({ data: [], source: "otx", total: 0, requiresKey: true, keyName: "OTX_API_KEY" });
    return;
  }
  const resp = await safeFetch("https://otx.alienvault.com/api/v1/pulses/subscribed?limit=20", {
    headers: { "X-OTX-API-KEY": key },
  });
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const items = (raw.results || []).map((p: any) => ({
      id: p.id, name: p.name, description: p.description,
      author: p.author_name, created: p.created,
      tags: p.tags, tlp: p.tlp,
      indicatorCount: p.indicators_count,
      malwareFamilies: p.malware_families?.map((m: any) => m.display_name),
      references: (p.references || []).slice(0, 3),
    }));
    res.json({ data: items, source: "otx", total: raw.count || items.length });
    return;
  }
  res.json({ data: [], source: "otx", total: 0, error: "Failed to fetch OTX data" });
});

// ─── VirusTotal ─────────────────────────────────────────────────────────────
router.get("/virustotal", async (_req, res) => {
  const key = await getApiKey("virustotal");
  if (!key) {
    res.json({ data: [], source: "virustotal", total: 0, requiresKey: true, keyName: "VIRUSTOTAL_API_KEY" });
    return;
  }
  const resp = await safeFetch("https://www.virustotal.com/api/v3/feeds/files?cursor=MTY%3D&limit=20", {
    headers: { "x-apikey": key },
  });
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const items = (raw.data || []).map((f: any) => ({
      id: f.id, sha256: f.attributes?.sha256, md5: f.attributes?.md5,
      name: f.attributes?.meaningful_name || f.attributes?.names?.[0],
      type: f.attributes?.type_description,
      size: f.attributes?.size,
      lastAnalysisDate: f.attributes?.last_analysis_date,
      detections: f.attributes?.last_analysis_stats?.malicious || 0,
      totalEngines: Object.values(f.attributes?.last_analysis_stats || {}).reduce((a: any, b: any) => a + b, 0),
      tags: f.attributes?.tags || [],
    }));
    res.json({ data: items, source: "virustotal", total: items.length });
    return;
  }
  res.json({ data: [], source: "virustotal", total: 0, error: "Failed to fetch VirusTotal data" });
});

// ─── Shodan ─────────────────────────────────────────────────────────────────
router.get("/shodan", async (req, res) => {
  const key = await getApiKey("shodan");
  if (!key) {
    res.json({ data: [], source: "shodan", total: 0, requiresKey: true, keyName: "SHODAN_API_KEY" });
    return;
  }

  const userQuery = req.query.query as string | undefined;
  const query = userQuery || "vuln:cve-2024";

  const resp = await safeFetch(
    `https://api.shodan.io/shodan/host/search?key=${key}&query=${encodeURIComponent(query)}`,
    {}, 15000
  );

  if (resp?.ok) {
    const raw = await resp.json() as any;
    if (raw.matches) {
      const items = raw.matches.slice(0, 50).map((m: any) => ({
        ip: m.ip_str, port: m.port, org: m.org, isp: m.isp,
        os: m.os, product: m.product, version: m.version,
        country: m.location?.country_name, city: m.location?.city,
        lat: m.location?.latitude, lng: m.location?.longitude,
        vulns: m.vulns ? Object.keys(m.vulns) : [],
        timestamp: m.timestamp,
      }));
      res.json({ data: items, source: "shodan", total: raw.total ?? items.length, tier: "paid", query });
      return;
    }
  }

  if (!userQuery) {
    const freeResp = await safeFetch(
      `https://api.shodan.io/shodan/host/search?key=${key}&query=${encodeURIComponent("port:22,3389,445")}`,
      {}, 15000
    );
    if (freeResp?.ok) {
      const freeRaw = await freeResp.json() as any;
      const items = (freeRaw.matches || []).slice(0, 50).map((m: any) => ({
        ip: m.ip_str, port: m.port, org: m.org, isp: m.isp,
        os: m.os, product: m.product, version: m.version,
        country: m.location?.country_name, city: m.location?.city,
        lat: m.location?.latitude, lng: m.location?.longitude,
        timestamp: m.timestamp,
      }));
      res.json({ data: items, source: "shodan", total: freeRaw.total ?? items.length, tier: "free", query: "port:22,3389,445" });
      return;
    }
  }

  res.json({ data: [], source: "shodan", total: 0, error: "Failed to fetch Shodan data" });
});

// ─── AbuseIPDB ──────────────────────────────────────────────────────────────
router.get("/abuseipdb", async (_req, res) => {
  const key = await getApiKey("abuseipdb");
  if (!key) {
    res.json({ data: [], source: "abuseipdb", total: 0, requiresKey: true, keyName: "ABUSEIPDB_API_KEY" });
    return;
  }
  const resp = await safeFetch("https://api.abuseipdb.com/api/v2/blacklist?confidenceMinimum=90&limit=50", {
    headers: { Key: key, Accept: "application/json" },
  });
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const items = (raw.data || []).slice(0, 50).map((ip: any) => ({
      ip: ip.ipAddress,
      score: ip.abuseConfidenceScore,
      country: ip.countryCode,
      isp: ip.isp,
      usageType: ip.usageType,
      domain: ip.domain,
      lastReported: ip.lastReportedAt,
      totalReports: ip.totalReports,
    }));
    res.json({ data: items, source: "abuseipdb", total: items.length });
    return;
  }
  res.json({ data: [], source: "abuseipdb", total: 0, error: "Failed to fetch AbuseIPDB data" });
});

// ─── AbuseIPDB single IP check ───────────────────────────────────────────────
router.get("/abuseipdb/check/:ip", async (req, res) => {
  const key = await getApiKey("abuseipdb");
  if (!key) {
    res.json({ error: "no_key", requiresKey: true });
    return;
  }
  const { ip } = req.params;
  const days = req.query.days || "90";
  const resp = await safeFetch(
    `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=${days}&verbose`,
    { headers: { Key: key, Accept: "application/json" } },
    15000
  );
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const d = raw.data || {};
    res.json({
      ip: d.ipAddress, isPublic: d.isPublic, abuseScore: d.abuseConfidenceScore,
      country: d.countryCode, isp: d.isp, domain: d.domain, usageType: d.usageType,
      totalReports: d.totalReports, numDistinctUsers: d.numDistinctUsers,
      lastReported: d.lastReportedAt, isWhitelisted: d.isWhitelisted,
      reports: (d.reports || []).slice(0, 10).map((r: any) => ({
        reportedAt: r.reportedAt, comment: r.comment, categories: r.categories,
        reporterId: r.reporterId, reporterCountryCode: r.reporterCountryCode,
      })),
      source: "abuseipdb",
    });
    return;
  }
  res.json({ ip, error: "AbuseIPDB check failed", source: "abuseipdb" });
});

// ─── Batch GeoIP (for world map) ─────────────────────────────────────────────
router.post("/geoip", async (req, res) => {
  const ips: string[] = req.body?.ips || [];
  if (!ips.length || ips.length > 100) {
    res.status(400).json({ error: "Provide 1-100 IPs in { ips: [...] }" });
    return;
  }

  const batchResp = await safeFetch(
    "http://ip-api.com/batch?fields=query,country,countryCode,city,lat,lon,isp,org,as",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ips.map(ip => ({ query: ip }))) },
    15000
  );

  if (batchResp?.ok) {
    const results = await batchResp.json() as any[];
    const mapped = results.map((r: any) => ({
      ip: r.query, country: r.country, countryCode: r.countryCode,
      city: r.city, lat: r.lat, lng: r.lon, isp: r.isp, org: r.org, as: r.as,
    }));
    res.json({ results: mapped, total: mapped.length });
    return;
  }

  const results = await Promise.all(
    ips.slice(0, 50).map(async (ip) => {
      const r = await safeFetch(`http://ip-api.com/json/${ip}?fields=query,country,countryCode,city,lat,lon,isp`);
      if (r?.ok) {
        const d = await r.json() as any;
        return { ip: d.query || ip, country: d.country, countryCode: d.countryCode, city: d.city, lat: d.lat, lng: d.lon, isp: d.isp };
      }
      return { ip };
    })
  );
  res.json({ results, total: results.length });
});

// ─── Overview (aggregated) ──────────────────────────────────────────────────
router.get("/overview", async (_req, res) => {
  const sources = [
    { name: "cisa-kev", url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", type: "get" },
    { name: "threatfox", url: "https://threatfox-api.abuse.ch/api/v1/", type: "post", body: JSON.stringify({ query: "get_iocs", days: 1 }) },
    { name: "urlhaus", url: "https://urlhaus-api.abuse.ch/v1/urls/recent/", type: "post-form", body: "limit=5" },
    { name: "hackernews", url: "https://hn.algolia.com/api/v1/search?query=security+vulnerability+exploit&tags=story&hitsPerPage=5", type: "get" },
    { name: "reddit", url: "https://www.reddit.com/r/netsec+cybersecurity.json?limit=5", type: "get", headers: { "User-Agent": "UnifiedThreatAlert/1.0" } },
    { name: "malwarebazaar", url: "https://mb-api.abuse.ch/api/v1/", type: "post-form", body: "query=get_recent&selector=10" },
  ];

  const results: Record<string, { count: number; items: any[]; ok: boolean }> = {};

  await Promise.all(sources.map(async (src) => {
    try {
      let opts: RequestInit = {};
      if (src.type === "post") { opts = { method: "POST", headers: { "Content-Type": "application/json" }, body: src.body }; }
      else if (src.type === "post-form") { opts = { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: src.body }; }
      if (src.headers) opts.headers = { ...opts.headers, ...src.headers };
      const resp = await safeFetch(src.url, opts, 6000);
      if (!resp?.ok) { results[src.name] = { count: 0, items: [], ok: false }; return; }
      const raw = await resp.json() as any;
      let items: any[] = [];
      if (src.name === "cisa-kev") {
        const sorted = [...(raw.vulnerabilities || [])].sort((a: any, b: any) => b.dateAdded.localeCompare(a.dateAdded));
        items = sorted.slice(0, 5).map((v: any) => ({ title: v.vulnerabilityName, subtitle: `${v.vendorProject} — ${v.product}`, date: v.dateAdded, severity: v.knownRansomwareCampaignUse === "Known" ? "CRITICAL" : "HIGH", id: v.cveID, url: `https://www.cisa.gov/known-exploited-vulnerabilities-catalog` }));
      } else if (src.name === "threatfox") {
        items = (raw.data || []).slice(0, 5).map((d: any) => ({ title: d.ioc, subtitle: d.malware || d.ioc_type, date: d.first_seen, severity: d.confidence_level > 80 ? "HIGH" : "MEDIUM", id: d.id, url: `https://threatfox.abuse.ch/ioc/${d.id}` }));
      } else if (src.name === "urlhaus") {
        items = (raw.urls || []).slice(0, 5).map((u: any) => ({ title: u.url, subtitle: u.host, date: u.date_added, severity: u.url_status === "online" ? "HIGH" : "LOW", id: u.id, url: `https://urlhaus.abuse.ch/url/${u.id}` }));
      } else if (src.name === "hackernews") {
        items = (raw.hits || []).slice(0, 5).map((h: any) => ({ title: h.title, subtitle: h.author, date: h.created_at, severity: "INFO", id: h.objectID, url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}` }));
      } else if (src.name === "reddit") {
        items = (raw.data?.children || []).slice(0, 5).map((c: any) => ({ title: c.data.title, subtitle: `r/${c.data.subreddit}`, date: new Date(c.data.created_utc * 1000).toISOString(), severity: "INFO", id: c.data.id, url: c.data.url }));
      } else if (src.name === "malwarebazaar") {
        items = (raw.data || []).slice(0, 5).map((m: any) => ({ title: m.signature || m.file_name, subtitle: m.file_type, date: m.first_seen, severity: "HIGH", id: m.sha256_hash, url: `https://bazaar.abuse.ch/sample/${m.sha256_hash}` }));
      }
      results[src.name] = { count: items.length, items, ok: true };
    } catch {
      results[src.name] = { count: 0, items: [], ok: false };
    }
  }));

  res.json({ sources: results, timestamp: new Date().toISOString() });
});

// ─── Feodo Tracker ──────────────────────────────────────────────────────────
router.get("/feodo", async (req, res) => {
  const period = parseInt((req.query.period as string) || "7", 10);
  const cutoff = new Date(Date.now() - period * 86400000);
  const resp = await safeFetch("https://feodotracker.abuse.ch/downloads/ipblocklist.json", {}, 12000);
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const list: any[] = Array.isArray(raw) ? raw : (raw.blocklist ?? []);
    const filtered = list.filter((e: any) => {
      const seen = e.first_seen ? new Date(e.first_seen) : null;
      return !seen || seen >= cutoff;
    });
    const final = filtered.length > 0 ? filtered : list.slice(0, 50);
    const items = final.slice(0, 200).map((e: any) => ({
      id: `${e.ip_address}:${e.port}`,
      ip: e.ip_address,
      port: e.port,
      status: e.status,
      hostname: e.hostname,
      abuseScore: e.abuse_ch_score ?? null,
      country: e.country,
      firstSeen: e.first_seen,
      lastSeen: e.last_online ?? e.last_seen,
      malware: e.malware,
      asnName: e.as_name,
    }));
    res.json({ data: items, source: "feodo", total: list.length, period });
    return;
  }
  res.json({ data: [], source: "feodo", total: 0, error: "upstream_unavailable" });
});

// ─── GitHub Security Advisories ─────────────────────────────────────────────
router.get("/ghsa", async (req, res) => {
  const severity = (req.query.severity as string) || "";
  const period = parseInt((req.query.period as string) || "7", 10);
  const perPage = period <= 1 ? 20 : period <= 7 ? 30 : 50;
  let url = `https://api.github.com/advisories?per_page=${perPage}&type=reviewed&direction=desc&sort=published`;
  if (severity) url += `&severity=${severity}`;
  const resp = await safeFetch(url, {
    headers: { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "UnifiedThreatAlert/1.0" },
  }, 12000);
  if (resp?.ok) {
    const raw = await resp.json() as any[];
    const items = (Array.isArray(raw) ? raw : []).map((a: any) => ({
      id: a.ghsa_id,
      ghsaId: a.ghsa_id,
      cveId: a.cve_id,
      summary: a.summary,
      description: (a.description || "").slice(0, 300),
      severity: (a.severity || "unknown").toUpperCase(),
      cvss: a.cvss?.score ?? null,
      cwes: (a.cwes || []).map((c: any) => c.cwe_id),
      publishedAt: a.published_at,
      updatedAt: a.updated_at,
      ecosystem: a.vulnerabilities?.[0]?.package?.ecosystem,
      packageName: a.vulnerabilities?.[0]?.package?.name,
      references: (a.references || []).slice(0, 3),
      url: a.html_url,
    }));
    res.json({ data: items, source: "ghsa", total: items.length, period });
    return;
  }
  res.json({ data: [], source: "ghsa", total: 0, error: "upstream_unavailable" });
});

// ─── EPSS (Exploit Prediction Scoring System) ────────────────────────────────
router.get("/epss", async (req, res) => {
  const cve = (req.query.cve as string) || "";
  let url = "https://api.first.org/data/v1/epss?limit=50&order=!epss";
  if (cve) url = `https://api.first.org/data/v1/epss?cve=${encodeURIComponent(cve)}`;
  const resp = await safeFetch(url, {}, 12000);
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const items = (raw.data ?? []).map((e: any) => ({
      id: e.cve,
      cveId: e.cve,
      epss: parseFloat(e.epss),
      percentile: parseFloat(e.percentile),
      date: e.date,
    }));
    res.json({ data: items, source: "epss", total: raw.total ?? items.length, date: raw.date });
    return;
  }
  res.json({ data: [], source: "epss", total: 0, error: "upstream_unavailable" });
});

// ─── GeoIP ──────────────────────────────────────────────────────────────────
router.get("/geoip/:ip", async (req, res) => {
  const { ip } = req.params;
  const resp = await safeFetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,city,lat,lon,isp`);
  if (resp?.ok) {
    const data = await resp.json() as any;
    res.json({ ip, country: data.country, countryCode: data.countryCode, city: data.city, lat: data.lat, lng: data.lon, isp: data.isp });
    return;
  }
  res.json({ ip });
});

// ─── Save API keys ───────────────────────────────────────────────────────────
router.post("/keys", requireScope("admin.settings"), (req, res) => {
  const data = getAuthData() as any;
  data.threatintelKeys = { ...(data.threatintelKeys || {}), ...req.body };
  saveAuthData(data);
  res.json({ ok: true });
});

router.get("/keys", requireScope("admin.settings"), (_req, res) => {
  const data = getAuthData() as any;
  const keys = data.threatintelKeys || {};
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(keys)) {
    const s = String(v);
    masked[k] = s.length > 8 ? s.slice(0, 4) + "••••" + s.slice(-4) : "••••••••";
  }
  res.json({ keys: masked, configured: Object.keys(keys) });
});

// ─── Connection status for all sources ───────────────────────────────────────
router.get("/status", async (_req, res) => {
  const results = await Promise.all(
    SOURCE_REGISTRY.map(async (s) => {
      const key = s.keyRequired ? await getApiKey(s.id) : null;
      const hasKey = s.keyRequired ? !!key : true;
      return {
        id: s.id,
        name: s.name,
        category: s.category,
        keyRequired: s.keyRequired,
        hasKey,
        docsUrl: s.docsUrl,
        status: s.keyRequired
          ? (hasKey ? "configured" : "no-key")
          : "available",
      };
    })
  );
  res.json({ sources: results, checkedAt: new Date().toISOString() });
});

// ─── Live connectivity test for a single source ───────────────────────────────
router.post("/test/:sourceId", requireScope("admin.settings"), async (req, res) => {
  const { sourceId } = req.params;
  const meta = SOURCE_REGISTRY.find(s => s.id === sourceId);
  if (!meta || !meta.testUrl) {
    res.status(404).json({ error: "unknown_source" });
    return;
  }

  let url = meta.testUrl;
  const headers: Record<string, string> = { "User-Agent": "UnifiedThreatAlert/1.0" };

  if (meta.keyRequired) {
    const key = await getApiKey(sourceId);
    if (!key) {
      res.json({ source: sourceId, connected: false, reason: "no_key", testedAt: new Date().toISOString() });
      return;
    }
    // Shodan embeds key in URL
    if (sourceId === "shodan") url = `https://api.shodan.io/api-info?key=${key}`;
    else if (meta.testHeaders) Object.assign(headers, meta.testHeaders(key));
  }

  const resp = await safeFetch(url, { method: "GET", headers }, 10000);
  const connected = resp !== null && resp.status < 500;
  res.json({
    source: sourceId,
    connected,
    httpStatus: resp?.status ?? null,
    reason: !resp ? "timeout" : (connected ? "ok" : `http_${resp.status}`),
    testedAt: new Date().toISOString(),
  });
});

export default router;
