#!/usr/bin/env node
/**
 * RLS ratchet for tenant isolation (Phase 1 skeleton).
 *
 * Blueprint target: every table carrying `firmId` must:
 *   1. ENABLE ROW LEVEL SECURITY
 *   2. FORCE ROW LEVEL SECURITY   (app role must not be the table owner)
 *   3. have at least one POLICY bound to it
 *
 * Reality today: RLS is not in place yet. This script is the build-failing
 * gate that stops NEW drift while Phase 1 lands. It:
 *   - collects the `firmId` model names from prisma/schema.prisma
 *   - scans prisma/migrations/**.sql for ENABLE/FORCE/POLICY per table
 *   - compares against a checked-in baseline (scripts/rls-baseline.json)
 *   - exits 1 if any table is unprotected and not in the baseline, or if the
 *     baseline lists a table that no longer exists / is now protected
 *     (i.e. the baseline may only shrink — never grow).
 *
 * Flags:
 *   --strict   ignore the baseline; require every firmId table to be protected
 *              (this is the end-state of Phase 1)
 *   --write-baseline   regenerate the baseline (use only when deliberately
 *                      acknowledging existing unprotected tables)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
const apiRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = join(apiRoot, "prisma", "schema.prisma");
const migrationsDir = join(apiRoot, "prisma", "migrations");
const baselinePath = join(apiRoot, "scripts", "rls-baseline.json");

/** Extract table names for models that declare a `firmId` column. */
function firmIdModels(schema) {
  const models = [];
  const modelRe = /model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let match;
  while ((match = modelRe.exec(schema)) !== null) {
    const [, name, body] = match;
    if (/^\s*firmId\s+String/m.test(body)) {
      models.push(name);
    }
  }
  return models.sort();
}

function migrationSqlFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(dir, entry.name, "migration.sql"))
    .filter((path) => existsSync(path));
}

function normalizeTable(raw) {
  return raw.replace(/^["']|["']$/g, "");
}

/** Scan SQL for ENABLE/FORCE/POLICY markers per table. */
function protectedTables(files) {
  const state = new Map(); // table -> { enable: bool, force: bool, policy: bool }
  const ensure = (t) => {
    const key = normalizeTable(t);
    if (!state.has(key)) state.set(key, { enable: false, force: false, policy: false });
    return state.get(key);
  };

  for (const file of files) {
    const sql = readFileSync(file, "utf8");

    const enableRe =
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?["']?([\w.]+)["']?\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
    const forceRe =
      /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?["']?([\w.]+)["']?\s+FORCE\s+ROW\s+LEVEL\s+SECURITY/gi;
    // Matches: CREATE POLICY name ON "Table" ... ;  (TO/USING clause irrelevant here)
    const policyRe =
      /CREATE\s+POLICY\s+[\w"]+\s+ON\s+(?:["']?[\w]+["']?\.)?["']?([\w]+)["']?/gi;

    let m;
    while ((m = enableRe.exec(sql)) !== null) ensure(m[1]).enable = true;
    while ((m = forceRe.exec(sql)) !== null) ensure(m[1]).force = true;
    while ((m = policyRe.exec(sql)) !== null) ensure(m[1]).policy = true;
  }
  return state;
}

const schema = readFileSync(schemaPath, "utf8");
const models = firmIdModels(schema);
const sqlFiles = migrationSqlFiles(migrationsDir);
const state = protectedTables(sqlFiles);
const unprotected = models.filter((table) => {
  const entry = state.get(table);
  return !entry || !entry.enable || !entry.force || !entry.policy;
});

if (args.has("--write-baseline")) {
  writeFileSync(
    baselinePath,
    JSON.stringify({ generatedAt: new Date().toISOString(), unprotected }, null, 2) + "\n"
  );
  console.log(`Baseline written to ${baselinePath}: ${unprotected.length} unprotected tables`);
  process.exit(0);
}

const strict = args.has("--strict");
let baseline = [];
if (existsSync(baselinePath)) {
  try {
    baseline = JSON.parse(readFileSync(baselinePath, "utf8")).unprotected ?? [];
  } catch (error) {
    console.error(`Failed to parse ${baselinePath}: ${error.message}`);
    process.exit(2);
  }
}

const baselineSet = new Set(baseline);
const newlyUnprotected = unprotected.filter((table) => !baselineSet.has(table));
const staleBaseline = baseline.filter(
  (table) => !models.includes(table) || !unprotected.includes(table)
);

for (const table of models) {
  const entry = state.get(table);
  const ok = entry && entry.enable && entry.force && entry.policy;
  console.log(`${ok ? "OK " : "!! "} ${table}`);
}

if (strict) {
  if (unprotected.length) {
    console.error(
      `\nRLS check (--strict) FAILED: ${unprotected.length} firmId table(s) not protected:\n  ${unprotected.join(", ")}`
    );
    process.exit(1);
  }
  console.log("\nRLS check (--strict) passed: every firmId table has ENABLE+FORCE RLS and a POLICY.");
  process.exit(0);
}

let failed = false;
if (newlyUnprotected.length) {
  console.error(
    `\nRLS ratchet FAILED: new firmId table(s) without RLS (not in baseline):\n  ${newlyUnprotected.join(", ")}\nAdd ENABLE/FORCE/POLICY in a migration, commit scripts/rls-baseline.json removal, or (temporarily) acknowledge via --write-baseline.`
  );
  failed = true;
}
if (staleBaseline.length) {
  console.error(
    `\nRLS ratchet FAILED: baseline lists table(s) that are now protected or gone:\n  ${staleBaseline.join(", ")}\nRun with --write-baseline to shrink the baseline. The baseline may only shrink.`
  );
  failed = true;
}
if (failed) process.exit(1);

console.log(
  `\nRLS ratchet passed: ${models.length} firmId tables, ${unprotected.length} recorded as baseline-unprotected, 0 new.`
);
