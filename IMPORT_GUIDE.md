# TravelGo — Import Quick Start Guide

## Overview

The TravelGo catalog import system is a three-step process:

1. **Configure** — Choose a region and import settings
2. **Count** — Query OpenStreetMap to see how many places will be imported
3. **Import** — Process in batches, enrich from Wikipedia, generate embeddings

---

## Step 1: Access Admin Panel

Navigate to: `/admin/catalog`

Requirements: Admin or Developer account

---

## Step 2: Choose a Region

### Option A: Use a Preset (Recommended)

Click one of the **Template Rapidi** buttons on the left:

- **🇯🇵 Giappone - Completo** — All attractions across Japan (~8,500 places)
- **🇯🇵 Giappone - Tokyo** — Tokyo prefectures (~850 places)
- **⛩️ Giappone - Kyoto** — Temples and historic sites (~350 places)
- **🇮🇹 Italia - Roma** — Rome monuments (~1,200 places)
- **🇫🇷 Francia - Parigi** — Paris museums and landmarks (~1,500 places)

_More presets available in the preset menu._

**What happens when you click a preset:**
- Location is set (e.g., "Japan")
- Categories are selected (e.g., attractions + historic + religion)
- Batch size, Wikipedia enrichment, and other options are configured
- All settings appear in the main filter panel below

### Option B: Custom Configuration

Fill in the fields manually:

**Destinazione** (Location)
- Examples: "Japan", "Tokyo", "New York", "Rome"
- Be specific for better results: "Kyoto" is better than "Japan" if you only want Kyoto

**Categorie OSM** (Categories)
- Toggle which types of places to include:
  - **Attractions** — Museums, viewpoints, landmarks
  - **Historic** — Castles, ruins, historical sites
  - **Religion** — Temples, churches, mosques
  - **Shopping** — Markets, shops, malls
  - **Recreation** — Parks, sports facilities
  - **Food** — Restaurants (if available in OSM)

**Opzioni** (Options)
- **Batch Size** (100-2000): How many places to process at once
  - Default: 500
  - Smaller = safer, slower
  - Larger = faster, but uses more API credits
  
- **Solo posti notevoli** — Only import places with Wikipedia/Wikidata entries
  - Good for: High-quality data, fewer but richer places
  - Check if: You want only notable attractions
  
- **Arricchisci da Wikipedia** — Fetch descriptions and images from Wikipedia
  - Takes longer (adds ~100ms per place)
  - Highly recommended for tourism
  - Provides: descriptions (up to 500 chars), cover images
  
- **Continua automaticamente** — Resume the next batch automatically
  - Good for: Large imports where you can't monitor
  - Uncheck if: You want to review between batches

---

## Step 3: Monitor Overpass API Status

**Before creating a job**, check the **Overpass API Status** box at the top:

- **🟢 ✓ Pronto** — Green indicator = Ready to use
- **🟡 ⏳ Occupato** — Yellow = Busy but will work (may wait)
- **🔴 ✕ Errore** — Red = Error, don't start new imports yet

The system shows:
- **Slot disponibili** — How many queries can start now (on the best endpoint)
- **Endpoint attivo** — Which Overpass mirror is fastest
- **Aggiornato** — Last check timestamp

The status auto-updates every **30 seconds** (not more, to avoid banning Overpass).

---

## Step 4: Create a Job

Once configured, click **Crea Task** (Create Job)

### What happens:
1. System queries Overpass API to count matching places
2. Shows status messages as it retries if needed
3. Once count is found, creates a pending job in the **Job List** (right column)

### Potential issues:
- **"Server occupato — attendo..."** — Overpass is busy, system is backing off
  - Don't cancel, it will retry automatically
  - Usually takes 30-60 seconds
  
- **Errore: location richiesto** — You didn't enter a location
  - Fill in the "Destinazione" field
  
- **Errore: almeno una categoria** — No categories selected
  - Click at least one category checkbox

---

## Step 5: Start the Import

Once a job is created and shows status **In attesa** (Pending):

Click the **▶ Avvia Import** button in the job card.

### Real-time progress shows:

- **Saved**: # di posti inseriti nel DB
- **Embedded**: # di posti con embeddings calcolati
- **Progress bar**: Visual percentage completion
- **Message**: Current operation (e.g., "Importati 450/500 in questo batch…")

### What the system does:

For each batch:
1. Fetches places from OpenStreetMap
2. Enriches from Wikipedia (if enabled)
   - Fetches descriptions (max 500 chars)
   - Finds cover images from Wikimedia
3. Creates embeddings using OpenAI (for semantic search)
4. Saves to Supabase database

**Approximate timing:**
- 100 places: ~15-20 seconds (with Wikipedia enrichment)
- 500 places: ~60-90 seconds
- 1000 places: ~2-3 minutes

---

## Step 6: Monitor the Job

### Job status values:

- **In attesa** (Pending) — Waiting to start
  - Action: Click "▶ Avvia Import"

- **In corso** (Running) — Currently importing
  - Action: Click "⏹ Stop" to pause
  - Monitor: Progress bar updates in real-time

- **In pausa** (Paused) — Partially complete
  - Action: Click "▶ Riprendi" to continue
  - Status: Shows how many more batches remain

