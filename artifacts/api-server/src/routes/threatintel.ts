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
router.get("/cisa-kev", async (_req, res) => {
  const resp = await safeFetch("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json");
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const all = raw.vulnerabilities || [];
    const sorted = [...all].sort((a: any, b: any) => b.dateAdded.localeCompare(a.dateAdded));
    const items = sorted.slice(0, 100).map((v: any) => ({
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
    res.json({ data: items, source: "cisa-kev", total: all.length });
    return;
  }
  const mock = [
    { id: "CVE-2024-21893", cveId: "CVE-2024-21893", vendorProject: "Ivanti", product: "Connect Secure, Policy Secure", vulnerabilityName: "Ivanti Connect Secure SSRF", dateAdded: "2024-02-02", shortDescription: "Server-side request forgery in Ivanti Connect Secure.", requiredAction: "Apply mitigations per vendor instructions.", dueDate: "2024-02-23", ransomware: false },
    { id: "CVE-2024-21887", cveId: "CVE-2024-21887", vendorProject: "Ivanti", product: "Connect Secure, Policy Secure", vulnerabilityName: "Ivanti Command Injection", dateAdded: "2024-01-11", shortDescription: "Command injection in web components of Ivanti Connect Secure.", requiredAction: "Apply mitigations per vendor instructions.", dueDate: "2024-02-02", ransomware: false },
    { id: "CVE-2023-46805", cveId: "CVE-2023-46805", vendorProject: "Ivanti", product: "Connect Secure, Policy Secure", vulnerabilityName: "Ivanti Authentication Bypass", dateAdded: "2024-01-11", shortDescription: "Authentication bypass in web component of Ivanti Connect Secure.", requiredAction: "Apply mitigations per vendor instructions.", dueDate: "2024-02-02", ransomware: false },
  ];
  res.json({ data: mock, source: "cisa-kev", total: mock.length, mock: true });
});

// ─── NVD CVEs ───────────────────────────────────────────────────────────────
router.get("/nvd", async (req, res) => {
  const keyword = (req.query.keyword as string) || "";
  const severity = (req.query.severity as string) || "";
  let url = `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=20`;
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
    res.json({ data: items, source: "nvd", total: raw.totalResults || items.length });
    return;
  }
  const mock = [
    { id: "CVE-2024-1234", cveId: "CVE-2024-1234", description: "A critical remote code execution vulnerability in a popular web framework allows unauthenticated attackers to execute arbitrary code.", published: new Date(Date.now() - 86400000).toISOString(), lastModified: new Date().toISOString(), severity: "CRITICAL", score: 9.8, vectorString: "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H", references: [], weaknesses: ["CWE-78"] },
    { id: "CVE-2024-5678", cveId: "CVE-2024-5678", description: "An SQL injection vulnerability in a database management system allows privilege escalation.", published: new Date(Date.now() - 172800000).toISOString(), lastModified: new Date().toISOString(), severity: "HIGH", score: 8.1, vectorString: "CVSS:3.1/AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H", references: [], weaknesses: ["CWE-89"] },
  ];
  res.json({ data: mock, source: "nvd", total: mock.length, mock: true });
});

// ─── ThreatFox ─────────────────────────────────────────────────────────────
router.get("/threatfox", async (_req, res) => {
  const resp = await safeFetch("https://threatfox-api.abuse.ch/api/v1/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "get_iocs", days: 3 }),
  });
  if (resp?.ok) {
    const data = await resp.json() as any;
    const items = (data.data ?? []).slice(0, 50).map((d: any) => ({
      id: d.id, type: d.ioc_type, value: d.ioc, malware: d.malware,
      confidence: d.confidence_level, firstSeen: d.first_seen, tags: d.tags ?? [],
    }));
    res.json({ data: items, source: "threatfox", total: items.length });
    return;
  }
  const mock = [
    { id: "tf-001", type: "ip:port", value: "185.220.101.33:443", malware: "CobaltStrike", confidence: 90, firstSeen: new Date(Date.now() - 86400000).toISOString(), tags: ["c2", "cobalt_strike"] },
    { id: "tf-002", type: "domain", value: "evil-c2.xyz", malware: "AsyncRAT", confidence: 75, firstSeen: new Date(Date.now() - 172800000).toISOString(), tags: ["rat", "asyncrat"] },
    { id: "tf-003", type: "sha256_hash", value: "a1b2c3d4e5f67890abcd1234567890abcd1234567890abcd1234567890abcd12", malware: "Raccoon Stealer", confidence: 85, firstSeen: new Date(Date.now() - 3600000).toISOString(), tags: ["stealer"] },
    { id: "tf-004", type: "url", value: "http://45.33.32.156/drop/loader.exe", malware: "RedLine", confidence: 80, firstSeen: new Date(Date.now() - 7200000).toISOString(), tags: ["stealer", "loader"] },
  ];
  res.json({ data: mock, source: "threatfox", total: mock.length, mock: true });
});

