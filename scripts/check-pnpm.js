#!/usr/bin/env node
// Cross-platform preinstall check: ensures pnpm is used as the package manager.
import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1');

// Remove lock files from other package managers
for (const lock of ['package-lock.json', 'yarn.lock']) {
  const p = join(root, lock);
  if (existsSync(p)) {
    unlinkSync(p);
    console.log(`Removed ${lock}`);
  }
}

// Check the user agent to ensure pnpm is being used
const agent = process.env.npm_config_user_agent || '';
if (!agent.startsWith('pnpm/')) {
  console.error('Error: This project must be installed with pnpm.');
  console.error('  Run: npm install -g pnpm && pnpm install');
  process.exit(1);
}
