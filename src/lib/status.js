/**
 * Flags are derived here, never stored on the report. A test's state is a pure
 * function of (value, ref) — so correcting a reference interval re-flags every
 * historical report, and a bad extraction can never bake a wrong flag into Mongo.
 */

export const DIRECTION = {
  NORMAL: 'normal',
  LOW: 'low',
  HIGH: 'high',
  ABNORMAL: 'abnormal', // qualitative result that differs from the expected one
  UNKNOWN: 'unknown', // calculated value with no stated interval
}

/**
 * How far outside the interval the value sits, expressed in reference-span
 * widths. Purely geometric — the same distance the range bar draws. It is NOT a
 * clinical severity grade, and the UI says so.
 */
function deviation(value, ref) {
  if (ref.type === 'range') {
    const span = ref.high - ref.low
    if (!span) return 0
    if (value > ref.high) return (value - ref.high) / span
    if (value < ref.low) return (ref.low - value) / span
    return 0
  }
  if (ref.type === 'max') return value > ref.high ? (value - ref.high) / Math.abs(ref.high || 1) : 0
  if (ref.type === 'min') return value < ref.low ? (ref.low - value) / Math.abs(ref.low || 1) : 0
  return 0
}

const MARKED_AT = 0.5 // ≥ half a reference span outside → the louder treatment

export function evaluate(test) {
  const { value, ref, operator } = test

  if (ref.type === 'none') {
    return { direction: DIRECTION.UNKNOWN, deviation: 0, marked: false, label: 'No reference interval' }
  }

  if (ref.type === 'qualitative' || typeof value === 'string') {
    const same = String(value).trim().toLowerCase() === String(ref.expected ?? '').trim().toLowerCase()
    // A lab note explaining why a mismatch is still normal (e.g. urine colour).
    const excused = Boolean(test.note) && !same && ref.type === 'qualitative' && test.key === 'urine_colour'
    if (same || excused) return { direction: DIRECTION.NORMAL, deviation: 0, marked: false, label: 'Expected' }
    return { direction: DIRECTION.ABNORMAL, deviation: 0, marked: false, label: 'Not expected' }
  }

  // "< 20.0" against a "≤ 29.9" ceiling is unambiguously under it.
  if (operator === '<' && (ref.type === 'max' || ref.type === 'range') && value <= ref.high) {
    return { direction: DIRECTION.NORMAL, deviation: 0, marked: false, label: 'In range' }
  }

  const dev = deviation(value, ref)
  if (dev === 0) return { direction: DIRECTION.NORMAL, deviation: 0, marked: false, label: 'In range' }

  const isHigh =
    (ref.type === 'range' && value > ref.high) || (ref.type === 'max' && value > ref.high)
  const marked = dev >= MARKED_AT

  return {
    direction: isHigh ? DIRECTION.HIGH : DIRECTION.LOW,
    deviation: dev,
    marked,
    label: isHigh ? (marked ? 'Well above range' : 'Above range') : marked ? 'Well below range' : 'Below range',
  }
}

/**
 * Maps a direction + severity onto the reserved status tokens. Only three of the
 * four status steps are used: `warning` and `serious` sit at ΔE 13.6 unsimulated,
 * below the separation floor, so seating both would make two states that mean
 * different things hard to tell apart. `serious` is the one dropped.
 */
export function statusToken({ direction, marked }) {
  if (direction === DIRECTION.NORMAL) return 'good'
  if (direction === DIRECTION.UNKNOWN) return 'neutral'
  if (direction === DIRECTION.ABNORMAL) return 'warning'
  return marked ? 'critical' : 'warning'
}

export const isFlagged = (state) =>
  state.direction === DIRECTION.LOW ||
  state.direction === DIRECTION.HIGH ||
  state.direction === DIRECTION.ABNORMAL

/**
 * Bounds of the "normal" band. A one-sided interval ("≤ 149.9", "≥ 39.9") is
 * genuinely open on one side, so that side is reported as `null` + an `open`
 * flag rather than being pinned to a number. Pinning it — which an earlier
 * version did, by closing "≥ 39.9" at the observed value — collapsed the band to
 * zero width whenever the value sat below the threshold, drawing no band at all.
 */
export function bandBounds(ref) {
  if (!ref || ref.type === 'qualitative' || ref.type === 'none') return null
  if (ref.type === 'range') return { low: ref.low, high: ref.high, openLow: false, openHigh: false }
  if (ref.type === 'max') return { low: null, high: ref.high, openLow: true, openHigh: false }
  if (ref.type === 'min') return { low: ref.low, high: null, openLow: false, openHigh: true }
  return null
}

/** The finite threshold(s) a band is anchored to — for scaling an axis. */
export const bandAnchors = (band) =>
  band ? [band.low, band.high].filter((n) => n !== null && Number.isFinite(n)) : []

/**
 * Display domain for a range bar: covers the interval and the value, padded so a
 * marker sitting exactly on a boundary is still visibly distinguishable from it.
 * An open side gets room beyond its threshold so the band reads as continuing.
 */
export function domainFor(ref, value, history = []) {
  const band = bandBounds(ref)
  if (!band) return null
  const nums = [value, ...history].filter((n) => typeof n === 'number' && Number.isFinite(n))
  const anchors = bandAnchors(band)
  if (!nums.length && !anchors.length) return null

  let lo = Math.min(...nums, ...anchors)
  let hi = Math.max(...nums, ...anchors)

  // When every value hugs the threshold the observed spread is ~0, so fall back
  // to a fraction of the threshold itself for a sane amount of breathing room.
  const base = Math.max(hi - lo, Math.abs(anchors[0] ?? 1) * 0.2, 1e-9)
  if (band.openHigh) hi = hi + base * 0.3
  if (band.openLow) lo = Math.min(...nums, 0) >= 0 ? 0 : lo - base * 0.3

  const span = hi - lo || base
  const padLo = band.openLow && lo === 0 ? 0 : span * 0.12
  lo -= padLo
  hi += span * 0.12
  return { lo, hi }
}

export const pct = (v, { lo, hi }) => ((v - lo) / (hi - lo)) * 100
export const clamp = (n, a = 0, b = 100) => Math.max(a, Math.min(b, n))
