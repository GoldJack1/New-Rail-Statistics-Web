# Uploading new ORR station usage and ODM data

Runbook for refreshing Firestore when the Office of Rail and Road (ORR) publishes new **Estimates of station usage** (Table 1415) or **Origin–Destination Matrix (ODM)** files.

| Collection | Source | Script |
|---|---|---|
| `GBNR-PASS-USAGE-DATA` | Table 1415 `.ods` (entries/exits + interchanges time series) | [`scripts/import-gbnr-pass-usage-data.mjs`](../scripts/import-gbnr-pass-usage-data.mjs) |
| `GBNR-ODM-FLOWS` | ODM `.csv` files (top/bottom 25 destinations per origin NLC) | [`scripts/import-gbnr-odm-flows.mjs`](../scripts/import-gbnr-odm-flows.mjs) |

Both scripts use the Firebase Admin SDK. Credentials live in the gitignored `ignore/` folder at the repo root (never commit the service account JSON).

---

## Prerequisites

1. **Node.js** and repo dependencies (`cd new-site && npm install` if needed).
2. **Python 3** on your PATH (both importers shell out to Python to parse ODS/CSV).
3. Admin credentials at:

   `ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json`

4. Work from the `new-site` directory for the commands below.

```bash
cd new-site
```

---

## 1. Entries, exits and interchanges (`GBNR-PASS-USAGE-DATA`)

### What to download

- ORR page: [Passenger entries/exits and interchanges time series — Table 1415](https://dataportal.orr.gov.uk/statistics/usage/estimates-of-station-usage/) (Estimates of station usage).
- File: `table-1415-time-series-of-passenger-entries-and-exits-and-interchanges-by-station.ods` (name may gain a year suffix).

Table **1410** (latest year only, ticket splits, rank, main OD) is **not** imported by this script.

### Document shape (reminder)

- Doc ID: `{CRS}_{NLC}` when both codes exist (e.g. `ABW_5131`); otherwise sequential `0001`, `0002`, …
- Fields: `entriesExits` and `interchanges` maps keyed by **ending calendar year** of each April–March period (e.g. `2025` = Apr 2024–Mar 2025).

### Dry run (recommended)

```bash
node scripts/import-gbnr-pass-usage-data.mjs \
  --dry-run \
  --ods "/path/to/table-1415-….ods"
```

Check the log for station count and a sample such as `ABW_5131` / latest year totals.

### Upload

```bash
node scripts/import-gbnr-pass-usage-data.mjs \
  --credentials "../ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json" \
  --ods "/path/to/table-1415-….ods"
```

The import **overwrites** documents with `set` (idempotent). Re-running with a newer 1415 file refreshes the full time series.

### Verify

- Firebase console → `GBNR-PASS-USAGE-DATA` → e.g. `ABW_5131`
- Or open a GBNR station in the app → **Station Usage** (entries/exits / interchanges charts)

### App matching note

Knowledgebase NLC is often **6 digits** (e.g. `513100`); ORR uses **4 digits** (`5131`). The app tries both when loading usage.

---

## 2. Origin–Destination Matrix (`GBNR-ODM-FLOWS`)

### What to download

- Rail Data Marketplace: **Origin and destination matrix (ODM)** for the new financial year (CSV).
- Typical filename patterns: `ODM_for_rdm_YYYY-YY.csv`, `ODM_for_RDM_YYYY-YY.csv`, or `ODM_YYYY-YY v1.csv`.

Place new files in the repo’s gitignored folder:

```text
ignore/ODM_….csv
```

Keep previous year CSVs there too if you want a full rebuild of all years in one run.

### Document shape (reminder)

- Doc ID: origin **NLC** only (e.g. `5131`).
- Per year key (ending year, e.g. `2025`):
  - `topDestinations` — top 25 by journeys
  - `bottomDestinations` — bottom 25 by journeys
  - `destinationCount`, `financialYearLabel`

### Option A — Full rebuild (recommended when adding a year)

Process every `ODM*.csv` in `ignore/` and rewrite all station docs:

```bash
# Optional dry run
node scripts/import-gbnr-odm-flows.mjs --dry-run --dir "../ignore" --top 25

node scripts/import-gbnr-odm-flows.mjs \
  --credentials "../ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json" \
  --dir "../ignore" \
  --top 25
```

Expect several minutes: aggregation walks multi‑million-row CSVs, then uploads ~2.5k docs in small batches.

### Option B — Merge only the new year file(s)

If you only pass the new CSV(s) and want to keep existing year keys on each doc:

```bash
node scripts/import-gbnr-odm-flows.mjs \
  --credentials "../ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json" \
  --csv "../ignore/ODM_for_rdm_2025-26.csv" \
  --top 25 \
  --merge-years
```

Without `--merge-years`, each written doc’s `years` map is replaced by **only** the years present in the files you passed — older years would be dropped. Prefer Option A unless you are sure about merge behaviour.

### Verify

- Firebase console → `GBNR-ODM-FLOWS` → e.g. `5131` → confirm the new year key under `years`
- App → GBNR station → **Station Usage** → **ODM destinations** → select the new year tab

---

## Release checklist

When ORR / RDM publish a new year:

1. [ ] Download Table **1415** `.ods` and/or new **ODM** `.csv`
2. [ ] Store ODM files under `ignore/` (gitignored)
3. [ ] Dry-run the relevant import script(s)
4. [ ] Run the real import with Admin credentials
5. [ ] Spot-check Abbey Wood (`ABW_5131` / NLC `5131`) in Firebase and in the app
6. [ ] Note: 2022–23+ ODM methodology changes mean years are not always directly comparable — keep that in mind when interpreting the UI

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Credentials not found` | Wrong path or missing `ignore/` JSON | Pass `--credentials` to the Admin SDK file |
| `Transaction too big` (ODM) | Batch too large | Script already uses small batches; pull latest script; retry |
| App shows wrong NLC / not found | 6-digit KB vs 4-digit ORR | Usage and ODM loaders try both; confirm doc id is 4-digit NLC for ODM |
| ODM year missing after partial import | Imported without all CSVs and without `--merge-years` | Re-run Option A with full `ignore/` set, or re-import with `--merge-years` |
| Python / parse errors | Corrupt download or unexpected columns | Re-download file; confirm header includes `origin_nlc`, `destination_nlc`, `journeys` |

---

## Security

- Do **not** commit `ignore/*.json` service account keys or large ODM CSVs.
- Client apps have **read-only** access to these collections; only Admin SDK imports write data.
