import { Router } from "express";
import { requireAuth, requireScope } from "../middlewares/requireAuth.js";
import { getAuthData } from "../lib/auth.js";

const router = Router();
router.use(requireAuth);
router.use(requireScope("lr.dashboard"));

// ── Helper: proxy to real LogRhythm SIEM 7.x API ────────────────────────────
//
// LogRhythm 7.x uses separate sub-API paths mounted at the base URL:
//   /lr-admin-api/   → entities, hosts, networks, agents, logsources, lists
//   /lr-alarm-api/   → alarms
//   /lr-case-api/    → cases
//   /lr-search-api/  → log search tasks
//   /lr-drilldown-cache-api/ → alarm drilldown
//
// Auth: "Authorization: Bearer <token>"
// Base URL example: https://lr-server (no trailing slash)
// Docs: https://docs.logrhythm.com/docs/rest-api-development
//
async function lrFetch(
  subPath: string,
  settings: Record<string, string>,
  queryString = "",
  method = "GET",
  body?: unknown
): Promise<unknown | null> {
  const baseUrl = settings.lrBaseUrl;
  const apiToken = settings.lrApiToken;
  if (!baseUrl || !apiToken) return null;

  try {
    const { default: nodeFetch } = await import("node-fetch");
    const url = `${baseUrl.replace(/\/$/, "")}${subPath}${queryString ? `?${queryString}` : ""}`;
    const opts: any = {
      method,
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      // LR on-prem uses self-signed TLS — disable strict cert check
      agent: await (async () => {
        try {
          const https = await import("https");
          return new https.Agent({ rejectUnauthorized: false });
        } catch { return undefined; }
      })(),
    };
    if (body) opts.body = JSON.stringify(body);
    const resp = await nodeFetch(url, opts);
    if (!resp.ok) {
      const errText = await resp.text();
      console.warn(`[LR] ${method} ${subPath} → ${resp.status}: ${errText.slice(0, 200)}`);
      return null;
    }
    return await resp.json();
  } catch (err) {
    console.warn("[LR] Fetch error:", (err as Error).message);
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

// ── GET /api/lr/alarms ───────────────────────────────────────────────────────
// LR: GET /lr-alarm-api/alarms?count=1000&pageNumber=0&orderBy=dateInserted
// Response: { alarmsSearchDetails: { alarmSummaryList: [...] }, totalCount }
router.get("/alarms", requireScope("lr.alarms.view"), async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-alarm-api/alarms", data.settings as any, qs(req) || "count=1000&pageNumber=0&orderBy=dateInserted&sort=desc");

  if (real) {
    const r = real as { alarmsSearchDetails?: { alarmSummaryList?: unknown[] }; totalCount?: number };
    const alarms = r.alarmsSearchDetails?.alarmSummaryList ?? (Array.isArray(real) ? real : []);
    res.json({ data: alarms, total: r.totalCount ?? alarms.length, live: true });
    return;
  }

  res.json({ data: [], total: 0, error: "not_configured", message: "Configure LogRhythm credentials in Settings to see live data." });
});

// ── GET /api/lr/cases ────────────────────────────────────────────────────────
// LR: GET /lr-case-api/cases
// Response: array of case objects
router.get("/cases", requireScope("lr.cases.view"), async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-case-api/cases", data.settings as any, qs(req));

  if (real) {
    const cases = Array.isArray(real) ? real : (real as any).data ?? [];
    res.json({ data: cases, total: cases.length, live: true });
    return;
  }

  res.json({ data: [], total: 0, error: "not_configured" });
});

// ── GET /api/lr/logsources ───────────────────────────────────────────────────
// LR: GET /lr-admin-api/logsources?count=1000&pageNumber=0
router.get("/logsources", requireScope("lr.logs.view"), async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-admin-api/logsources", data.settings as any, qs(req) || "count=1000&pageNumber=0");

  if (real) {
    const items = Array.isArray(real) ? real : (real as any).data ?? [];
    res.json({ data: items, total: items.length, live: true });
    return;
  }
  res.json({ data: [], total: 0, error: "not_configured" });
});

// ── GET /api/lr/hosts ────────────────────────────────────────────────────────
// LR: GET /lr-admin-api/hosts?count=1000&pageNumber=0
router.get("/hosts", async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-admin-api/hosts", data.settings as any, qs(req) || "count=1000&pageNumber=0");

  if (real) {
    const items = Array.isArray(real) ? real : (real as any).data ?? [];
    res.json({ data: items, total: items.length, live: true });
    return;
  }
  res.json({ data: [], total: 0, error: "not_configured" });
});