- **Completato** (Done) — All places imported
  - Success: ✓ Shows completed status
  - Status: All places with descriptions and embeddings

- **Errore** (Error) — Something went wrong
  - Action: Click "▶ Riprendi" to retry
  - Details: Error message shown below job card

### Job statistics:

Each job card shows three metrics:
- **Totale** — Total places found (from Overpass count)
- **Importati** — Places inserted into DB
- **Embedded** — Places with OpenAI embeddings calculated

Example: Totale: 8,500 | Importati: 5,200 | Embedded: 5,200

---

## Step 7: After Import Completes

### Review the results:

Once status shows **Completato** (Done):

1. **Check DB** — Places now appear in `catalog_places` table
2. **Verify counts** — Compare expected vs actual imports
3. **Validate quality** — Use data quality tools (future)

### What can go wrong:

- **Imported < Total Found** — Some places failed enrichment
  - This is OK, especially if Wikipedia was unavailable
  - Check error logs for details
  
- **Missing descriptions** — Wikipedia wasn't enriched
  - If you enabled it but descriptions are null
  - Likely Wikipedia API was down temporarily
  - Can re-enrich later with another import job

- **Missing images** — No cover images found
  - Some places legitimately don't have images on Wikipedia
  - This is expected for less notable locations

---

## Common Recipes

### Quick Japan Tourism Setup

```
1. Click: "🇯🇵 Giappone - Completo"
2. Click: "Crea Task"
3. Wait for count (~10-20s)
4. Click: "▶ Avvia Import"
5. Monitor progress bar
6. With auto-continue: Check back in 15-20 minutes
   (Or: Click "▶ Riprendi" between batches for quality check)
```

**Expected result:** ~8,500 Japanese attractions with descriptions and embeddings

### High-Quality Single City

```
1. Fill Location: "Kyoto, Japan"
2. Check: "Solo posti notevoli" ✓
3. Keep: All categories selected
4. Uncheck: "Continua automaticamente" (review each batch)
5. Set Batch Size: 200 (slower, more monitoring)
6. Click: "Crea Task"
7. Click: "▶ Avvia Import"
8. After each batch: Review progress, then click "▶ Riprendi"
```

**Expected result:** ~350 notable Kyoto sites, all with Wikipedia descriptions

### Fast Import (Minimal Enrichment)

```
1. Fill Location: "Tokyo"
2. Uncheck: "Arricchisci da Wikipedia" (much faster)
3. Keep: "Solo posti notevoli" unchecked
4. Increase Batch Size: 1000
5. Check: "Continua automaticamente" ✓
6. Click: "Crea Task"
7. Click: "▶ Avvia Import"
8. Time: ~5-10 minutes total
```

**Expected result:** ~850 Tokyo places, names and coordinates but no descriptions

---

## Troubleshooting

### "Overpass API Status: ✕ Errore"

**Problem:** Overpass mirrors are down or not responding

**Solution:**
1. Wait 5-10 minutes
2. Click the refresh button next to the status
3. Try creating a job again

### "Server occupato — attendo 32s (tentativo 2/5)"

**Problem:** Overpass rate limiting

**Solution:**
- This is normal and expected
- System automatically retries with backoff
- Wait, don't cancel the dialog
- Usually resolves in 30-60 seconds

### Import stops after first batch

**Problem:** Auto-continue is off

**Solution:**
1. Job shows status: **In pausa**
2. Click the **▶ Riprendi** button in the job card
3. Import continues with next batch
4. Repeat until status shows **Completato**

Or next time: Check "Continua automaticamente" before creating job

### Imported count is much less than Total Found

**Problem:** Some places failed enrichment or database upsert

**Solution:**
- This is normal
- Failures often due to:
  - Wikipedia API timeout
  - Duplicate entries (merged by source+source_id)
  - Missing coordinates
- Check server logs for details
- Re-run the same import to retry failed places

### "Errore: Unauthorized"

**Problem:** User is not admin

**Solution:**
- Ask the admin to create the import
- Or ensure your account has admin role in `platform_admins` table

---

## Best Practices

### 1. Start small
- Import a single city first (Tokyo, Rome, Paris)
- Verify quality before large imports
- Adjust settings based on results

### 2. Watch the status
- Check Overpass status before creating jobs
- Monitor first batch to ensure quality
- Stop if errors appear

### 3. Batch size guidance
- 300-500: Balanced (good for monitoring)
- 1000+: Fast (good with auto-continue)
- <300: Very safe (good for testing)

### 4. Wikipedia enrichment trade-off
- **Enable** for tourism (descriptions are valuable)
- **Disable** for speed (10x faster)
- Default: Enabled (recommended)

### 5. Managing storage
- Each place with embedding: ~2-3 KB
- 10,000 places ≈ 30 MB
- Supabase free tier: Sufficient for most regions

---

## Next Steps

After importing catalog data:

1. **Verify embeddings** — Test semantic search
2. **Set up user-facing API** — Expose search endpoint
3. **Create search UI** — Let users find places
4. **Add ratings/reviews** — Integrate Google Places / TripAdvisor
5. **Regional updates** — Periodic re-imports for new places

---
