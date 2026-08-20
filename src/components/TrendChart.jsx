import { useState } from 'react'
import { bandBounds, bandAnchors, evaluate, statusToken } from '../lib/status'
import { dayNumber, shortDate, formatValue } from '../lib/format'

const W = 260
const H = 96
const PAD = { t: 10, r: 12, b: 20, l: 12 }

/**
 * One analyte across every report a patient has. Reference intervals can differ
 * between labs, so the band drawn is the *latest* report's interval and earlier
 * points are positioned against the same scale — the alternative, re-banding per
 * point, would make the line appear to move when only the lab changed.
 */
export default function TrendChart({ testKey, name, points, onOpen }) {
  const [hover, setHover] = useState(null)

  const series = points.filter((p) => typeof p.value === 'number' && Number.isFinite(p.value))
  if (series.length < 2) return null

  const latest = series.at(-1)
  const unit = latest.unit || series.find((p) => p.unit)?.unit || ''
  const refInterval = latest.ref
  const state = evaluate({ value: latest.value, unit, ref: refInterval })
  const band = bandBounds(refInterval)

  const values = series.map((p) => p.value)
  const anchors = bandAnchors(band)
  let lo = Math.min(...values, ...anchors)
  let hi = Math.max(...values, ...anchors)
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.16
  lo -= pad
  hi += pad

  const xs = series.map((p) => dayNumber(p.date))
  const x0 = Math.min(...xs)
  const x1 = Math.max(...xs)
  const px = (d) => PAD.l + ((d - x0) / (x1 - x0 || 1)) * (W - PAD.l - PAD.r)
  const py = (v) => PAD.t + (1 - (v - lo) / (hi - lo || 1)) * (H - PAD.t - PAD.b)

  const pts = series.map((p) => ({ ...p, x: px(dayNumber(p.date)), y: py(p.value) }))
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
  const last = pts.at(-1)
  const first = pts[0]
  const delta = latest.value - series[0].value

  // An open side is drawn to the edge of the plot, not clipped at a threshold.
  const bandTop = band ? (band.openHigh ? PAD.t : py(Math.min(band.high, hi))) : null
  const bandBot = band ? (band.openLow ? H - PAD.b : py(Math.max(band.low, lo))) : null

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    const mx = ((e.clientX - r.left) / r.width) * W
    let near = pts[0]
    for (const p of pts) if (Math.abs(p.x - mx) < Math.abs(near.x - mx)) near = p
    setHover(near)
  }

  return (
    <div className="card trendcard" onClick={onOpen}>
      <div className="trend-head">
        <div>
          <div className="trend-name">{name}</div>
          <div className="trend-sub">
            {series.length} results · {shortDate(series[0].date)} → {shortDate(latest.date)}
          </div>
        </div>
        <div className="trend-now">
          <span className={`swatch ${statusToken(state)}`} aria-hidden="true" />
          <b>{formatValue(latest.value)}</b>
          <span className="unit">{unit}</span>
        </div>
      </div>

      <div className="spark" style={{ position: 'relative' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height={H}
          className="spark-hit"
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${name}: ${series.map((p) => `${shortDate(p.date)} ${p.value} ${unit}`).join(', ')}`}
        >
          {band && bandBot > bandTop && (
            <rect x={PAD.l} y={bandTop} width={W - PAD.l - PAD.r} height={bandBot - bandTop} fill="var(--good-wash)" />
          )}
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="var(--gridline)" strokeWidth="1" />
          <path d={path} fill="none" stroke="var(--series-1)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />
          ))}
          {hover && <circle cx={hover.x} cy={hover.y} r="5" fill="var(--series-1)" stroke="var(--surface-1)" strokeWidth="2" />}
        </svg>

        {hover && (
          <div className="tip" style={{ left: `${(hover.x / W) * 100}%`, top: hover.y }}>
            <div><b>{formatValue(hover.value)}</b> {hover.unit || unit}</div>
            <div className="tip-date">{shortDate(hover.date)}</div>
          </div>
        )}
      </div>

      <div className="trend-foot">
        <span>{refInterval?.text ? `Ref ${refInterval.text}` : 'No reference interval'}</span>
        <span className={delta === 0 ? '' : 'delta'}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {formatValue(Math.abs(Number(delta.toFixed(3))))} since {shortDate(first.date)}
        </span>
      </div>
    </div>
  )
}