// ── GET /api/lr/networks ─────────────────────────────────────────────────────
// LR: GET /lr-admin-api/networks?count=1000&pageNumber=0
router.get("/networks", async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-admin-api/networks", data.settings as any, qs(req) || "count=1000&pageNumber=0");

  if (real) {
    const items = Array.isArray(real) ? real : (real as any).data ?? [];
    res.json({ data: items, total: items.length, live: true });
    return;
  }
  res.json({ data: [], total: 0, error: "not_configured" });
});

// ── GET /api/lr/entities ─────────────────────────────────────────────────────
// LR: GET /lr-admin-api/entities?count=1000&pageNumber=0
router.get("/entities", async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-admin-api/entities", data.settings as any, qs(req) || "count=1000&pageNumber=0");

  if (real) {
    const items = Array.isArray(real) ? real : (real as any).data ?? [];
    res.json({ data: items, total: items.length, live: true });
    return;
  }
  res.json({ data: [], total: 0, error: "not_configured" });
});

// ── GET /api/lr/agents ───────────────────────────────────────────────────────
// LR: GET /lr-admin-api/agents?count=1000&pageNumber=0
router.get("/agents", async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-admin-api/agents", data.settings as any, qs(req) || "count=1000&pageNumber=0");

  if (real) {
    const items = Array.isArray(real) ? real : (real as any).data ?? [];
    res.json({ data: items, total: items.length, live: true });
    return;
  }
  res.json({ data: [], total: 0, error: "not_configured" });
});

// ── GET /api/lr/lists ────────────────────────────────────────────────────────
// LR: GET /lr-admin-api/lists?pageSize=500
router.get("/lists", async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-admin-api/lists", data.settings as any, qs(req) || "pageSize=500");

  if (real) {
    const items = Array.isArray(real) ? real : (real as any).data ?? [];
    res.json({ data: items, total: items.length, live: true });
    return;
  }
  res.json({ data: [], total: 0, error: "not_configured" });
});

// ── GET /api/lr/search ───────────────────────────────────────────────────────
// LR: GET /lr-search-api/actions/search-task (task initiation is a POST, results is also POST)
// For simple keyword search, we provide the GET interface and proxy to task API
router.get("/search", requireScope("lr.logs.search"), async (req, res) => {
  const query = (req.query.q as string) || "";
  const data = getAuthData();
  const settings = data.settings as any;

  if (settings.lrBaseUrl && settings.lrApiToken && query) {
    // Initiate a search task
    const taskBody = {
      maxMsgsToQuery: 1000,
      logCacheSize: 10000,
      queryTimeout: 60,
      queryLogType: -1000001,
      dateCriteria: { useInsertedDate: false, lastIntervalValue: 24, lastIntervalUnit: 4 },
      searchMode: 0,
      query: { msgFilterType: 2, isSavedFilter: false, filterGroup: { filterItemType: 1, fieldOperator: 0, filterMode: 1, filterGroupOperators: [], filterItems: [{ filterItemType: 0, fieldOperator: 0, filterMode: 1, filterType: 2, filterValue: { messageId: 1001, filterType: 0, value: { numericField: true, fullText: query } } }] } },
    };
    const task = await lrFetch("/lr-search-api/actions/search-task", settings, "", "POST", taskBody);
    if (task) {
      res.json({ data: task, taskMode: true, live: true, query });
      return;
    }
  }

  res.json({ data: [], total: 0, query, error: "not_configured" });
});

// ── POST /api/lr/search-results ──────────────────────────────────────────────
// LR: POST /lr-search-api/actions/search-result  { taskId, pageOrigin, pageSize }
router.post("/search-results", requireScope("lr.logs.search"), async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-search-api/actions/search-result", data.settings as any, "", "POST", req.body);
  if (real) { res.json({ ...(real as object), live: true }); return; }
  res.json({ items: [], totalCount: 0, taskStatus: "COMPLETE", error: "not_configured" });
});

// ── GET /api/lr/drilldown ────────────────────────────────────────────────────
// LR: GET /lr-drilldown-cache-api/drilldown?alarmId=<id>
router.get("/drilldown", requireScope("lr.alarms.view"), async (req, res) => {
  const data = getAuthData();
  const real = await lrFetch("/lr-drilldown-cache-api/drilldown", data.settings as any, qs(req));
  if (real) { res.json({ ...(real as object), live: true }); return; }
  res.json({ data: [], error: "not_configured" });
});

export default router;
