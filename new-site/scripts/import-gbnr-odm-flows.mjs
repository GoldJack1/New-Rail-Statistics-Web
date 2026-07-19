/**
 * Import ORR Origin–Destination Matrix (ODM) CSVs into GBNR-ODM-FLOWS.
 *
 * For each origin NLC and financial year: keep the top N and bottom N destinations
 * by journeys (default N=25). Document id = origin NLC (e.g. "5131").
 *
 * Usage:
 *   node scripts/import-gbnr-odm-flows.mjs \
 *     --credentials ../ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json \
 *     --dir ../ignore
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')
const COLLECTION = 'GBNR-ODM-FLOWS'
/** Docs are large (multi-year top+bottom); keep batches small for the 10MB commit limit. */
const BATCH_SIZE = 20
const TOP_N = 25

const DEFAULT_CREDENTIALS = resolve(
  REPO_ROOT,
  'ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json'
)
const DEFAULT_DIR = resolve(REPO_ROOT, 'ignore')

function parseArgs(argv) {
  const out = {
    credentials: DEFAULT_CREDENTIALS,
    csvPaths: [],
    dir: null,
    dryRun: false,
    mergeYears: false,
    topN: TOP_N,
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--credentials' || a === '-c') out.credentials = resolve(argv[++i])
    else if (a === '--csv') out.csvPaths.push(resolve(argv[++i]))
    else if (a === '--dir') out.dir = resolve(argv[++i])
    else if (a === '--top') out.topN = Math.max(1, parseInt(argv[++i], 10) || TOP_N)
    else if (a === '--merge-years') out.mergeYears = true
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/import-gbnr-odm-flows.mjs [options]
  --credentials, -c   Admin SDK JSON path
  --csv               ODM CSV path (repeatable)
  --dir               Directory containing ODM*.csv (default with no --csv: ignore/)
  --top               Top/bottom destinations per origin (default 25)
  --merge-years       Preserve existing year keys not present in this import
  --dry-run           Aggregate only; no Firestore writes`)
      process.exit(0)
    }
  }
  return out
}

function resolveCsvPaths(args) {
  if (args.csvPaths.length > 0) return args.csvPaths
  const dir = args.dir || DEFAULT_DIR
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => /^ODM.*\.csv$/i.test(name))
    .map((name) => join(dir, name))
    .sort()
}

const AGGREGATE_PY = `
import csv, json, sys
from collections import defaultdict

top_n = int(sys.argv[1])
paths = sys.argv[2:]

def norm_nlc(raw):
    if raw is None:
        return None
    s = str(raw).strip()
    if not s:
        return None
    # numeric NLCs as plain digit strings (375, 5131)
    try:
        return str(int(float(s)))
    except ValueError:
        return s

def fy_end_year(raw):
    s = str(raw).strip()
    if len(s) == 8 and s.isdigit():
        return s[4:8]  # 20182019 -> 2019
    if len(s) == 4 and s.isdigit():
        # 1920 -> 2019-20 -> end year 2020
        return str(2000 + int(s[2:4]))
    # fallback: digits only, take last 4 if long
    digits = "".join(c for c in s if c.isdigit())
    if len(digits) >= 4:
        return digits[-4:]
    return s

def fy_label(end_year):
    try:
        end = int(end_year)
        return f"April {end - 1} to March {end}"
    except ValueError:
        return str(end_year)

# origin -> year -> dest -> {journeys, meta}
agg = defaultdict(lambda: defaultdict(lambda: defaultdict(lambda: {"journeys": 0, "meta": None})))
origin_meta = {}  # nlc -> latest meta from rows

for path in paths:
    with open(path, newline="", encoding="utf-8", errors="replace") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames:
            raise SystemExit(f"No header: {path}")
        fields = {h.lower(): h for h in reader.fieldnames}
        def col(*names):
            for n in names:
                if n.lower() in fields:
                    return fields[n.lower()]
            return None
        c_fy = col("Financial_Year")
        c_on = col("origin_nlc")
        c_os = col("origin_station_name")
        c_or = col("origin_region")
        c_ola = col("origin_local_authority")
        c_otlc = col("origin_tlc")
        c_osg = col("origin_station_group")
        c_dn = col("destination_nlc")
        c_ds = col("destination_station_name")
        c_dr = col("destination_region")
        c_dla = col("destination_local_authority")
        c_dtlc = col("destination_tlc")
        c_dsg = col("destination_station_group")
        c_j = col("journeys")
        if not all([c_fy, c_on, c_dn, c_j]):
            raise SystemExit(f"Missing required columns in {path}: {reader.fieldnames}")

        for row in reader:
            origin = norm_nlc(row.get(c_on))
            dest = norm_nlc(row.get(c_dn))
            if not origin or not dest:
                continue
            try:
                journeys = int(float(str(row.get(c_j, "0")).replace(",", "").strip() or 0))
            except ValueError:
                continue
            if journeys <= 0:
                continue
            year = fy_end_year(row.get(c_fy))
            bucket = agg[origin][year][dest]
            bucket["journeys"] += journeys
            if bucket["meta"] is None:
                bucket["meta"] = {
                    "stationName": (row.get(c_ds) or "").strip(),
                    "crsCode": ((row.get(c_dtlc) or "").strip() or None) if c_dtlc else None,
                    "region": ((row.get(c_dr) or "").strip() or None) if c_dr else None,
                    "localAuthority": ((row.get(c_dla) or "").strip() or None) if c_dla else None,
                    "stationGroup": ((row.get(c_dsg) or "").strip() or None) if c_dsg else None,
                }
            origin_meta[origin] = {
                "stationName": (row.get(c_os) or "").strip() or origin_meta.get(origin, {}).get("stationName") or "",
                "crsCode": (
                    ((row.get(c_otlc) or "").strip() or None) if c_otlc else None
                ) or origin_meta.get(origin, {}).get("crsCode"),
                "region": ((row.get(c_or) or "").strip() or None) if c_or else origin_meta.get(origin, {}).get("region"),
                "localAuthority": ((row.get(c_ola) or "").strip() or None) if c_ola else origin_meta.get(origin, {}).get("localAuthority"),
                "stationGroup": ((row.get(c_osg) or "").strip() or None) if c_osg else origin_meta.get(origin, {}).get("stationGroup"),
            }

docs = []

def dest_entry(rank, dest, payload):
    m = payload["meta"] or {}
    return {
        "rank": rank,
        "nlc": dest,
        "stationName": m.get("stationName") or "",
        "crsCode": m.get("crsCode"),
        "region": m.get("region"),
        "localAuthority": m.get("localAuthority"),
        "stationGroup": m.get("stationGroup"),
        "journeys": payload["journeys"],
    }

for origin, years_map in agg.items():
    years_out = {}
    for year, dest_map in years_map.items():
        items = list(dest_map.items())
        by_high = sorted(items, key=lambda kv: (-kv[1]["journeys"], kv[0]))
        by_low = sorted(items, key=lambda kv: (kv[1]["journeys"], kv[0]))
        top = [dest_entry(rank, dest, payload) for rank, (dest, payload) in enumerate(by_high[:top_n], start=1)]
        bottom = [dest_entry(rank, dest, payload) for rank, (dest, payload) in enumerate(by_low[:top_n], start=1)]
        years_out[year] = {
            "financialYearLabel": fy_label(year),
            "destinationCount": len(items),
            "topDestinations": top,
            "bottomDestinations": bottom,
        }
    om = origin_meta.get(origin) or {}
    docs.append({
        "nlc": origin,
        "stationName": om.get("stationName") or "",
        "crsCode": om.get("crsCode"),
        "region": om.get("region"),
        "localAuthority": om.get("localAuthority"),
        "stationGroup": om.get("stationGroup"),
        "years": years_out,
    })

docs.sort(key=lambda d: (len(d["nlc"]), d["nlc"]))
print(json.dumps({"topN": top_n, "stationCount": len(docs), "stations": docs}, separators=(",", ":")))
`

function aggregateOdm(csvPaths, topN) {
  const result = execFileSync('python3', ['-c', AGGREGATE_PY, String(topN), ...csvPaths], {
    encoding: 'utf8',
    maxBuffer: 200 * 1024 * 1024,
  })
  return JSON.parse(result)
}

async function upload(stations, credentialsPath, { mergeYears, sourceFiles, topN }) {
  const serviceAccount = JSON.parse(readFileSync(credentialsPath, 'utf8'))
  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id,
    })
  }
  const db = getFirestore()
  const importedAt = Timestamp.now()
  let written = 0

  for (let i = 0; i < stations.length; i += BATCH_SIZE) {
    const chunk = stations.slice(i, i + BATCH_SIZE)
    const batch = db.batch()

    for (const station of chunk) {
      const ref = db.collection(COLLECTION).doc(station.nlc)
      let years = station.years

      if (mergeYears) {
        const existing = await ref.get()
        if (existing.exists()) {
          const prev = existing.data()?.years
          if (prev && typeof prev === 'object') {
            years = { ...prev, ...station.years }
          }
        }
      }

      batch.set(
        ref,
        {
          nlc: station.nlc,
          stationName: station.stationName,
          crsCode: station.crsCode,
          region: station.region,
          localAuthority: station.localAuthority,
          stationGroup: station.stationGroup,
          years,
          source: {
            topN,
            bottomN: topN,
            files: sourceFiles,
            importedAt,
            table: 'ODM',
          },
        },
        { merge: false }
      )
    }

    await batch.commit()
    written += chunk.length
    console.log(`Wrote ${written}/${stations.length}`)
  }

  return written
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const csvPaths = resolveCsvPaths(args)

  if (csvPaths.length === 0) {
    console.error('No ODM CSV files found. Pass --csv or --dir.')
    process.exit(1)
  }
  for (const p of csvPaths) {
    if (!existsSync(p)) {
      console.error(`CSV not found: ${p}`)
      process.exit(1)
    }
  }
  if (!args.dryRun && !existsSync(args.credentials)) {
    console.error(`Credentials not found: ${args.credentials}`)
    process.exit(1)
  }

  console.log(`Aggregating top+bottom ${args.topN} from ${csvPaths.length} file(s):`)
  for (const p of csvPaths) console.log(`  - ${p}`)

  const { stations, stationCount } = aggregateOdm(csvPaths, args.topN)
  const yearKeys = new Set()
  for (const s of stations) {
    for (const y of Object.keys(s.years || {})) yearKeys.add(y)
  }
  console.log(`Stations: ${stationCount}; years: ${[...yearKeys].sort().join(', ')}`)

  const sample = stations.find((s) => s.nlc === '5131') || stations[0]
  if (sample) {
    const years = Object.keys(sample.years || {}).sort()
    const y = years[years.length - 1]
    const top = sample.years?.[y]?.topDestinations?.[0]
    const bottom = sample.years?.[y]?.bottomDestinations?.[0]
    console.log(
      `Sample NLC ${sample.nlc} ${sample.stationName} year ${y}: top #1 ${top?.stationName} (${top?.journeys}); bottom #1 ${bottom?.stationName} (${bottom?.journeys})`
    )
  }

  if (args.dryRun) {
    console.log('Dry run — no Firestore writes')
    return
  }

  const sourceFiles = csvPaths.map((p) => p.split('/').pop())
  console.log(`Uploading to ${COLLECTION}…`)
  const written = await upload(stations, args.credentials, {
    mergeYears: args.mergeYears,
    sourceFiles,
    topN: args.topN,
  })
  console.log(`Done. Wrote ${written} documents to ${COLLECTION}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
