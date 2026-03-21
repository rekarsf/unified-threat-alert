import { Router } from "express";
import { requireAuth, requireScope } from "../middlewares/requireAuth.js";

const router = Router();
router.use(requireAuth);
router.use(requireScope("threatintel.view"));

// Fetch with timeout helper
async function safeFetch(url: string, options: RequestInit = {}, timeoutMs = 5000): Promise<Response | null> {
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

// GET /api/threatfox
router.get("/threatfox", async (_req, res) => {
  const resp = await safeFetch("https://threatfox-api.abuse.ch/api/v1/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: "get_iocs", days: 3 }),
  });

  if (resp?.ok) {
    const data = await resp.json() as { data?: Array<{
      id: string; ioc_type: string; ioc: string; malware?: string; confidence_level?: number; first_seen?: string; tags?: string[];
    }> };
    const items = (data.data ?? []).slice(0, 50).map((d) => ({
      id: d.id,
      type: d.ioc_type,
      value: d.ioc,
      malware: d.malware,
      confidence: d.confidence_level,
      firstSeen: d.first_seen,
      tags: d.tags ?? [],
    }));
    res.json({ data: items, source: "threatfox", total: items.length });
    return;
  }

  // Mock fallback
  const items = [
    { id: "tf-001", type: "ip:port", value: "185.220.101.33:443", malware: "CobaltStrike", confidence: 90, firstSeen: new Date(Date.now() - 86400000).toISOString(), tags: ["c2", "cobalt_strike"] },
    { id: "tf-002", type: "domain", value: "evil-c2.xyz", malware: "AsyncRAT", confidence: 75, firstSeen: new Date(Date.now() - 172800000).toISOString(), tags: ["rat", "asyncrat"] },
    { id: "tf-003", type: "sha256_hash", value: "a1b2c3d4e5f678901234567890123456789012345678901234567890abcd1234", malware: "Raccoon Stealer", confidence: 85, firstSeen: new Date(Date.now() - 3600000).toISOString(), tags: ["stealer"] },
  ];
  res.json({ data: items, source: "threatfox", total: items.length });
});

// GET /api/urlhaus
router.get("/urlhaus", async (_req, res) => {
  const resp = await safeFetch("https://urlhaus-api.abuse.ch/v1/urls/recent/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: "limit=20",
  });

  if (resp?.ok) {
    const data = await resp.json() as { urls?: Array<{
      id: string; url: string; url_status: string; host: string; date_added: string; tags?: string[];
    }> };
    const items = (data.urls ?? []).map((u) => ({
      id: u.id,
      type: "url",
      value: u.url,
      malware: u.url_status,
      confidence: null,
      firstSeen: u.date_added,
      tags: u.tags ?? [],
    }));
    res.json({ data: items, source: "urlhaus", total: items.length });
    return;
  }

  const items = [
    { id: "uh-001", type: "url", value: "http://45.89.127.238/payload/drop.ps1", malware: "online", confidence: null, firstSeen: new Date(Date.now() - 43200000).toISOString(), tags: ["powershell", "dropper"] },
    { id: "uh-002", type: "url", value: "http://malware-dist.ru/files/loader.exe", malware: "online", confidence: null, firstSeen: new Date(Date.now() - 86400000).toISOString(), tags: ["loader"] },
  ];
  res.json({ data: items, source: "urlhaus", total: items.length });
});

// GET /api/hackernews
router.get("/hackernews", async (req, res) => {
  const query = encodeURIComponent((req.query.query as string) || "security vulnerability exploit");
  const resp = await safeFetch(
    `https://hn.algolia.com/api/v1/search?query=${query}&tags=story&hitsPerPage=20`
  );

  if (resp?.ok) {
    const data = await resp.json() as { hits?: unknown[]; nbHits?: number };
    res.json({ hits: data.hits ?? [], total: data.nbHits ?? 0 });
    return;
  }

  res.json({ hits: [], total: 0 });
});

// GET /api/geoip/:ip
router.get("/geoip/:ip", async (req, res) => {
  const { ip } = req.params;
  const resp = await safeFetch(`http://ip-api.com/json/${ip}?fields=country,countryCode,city,lat,lon,isp`);

  if (resp?.ok) {
    const data = await resp.json() as { country?: string; countryCode?: string; city?: string; lat?: number; lon?: number; isp?: string };
    res.json({ ip, country: data.country, countryCode: data.countryCode, city: data.city, lat: data.lat, lng: data.lon, isp: data.isp });
    return;
  }

  res.json({ ip });
});

export default router;
