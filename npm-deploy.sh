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
resolve_catalog() {
  REPO="$REPO" node --input-type=module <<'JS'
const catalog = {
  "@replit/vite-plugin-cartographer":       "^0.5.1",
  "@replit/vite-plugin-dev-banner":         "^0.1.1",
  "@replit/vite-plugin-runtime-error-modal":"^0.0.6",
  "@tailwindcss/vite":                      "^4.1.14",
  "@tanstack/react-query":                  "^5.90.0",
  "@types/node":                            "^22.15.0",
  "@types/react":                           "^19.1.0",
  "@types/react-dom":                       "^19.1.0",
  "@vitejs/plugin-react":                   "^5.0.0",
  "class-variance-authority":               "^0.7.1",
  "clsx":                                   "^2.1.1",
  "drizzle-orm":                            "^0.43.0",
  "framer-motion":                          "12.35.1",
  "lucide-react":                           "^0.511.0",
  "react":                                  "19.1.0",
  "react-dom":                              "19.1.0",
  "tailwind-merge":                         "^3.3.1",
  "tailwindcss":                            "^4.1.14",
  "tsx":                                    "^4.19.0",
  "vite":                                   "^7.0.0",
  "zod":                                    "^3.24.0",
};

const fs = (await import("fs")).default;
const path = (await import("path")).default;
const REPO = process.env.REPO;

function patchPkg(pkgPath, removeDeps = []) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    if (!pkg[section]) continue;
    for (const k of removeDeps) delete pkg[section][k];
    for (const [k, v] of Object.entries(pkg[section])) {
      if (v === "catalog:" || v.startsWith("catalog:")) {
        pkg[section][k] = catalog[k] ?? "*";
      } else if (v.startsWith("workspace:")) {
        // Use absolute file: path so npm resolves correctly from any directory
        const libName = k.replace("@workspace/", "");
        pkg[section][k] = "file:" + path.join(REPO, "lib", libName);
      }
    }
  }
  if (pkg.scripts?.preinstall?.includes("check-pnpm")) delete pkg.scripts.preinstall;
  return pkg;
}

// lib/api-zod — used by api-server health check
const apiZodPkg = patchPkg(path.join(REPO, "lib/api-zod/package.json"));
fs.writeFileSync(path.join(REPO, "lib/api-zod/package.json.npm"), JSON.stringify(apiZodPkg, null, 2));
console.log("PATCHED_LIB:api-zod");

// lib/api-client-react — used throughout the dashboard
const apiClientPkg = patchPkg(path.join(REPO, "lib/api-client-react/package.json"));
fs.writeFileSync(path.join(REPO, "lib/api-client-react/package.json.npm"), JSON.stringify(apiClientPkg, null, 2));
console.log("PATCHED_LIB:api-client-react");

// api-server — remove @workspace/db (not imported anywhere in source)
const apiPkg = patchPkg(
  path.join(REPO, "artifacts/api-server/package.json"),
  ["@workspace/db"]
);
fs.writeFileSync(path.join(REPO, "artifacts/api-server/package.json.npm"), JSON.stringify(apiPkg, null, 2));
console.log("PATCHED_ARTIFACT:api-server");

// soc-dashboard — keep api-client-react, remove unused api-spec
const dashPkg = patchPkg(
  path.join(REPO, "artifacts/soc-dashboard/package.json"),
  ["@workspace/api-spec"]
);
fs.writeFileSync(path.join(REPO, "artifacts/soc-dashboard/package.json.npm"), JSON.stringify(dashPkg, null, 2));
console.log("PATCHED_ARTIFACT:soc-dashboard");
JS
}

# ── Apply / restore helpers ───────────────────────────────────────
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
  restore_patch "$REPO/lib/api-client-react"; \
  restore_patch "$REPO/artifacts/api-server"; \
  restore_patch "$REPO/artifacts/soc-dashboard"' EXIT

log "Step 1/6 — patching package.json files for npm compatibility"
resolve_catalog

apply_patch "$REPO/lib/api-zod"
apply_patch "$REPO/lib/api-client-react"
apply_patch "$REPO/artifacts/api-server"
apply_patch "$REPO/artifacts/soc-dashboard"

# ── Install lib packages ──────────────────────────────────────────
log "Step 2/6 — installing lib/api-zod"
cd "$REPO/lib/api-zod"
npm install --legacy-peer-deps --prefer-offline 2>&1 | tail -2

log "Step 3/6 — installing lib/api-client-react"
cd "$REPO/lib/api-client-react"
npm install --legacy-peer-deps --prefer-offline 2>&1 | tail -2

# ── Build API server ─────────────────────────────────────────────
log "Step 4/6 — building API server"
cd "$REPO/artifacts/api-server"
npm install --legacy-peer-deps 2>&1 | grep -E "^added|error" | tail -3
node ./build.mjs

# ── Build dashboard ──────────────────────────────────────────────
log "Step 5/6 — building dashboard"
cd "$REPO/artifacts/soc-dashboard"
npm install --legacy-peer-deps 2>&1 | grep -E "^added|error" | tail -3
BASE_PATH=/ PORT=3000 npx vite build --config vite.config.ts

# ── Done ─────────────────────────────────────────────────────────
log "Step 6/6 — done!"
echo ""
echo "  API server : $REPO/artifacts/api-server/dist/index.mjs"
echo "  Dashboard  : $REPO/artifacts/soc-dashboard/dist/public/"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Start the API server with PM2"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  npm install -g pm2"
echo ""
echo "  SOC_DATA_FILE=$REPO/artifacts/soc-auth-data.json \\"
echo "  PORT=8080 \\"
echo "  pm2 start node --name uta-api \\"
echo "    -- --enable-source-maps $REPO/artifacts/api-server/dist/index.mjs"
echo ""
echo "  pm2 save && pm2 startup"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " Configure Apache httpd"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  sudo cp $REPO/deploy/uta.conf /etc/httpd/conf.d/uta.conf"
echo "  sudo sed -i \"s|/srv/uta|$REPO|g\" /etc/httpd/conf.d/uta.conf"
echo "  sudo setsebool -P httpd_can_network_connect 1"
echo "  sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload"
echo "  sudo systemctl enable --now httpd"
echo ""
