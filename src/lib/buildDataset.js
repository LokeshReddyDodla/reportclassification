/**
 * Turns raw `patient_documents` records into the dataset the UI renders.
 *
 * Shared deliberately: `scripts/extract.mjs` runs this over a Mongo export to
 * produce dataset.json, and the live client runs the identical function over
 * API responses. One implementation means the offline and live views cannot
 * drift apart — a bug shows up in both, and a fix lands in both.
 */
import { classify, parseHeader, parseRows } from './parseReport.js'
import { lookup, PANELS } from './testCatalog.js'

/**
 * Which bucket a document belongs in.
 *
 * The backend stamps `classification` at upload (and the sweep backfills older
 * documents), and that verdict is computed from the full `text_raw` — which the
 * documents endpoint strips from list responses. So the server has seen more of
 * the document than this client ever will, and its answer wins wherever it
 * exists. `classify()` stays as the fallback for documents that predate the
 * engine or that it could not read.
 */
export function docKind(doc) {
  const c = doc.classification
  const type = c?.doc_type
  if (!type || type === 'unclassified') return { kind: classify(doc), source: 'heuristic' }
  if (type === 'lab_report') return { kind: 'lab', source: 'engine' }
  if (type === 'radiology') return { kind: 'radiology', source: 'engine' }
  // The engine has no InBody type -- body-composition scans land in `other`
  // with the signal preserved in the evidence trail.
  const hits = c?.evidence?.doc_type?.other_hits || []
  const files = c?.evidence?.doc_type?.file_signals || []
  if (hits.includes('inbody') || files.includes('filename_inbody'))
    return { kind: 'inbody', source: 'engine' }
  return { kind: 'other', source: 'engine' }
}

/** Mongo extended JSON (`{$date: …}`, `{$oid: …}`) or a plain value. */
const isoDate = (v) => {
  const s = v && typeof v === 'object' ? v.$date ?? v.$oid ?? null : v
  return typeof s === 'string' ? s.slice(0, 10) : null
}
const idOf = (v) => (v && typeof v === 'object' ? v.$oid ?? String(v) : String(v ?? ''))

export function emptyStats() {
  return {
    documents_total: 0,
    by_type: { lab: 0, inbody: 0, radiology: 0, other: 0 },
    // How each document's type was decided, so the UI can say whether it is
    // reading the backend engine's verdict or its own fallback guess.
    typed_by_engine: 0,
    typed_by_heuristic: 0,
    engine_versions: {},
    reports_kept: 0,
    reports_dropped_no_rows: 0,
    rows_parsed: 0,
    rows_catalogued: 0,
    rows_uncatalogued: 0,
    uncatalogued_names: {},
    // Whether the source gave us the lab's own table or only its summary. The
    // API strips `text_raw` from list responses, and summary_text alone is an
    // abnormal-findings précis — so the UI must be able to say which it got.
    docs_with_text_raw: 0,
    docs_summary_only: 0,
  }
}

