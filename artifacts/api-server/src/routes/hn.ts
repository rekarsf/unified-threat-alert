import { Router } from "express";
import { GetHackerNewsQueryParams } from "@workspace/api-zod";

const router = Router();

router.get("/hackernews", async (req, res) => {
  const parsed = GetHackerNewsQueryParams.safeParse(req.query);
  const query = parsed.success ? parsed.data.query : "security vulnerability exploit";

  try {
    const url = new URL("https://hn.algolia.com/api/v1/search");
    url.searchParams.set("query", query);
    url.searchParams.set("tags", "story");
    url.searchParams.set("hitsPerPage", "30");

    const upstream = await fetch(url.toString(), {
      headers: { "User-Agent": "UnifiedThreatAlert/1.0" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      res.status(502).json({ error: "upstream_error", message: `HN Algolia returned ${upstream.status}` });
      return;
    }

    const data = await upstream.json() as { hits: unknown[] };
    res.json({ hits: data.hits ?? [] });
  } catch (err: any) {
    res.status(502).json({ error: "fetch_failed", message: err?.message ?? "Unknown error" });
  }
});

export default router;
