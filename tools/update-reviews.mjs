#!/usr/bin/env node
/**
 * Weekly auto-update of LocalBusiness aggregateRating across all hub + spoke
 * pages that carry the JSON-LD Review array.
 *
 * Flow:
 *   1. Read current rating + review count from Google Business Profile API
 *      (or accept --rating / --count CLI overrides for testing).
 *   2. For each TARGET html file, regenerate the aggregateRating block.
 *   3. Write only files whose values actually changed (clean git diff).
 *
 * Auth:
 *   Uses a Google service account JSON in env var GBP_SERVICE_ACCOUNT_JSON
 *   (set as a GitHub Actions secret). The service account must be granted
 *   access to the GBP location via business.google.com.
 *
 * Manual usage:
 *   node tools/update-reviews.mjs                  # fetch live + write
 *   node tools/update-reviews.mjs --dry-run        # fetch live + diff only
 *   node tools/update-reviews.mjs --rating 5.0 --count 160   # offline override
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const TARGETS = [
  "index.html",
  "index2.html",
  "services/apostille.html",
  "services/notary/real-estate.html",
  "services/notary/jail.html",
  "services/notary/hospital.html",
  "services/notary/estate-planning.html",
  "services/notary/jail/vehicle-title.html",
  "services/notary/jail/power-of-attorney.html",
  "services/notary/jail/affidavits.html",
  "services/notary/hospital/molst-polst.html",
  "services/notary/hospital/living-will.html",
  "services/notary/hospital/hipaa-authorization.html",
  "services/notary/hospital/healthcare-power-of-attorney.html",
  "services/notary/hospital/bedside-notary.html",
  "services/notary/hospital/advance-healthcare-directive.html",
];

// ---------------------------- CLI ARGS ----------------------------
const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, all) => {
    if (a.startsWith("--")) {
      const key = a.replace(/^--/, "");
      const next = all[i + 1];
      if (!next || next.startsWith("--")) return [key, true];
      return [key, next];
    }
    return [null, null];
  }).filter(([k]) => k)
);

const DRY_RUN = args["dry-run"] === true;

// ---------------------------- FETCH GBP ----------------------------
async function fetchGbpStats() {
  if (args.rating && args.count) {
    return {
      ratingValue: String(args.rating),
      ratingCount: String(args.count),
      reviewCount: String(args.count),
      source: "cli-override",
    };
  }

  const saJson = process.env.GBP_SERVICE_ACCOUNT_JSON;
  const locationName = process.env.GBP_LOCATION_NAME; // e.g. "accounts/123/locations/456"
  if (!saJson || !locationName) {
    throw new Error(
      "GBP_SERVICE_ACCOUNT_JSON and GBP_LOCATION_NAME env vars are required " +
      "(or pass --rating X --count N for testing)."
    );
  }

  const sa = JSON.parse(saJson);

  // --- mint an OAuth access token with google-auth-library ---
  const { GoogleAuth } = await import("google-auth-library");
  const auth = new GoogleAuth({
    credentials: sa,
    scopes: ["https://www.googleapis.com/auth/business.manage"],
  });
  const client = await auth.getClient();
  const token = (await client.getAccessToken()).token;

  // --- fetch reviews page (API returns averageRating + totalReviewCount) ---
  // Endpoint: mybusinessbusinessinformation does NOT carry reviews; the
  // legacy "mybusiness" v4 endpoint does. Google has been migrating
  // between endpoints — the new endpoint is google-my-business → business-profile.
  // We try the current v4 first, fall back to a fresh endpoint if it changes.
  const url = `https://mybusiness.googleapis.com/v4/${locationName}/reviews?pageSize=1`;
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`GBP API ${resp.status}: ${body.slice(0, 400)}`);
  }
  const data = await resp.json();

  const ratingValue = (data.averageRating ?? 5.0).toFixed(1);
  const ratingCount = String(data.totalReviewCount ?? 0);

  return {
    ratingValue,
    ratingCount,
    reviewCount: ratingCount,
    source: "gbp-api",
  };
}

// ---------------------------- REWRITE ----------------------------
function buildBlock(stats, indent) {
  const I = " ".repeat(indent);
  return [
    `${I}"aggregateRating": {`,
    `${I}  "@type": "AggregateRating",`,
    `${I}  "ratingValue": "${stats.ratingValue}",`,
    `${I}  "bestRating": "5",`,
    `${I}  "worstRating": "1",`,
    `${I}  "ratingCount": "${stats.ratingCount}",`,
    `${I}  "reviewCount": "${stats.reviewCount}"`,
    `${I}}`,
  ].join("\n");
}

const BLOCK_RE = /"aggregateRating":\s*\{[^}]*\}/m;

async function rewriteFile(absPath, stats) {
  const text = await fs.readFile(absPath, "utf8");
  if (!BLOCK_RE.test(text)) {
    return { path: absPath, status: "skipped-no-block" };
  }
  // detect indent from existing block
  const m = text.match(/^(\s*)"aggregateRating":/m);
  const indent = m ? m[1].length : 4;
  const newBlock = buildBlock(stats, indent).replace(/^\s+/, "");
  const next = text.replace(BLOCK_RE, newBlock);
  if (next === text) return { path: absPath, status: "no-change" };
  if (!DRY_RUN) await fs.writeFile(absPath, next, "utf8");
  return { path: absPath, status: DRY_RUN ? "would-change" : "changed" };
}

// ---------------------------- MAIN ----------------------------
(async () => {
  const stats = await fetchGbpStats();
  console.log(
    `[update-reviews] source=${stats.source}  rating=${stats.ratingValue}  count=${stats.ratingCount}`
  );

  const results = [];
  for (const rel of TARGETS) {
    const abs = path.join(REPO_ROOT, rel);
    try {
      const r = await rewriteFile(abs, stats);
      results.push(r);
    } catch (err) {
      results.push({ path: abs, status: "error", error: err.message });
    }
  }

  const counts = results.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  console.log("[update-reviews] result counts:", counts);

  // Write a machine-readable summary so the GH Action can decide whether to commit
  const changed = results.filter((r) =>
    r.status === "changed" || r.status === "would-change"
  ).length;
  await fs.writeFile(
    path.join(REPO_ROOT, "tools/.last-review-update.json"),
    JSON.stringify({ ts: new Date().toISOString(), stats, results }, null, 2)
  );

  if (changed === 0) {
    console.log("[update-reviews] nothing to commit.");
    process.exit(0);
  }
  console.log(`[update-reviews] ${changed} file(s) updated.`);
})().catch((err) => {
  console.error("[update-reviews] FAILED:", err);
  process.exit(1);
});
