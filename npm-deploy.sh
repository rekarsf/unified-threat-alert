#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
#  npm-deploy.sh  — build and deploy using plain npm (no pnpm)
#  Run from the repo root: bash npm-deploy.sh
# ─────────────────────────────────────────────────────────────────
set -e
REPO="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO"

log() { echo -e "\n\033[1;36m>>> $*\033[0m"; }

# ── Catalog version map (from pnpm-workspace.yaml) ───────────────
# These are the real package versions that pnpm's "catalog:" feature
# resolves to. npm doesn't support catalog: so we substitute them.
resolve_catalog() {
  node --input-type=module <<'JS'
const catalog = {
  "@replit/vite-plugin-cartographer":   "^0.5.1",
  "@replit/vite-plugin-dev-banner":     "^0.1.1",
  "@replit/vite-plugin-runtime-error-modal": "^0.0.6",
  "@tailwindcss/vite":                  "^4.1.14",
  "@tanstack/react-query":              "^5.90.21",
  "@types/node":                        "^25.3.3",
  "@types/react":                       "^19.2.0",
  "@types/react-dom":                   "^19.2.0",
  "@vitejs/plugin-react":               "^5.0.4",
  "class-variance-authority":           "^0.7.1",
  "clsx":                               "^2.1.1",
  "drizzle-orm":                        "^0.45.1",
  "framer-motion":                      "12.35.1",
  "lucide-react":                       "^0.545.0",
  "react":                              "19.1.0",
  "react-dom":                          "19.1.0",
  "tailwind-merge":                     "^3.3.1",
  "tailwindcss":                        "^4.1.14",
  "tsx":                                "^4.21.0",
  "vite":                               "^7.3.0",
  "zod":                                "^3.25.76",
};
const fs = (await import("fs")).default;
const path = (await import("path")).default;

// Workspace local lib paths
const libs = {
  "@workspace/api-zod":          "file:../../lib/api-zod",
  "@workspace/db":               "file:../../lib/db",
  "@workspace/api-client-react": "file:../../lib/api-client-react",
  "@workspace/api-spec":         "file:../../lib/api-spec",
};

// Patch a package.json: resolve catalog: and workspace: references
function patchPkg(pkgPath, extraLibPaths = {}) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const allLibs = { ...libs, ...extraLibPaths };
  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    if (!pkg[section]) continue;
    for (const [k, v] of Object.entries(pkg[section])) {
      if (v === "catalog:" || v.startsWith("catalog:")) {
        pkg[section][k] = catalog[k] ?? "*";
      } else if (v.startsWith("workspace:")) {
        pkg[section][k] = allLibs[k] ?? `file:../../lib/${k.replace("@workspace/", "")}`;
      }
    }
  }
  // Remove preinstall check that enforces pnpm
  if (pkg.scripts?.preinstall?.includes("check-pnpm")) {
    delete pkg.scripts.preinstall;
  }
  return pkg;
}

const REPO = process.env.REPO;

// ── Patch lib packages (they reference catalog: for their own deps) ──
for (const lib of ["api-zod", "db", "api-client-react", "api-spec"]) {
  const libPkg = path.join(REPO, "lib", lib, "package.json");
  if (!fs.existsSync(libPkg)) continue;
  const patched = patchPkg(libPkg);
  fs.writeFileSync(libPkg + ".npm", JSON.stringify(patched, null, 2));
  console.log("PATCHED_LIB:" + lib);
}

// ── Patch api-server ──
const apiPkg = patchPkg(path.join(REPO, "artifacts/api-server/package.json"));
fs.writeFileSync(path.join(REPO, "artifacts/api-server/package.json.npm"), JSON.stringify(apiPkg, null, 2));
console.log("PATCHED_ARTIFACT:api-server");

// ── Patch soc-dashboard ──
const dashPkg = patchPkg(path.join(REPO, "artifacts/soc-dashboard/package.json"));
fs.writeFileSync(path.join(REPO, "artifacts/soc-dashboard/package.json.npm"), JSON.stringify(dashPkg, null, 2));
console.log("PATCHED_ARTIFACT:soc-dashboard");
JS
}

log "Step 1/6 — patching package.json files for npm compatibility"
REPO="$REPO" resolve_catalog

# ── Apply patched package.json files ─────────────────────────────
apply_patch() {
  local dir="$1"
  if [ -f "$dir/package.json.npm" ]; then
    cp "$dir/package.json" "$dir/package.json.pnpm.bak"
    cp "$dir/package.json.npm" "$dir/package.json"
    rm "$dir/package.json.npm"
  fi
}

restore_patch() {
  local dir="$1"
  if [ -f "$dir/package.json.pnpm.bak" ]; then
    cp "$dir/package.json.pnpm.bak" "$dir/package.json"
    rm "$dir/package.json.pnpm.bak"
  fi
}

trap 'echo ""; echo "Restoring original package.json files..."; \
  restore_patch "$REPO/lib/api-zod"; \
  restore_patch "$REPO/lib/db"; \
  restore_patch "$REPO/lib/api-client-react"; \
  restore_patch "$REPO/lib/api-spec"; \
  restore_patch "$REPO/artifacts/api-server"; \
  restore_patch "$REPO/artifacts/soc-dashboard"' EXIT

for dir in \
  "$REPO/lib/api-zod" \
  "$REPO/lib/db" \
  "$REPO/lib/api-client-react" \
  "$REPO/lib/api-spec" \
  "$REPO/artifacts/api-server" \
  "$REPO/artifacts/soc-dashboard"
do
  apply_patch "$dir"
done

# ── Install lib packages ──────────────────────────────────────────
log "Step 2/6 — installing lib/api-zod"
cd "$REPO/lib/api-zod" && npm install --prefer-offline 2>&1 | tail -3

log "Step 3/6 — installing lib/db (if used by api-server)"
cd "$REPO/lib/db" && npm install --prefer-offline 2>&1 | tail -3

log "Step 4/6 — building the API server"
cd "$REPO/artifacts/api-server"
npm install --prefer-offline 2>&1 | tail -5
node ./build.mjs

log "Step 5/6 — building the dashboard"
cd "$REPO/artifacts/soc-dashboard"
npm install --prefer-offline 2>&1 | tail -5
BASE_PATH=/ PORT=3000 npx vite build --config vite.config.ts

log "Step 6/6 — done!"
echo ""
echo "Built files:"
echo "  API server : $REPO/artifacts/api-server/dist/index.mjs"
echo "  Dashboard  : $REPO/artifacts/soc-dashboard/dist/public/"
echo ""
echo "Next steps:"
echo "  1. npm install -g pm2"
echo "  2. SOC_DATA_FILE=$REPO/artifacts/soc-auth-data.json \\"
echo "       PORT=8080 pm2 start node --name uta-api \\"
echo "       -- --enable-source-maps $REPO/artifacts/api-server/dist/index.mjs"
echo "  3. pm2 save && pm2 startup"
echo "  4. Copy deploy/uta.conf to /etc/httpd/conf.d/ — edit the paths inside it"
echo "  5. setsebool -P httpd_can_network_connect 1"
echo "  6. systemctl enable --now httpd && systemctl reload httpd"
