import { Router } from "express";
import { requireAuth, requireScope } from "../middlewares/requireAuth.js";
import {
  MOCK_LR_ALARMS, MOCK_LR_CASES, MOCK_LR_LOG_SOURCES,
  MOCK_LR_HOSTS, MOCK_LR_NETWORKS, MOCK_LR_ENTITIES,
  MOCK_LR_AGENTS, MOCK_LR_LISTS
} from "../lib/mockData.js";
import { getAuthData } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireScope("lr.dashboard"));

// Helper: proxy to real LR API or fallback to mock
async function lrFetch(path: string, settings: { lrBaseUrl?: string; lrApiToken?: string }): Promise<unknown | null> {
  if (!settings.lrBaseUrl || !settings.lrApiToken) return null;

  try {
    const { default: nodeFetch } = await import("node-fetch");
    const resp = await nodeFetch(`${settings.lrBaseUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${settings.lrApiToken}`,
        "Content-Type": "application/json",
      },
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch {
    return null;
  }
}

// GET /api/lr/alarms
router.get("/alarms", requireScope("lr.alarms.view"), async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-api/alarms/", data.settings);

  if (real) {
    const r = real as { alarmsSearchDetails?: { alarmSummaryList?: unknown[] }; totalCount?: number };
    const alarms = r.alarmsSearchDetails?.alarmSummaryList ?? [];
    res.json({ data: alarms, total: r.totalCount ?? alarms.length });
    return;
  }

  const status = req.query.status as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  let results = MOCK_LR_ALARMS;
  if (status) results = results.filter((a) => a.alarmStatus === status);
  res.json({ data: results.slice(0, limit), total: results.length });
});

// GET /api/lr/cases
router.get("/cases", requireScope("lr.cases.view"), async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-api/cases/", data.settings);

  if (real) {
    const cases = Array.isArray(real) ? real : [];
    res.json({ data: cases, total: cases.length });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
  res.json({ data: MOCK_LR_CASES.slice(0, limit), total: MOCK_LR_CASES.length });
});

// GET /api/lr/logsources
router.get("/logsources", requireScope("lr.logs.view"), async (_req, res) => {
  res.json({ data: MOCK_LR_LOG_SOURCES, total: MOCK_LR_LOG_SOURCES.length });
});

// GET /api/lr/hosts
router.get("/hosts", async (_req, res) => {
  res.json({ data: MOCK_LR_HOSTS, total: MOCK_LR_HOSTS.length });
});

// GET /api/lr/networks
router.get("/networks", async (_req, res) => {
  res.json({ data: MOCK_LR_NETWORKS, total: MOCK_LR_NETWORKS.length });
});

// GET /api/lr/entities
router.get("/entities", async (_req, res) => {
  res.json({ data: MOCK_LR_ENTITIES, total: MOCK_LR_ENTITIES.length });
});

// GET /api/lr/agents
router.get("/agents", async (_req, res) => {
  res.json({ data: MOCK_LR_AGENTS, total: MOCK_LR_AGENTS.length });
});

// GET /api/lr/lists
router.get("/lists", async (_req, res) => {
  res.json({ data: MOCK_LR_LISTS, total: MOCK_LR_LISTS.length });
});

// GET /api/lr/search - log search
router.get("/search", requireScope("lr.logs.search"), async (req, res) => {
  const query = req.query.q as string || "";
  const results = query ? [
    { id: "log-001", timestamp: new Date().toISOString(), message: `[INFO] Authentication successful for user admin from 10.0.1.5`, source: "Windows Security", severity: "info" },
    { id: "log-002", timestamp: new Date(Date.now() - 30000).toISOString(), message: `[WARN] Failed login attempt for user ${query} from 185.220.101.33`, source: "Active Directory", severity: "warning" },
    { id: "log-003", timestamp: new Date(Date.now() - 60000).toISOString(), message: `[ERROR] Suspicious process execution: cmd.exe /c whoami`, source: "Windows Sysmon", severity: "error" },
  ] : [];
  res.json({ data: results, total: results.length, query });
});

export default router;
