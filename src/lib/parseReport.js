/**
 * Deterministic parsing of lab-report prose into the canonical schema.
 *
 * The stored documents hold LLM-extracted *text* — `text_raw` (the PDF's text,
 * layout largely flattened) and `summary_text` (a markdown précis). Neither
 * carries numbers as numbers, so every value the dashboard draws is recovered
 * here by pattern. Two sources are read because they fail differently:
 * `text_raw` has every test but wildly varying layout; `summary_text` is
 * uniformly formatted but many labs only summarise the abnormals.
 *
 * Nothing in here guesses: a row is emitted only when a value AND a reference
 * interval both parse. Rows that don't parse are counted, never invented.
 */

// --- document classification ------------------------------------------------
// `category` on the document is unreliable — InBody scans are filed under both
// "report" and "other" — so type is decided by content.
const RE_INBODY = /inbody|body composition analysis|skeletal muscle mass|body fat mass/i
const RE_LAB = /bio\.? ?ref|reference (range|interval|value)|h(a)?emoglobin|haematolog|hematolog|creatinine|lipid profile|thyroid|glucose|cholesterol|blood count|vitamin/i

export function classify(doc) {
  // The live API strips `text_raw`, so classification must also read
  // `summary_text` (and `text_repr`) — otherwise every API document, having no
  // text_raw, falls through to "other" and is dropped.
  const t = `${doc.text_raw || ''}\n${doc.summary_text || ''}\n${doc.text_repr || ''}`
  if (RE_INBODY.test(t)) return 'inbody'
  if (RE_LAB.test(t)) return 'lab'
  return 'other'
}

// --- header -----------------------------------------------------------------
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 }

/** Returns a naive ISO date (no zone) — these are patient-local wall times. */
export function parseDate(s) {
  if (!s) return null
  const t = s.trim()
  let m

  // 04 Feb 2025 / 08-Nov-2025 / 15/Dec/2025
  m = t.match(/\b(\d{1,2})[-/ ]([A-Za-z]{3,9})[-/ ,]+(\d{4})\b/)
  if (m) {
    const mo = MONTHS[m[2].slice(0, 3).toLowerCase()]
    if (mo) return iso(+m[3], mo, +m[1])
  }
  // 4 May, 2026
  m = t.match(/\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})\b/)
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()]
    if (mo) return iso(+m[3], mo, +m[2])
  }
  // 15/12/2022 or 15-12-2022 (day first — Indian labs)
  m = t.match(/\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/)
  if (m) {
    let y = +m[3]
    if (y < 100) y += 2000
    const d = +m[1], mo = +m[2]
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return iso(y, mo, d)
  }
  // 2025-11-08T10:45:00
  m = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/)
  if (m) return iso(+m[1], +m[2], +m[3])
  return null
}

const iso = (y, m, d) =>
  y >= 1990 && y <= 2100 ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null

const LAB_NAMES = [
  [/tata\s*1\s*mg|\b1mg\b/i, 'Tata 1mg'],
  [/manipal/i, 'Manipal Hospitals'],
  [/neuberg/i, 'Neuberg Diagnostics'],
  [/thyrocare/i, 'Thyrocare'],
  [/metropolis/i, 'Metropolis'],
  [/\bsrl\b/i, 'SRL Diagnostics'],
  [/lal\s*path/i, 'Dr Lal PathLabs'],
  [/apollo/i, 'Apollo'],
  [/\baster\b/i, 'Aster'],
  [/agilus/i, 'Agilus'],
  [/vijaya\s*diagn/i, 'Vijaya Diagnostics'],
  [/fortis/i, 'Fortis'],
]

