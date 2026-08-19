import { PANELS } from '../lib/meta.js'

const BAR_HUE = '#0f766e'

/**
 * Panel distribution as a horizontal bar list — one hue (magnitude of a
 * labeled category list, not multi-series), value labels at row end,
 * rows clickable to filter. Documents are multi-label, so counts can
 * sum to more than the lab-report total.
 */
export default function PanelBars({ byPanel, active, onPick }) {
  const rows = PANELS.filter((p) => byPanel[p.key] > 0)
  if (rows.length === 0) return null
  const max = Math.max(...rows.map((p) => byPanel[p.key]))

  return (
    <div className="panel-bars">
      <div className="panel-bars-head">
        <span>Panels detected</span>
        <span className="muted">multi-label — one report can carry several</span>
      </div>
      {rows.map((p) => {
        const count = byPanel[p.key]
        const isActive = active === p.key
        return (
          <button
            key={p.key}
            className={`bar-row${isActive ? ' active' : ''}`}
            onClick={() => onPick(p.key)}
            title={`${p.label}: ${count} report${count === 1 ? '' : 's'} — click to filter`}
          >
            <span className="bar-label">{p.label}</span>
            <span className="bar-track">
              <span
                className="bar-fill"
                style={{ width: `${(count / max) * 100}%`, background: BAR_HUE }}
              />
            </span>
            <span className="bar-value">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
