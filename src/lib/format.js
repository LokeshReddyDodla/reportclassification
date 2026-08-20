const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Dates are patient-local and naive — parse the parts, never `new Date(str)`. */
export function parseNaive(iso) {
  const [d, t = '00:00:00'] = iso.split('T')
  const [y, m, day] = d.split('-').map(Number)
  const [hh, mm] = t.split(':').map(Number)
  return { y, m, day, hh, mm }
}

export function formatDate(iso, { withTime = false } = {}) {
  const { y, m, day, hh, mm } = parseNaive(iso)
  const base = `${String(day).padStart(2, '0')} ${MONTHS[m - 1]} ${y}`
  if (!withTime) return base
  const h12 = hh % 12 || 12
  return `${base}, ${h12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'am' : 'pm'}`
}

export const shortDate = (iso) => {
  const { y, m, day } = parseNaive(iso)
  return `${String(day).padStart(2, '0')} ${MONTHS[m - 1]} ’${String(y).slice(2)}`
}

/** Days since epoch — enough to space sparkline points by real elapsed time. */
export function dayNumber(iso) {
  const { y, m, day } = parseNaive(iso)
  return Math.floor(Date.UTC(y, m - 1, day) / 86400000)
}

/** Trims trailing zeros the lab printed but that carry no precision. */
export function formatValue(value, operator) {
  if (typeof value !== 'number') return String(value)
  const s = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)))
  return operator ? `${operator} ${s}` : s
}

export function formatDelta(delta) {
  const abs = Math.abs(delta)
  const s = abs < 1 ? abs.toFixed(2).replace(/0$/, '') : Number(abs.toFixed(2)).toString()
  return `${delta > 0 ? '+' : delta < 0 ? '−' : ''}${s}`
}
