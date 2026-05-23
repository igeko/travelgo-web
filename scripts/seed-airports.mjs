/**
 * scripts/seed-airports.mjs
 *
 * One-off seed for the `airports` reference table from the OurAirports
 * dataset (public domain). Keeps large + medium airports that have a real
 * IATA code, mapped to { iata, name, city, country, lat, lng }.
 *
 * Run:  node scripts/seed-airports.mjs
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env.local.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const CSV_URL = "https://davidmegginson.github.io/ourairports-data/airports.csv";
const KEEP_TYPES = new Set(["large_airport", "medium_airport"]);
const BATCH = 1000;

function loadEnv() {
  const text = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

/** Parse one CSV line into fields, honoring quoted fields with embedded commas/quotes. */
function parseCsvLine(line) {
  const out = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      out.push(field); field = "";
    } else field += c;
  }
  out.push(field);
  return out;
}

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");

  console.log("Fetching OurAirports CSV…");
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`CSV fetch failed: ${res.status}`);
  const csv = await res.text();

  const lines = csv.split("\n");
  const header = parseCsvLine(lines[0]);
  const col = (name) => header.indexOf(name);
  const iIata = col("iata_code");
  const iType = col("type");
  const iName = col("name");
  const iCity = col("municipality");
  const iCountry = col("iso_country");
  const iLat = col("latitude_deg");
  const iLng = col("longitude_deg");
  const iKeywords = col("keywords");

  const byIata = new Map();
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    const f = parseCsvLine(lines[i]);
    const iata = (f[iIata] || "").trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(iata)) continue;
    if (!KEEP_TYPES.has(f[iType])) continue;
    if (byIata.has(iata)) continue;
    const lat = parseFloat(f[iLat]);
    const lng = parseFloat(f[iLng]);
    byIata.set(iata, {
      iata,
      name: (f[iName] || "").trim(),
      city: (f[iCity] || "").trim() || null,
      country: (f[iCountry] || "").trim() || null,
      type: (f[iType] || "").trim() || null,
      keywords: (f[iKeywords] || "").trim() || null,
      lat: Number.isFinite(lat) ? lat : null,
      lng: Number.isFinite(lng) ? lng : null,
    });
  }

  const rows = [...byIata.values()];
  console.log(`Prepared ${rows.length} airports. Upserting…`);

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    const { error } = await supabase.from("airports").upsert(chunk, { onConflict: "iata" });
    if (error) throw new Error(`Upsert failed at ${i}: ${error.message}`);
    console.log(`  ${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