// ─── URLHaus ────────────────────────────────────────────────────────────────
router.get("/urlhaus", async (_req, res) => {
  const resp = await safeFetch("https://urlhaus-api.abuse.ch/v1/urls/recent/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "limit=30",
  });
  if (resp?.ok) {
    const data = await resp.json() as any;
    const items = (data.urls ?? []).map((u: any) => ({
      id: u.id, url: u.url, status: u.url_status, host: u.host,
      dateAdded: u.date_added, tags: u.tags ?? [], threat: u.threat,
    }));
    res.json({ data: items, source: "urlhaus", total: items.length });
    return;
  }
  const mock = [
    { id: "uh-001", url: "http://45.89.127.238/payload/drop.ps1", status: "online", host: "45.89.127.238", dateAdded: new Date(Date.now() - 43200000).toISOString(), tags: ["powershell", "dropper"], threat: "malware_download" },
    { id: "uh-002", url: "http://malware-dist.ru/files/loader.exe", status: "online", host: "malware-dist.ru", dateAdded: new Date(Date.now() - 86400000).toISOString(), tags: ["loader"], threat: "malware_download" },
    { id: "uh-003", url: "http://185.234.218.23/c2/gate.php", status: "offline", host: "185.234.218.23", dateAdded: new Date(Date.now() - 172800000).toISOString(), tags: ["c2"], threat: "botnet_cc" },
  ];
  res.json({ data: mock, source: "urlhaus", total: mock.length, mock: true });
});

