#!/usr/bin/env node

/**
 * sync-shared.js
 *
 * Copies client/src/shared/ to server/src/shared/ so both sides
 * stay in sync without a monorepo workspace package.
 *
 * Usage:
 *   node scripts/sync-shared.js          # one-shot sync
 *   node scripts/sync-shared.js --watch  # watch mode (dev)
 *
 * Hooked into build:server and dev:server via package.json scripts.
 */

import { cpSync, existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "client", "src", "shared");
const DEST = join(ROOT, "server", "src", "shared");

// ─── Manifest ────────────────────────────────────────────────────────────────
// Tracks last-sync timestamp so we can skip no-op copies.

const MANIFEST = join(ROOT, ".shared-sync-manifest.json");

function readManifest() {
  try {
    return JSON.parse(readFileSync(MANIFEST, "utf-8"));
  } catch {
    return {};
  }
}

function writeManifest(entry) {
  const manifest = { ...readManifest(), ...entry };
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
}

// ─── Sync ────────────────────────────────────────────────────────────────────

function sync() {
  if (!existsSync(SRC)) {
    console.error(`[sync-shared] Source not found: ${SRC}`);
    process.exit(1);
  }

  const start = performance.now();

  cpSync(SRC, DEST, {
    recursive: true,
    force: true,
    filter: (src) => {
      // Skip node_modules, .DS_Store, etc.
      const name = relative(SRC, src).split(/[\\/]/)[0];
      if (name === "node_modules" || name === ".DS_Store") return false;
      return true;
    },
  });

  const elapsed = (performance.now() - start).toFixed(0);
  const ts = new Date().toISOString();

  writeManifest({ lastSync: ts });
  console.log(`[sync-shared] Synced client/shared → server/shared (${elapsed}ms)`);
}

// ─── Watch ───────────────────────────────────────────────────────────────────

async function watch() {
  console.log("[sync-shared] Watching client/src/shared/ for changes...");

  let debounce;
  const fs = await import("node:fs");
  const onChange = (_event, filename) => {
    if (!filename?.includes("shared")) return;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      sync();
    }, 100);
  };

  fs.watch(SRC, { recursive: true }, onChange);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes("--watch")) {
  watch();
} else {
  sync();
}
