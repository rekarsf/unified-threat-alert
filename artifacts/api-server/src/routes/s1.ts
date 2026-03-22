import { Router } from "express";
import { requireAuth, requireScope } from "../middlewares/requireAuth.js";
import {
  MOCK_ENDPOINTS, MOCK_THREATS, MOCK_ALERTS, MOCK_IOCS
} from "../lib/mockData.js";
import { getAuthData } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireScope("s1.dashboard"));

// ── Helper: proxy to real SentinelOne v2.1 API ──────────────────────────────
// Auth scheme: "Authorization: ApiToken <token>"
// Docs: https://usea1.sentinelone.net/api-doc/overview
async function s1Fetch(
  path: string,
  settings: Record<string, string>,
  queryString = "",
  method = "GET",
  body?: unknown
): Promise<unknown | null> {
  const baseUrl = settings.s1BaseUrl;
  const apiToken = settings.s1ApiToken;
  if (!baseUrl || !apiToken) return null;

  try {
    const { default: nodeFetch } = await import("node-fetch");
    const url = `${baseUrl.replace(/\/$/, "")}${path}${queryString ? `?${queryString}` : ""}`;
    const opts: any = {
      method,
      headers: {
        Authorization: `ApiToken ${apiToken}`,
        "Content-Type": "application/json",
      },
    };
    if (body) opts.body = JSON.stringify(body);
    const resp = await nodeFetch(url, opts);
    if (!resp.ok) {
      const errText = await resp.text();
      console.warn(`[S1] ${method} ${path} → ${resp.status}: ${errText.slice(0, 200)}`);
      return null;
    }
    return await resp.json();
  } catch (err) {
    console.warn("[S1] Fetch error:", (err as Error).message);
    return null;
  }
}

function qs(req: any) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === "string") q.set(k, v);
  }
  return q.toString();
}

// ── GET /api/s1/agents ───────────────────────────────────────────────────────
// S1: GET /web/api/v2.1/agents?limit=100&cursor=<cursor>
router.get("/agents", async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/agents", data.settings as any, qs(req));

  if (real) {
    const r = real as { data?: unknown[]; pagination?: { nextCursor?: string; totalItems?: number } };
    res.json({ data: r.data ?? [], pagination: r.pagination, total: r.pagination?.totalItems ?? 0, live: true });
    return;
  }

  const status = req.query.status as string | undefined;
  const query = (req.query.query as string | undefined)?.toLowerCase();
  const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
  let results = [...MOCK_ENDPOINTS];
  if (status) results = results.filter((e) => e.status === status);
  if (query) results = results.filter((e) =>
    e.hostname.toLowerCase().includes(query) ||
    e.ip.includes(query) ||
    (e.country ?? "").toLowerCase().includes(query)
  );
  res.json({ data: results.slice(0, limit), total: results.length, mock: true });
});

// GET /api/s1/agents/count
router.get("/agents/count", async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/agents/count", data.settings as any, qs(req));
  if (real) { res.json({ ...(real as object), live: true }); return; }
  res.json({ data: { total: MOCK_ENDPOINTS.length }, mock: true });
});

// ── GET /api/s1/threats ──────────────────────────────────────────────────────
// S1: GET /web/api/v2.1/threats?limit=100&resolved=false
router.get("/threats", async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/threats", data.settings as any, qs(req));

  if (real) {
    const r = real as { data?: unknown[]; pagination?: { nextCursor?: string; totalItems?: number } };
    res.json({ data: r.data ?? [], pagination: r.pagination, total: r.pagination?.totalItems ?? 0, live: true });
    return;
  }

  const resolved = req.query.resolved === "true";
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  let results = MOCK_THREATS;
  if (req.query.resolved !== undefined) results = results.filter((t) => t.resolved === resolved);
  res.json({ data: results.slice(0, limit), total: results.length, mock: true });
});

// POST /api/s1/threats/analyst-verdict
router.post("/threats/analyst-verdict", requireScope("s1.alerts.manage"), async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/threats/analyst-verdict", data.settings as any, "", "POST", req.body);
  if (real) { res.json({ ...(real as object), live: true }); return; }
  res.json({ success: true, mock: true });
});

// POST /api/s1/threats/incident
router.post("/threats/incident", requireScope("s1.alerts.manage"), async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/threats/incident", data.settings as any, "", "POST", req.body);
  if (real) { res.json({ ...(real as object), live: true }); return; }
  res.json({ success: true, mock: true });
});

// POST /api/s1/threats/mitigate
router.post("/threats/mitigate", requireScope("s1.alerts.manage"), async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/threats/mitigate-alerts", data.settings as any, "", "POST", req.body);
  if (real) { res.json({ ...(real as object), live: true }); return; }
  res.json({ success: true, mock: true });
});

// POST /api/s1/threats/add-to-blacklist
router.post("/threats/add-to-blacklist", requireScope("s1.alerts.manage"), async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/threats/add-to-blacklist", data.settings as any, "", "POST", req.body);
  if (real) { res.json({ ...(real as object), live: true }); return; }
  res.json({ success: true, mock: true });
});

// ── GET /api/s1/alerts (STAR Cloud Detection alerts) ─────────────────────────
// S1: GET /web/api/v2.1/cloud-detection/alerts
router.get("/alerts", async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/cloud-detection/alerts", data.settings as any, qs(req));

  if (real) {
    const r = real as { data?: unknown[]; pagination?: { nextCursor?: string; totalItems?: number } };
    res.json({ data: r.data ?? [], pagination: r.pagination, total: r.pagination?.totalItems ?? 0, live: true });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json({ data: MOCK_ALERTS.slice(0, limit), total: MOCK_ALERTS.length, mock: true });
});

