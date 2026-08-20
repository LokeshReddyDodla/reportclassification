import { useMemo, useState } from 'react'
import { evaluate, isFlagged } from '../lib/status.js'
import TrendChart from './TrendChart.jsx'

const INITIAL = 9

/**
 * Every analyte the patient has at least two dated results for, most
 * interesting first: currently flagged, then furthest outside its interval,
 * then most-moved. A doctor opening this should not have to hunt for the
 * thing that changed.
 */
export default function TrendsTab({ patient, reportCount, onSeeReports }) {
  const [showAll, setShowAll] = useState(false)
  const [onlyFlagged, setOnlyFlagged] = useState(false)

  const trends = useMemo(() => {
    return Object.entries(patient.series || {})
      .map(([key, pts]) => {
        const last = pts.at(-1)
        const state = evaluate({ value: last.value, unit: last.unit, ref: last.ref })
        const scale = Math.abs(pts[0].value) || 1
        return {
          key,
          pts,
          state,
          flagged: isFlagged(state),
          move: Math.abs(last.value - pts[0].value) / scale,
          name: nameFor(patient, key),
        }
      })
      .sort(
        (a, b) =>
          Number(b.flagged) - Number(a.flagged) ||
          b.state.deviation - a.state.deviation ||
          b.move - a.move,
      )
  }, [patient])

  const flaggedCount = trends.filter((t) => t.flagged).length
  const pool = onlyFlagged ? trends.filter((t) => t.flagged) : trends
  const shown = showAll ? pool : pool.slice(0, INITIAL)

  if (trends.length === 0) {
    return (
      <div className="card empty">
        No analyte has two dated results yet, so nothing can be trended.
        <br />
        <button className="btn" style={{ marginTop: 12 }} onClick={onSeeReports}>
          View the reports
        </button>
      </div>
    )
  }

  return (
    <>
      <p className="section-note">
        Each analyte pooled across all {reportCount} lab report
        {reportCount === 1 ? '' : 's'}, oldest to newest. Flagged analytes first.
        The shaded band is the reference interval from the most recent report.
      </p>

      {flaggedCount > 0 && (
        <div className="seg" style={{ marginBottom: 14 }}>
          <button className="btn" aria-pressed={!onlyFlagged} onClick={() => setOnlyFlagged(false)}>
            All analytes ({trends.length})
          </button>
          <button className="btn" aria-pressed={onlyFlagged} onClick={() => setOnlyFlagged(true)}>
            Outside range ({flaggedCount})
          </button>
        </div>
      )}

      <div className="trendgrid">
        {shown.map((t) => (
          <TrendChart key={t.key} testKey={t.key} name={t.name} points={t.pts} />
        ))}
      </div>

      {pool.length > INITIAL && (
        <button className="btn" style={{ marginTop: 14 }} onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'Show fewer' : `Show all ${pool.length} trends`}
        </button>
      )}
    </>
  )
}

/** Display name for a series key — taken from whichever report carries it. */
function nameFor(patient, key) {
  for (const r of patient.reports)
    for (const p of r.panels) {
      const t = p.tests.find((t) => t.key === key)
      if (t) return t.name
    }
  return key
}