// ─── Malware Bazaar ─────────────────────────────────────────────────────────
router.get("/malwarebazaar", async (_req, res) => {
  const resp = await safeFetch("https://mb-api.abuse.ch/api/v1/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "query=get_recent&selector=100",
  });
  if (resp?.ok) {
    const data = await resp.json() as any;
    const items = (data.data ?? []).slice(0, 50).map((m: any) => ({
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
    res.json({ data: items, source: "malwarebazaar", total: items.length });
    return;
  }
  const mock = [
    { id: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1", sha256: "abc123def456abc123def456abc123def456abc123def456abc123def456abc1", md5: "d41d8cd98f00b204e9800998ecf8427e", sha1: "da39a3ee5e6b4b0d3255bfef95601890afd80709", fileName: "invoice_9823.exe", fileType: "exe", fileSize: 245760, malwareName: "AgentTesla", tags: ["stealer", "agent_tesla"], firstSeen: new Date(Date.now() - 3600000).toISOString(), lastSeen: new Date().toISOString(), reporter: "abuse_ch" },
    { id: "bcd234ef5678bcd234ef5678bcd234ef5678bcd234ef5678bcd234ef5678bcd2", sha256: "bcd234ef5678bcd234ef5678bcd234ef5678bcd234ef5678bcd234ef5678bcd2", md5: "7215ee9c7d9dc229d2921a40e899ec5f", sha1: "adc83b19e793491b1c6ea0fd8b46cd9f32e592fc", fileName: "update.dll", fileType: "dll", fileSize: 102400, malwareName: "Emotet", tags: ["emotet", "banking_trojan"], firstSeen: new Date(Date.now() - 7200000).toISOString(), lastSeen: new Date().toISOString(), reporter: "viriback" },
  ];
  res.json({ data: mock, source: "malwarebazaar", total: mock.length, mock: true });
});

// ─── CIRCL CVE ──────────────────────────────────────────────────────────────
router.get("/circl", async (_req, res) => {
  const resp = await safeFetch("https://cve.circl.lu/api/last/30", {}, 10000);
  if (resp?.ok) {
    const raw = await resp.json() as any[];
    const items = raw.slice(0, 30).map((c: any) => ({
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
    res.json({ data: items, source: "circl", total: items.length });
    return;
  }
  const mock = [
    { id: "CVE-2024-0001", cveId: "CVE-2024-0001", description: "Buffer overflow in network driver allows remote code execution via crafted packets.", published: new Date(Date.now() - 86400000).toISOString(), modified: new Date().toISOString(), cvss: 9.0, cvss3: 9.8, cwe: "CWE-122", references: ["https://example.com/advisory"] },
    { id: "CVE-2024-0002", cveId: "CVE-2024-0002", description: "Cross-site scripting in web portal allows attackers to inject malicious scripts.", published: new Date(Date.now() - 172800000).toISOString(), modified: new Date().toISOString(), cvss: 6.1, cvss3: 6.1, cwe: "CWE-79", references: [] },
  ];
  res.json({ data: mock, source: "circl", total: mock.length, mock: true });
});

// ─── Reddit Security ────────────────────────────────────────────────────────
router.get("/reddit", async (_req, res) => {
  const subs = "netsec+cybersecurity+blueteamsec+Malware+netsecstudents";
  const resp = await safeFetch(`https://www.reddit.com/r/${subs}/hot.json?limit=30`, {
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
    res.json({ data: items, source: "reddit", total: items.length });
    return;
  }
  const mock = [
    { id: "abc1", title: "New ransomware group targeting critical infrastructure sectors", url: "https://reddit.com/r/netsec/comments/abc1", author: "security_researcher", subreddit: "netsec", score: 342, numComments: 45, created: new Date(Date.now() - 3600000).toISOString(), selftext: "", flair: "Threat Intel" },
    { id: "abc2", title: "PoC exploit published for critical RCE in enterprise VPN", url: "https://reddit.com/r/netsec/comments/abc2", author: "vuln_hunter", subreddit: "cybersecurity", score: 289, numComments: 67, created: new Date(Date.now() - 7200000).toISOString(), selftext: "", flair: "Vulnerability" },
    { id: "abc3", title: "Analysis: How APT29 is using legitimate cloud services for C2", url: "https://reddit.com/r/blueteamsec/comments/abc3", author: "blueteam_analyst", subreddit: "blueteamsec", score: 198, numComments: 23, created: new Date(Date.now() - 14400000).toISOString(), selftext: "", flair: "Analysis" },
  ];
  res.json({ data: mock, source: "reddit", total: mock.length, mock: true });
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
router.get("/shodan", async (_req, res) => {
  const key = await getApiKey("shodan");
  if (!key) {
    res.json({ data: [], source: "shodan", total: 0, requiresKey: true, keyName: "SHODAN_API_KEY" });
    return;
  }
  const resp = await safeFetch(`https://api.shodan.io/shodan/alert/info?key=${key}`);
  if (resp?.ok) {
    const raw = await resp.json() as any;
    res.json({ data: Array.isArray(raw) ? raw.slice(0, 20) : [], source: "shodan", total: Array.isArray(raw) ? raw.length : 0 });
    return;
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
router.get("/feodo", async (_req, res) => {
  const resp = await safeFetch("https://feodotracker.abuse.ch/downloads/ipblocklist.json", {}, 12000);
  if (resp?.ok) {
    const raw = await resp.json() as any;
    const list: any[] = Array.isArray(raw) ? raw : (raw.blocklist ?? []);
    const items = list.slice(0, 150).map((e: any) => ({
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
    res.json({ data: items, source: "feodo", total: list.length });
    return;
  }
  const mock = [
    { id: "185.220.101.1:443", ip: "185.220.101.1", port: 443, status: "online", hostname: null, abuseScore: 100, country: "NL", firstSeen: new Date(Date.now() - 86400000).toISOString(), lastSeen: new Date().toISOString(), malware: "Cobalt Strike", asnName: "AS-CHOOPA" },
    { id: "45.61.186.13:8080", ip: "45.61.186.13", port: 8080, status: "online", hostname: null, abuseScore: 95, country: "US", firstSeen: new Date(Date.now() - 172800000).toISOString(), lastSeen: new Date().toISOString(), malware: "QakBot", asnName: "VULTR-AS" },
    { id: "194.165.16.11:443", ip: "194.165.16.11", port: 443, status: "offline", hostname: null, abuseScore: 80, country: "RU", firstSeen: new Date(Date.now() - 604800000).toISOString(), lastSeen: new Date(Date.now() - 86400000).toISOString(), malware: "Emotet", asnName: "SELECTEL" },
  ];
  res.json({ data: mock, source: "feodo", total: mock.length, mock: true });
});

// ─── GitHub Security Advisories ─────────────────────────────────────────────
router.get("/ghsa", async (req, res) => {
  const severity = (req.query.severity as string) || "";
  let url = "https://api.github.com/advisories?per_page=30&type=reviewed&direction=desc&sort=published";
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
    res.json({ data: items, source: "ghsa", total: items.length });
    return;
  }
  const mock = [
    { id: "GHSA-xxxx-yyyy-zzzz", ghsaId: "GHSA-xxxx-yyyy-zzzz", cveId: "CVE-2024-12345", summary: "Critical RCE in popular npm package allows arbitrary code execution", description: "A remote code execution vulnerability exists in the affected package.", severity: "CRITICAL", cvss: 9.8, cwes: ["CWE-78"], publishedAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), ecosystem: "npm", packageName: "example-pkg", references: [], url: "https://github.com/advisories/GHSA-xxxx-yyyy-zzzz" },
    { id: "GHSA-aaaa-bbbb-cccc", ghsaId: "GHSA-aaaa-bbbb-cccc", cveId: "CVE-2024-67890", summary: "SQL injection in Python web framework allows data exfiltration", description: "An SQL injection vulnerability in the query builder permits data exfiltration.", severity: "HIGH", cvss: 7.5, cwes: ["CWE-89"], publishedAt: new Date(Date.now() - 172800000).toISOString(), updatedAt: new Date().toISOString(), ecosystem: "pip", packageName: "example-framework", references: [], url: "https://github.com/advisories/GHSA-aaaa-bbbb-cccc" },
  ];
  res.json({ data: mock, source: "ghsa", total: mock.length, mock: true });
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
  const mock = [
    { id: "CVE-2023-46805", cveId: "CVE-2023-46805", epss: 0.9731, percentile: 0.9999, date: new Date().toISOString().slice(0, 10) },
    { id: "CVE-2024-21887", cveId: "CVE-2024-21887", epss: 0.9654, percentile: 0.9997, date: new Date().toISOString().slice(0, 10) },
    { id: "CVE-2023-4966", cveId: "CVE-2023-4966", epss: 0.9567, percentile: 0.9995, date: new Date().toISOString().slice(0, 10) },
    { id: "CVE-2023-22527", cveId: "CVE-2023-22527", epss: 0.9501, percentile: 0.9993, date: new Date().toISOString().slice(0, 10) },
    { id: "CVE-2024-3400", cveId: "CVE-2024-3400", epss: 0.9489, percentile: 0.9991, date: new Date().toISOString().slice(0, 10) },
  ];
  res.json({ data: mock, source: "epss", total: mock.length, mock: true });
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
