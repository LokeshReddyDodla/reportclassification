import { useState } from 'react'
import { bandBounds, bandAnchors } from '../lib/status'
import { dayNumber, shortDate, formatValue } from '../lib/format'

/**
 * Trend across a patient's reports. Points are spaced by real elapsed time, not
 * by index — collections here are months to years apart at uneven intervals, and
 * index spacing would draw a 2-year gap the same width as a 2-month one.
 */
export default function Sparkline({ points, ref: refInterval, unit, width = 118, height = 34 }) {
  const [hover, setHover] = useState(null)

  const series = (points || []).filter((p) => typeof p.value === 'number' && Number.isFinite(p.value))
  if (series.length < 2) return <div className="spark-empty">—</div>

  const band = bandBounds(refInterval)
  const values = series.map((p) => p.value)
  const anchors = bandAnchors(band)
  let lo = Math.min(...values, ...anchors)
  let hi = Math.max(...values, ...anchors)
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.14
  lo -= pad
  hi += pad

  const xs = series.map((p) => dayNumber(p.date))
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const PAD = 6 // room for the end dot plus its surface ring
  const px = (d) => ((d - x0) / (x1 - x0 || 1)) * (width - PAD * 2) + PAD
  const py = (v) => height - ((v - lo) / (hi - lo || 1)) * height

  const pts = series.map((p) => ({ ...p, x: px(dayNumber(p.date)), y: py(p.value) }))
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = pts.at(-1)
  // An open side is drawn to the edge of the plot, not clipped at a threshold.
  const bandTop = band ? (band.openHigh ? 0 : py(Math.min(band.high, hi))) : null
  const bandBot = band ? (band.openLow ? height : py(Math.max(band.low, lo))) : null

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - r.left
    let near = pts[0]
    for (const p of pts) if (Math.abs(p.x - mx) < Math.abs(near.x - mx)) near = p
    setHover(near)
  }

  return (
    <div className="spark">
      <svg
        width={width}
        height={height}
        className="spark-hit"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label={series.map((p) => `${shortDate(p.date)}: ${p.value}`).join(', ')}
      >
        {band && bandBot > bandTop && (
          <rect x="0" y={bandTop} width={width} height={bandBot - bandTop} fill="var(--good-wash)" />
        )}
        <path d={path} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover && <circle cx={hover.x} cy={hover.y} r="4" fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />}
        <circle cx={last.x} cy={last.y} r="4" fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />
      </svg>

      {hover && (
        <div className="tip" style={{ left: hover.x, top: hover.y }}>
          <div><b>{formatValue(hover.value)}</b> {unit}</div>
          <div className="tip-date">{shortDate(hover.date)}</div>
        </div>
      )}
    </div>
  )
}
