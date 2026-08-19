import { DOC_TYPES, UNSWEPT } from '../lib/meta.js'

/**
 * Headline counts as clickable stat tiles (they double as the doc-type
 * filter). Identity is carried by the label text; the colored dot is a
 * redundant cue.
 */
export default function StatsBar({ stats, active, onPick }) {
  const tiles = [
    { key: 'all', label: 'All documents', color: '#3f3f46' },
    ...DOC_TYPES,
    ...(stats.byType.unswept > 0 ? [UNSWEPT] : []),
  ]
  return (
    <div className="stat-row" role="tablist" aria-label="Filter by document type">
      {tiles.map((t) => {
        const count = t.key === 'all' ? stats.total : stats.byType[t.key]
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={`stat-tile${active === t.key ? ' active' : ''}`}
            onClick={() => onPick(t.key)}
          >
            <span className="stat-label">
              <span className="dot" style={{ background: t.color }} aria-hidden="true" />
              {t.label}
            </span>
            <span className="stat-value">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