export function parseHeader(doc) {
  const t = doc.text_raw || ''
  const s = doc.summary_text || ''
  const head = t.slice(0, 2500)

  let name =
    pick(head, /(?:Patient\s*Name|Customer\s*Name|Name)\s*[:\-]\s*([A-Za-z][A-Za-z .'’]{2,50}?)(?=\s{2,}|\s*(?:\(|Age|Gender|Sex|Lab|Reg|Date|Mob|Ref|Patient|$))/i) ||
    pick(s, /^-?\s*\*{0,2}Name\*{0,2}\s*[:\-]\s*([A-Za-z][A-Za-z .'’]{2,50})/im)
  if (name) name = titleCase(name.replace(/\b(MRS|MR|MS|DR|MISS)\.?\s+/i, '').trim())

  const ageRaw = pick(head, /Age\s*[:/]?\s*(\d{1,3})\s*(?:Y|y|years?|Yr)/i) || pick(head, /\((\d{1,3})\s*[YyMm]\s*\/\s*[MFmf]\)/) || pick(s, /Age\s*[:\-]\s*(\d{1,3})/i)
  const age = ageRaw ? +ageRaw : null

  let gender = pick(head, /(?:Gender|Sex)\s*[:\-]?\s*(Male|Female|M|F)\b/i) || pick(head, /\(\d{1,3}\s*[Yy]\s*\/\s*([MF])\)/)
  if (gender) gender = /^m/i.test(gender) ? 'Male' : 'Female'

  const collected =
    parseDate(pick(head, /(?:Collection|Collected)\s*(?:Date|On)?[^\n:]{0,20}:\s*([^\n]{6,30})/i)) ||
    parseDate(pick(head, /(?:Sample\s*Collected)[^\n:]{0,20}:\s*([^\n]{6,30})/i)) ||
    parseDate(pick(head, /(?:Reg(?:istration)?\s*Date[^\n:]{0,20})[:\s]\s*([^\n]{6,30})/i)) ||
    parseDate(pick(s, /Collection[^\n:]{0,24}:\s*([^\n]{6,30})/i)) ||
    parseDate(pick(s, /(?:Report|Registration)\s*Date[^\n:]{0,24}:\s*([^\n]{6,30})/i)) ||
    parseDate(pick(head, /\bDate\s*[:\-]\s*([^\n]{6,30})/i))

  let lab = null
  for (const [re, nm] of LAB_NAMES) if (re.test(t.slice(0, 6000))) { lab = nm; break }

  return { name, age, gender, collected, lab }
}

const pick = (s, re) => { const m = (s || '').match(re); return m ? m[1].trim() : null }
const titleCase = (s) => s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase())

// --- reference intervals ----------------------------------------------------
export function parseRef(raw) {
  if (!raw) return null
  const s = String(raw).replace(/\s+/g, ' ').trim()

  let m = s.match(/^\[?\s*(-?\d+\.?\d*)\s*[-–—to]+\s*(-?\d+\.?\d*)\s*\]?$/i)
  if (m) {
    const low = +m[1], high = +m[2]
    return low < high ? { type: 'range', low, high, text: `${low} – ${high}` } : null
  }
  m = s.match(/^(?:<=?|less than|up ?to|below|upto)\s*(-?\d+\.?\d*)$/i)
  if (m) return { type: 'max', high: +m[1], text: `≤ ${+m[1]}` }
  m = s.match(/^(?:>=?|greater than|above|more than)\s*(-?\d+\.?\d*)$/i)
  if (m) return { type: 'min', low: +m[1], text: `≥ ${+m[1]}` }
  if (/^(negative|nil|absent|normal|clear)$/i.test(s)) return { type: 'qualitative', expected: titleCase(s), text: titleCase(s) }
  return null
}

// --- test rows --------------------------------------------------------------
// Junk that a naive "words then numbers" pattern would otherwise swallow.
const NAME_BLOCKLIST =
  /\b(page|address|road|floor|block|phone|mobile|mob|tel|barcode|order|po no|visit|lab id|reg date|report date|collected|received|referred|sample|pin|gst|email|www|http|invoice|bill|amount|qty|rate|total amount|dob|uhid|patient id|opd|ipd|ward|bed|nabl|iso|disclaimer|note|comment|method|interpretation|printed|verified|authorised|authorized|signature|end of report|conditions|terms)\b/i

/**
 * Interpretation legends ("Borderline high", "Good control", "Non diabetic
 * adults >=") sit in the same columns as results and parse identically. They are
 * rejected by name, since nothing in the row's shape distinguishes them.
 */
const INTERPRETATION =
  /\b(high|low|normal|elevated|decreased|deficien\w*|insufficien\w*|sufficien\w*|optimal|desirable|border\w*|bod?erline|risk|control|diabet\w*|pre.?diabet\w*|adults?|children|male|female|men|women|negative|positive|toxicity|therapeutic|severe|mild|moderate|middle|above|below|category|interpretation|goal|target|recommend\w*|caution|good|fair|poor|excellent|range|value|result|treatment|selective|detergent|accelerator|optimum|meal|before|after|satisfactory)\b/i

/** Medicines and supplements — prescriptions ride along inside outpatient records. */
const MEDICATION = /\b(tab|cap|inj|syp|tsp|powder|sachet|mg\/dl|prohance|meconerve|ointment|drops)\b/i

const looksLikeName = (n) => {
  const s = n.trim()
  if (s.length < 3 || s.length > 58) return false
  if (!/[A-Za-z]{3}/.test(s)) return false
  if (NAME_BLOCKLIST.test(s) || MEDICATION.test(s)) return false
  // A name that is *only* an interpretation word is a legend row, not a test.
  // (Guarded, not blanket: real analytes contain these words — "HDL Cholesterol
  //  - high risk", "Total protein" — so only reject when nothing else is left.)
  const residue = s
    .replace(new RegExp(INTERPRETATION.source, 'gi'), ' ')
    .replace(/\b(non|and|or|in|of|for|with|the|to|at|by|serum|plasma|blood|urine)\b/gi, ' ')
    .replace(/[^A-Za-z]/g, '')
  if (residue.length < 3) return false
  // An embedded value ("Yeast 0.00 /hpf") means the row split in the wrong
  // place. The digits must be their own token to count: analyte names legitimately
  // glue digits into a word -- HbA1c, B12, 25-OH -- and rejecting those dropped
  // HbA1c, of all things, from every report it appeared in.
  if (/(?:^|\s)\d+\.?\d*\s*(?:\/|[A-Za-zµμ%])/.test(s)) return false
  if ((s.match(/\d/g) || []).length > 4) return false
  if (/[©®™]|(.)\1{3,}/.test(s)) return false // OCR garble: "ssuuppppoorrtt"
  return true
}

// Leading "/" covers per-volume units the labs write bare: /hpf, /cumm, /µL.
// The trailing group covers units the labs write with an internal space --
// "288 x 10^3/µL" -- which otherwise stop the match dead at "x".
// The first branch covers per-volume counts written starting with the power
// itself -- "310 10³/µL" -- which the letter-initial branch cannot begin to
// match. The trailing group on that branch covers the same unit written with an
// internal space, "288 x 10^3/µL", which otherwise stops the match dead at "x".
const UNIT = String.raw`(?:\d+(?:\^\d+)?[³²]?\s*\/\s*[A-Za-zµμ]+|\/?[A-Za-zµμ%][A-Za-z0-9µμ%^/³²·.\-]{0,16}(?:\s[A-Za-z0-9µμ%^/³²·.\-]{1,12})?)`

// Several labs put a specimen or method column *after* the reference interval
// ("SGOT(AST) 23 U/L 10-50 Serum"), so the range is not always line-final.
const TAIL = String.raw`(?:\s+(?:serum|plasma|whole\s*blood|blood|urine|edta|fluoride|csf|stool|fluid|[A-Za-z][A-Za-z()'’,.\/-]{2,24}))?\s*`

/** Table-style rows out of `text_raw`. */
function rowsFromRaw(text) {
  const out = []
  // text_raw flattens the PDF; both real newlines and " | " act as row breaks.
  const lines = String(text).split(/\n|\s\|\s/)

  for (let line of lines) {
    line = line.replace(/\s+/g, ' ').trim()
    if (!line || line.length > 220) continue

    // NAME VALUE [UNIT] LOW - HIGH        (optionally bracketed)
    let m = line.match(
      new RegExp(String.raw`^(.{3,58}?)\s+(-?\d+\.?\d*)\s*(${UNIT})?\s*\[?\s*(-?\d+\.?\d*)\s*[-–]\s*(-?\d+\.?\d*)\s*\]?${TAIL}$`)
    )
    if (m && looksLikeName(m[1])) {
      const ref = parseRef(`${m[4]} - ${m[5]}`)
      if (ref) { out.push({ name: clean(m[1]), value: +m[2], unit: clean(m[3] || ''), ref }); continue }
    }

    // NAME VALUE [UNIT] < 5.0  /  > 45  /  Less than 20  /  Optimal : < 200
    m = line.match(
      new RegExp(
        String.raw`^(.{3,58}?)\s+(-?\d+\.?\d*)\s*(${UNIT})?\s*(?:[A-Za-z][A-Za-z ]{1,18}:\s*)?((?:<=?|>=?|less than|greater than|up ?to)\s*-?\d+\.?\d*)${TAIL}$`,
        'i'
      )
    )
    if (m && looksLikeName(m[1])) {
      const ref = parseRef(m[4])
      if (ref) { out.push({ name: clean(m[1]), value: +m[2], unit: clean(m[3] || ''), ref }); continue }
    }

    // NAME Negative Negative   (qualitative result + expected)
    m = line.match(/^(.{3,58}?)\s+(Negative|Positive|Nil|Absent|Present|Normal|Clear)\s+(Negative|Nil|Absent|Normal|Clear)\s*$/i)
    if (m && looksLikeName(m[1])) {
      out.push({ name: clean(m[1]), value: titleCase(m[2]), unit: '', ref: parseRef(m[3]) })
    }
  }
  return out.filter((r) => r.ref)
}

/** Markdown bullets out of `summary_text`. */
function rowsFromSummary(text) {
  const out = []
  const re = new RegExp(
    // The summariser emits two bullet shapes, differing in where the colon sits
    // relative to the bold markers: `**Name**: 15.5` and `**Name:** 16.5`. The
    // second puts a space between the closing `**` and the value, which fails
    // the match outright unless whitespace is allowed after those markers.
    String.raw`[-*]\s+\*{0,2}([^*:\n]{3,58}?)\s*\*{0,2}\s*:\s*\*{0,2}\s*(-?\d+\.?\d*)\*{0,2}\s*(${UNIT})?\s*\(([^)]{2,90})\)`,
    'g'
  )
  let m
  while ((m = re.exec(String(text)))) {
    if (!looksLikeName(m[1])) continue
    // "(Reference Range: 0.35 - 4.94, **Low**)" → keep just the interval
    const inner = m[4]
      .replace(/\*/g, '')
      // Three lead-ins seen in the wild: "Reference Range:", "Reference:" and
      // "Ref." -- the abbreviation's full stop has to count as a separator or
      // it survives the strip and the interval fails to parse.
      .replace(/^(reference\s*(range|interval|value)?|normal|ref)\s*[:.\-]?\s*/i, '')
      .replace(/,\s*(low|high|normal|elevated|decreased|deficient|borderline|abnormal)\s*$/i, '')
      .trim()
    const ref = parseRef(inner) || parseRef(inner.split(',')[0].trim())
    if (ref) out.push({ name: clean(m[1]), value: +m[2], unit: clean(m[3] || ''), ref })
  }
  return out
}

const clean = (s) =>
  String(s)
    .replace(/[*_]/g, '')
    // Some labs put an H/L abnormality flag between the name and the value,
    // which lands at the end of the captured name.
    .replace(/\s+[HLN]$/, '')
    .replace(/\s*\((?:calculated|serum|plasma|urine|electrical impedance|method[^)]*)\)\s*$/i, '')
    .replace(/[\s:.\-]+$/, '')
    .replace(/^[\s:.\-]+/, '')
    .replace(/\s+/g, ' ')
    .trim()

export function parseRows(doc) {
  const raw = rowsFromRaw(doc.text_raw || '')
  const sum = rowsFromSummary(doc.summary_text || '')
  // text_raw wins on conflict: it is the lab's own table, and summary_text is a
  // paraphrase that sometimes rounds.
  const seen = new Map()
  for (const r of [...raw, ...sum]) {
    const k = r.name.toLowerCase()
    if (!seen.has(k)) seen.set(k, r)
  }
  return [...seen.values()]
}
