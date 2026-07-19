/**
 * Import ORR Table 1415 (entries/exits + interchanges time series) into
 * Firestore collection GBNR-PASS-USAGE-DATA.
 *
 * Doc IDs: {CRS}_{NLC} when both codes are present; otherwise sequential 0001, 0002, …
 *
 * Usage:
 *   node scripts/import-gbnr-pass-usage-data.mjs \
 *     --credentials ../ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json \
 *     --ods /path/to/table-1415-....ods
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '../..')
const COLLECTION = 'GBNR-PASS-USAGE-DATA'
const BATCH_SIZE = 400

const DEFAULT_CREDENTIALS = resolve(
  REPO_ROOT,
  'ignore/rail-statistics-firebase-adminsdk-fbsvc-3a33025fa6.json'
)
const DEFAULT_ODS = resolve(
  process.env.HOME || '',
  'Downloads/table-1415-time-series-of-passenger-entries-and-exits-and-interchanges-by-station.ods'
)

function parseArgs(argv) {
  const out = { credentials: DEFAULT_CREDENTIALS, ods: DEFAULT_ODS, dryRun: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--credentials' || a === '-c') out.credentials = resolve(argv[++i])
    else if (a === '--ods' || a === '-o') out.ods = resolve(argv[++i])
    else if (a === '--dry-run') out.dryRun = true
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: node scripts/import-gbnr-pass-usage-data.mjs [options]
  --credentials, -c   Path to Firebase Admin SDK JSON (default: ignore/…adminsdk….json)
  --ods, -o           Path to Table 1415 .ods file
  --dry-run           Parse and assign IDs only; do not write to Firestore`)
      process.exit(0)
    }
  }
  return out
}

const PARSE_PY = `
import json, sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path

NS = {
    "table": "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
    "text": "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
    "office": "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
}

def cell_text(cell):
    parts = ["".join(t.itertext()) for t in cell.findall(".//text:p", NS)]
    txt = " | ".join(p for p in parts if p).strip()
    if txt:
        return txt
    return (
        cell.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}value")
        or cell.get("{urn:oasis:names:tc:opendocument:xmlns:office:1.0}date-value")
        or ""
    )

def row_cells(row, max_cols=80):
    cells = []
    for cell in row.findall("table:table-cell", NS):
        crep = int(cell.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-columns-repeated") or 1)
        val = cell_text(cell)
        if not val and crep > 20:
            crep = 1
        for _ in range(crep):
            cells.append(val)
            if len(cells) >= max_cols:
                return cells
    while cells and not cells[-1]:
        cells.pop()
    return cells

def year_from_header(h):
    # "Apr 2024 to Mar 2025" / "... [b]" / "... [note 1]" -> "2025"
    import re
    m = re.search(r"Mar\\s+(\\d{4})", h or "")
    return m.group(1) if m else None

def parse_value(raw):
    if raw is None:
        return 0
    s = str(raw).strip()
    if not s:
        return 0
    # ORR markers for not applicable / suppressed / missing
    if s.lower() in ("[x]", "[z]", "[a]", "x", "z", "a", "-", "–", "—"):
        return 0
    # strip note markers left in cells (rare)
    s = s.replace(",", "")
    try:
        return int(float(s))
    except ValueError:
        return 0

def clean_code(raw):
    if raw is None:
        return None
    s = str(raw).strip()
    if not s or s == "[z]" or s == "[x]":
        return None
    return s

def parse_sheet(root, sheet_name):
    for sheet in root.findall(".//table:table", NS):
        name = sheet.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}name") or ""
        if name != sheet_name:
            continue
        year_cols = []  # list of (col_index, year_key)
        rows_out = []
        for row in sheet.findall("table:table-row", NS):
            rep = int(row.get("{urn:oasis:names:tc:opendocument:xmlns:table:1.0}number-rows-repeated") or 1)
            if rep > 20:
                continue
            cells = row_cells(row)
            if not any(cells):
                continue
            joined = " ".join(cells[:6])
            if "Station name" in joined and "Three Letter" in joined:
                year_cols = []
                for i, h in enumerate(cells):
                    y = year_from_header(h.replace(" | ", " "))
                    if y:
                        year_cols.append((i, y))
                continue
            if not year_cols:
                continue
            # data row: Sort, Station name, TLC, NLC, Region, Local authority, then years
            if len(cells) < 6:
                continue
            sort_raw = cells[0].strip()
            try:
                sort = int(float(sort_raw.replace(",", "")))
            except ValueError:
                continue
            station_name = cells[1].strip()
            if not station_name:
                continue
            years = {}
            for col_i, yk in year_cols:
                years[yk] = parse_value(cells[col_i] if col_i < len(cells) else None)
            rows_out.append({
                "sort": sort,
                "stationName": station_name,
                "crsCode": clean_code(cells[2] if len(cells) > 2 else None),
                "nlc": clean_code(cells[3] if len(cells) > 3 else None),
                "region": clean_code(cells[4] if len(cells) > 4 else None),
                "localAuthority": clean_code(cells[5] if len(cells) > 5 else None),
                "years": years,
            })
        return rows_out
    raise SystemExit(f"Sheet not found: {sheet_name}")

def merge_key(r):
    return (r["sort"], r["stationName"], r["crsCode"] or "", r["nlc"] or "")

path = Path(sys.argv[1])
with zipfile.ZipFile(path) as z:
    root = ET.fromstring(z.read("content.xml"))

entries = parse_sheet(root, "1415a_Entries_and_Exits")
interchanges = parse_sheet(root, "1415b_Interchanges")
ix_map = {merge_key(r): r for r in interchanges}

merged = []
for e in entries:
    i = ix_map.get(merge_key(e))
    merged.append({
        "sort": e["sort"],
        "stationName": e["stationName"],
        "crsCode": e["crsCode"],
        "nlc": e["nlc"],
        "region": e["region"],
        "localAuthority": e["localAuthority"],
        "entriesExits": e["years"],
        "interchanges": (i["years"] if i else {k: 0 for k in e["years"]}),
    })

print(json.dumps(merged, separators=(",", ":")))
`

function parseOds(odsPath) {
  const result = execFileSync('python3', ['-c', PARSE_PY, odsPath], {
    encoding: 'utf8',
    maxBuffer: 80 * 1024 * 1024,
  })
  return JSON.parse(result)
}

function assignDocIds(rows) {
  let seq = 0
  const used = new Set()
  const withIds = []

  for (const row of rows) {
    let docId
    if (row.crsCode && row.nlc) {
      docId = `${row.crsCode}_${row.nlc}`
    } else {
      seq += 1
      docId = String(seq).padStart(4, '0')
      // keep crs/nlc null when incomplete (already cleaned by parser)
    }
    if (used.has(docId)) {
      throw new Error(`Duplicate document id: ${docId} (${row.stationName})`)
    }
    used.add(docId)
    withIds.push({ docId, ...row })
  }
  return { withIds, sequentialCount: seq, compositeCount: withIds.length - seq }
}

async function upload(docs, credentialsPath) {
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

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const chunk = docs.slice(i, i + BATCH_SIZE)
    const batch = db.batch()
    for (const row of chunk) {
      const ref = db.collection(COLLECTION).doc(row.docId)
      batch.set(ref, {
        stationName: row.stationName,
        crsCode: row.crsCode,
        nlc: row.nlc,
        region: row.region,
        localAuthority: row.localAuthority,
        sort: row.sort,
        entriesExits: row.entriesExits,
        interchanges: row.interchanges,
        source: {
          table: '1415',
          periodLabel: 'April 1997 to March 2025',
          importedAt,
        },
      })
    }
    await batch.commit()
    written += chunk.length
    console.log(`Wrote ${written}/${docs.length}`)
  }
  return written
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (!existsSync(args.ods)) {
    console.error(`ODS not found: ${args.ods}`)
    process.exit(1)
  }
  if (!args.dryRun && !existsSync(args.credentials)) {
    console.error(`Credentials not found: ${args.credentials}`)
    process.exit(1)
  }

  console.log(`Parsing ${args.ods}`)
  const rows = parseOds(args.ods)
  console.log(`Parsed ${rows.length} stations from 1415a (merged with 1415b)`)

  const { withIds, sequentialCount, compositeCount } = assignDocIds(rows)
  console.log(`Doc IDs: ${compositeCount} CRS_NLC, ${sequentialCount} sequential (000N)`)

  const sampleComposite = withIds.find((d) => d.docId.includes('_'))
  const sampleSeq = withIds.find((d) => !d.docId.includes('_'))
  if (sampleComposite) {
    console.log(
      `Sample composite: ${sampleComposite.docId} ${sampleComposite.stationName} entriesExits.2025=${sampleComposite.entriesExits['2025']}`
    )
  }
  if (sampleSeq) {
    console.log(
      `Sample sequential: ${sampleSeq.docId} ${sampleSeq.stationName} crs=${sampleSeq.crsCode} nlc=${sampleSeq.nlc}`
    )
  }

  if (args.dryRun) {
    console.log('Dry run — no Firestore writes')
    return
  }

  console.log(`Uploading to ${COLLECTION}…`)
  const written = await upload(withIds, args.credentials)
  console.log(`Done. Wrote ${written} documents to ${COLLECTION}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
