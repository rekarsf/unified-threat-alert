# SOC Map Center

## Overview

A full-stack cybersecurity operations console integrating SentinelOne EDR and LogRhythm SIEM. Features a dark cyberpunk aesthetic, canvas-based 2D world map with hexagonal endpoint markers, animated particle threat arcs, zoom/pan, JWT RBAC authentication, and full navigation across all SOC operations panels. Includes a dedicated full-screen Global Map view at `/map`.

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

## Authentication

- Default credentials: `admin` / `admin`
- JWT stored in localStorage as `soc_token`
- Auth data in `artifacts/api-server/soc-auth-data.json` (no DB needed)
- RBAC scopes: `s1.*`, `lr.*`, `admin.*`, `threat_intel.*`
- Global fetch interceptor in App.tsx injects JWT for all `/api/` calls

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

## Notes

- No database used — auth data stored in `soc-auth-data.json`
- World map loads TopoJSON from CDN: `https://unpkg.com/world-atlas@2.0.2/countries-110m.json`
- `lib/db` package exists in workspace but is NOT used by this project