export function buildDataset(docs) {
  const stats = emptyStats()
  stats.documents_total = docs.length

  const patients = new Map()
  const seen = new Set()

  for (const doc of docs) {
    const { kind, source } = docKind(doc)
    stats.by_type[kind]++
    if (source === 'engine') {
      stats.typed_by_engine++
      const v = doc.classification?.engine_version
      if (v) stats.engine_versions[v] = (stats.engine_versions[v] || 0) + 1
    } else stats.typed_by_heuristic++
    if (kind !== 'lab') continue

    if ((doc.text_raw || '').length > 200) stats.docs_with_text_raw++
    else stats.docs_summary_only++

    const rows = parseRows(doc)
    stats.rows_parsed += rows.length

    // Single-analyte reports are real (a standalone TSH, a fasting sugar), so
    // the floor is "parsed anything at all", not a minimum panel size.
    if (rows.length < 1) {
      stats.reports_dropped_no_rows++
      continue
    }

    const header = parseHeader(doc)
    // metadata.document_date is the extractor's own collection date. It is not
    // always a *report* date — one document carries a date of birth there — so
    // a date implausibly older than the upload is rejected, not plotted.
    const uploaded = isoDate(doc.file?.uploaded_at) || isoDate(doc.metadata?.created_at)
    const date =
      [isoDate(doc.metadata?.document_date), header.collected, uploaded].find((c) =>
        plausible(c, uploaded)
      ) || uploaded

    const pid = doc.patient_id
    if (!pid || !date) continue

    const fingerprint = `${pid}|${date}|${rows.length}|${rows[0]?.name}|${rows[0]?.value}`
    if (seen.has(fingerprint)) continue
    seen.add(fingerprint)

    const tests = rows.map((r) => {
      const entry = lookup(r.name, r.unit)
      if (entry) stats.rows_catalogued++
      else {
        stats.rows_uncatalogued++
        stats.uncatalogued_names[r.name] = (stats.uncatalogued_names[r.name] || 0) + 1
      }
      return {
        key: entry?.key || slug(r.name),
        name: entry?.name || titleish(r.name),
        raw_name: r.name,
        canonical: Boolean(entry),
        panel: entry?.panel || 'other',
        value: r.value,
        unit: r.unit || '',
        ref: r.ref,
      }
    })

    const byPanel = new Map()
    for (const t of tests) {
      if (!byPanel.has(t.panel)) byPanel.set(t.panel, [])
      byPanel.get(t.panel).push(t)
    }
    const order = Object.keys(PANELS)
    const panels = [...byPanel.entries()]
      .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([key, ts]) => ({ key, name: PANELS[key] || 'Other Tests', tests: dedupe(ts) }))

    const report = {
      // Mongo export gives `_id: {$oid}`; the live API gives a plain `id`.
      id: idOf(doc._id ?? doc.id),
      date,
      lab: header.lab || 'Unidentified lab',
      file: { name: doc.file?.name, url: doc.file?.url, type: doc.file?.type },
      test_count: tests.length,
      source: (doc.text_raw || '').length > 200 ? 'text_raw' : 'summary_text',
      panels,
      // The engine's own verdict, kept alongside the parsed values so a report
      // can show what the backend decided and on what evidence.
      classification: doc.classification || null,
    }

    if (!patients.has(pid)) {
      patients.set(pid, {
        id: pid,
        name: header.name,
        age: header.age,
        gender: header.gender,
        reports: [],
      })
    }
    const p = patients.get(pid)
    p.name ||= header.name
    p.age ||= header.age
    p.gender ||= header.gender
    p.reports.push(report)
    stats.reports_kept++
  }

  const list = [...patients.values()]
  for (const p of list) {
    p.reports.sort((a, b) => String(a.date).localeCompare(String(b.date)))
    p.reports = mergeSameDay(p.reports)

    const series = {}
    for (const r of p.reports)
      for (const panel of r.panels)
        for (const t of panel.tests) {
          if (!t.canonical || typeof t.value !== 'number') continue
          ;(series[t.key] ||= []).push({
            date: r.date,
            value: t.value,
            unit: t.unit,
            ref: t.ref,
            reportId: r.id,
          })
        }
    for (const k of Object.keys(series)) {
      series[k].sort((a, b) => String(a.date).localeCompare(String(b.date)))
      // One point is not a trend — it is already on the report.
      if (series[k].length < 2) delete series[k]
    }
    p.series = series
    p.report_count = p.reports.length
    p.latest_date = p.reports.at(-1)?.date || null
  }

  list.sort((a, b) => String(b.latest_date).localeCompare(String(a.latest_date)))
  stats.patients = list.length
  stats.patients_with_trends = list.filter((p) => Object.keys(p.series).length > 0).length
  stats.uncatalogued_names = Object.fromEntries(
    Object.entries(stats.uncatalogued_names).sort((a, b) => b[1] - a[1]).slice(0, 40)
  )

  return { stats, patients: list }
}

/**
 * Several documents are pages of a single collection uploaded separately — same
 * patient, same day, different panels. Left apart they become two points on a
 * trend at identical x, which reads as change where none happened.
 */
function mergeSameDay(reports) {
  const byDate = new Map()
  for (const r of reports) {
    const prev = byDate.get(r.date)
    if (!prev) { byDate.set(r.date, r); continue }
    prev.merged_from = (prev.merged_from || 1) + 1
    for (const panel of r.panels) {
      const target = prev.panels.find((x) => x.key === panel.key)
      if (!target) { prev.panels.push(panel); continue }
      const have = new Set(target.tests.map((t) => t.key))
      target.tests.push(...panel.tests.filter((t) => !have.has(t.key)))
    }
    prev.test_count = prev.panels.reduce((n, x) => n + x.tests.length, 0)
    if (prev.lab === 'Unidentified lab' && r.lab !== 'Unidentified lab') prev.lab = r.lab
  }
  return [...byDate.values()]
}

/** A report predating its upload by more than 15 years is a misread header. */
function plausible(date, uploaded) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  const y = +date.slice(0, 4)
  if (y < 2000 || y > 2100) return false
  if (uploaded && +uploaded.slice(0, 4) - y > 15) return false
  return true
}

function dedupe(ts) {
  const seen = new Set()
  return ts.filter((t) => (seen.has(t.key) ? false : (seen.add(t.key), true)))
}
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48)
const titleish = (s) => {
  const t = String(s).trim()
  return t.length <= 4 ? t.toUpperCase() : t[0].toUpperCase() + t.slice(1)
}
