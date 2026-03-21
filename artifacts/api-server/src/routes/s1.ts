import { Router } from "express";
import { requireAuth, requireScope } from "../middlewares/requireAuth.js";
import {
  MOCK_ENDPOINTS, MOCK_THREATS, MOCK_ALERTS, MOCK_IOCS
} from "../lib/mockData.js";
import { getAuthData } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireScope("s1.dashboard"));

// Helper: proxy to real S1 API or fallback to mock
async function s1Fetch(path: string, settings: { s1BaseUrl?: string; s1ApiToken?: string }): Promise<unknown | null> {
  if (!settings.s1BaseUrl || !settings.s1ApiToken) return null;

  try {
    const { default: nodeFetch } = await import("node-fetch");
    const resp = await nodeFetch(`${settings.s1BaseUrl}${path}`, {
      headers: {
        Authorization: `ApiToken ${settings.s1ApiToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// GET /api/s1/agents
router.get("/agents", async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/agents", data.settings);

  if (real) {
    const r = real as { data?: unknown[]; pagination?: { totalItems?: number } };
    res.json({ data: r.data ?? [], total: r.pagination?.totalItems ?? 0 });
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
    e.country?.toLowerCase().includes(query)
  );

  res.json({ data: results.slice(0, limit), total: results.length });
});

// GET /api/s1/threats
router.get("/threats", async (req, res) => {
  const data = getAuthData();
  const real = await s1Fetch("/web/api/v2.1/threats", data.settings);

  if (real) {
    const r = real as { data?: unknown[]; pagination?: { totalItems?: number } };
    res.json({ data: r.data ?? [], total: r.pagination?.totalItems ?? 0 });
    return;
  }

  const resolved = req.query.resolved === "true";
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  let results = MOCK_THREATS;
  if (req.query.resolved !== undefined) {
    results = results.filter((t) => t.resolved === resolved);
  }
  res.json({ data: results.slice(0, limit), total: results.length });
});

// GET /api/s1/alerts
router.get("/alerts", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json({ data: MOCK_ALERTS.slice(0, limit), total: MOCK_ALERTS.length });
});

// GET /api/s1/iocs
router.get("/iocs", requireScope("s1.iocs.view"), async (_req, res) => {
  res.json({ data: MOCK_IOCS, total: MOCK_IOCS.length });
});

// GET /api/s1/activities
router.get("/activities", async (_req, res) => {
  res.json({ data: [], total: 0 });
});

// GET /api/s1/app-risk
router.get("/app-risk", async (_req, res) => {
  const apps = [
    { id: "app-001", name: "Adobe Acrobat Reader", version: "11.0.0", cveCount: 12, riskScore: 9.1, affectedEndpoints: 8 },
    { id: "app-002", name: "Oracle Java SE", version: "1.8.0_202", cveCount: 8, riskScore: 8.5, affectedEndpoints: 15 },
    { id: "app-003", name: "WinRAR", version: "5.61", cveCount: 5, riskScore: 7.8, affectedEndpoints: 4 },
    { id: "app-004", name: "Mozilla Firefox", version: "88.0", cveCount: 3, riskScore: 6.2, affectedEndpoints: 22 },
    { id: "app-005", name: "OpenSSL", version: "1.0.2k", cveCount: 7, riskScore: 9.8, affectedEndpoints: 6 },
  ];
  res.json({ data: apps, total: apps.length });
});

// GET /api/s1/rogues
router.get("/rogues", async (_req, res) => {
  const rogues = [
    { id: "rogue-001", ip: "10.0.99.45", mac: "00:11:22:33:44:55", firstSeen: new Date(Date.now() - 3600000).toISOString(), lastSeen: new Date(Date.now() - 600000).toISOString(), networkName: "Office WiFi", riskLevel: "high" },
    { id: "rogue-002", ip: "192.168.100.77", mac: "AA:BB:CC:DD:EE:FF", firstSeen: new Date(Date.now() - 86400000).toISOString(), lastSeen: new Date(Date.now() - 7200000).toISOString(), networkName: "Guest Network", riskLevel: "medium" },
  ];
  res.json({ data: rogues, total: rogues.length });
});

export default router;