// POST /api/s1/alerts/analyst-verdict
router.post("/alerts/analyst-verdict", requireScope("s1.alerts.manage"), async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/cloud-detection/alerts/analyst-verdict", data.settings as any, "", "POST", req.body);
  if (real) { res.json({ ...(real as object), live: true }); return; }
  res.json({ success: true, mock: true });
});

// ── GET /api/s1/iocs ─────────────────────────────────────────────────────────
// S1: GET /web/api/v2.1/threat-intelligence/iocs
router.get("/iocs", requireScope("s1.iocs.view"), async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/threat-intelligence/iocs", data.settings as any, qs(req));

  if (real) {
    const r = real as { data?: unknown[]; pagination?: { nextCursor?: string; totalItems?: number } };
    res.json({ data: r.data ?? [], pagination: r.pagination, total: r.pagination?.totalItems ?? 0, live: true });
    return;
  }
  res.json({ data: MOCK_IOCS, total: MOCK_IOCS.length, mock: true });
});

// ── GET /api/s1/activities ───────────────────────────────────────────────────
// S1: GET /web/api/v2.1/activities
router.get("/activities", async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/activities", data.settings as any, qs(req));
  if (real) {
    const r = real as { data?: unknown[]; pagination?: { totalItems?: number } };
    res.json({ data: r.data ?? [], total: r.pagination?.totalItems ?? 0, live: true });
    return;
  }
  res.json({ data: [], total: 0, mock: true });
});

// ── GET /api/s1/app-risk ─────────────────────────────────────────────────────
// S1: GET /web/api/v2.1/application-management/risks/applications
router.get("/app-risk", async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/application-management/risks/applications", data.settings as any, qs(req));

  if (real) {
    const r = real as { data?: unknown[]; pagination?: { totalItems?: number } };
    res.json({ data: r.data ?? [], total: r.pagination?.totalItems ?? 0, live: true });
    return;
  }

  const apps = [
    { id: "app-001", name: "Adobe Acrobat Reader", version: "11.0.0", cveCount: 12, riskScore: 9.1, affectedEndpoints: 8 },
    { id: "app-002", name: "Oracle Java SE", version: "1.8.0_202", cveCount: 8, riskScore: 8.5, affectedEndpoints: 15 },
    { id: "app-003", name: "WinRAR", version: "5.61", cveCount: 5, riskScore: 7.8, affectedEndpoints: 4 },
    { id: "app-004", name: "Mozilla Firefox", version: "88.0", cveCount: 3, riskScore: 6.2, affectedEndpoints: 22 },
    { id: "app-005", name: "OpenSSL", version: "1.0.2k", cveCount: 7, riskScore: 9.8, affectedEndpoints: 6 },
  ];
  res.json({ data: apps, total: apps.length, mock: true });
});

// ── GET /api/s1/rogues ───────────────────────────────────────────────────────
// S1: GET /web/api/v2.1/rogues/table-view
router.get("/rogues", async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/rogues/table-view", data.settings as any, qs(req));

  if (real) {
    const r = real as { data?: unknown[]; pagination?: { totalItems?: number } };
    res.json({ data: r.data ?? [], total: r.pagination?.totalItems ?? 0, live: true });
    return;
  }

  const rogues = [
    { id: "rogue-001", ip: "10.0.99.45", mac: "00:11:22:33:44:55", firstSeen: new Date(Date.now() - 3600000).toISOString(), lastSeen: new Date(Date.now() - 600000).toISOString(), networkName: "Office WiFi", riskLevel: "high" },
    { id: "rogue-002", ip: "192.168.100.77", mac: "AA:BB:CC:DD:EE:FF", firstSeen: new Date(Date.now() - 86400000).toISOString(), lastSeen: new Date(Date.now() - 7200000).toISOString(), networkName: "Guest Network", riskLevel: "medium" },
  ];
  res.json({ data: rogues, total: rogues.length, mock: true });
});

// ── GET /api/s1/exclusions ───────────────────────────────────────────────────
// S1: GET /web/api/v2.1/exclusions
router.get("/exclusions", async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/exclusions", data.settings as any, qs(req));
  if (real) {
    const r = real as { data?: unknown[]; pagination?: { totalItems?: number } };
    res.json({ data: r.data ?? [], total: r.pagination?.totalItems ?? 0, live: true });
    return;
  }
  res.json({ data: [], total: 0, mock: true });
});

// ── POST /api/s1/dv/init-query (Deep Visibility) ─────────────────────────────
// S1: POST /web/api/v2.1/dv/init-query  { query, fromDate, toDate, queryType }
router.post("/dv/init-query", requireScope("s1.alerts.view"), async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/dv/init-query", data.settings as any, "", "POST", req.body);
  if (real) { res.json({ ...(real as object), live: true }); return; }
  res.json({ data: { queryId: "mock-query-001", responseState: "PENDING" }, mock: true });
});

// ── GET /api/s1/dv/query-status ──────────────────────────────────────────────
router.get("/dv/query-status", requireScope("s1.alerts.view"), async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/dv/query-status", data.settings as any, qs(req));
  if (real) { res.json({ ...(real as object), live: true }); return; }
  res.json({ data: { responseState: "FINISHED", progressStatus: 100 }, mock: true });
});

// ── GET /api/s1/dv/events ────────────────────────────────────────────────────
router.get("/dv/events", requireScope("s1.alerts.view"), async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/dv/events", data.settings as any, qs(req));
  if (real) {
    const r = real as { data?: unknown[]; pagination?: { totalItems?: number } };
    res.json({ data: r.data ?? [], total: r.pagination?.totalItems ?? 0, live: true });
    return;
  }
  res.json({ data: [], total: 0, mock: true });
});

export default router;
