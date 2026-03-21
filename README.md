# SOC Map Center

A full-stack cybersecurity operations console integrating **SentinelOne EDR** and **LogRhythm SIEM**. Features a real-time canvas world map with animated threat arcs, hex endpoint markers, JWT-based role authentication, and a comprehensive dark-UI dashboard suite.

---

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 20 or higher (24 recommended) | Use [nvm](https://github.com/nvm-sh/nvm) or [nvm-windows](https://github.com/coreybutler/nvm-windows) |
| pnpm | 9 or higher | `npm install -g pnpm` |
| Git | any | For cloning the repository |

> **Windows users**: Native Windows is supported. If you run into issues with any optional native modules, [WSL 2](https://learn.microsoft.com/en-us/windows/wsl/install) (Windows Subsystem for Linux) also works seamlessly.

---

## Quick Start

### Linux / macOS / WSL

```bash
# 1. Clone the repository
git clone <repo-url> && cd soc-map-center

# 2. Use the correct Node version (if you have nvm)
nvm install && nvm use

# 3. Install dependencies
pnpm install

# 4. Start everything
pnpm dev
```

### Windows (native — PowerShell or CMD)

```powershell
# 1. Clone the repository
git clone <repo-url>
cd soc-map-center

# 2. Install the correct Node version (if you have nvm-windows)
nvm install 24
nvm use 24

# 3. Install dependencies
pnpm install

# 4. Start everything
pnpm dev
```

> pnpm is the **only** supported package manager. Running `npm install` or `yarn` will be rejected automatically.

---

## Project Structure

```
soc-map-center/
├── artifacts/
│   ├── api-server/        # Express REST API (Node.js, ESM, esbuild)
│   └── soc-dashboard/     # React + Vite frontend (Tailwind CSS v4)
├── lib/
│   └── api-client-react/  # Shared API client (React Query hooks)
├── scripts/
│   └── check-pnpm.js      # Cross-platform preinstall guard
├── pnpm-workspace.yaml    # Monorepo workspace + dependency overrides
└── package.json
```

---

## Running Services

All services are managed via pnpm workspace scripts. In development you can run them separately or together.

### Option A — All services at once (coming soon via concurrently)

```bash
pnpm dev
```

### Option B — Individual services

```bash
# Terminal 1 — Backend API (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 5173 or $PORT)
pnpm --filter @workspace/soc-dashboard run dev
```

The frontend's Vite config proxies all `/api/` requests to the backend automatically, so no CORS configuration is needed.

---

## Default Login

| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin    | admin |

JWT tokens are stored in `localStorage` under the key `soc_token`. Auth data lives in `artifacts/api-server/soc-auth-data.json` (no database required).

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | API server listen port |
| `NODE_ENV` | `development` | `development` or `production` |
| `JWT_SECRET` | (auto-generated) | Override to fix token signing across restarts |

Set these in a `.env` file at the repo root or via your shell. The frontend reads `VITE_*` prefixed variables at build time.

---

## Building for Production

```bash
# Build all packages
pnpm build

# The API server output is at artifacts/api-server/dist/index.mjs
# The frontend output is at artifacts/soc-dashboard/dist/
```

---

## Key Features

- **World Map** — Natural Earth projection with drag-to-pan and scroll-wheel zoom; animated particle arcs trace threat paths between countries; hex endpoint markers on real landmass coordinates; floating glass-overlay status panels and a live ticker
- **SentinelOne Dashboard** — Endpoint grid with health bars, status filter pills, country breakdown, and cycling alert ticker
- **LogRhythm Dashboard** — SIEM event timeline, severity heat-map, and log source health panels
- **JWT Auth + RBAC** — Login page, token refresh, role-scoped route guards (`admin`, `analyst`, `viewer`)
- **Fully Responsive** — Dark navy/cyan design works on 1080 p desktops and ultrawide monitors

---

## Cross-Platform Notes

- **Scripts**: All npm scripts use `cross-env` to set environment variables — no bash required
- **Line endings**: `.gitattributes` enforces LF on commit so files are consistent across Windows and Linux
- **Native binaries**: `pnpm-workspace.yaml` overrides exclude macOS, Android, FreeBSD, and unused architectures to reduce install size, but Windows x64 and Linux x64 binaries are always included
- **Node version**: Pinned in `.nvmrc` (file recognized by nvm on Linux/macOS and nvm-windows on Windows)

---

## Troubleshooting

**`pnpm install` fails with "Use pnpm instead"**
→ You ran `npm install` or `yarn`. Use `pnpm install`.

**Port already in use**
→ Set `PORT=<other-port>` before starting the API server.

**Blank map / TopoJSON not loading**
→ Check your internet connection; the world map loads TopoJSON from the unpkg CDN on first render.

**Windows: esbuild or rollup fails to resolve native binary**
→ Run `pnpm install --ignore-scripts` first, then `pnpm install`. If it still fails, ensure you are using pnpm ≥ 9 and Node ≥ 20.
