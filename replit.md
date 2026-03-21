# Unified Threat Alert

## Overview

A vendor-agnostic, full-stack SOC (Security Operations Center) console. Admins configure up to 3 vendors per category (EDR, XDR, SIEM, SOAR) via the Integrations tab; no vendor names appear in the UI unless configured. Features a dark cyberpunk aesthetic, canvas-based 2D world map with animated threat arcs, JWT RBAC authentication, full navigation, and an Admin Panel with 6 tabs (Users, RBAC, Roles, Active Sessions, Audit Log, Integrations).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Build**: esbuild (for api-server)
- **Frontend**: React + Vite + Tailwind CSS
- **State**: Zustand (auth + app state)
- **Data fetching**: TanStack React Query (via generated Orval hooks)
- **Routing**: Wouter
- **API codegen**: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)

## Structure

```text
├── artifacts/
│   ├── api-server/         # Express backend (port 8080, proxied at /api)
│   │   └── src/
│   │       ├── routes/     # auth, s1, lr, admin, threatintel routes
│   │       └── lib/        # auth (JWT/PBKDF2), mockData, middleware
│   └── soc-dashboard/      # React frontend (port $PORT, preview at /)
│       └── src/
│           ├── pages/      # All page components
│           ├── components/ # layout, world-map, panels, cyber-ui
│           └── lib/        # store (Zustand), utils
├── lib/
│   ├── api-spec/           # OpenAPI spec + Orval config
│   └── api-client-react/   # Generated React Query hooks + types
```

## Authentication & RBAC

- Default credentials: `admin` / `admin`
- JWT stored in localStorage as `soc_token`
- Auth data in `artifacts/api-server/soc-auth-data.json` (no DB needed)
- RBAC scopes: `map.view`, `s1.*`, `lr.*`, `admin.*`, `threatintel.*`
- Global fetch interceptor in App.tsx injects JWT for all `/api/` calls using `new Headers()` merge to preserve Content-Type on POST/PUT
- Session tracking: in-memory `sessionStore.ts` records lastSeen on every authenticated request; expires after 30 min

## Admin Panel (`/admin`) Tabs

| Tab | Scope Required | Description |
|-----|---------------|-------------|
| Users | `admin.users` | Create/delete users with inline form; role badges; createdAt + lastLogin columns |
| RBAC | `admin.users` | Per-user scope editor: 5 groups (Map, S1, LR, ThreatIntel, Admin) with checkbox toggles, Grant/Revoke all, role templates, dirty-state Save |
| Active Sessions | `admin.users` | Live view of users active in last 30 min (in-memory session store), auto-refreshes every 15 s; stat cards + table with browser/OS detection |
| Audit Log | `admin.settings` | Filterable by search, action type, username, date range; 6 columns with color-coded actions |
| API Settings | `admin.settings` | S1 and LR base URL + API token fields |

### API Endpoints (new)
- `GET /api/admin/sessions` — returns active sessions from in-memory store
- `GET /api/admin/roles` — returns ROLE_SCOPES map
- `GET /api/admin/audit?user=&action=&since=&until=&limit=` — filterable audit log

## Pages & Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/login` | Login | JWT login form |
| `/s1` | S1Dashboard | SentinelOne dashboard + world map + live alerts |
| `/assets/endpoints` | EndpointsPage | All endpoint table |
| `/assets/servers` | ServersPage | Server endpoints |
| `/assets/workstations` | WorkstationsPage | Workstation endpoints |
| `/assets/vuln-apps` | VulnAppsPage | Vulnerable application inventory |
| `/assets/rogues` | RoguesPage | Rogue/unauthorized devices |
| `/alerts/active` | ActiveAlertsPage | Active alerts |
| `/alerts/critical` | CriticalAlertsPage | Critical severity alerts |
| `/alerts/history` | AlertHistoryPage | Full alert history |
| `/iocs` | IocPage | Indicators of Compromise |
| `/lr` | LrDashboard | LogRhythm SIEM dashboard |
| `/lr/alarms` | LrAlarmsPage | LR alarms |
| `/lr/cases` | LrCasesPage | LR cases |
| `/lr/search` | LrSearchPage | Log search |
| `/lr/sources` | LrSourcesPage | Log sources |
| `/lr/lists` | LrListsPage | LR lists |
| `/lr/entities` | LrEntitiesPage | LR entities |
| `/lr/hosts` | LrHostsPage | LR hosts |
| `/lr/networks` | LrNetworksPage | LR networks |
| `/lr/agents` | LrAgentsPage | LR agents |
| `/feeds/hackernews` | HackerNewsPage | Threat intel from Hacker News |
| `/admin` | AdminPage | Admin panel (users, settings, audit) |
| `/settings` | SettingsPage | Center settings + all integration credentials |

## API Endpoints

All under `/api/` prefix:
- `POST /api/auth/login` — JWT login
- `GET /api/auth/me` — current user profile
- `GET /api/s1/agents` — S1 endpoints
- `GET /api/s1/threats` — active threats
- `GET /api/s1/alerts` — alerts
- `GET /api/s1/iocs` — IOC list
- `GET /api/lr/alarms` — LR alarms
- `GET /api/lr/cases` — LR cases
- `GET /api/lr/logsources` — log sources
- `GET /api/lr/hosts`, `/networks`, `/entities`, `/agents`, `/lists`
- `GET /api/admin/users` — user management (admin scope)
- `GET/POST /api/admin/settings` — API credentials config (admin scope)
- `GET /api/admin/audit` — audit log (admin scope)
- `GET /api/hackernews` — threat intel feed proxy

## Design System

- Background: `hsl(210, 22%, 6%)` (near-black)
- Primary (cyber cyan): `#2dd4a0`
- Destructive (threat red): `#ef4444`
- Warning (amber): `#eab308`
- Healthy (green): `#22c55e`
- Font: monospace for data readouts, display font for headings
- Key classes: `cyber-glow`, `cyber-glow-destructive`, `font-mono`, `font-display`

## Mock Data

When no real API credentials are configured, the backend returns realistic mock data:
- 20 endpoints with geo-coordinates across the globe
- Active threats, alerts, IOCs
- LR alarms, cases, log sources, hosts, networks, entities, agents, lists

## Cross-Platform Support (Windows + Linux)

- **`cross-env`**: API server dev script uses `cross-env NODE_ENV=development` so the build works on Windows CMD/PowerShell and all Linux shells without any `export` hacks
- **Preinstall guard**: `scripts/check-pnpm.js` (pure Node.js, no bash) enforces pnpm and removes npm/yarn lockfiles on all platforms
- **Line endings**: `.gitattributes` enforces LF on commit for all text files; prevents CRLF issues on Windows
- **Binary overrides**: `pnpm-workspace.yaml` excludes macOS, Android, FreeBSD, and obscure arch binaries to reduce install size, but **Windows x64 and Linux x64 native binaries are included** for esbuild, rollup, lightningcss, and tailwindcss so builds work natively on both platforms
- **Node version**: `.nvmrc` pins Node 24 — recognized by nvm (Linux/macOS) and nvm-windows
- **`prefer-frozen-lockfile=false`** in `.npmrc` so Windows developers can reinstall without lockfile mismatch errors

## Notes

- No database used — auth data stored in `soc-auth-data.json`
- World map loads TopoJSON from CDN: `https://unpkg.com/world-atlas@2.0.2/countries-110m.json`
- `lib/db` package exists in workspace but is NOT used by this project
