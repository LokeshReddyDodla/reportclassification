import { useMemo, useState } from 'react'
import { evaluate, isFlagged, DIRECTION } from '../lib/status.js'
import { formatDate, shortDate } from '../lib/format.js'
import { PANELS as ANALYTE_PANELS } from '../lib/testCatalog.js'
import { PANEL_BY_KEY } from '../lib/meta.js'
import Panel from './Panel.jsx'
import TableView from './TableView.jsx'

/** One lab report at a time: its results against their reference intervals. */
export default function ReportsTab({ patient }) {
  const [idx, setIdx] = useState(patient.reports.length - 1)
  const [query, setQuery] = useState('')
  const [panelKey, setPanelKey] = useState('all')
  const [onlyFlagged, setOnlyFlagged] = useState(false)
  const [view, setView] = useState('cards')

  const report = patient.reports[idx]

  const allRows = useMemo(
    () =>
      report.panels.flatMap((panel) =>
        panel.tests.map((test) => {
          const state = evaluate(test)
          return { panel, test, state, flagged: isFlagged(state) }
        }),
      ),
    [report],
  )

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return allRows.filter(
      ({ panel, test, flagged }) =>
        (panelKey === 'all' || panel.key === panelKey) &&
        (!onlyFlagged || flagged) &&
        (!q || test.name.toLowerCase().includes(q) || panel.name.toLowerCase().includes(q)),
    )
  }, [allRows, query, panelKey, onlyFlagged])

  const flaggedCount = allRows.filter((r) => r.flagged).length
  const markedCount = allRows.filter((r) => r.flagged && r.state.marked).length
  const normalCount = allRows.filter((r) => r.state.direction === DIRECTION.NORMAL).length

  const grouped = report.panels
    .map((panel) => ({ panel, rows: rows.filter((r) => r.panel.key === panel.key) }))
    .filter((g) => g.rows.length > 0)

  // What the backend engine said about this same document.
  const enginePanels = (report.classification?.panels || [])
    .map((k) => PANEL_BY_KEY[k]?.label || k)

  return (
    <>
      <div className="reportbar">
        {patient.reports.map((r, i) => (
          <button
            key={r.id}
            className="btn reporttab"
            aria-pressed={i === idx}
            onClick={() => setIdx(i)}
          >
            <span className="rt-date">{shortDate(r.date)}</span>
            <span className="rt-meta">
              {r.lab} · {r.test_count} test{r.test_count === 1 ? '' : 's'}
            </span>
          </button>
        ))}
      </div>

      <section className="summary">
        <div className="card">
          <div className="hero-label">Outside reference interval</div>
          <div className="hero-fig">{flaggedCount}</div>
          <div className="hero-sub">
            of {allRows.length} results on {formatDate(report.date)}
          </div>
          <div className="hero-split">
            <div>
              <b>{markedCount}</b> well outside
            </div>
            <div>
              <b>{normalCount}</b> in range
            </div>
          </div>
        </div>

        <div className="card">
          <div className="tile-label">Report source</div>
          <div className="src-grid">
            <div>
              <span>Lab</span>
              <b>{report.lab}</b>
            </div>
            <div>
              <span>Collected</span>
              <b>{formatDate(report.date)}</b>
            </div>
            <div>
              <span>File</span>
              <b className="ellipsis">{report.file?.name || '—'}</b>
            </div>
            <div>
              <span>Values from</span>
              <b>{report.source === 'text_raw' ? 'Lab table' : 'Summary only'}</b>
            </div>
            {report.merged_from > 1 && (
              <div>
                <span>Merged</span>
                <b>{report.merged_from} same-day uploads</b>
              </div>
            )}
            {enginePanels.length > 0 && (
              <div>
                <span>Engine panels</span>
                <b className="ellipsis">{enginePanels.join(', ')}</b>
              </div>
            )}
          </div>
          {report.source !== 'text_raw' && (
            <p className="src-note">
              The documents endpoint returns only <code>summary_text</code> for this
              report, and summaries skew toward abnormal findings — so results here
              may be partial.
            </p>
          )}
          {report.file?.url && (
            <a
              className="btn btn-link"
              style={{ marginTop: 12 }}
              href={report.file.url}
              target="_blank"
              rel="noreferrer"
            >
              ↗ Original document
            </a>
          )}
        </div>
      </section>

      <div className="filters">
        <input
          type="search"
          placeholder="Search tests…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search tests"
        />
        <select
          value={panelKey}
          onChange={(e) => setPanelKey(e.target.value)}
          aria-label="Filter by panel"
        >
          <option value="all">All panels</option>
          {report.panels.map((p) => (
            <option key={p.key} value={p.key}>
              {ANALYTE_PANELS[p.key] || p.key}
            </option>
          ))}
        </select>
        <div className="seg">
          <button className="btn" aria-pressed={!onlyFlagged} onClick={() => setOnlyFlagged(false)}>
            All results
          </button>
          <button className="btn" aria-pressed={onlyFlagged} onClick={() => setOnlyFlagged(true)}>
            Outside range ({flaggedCount})
          </button>
        </div>
        <div className="spacer" />
        <span className="count">
          {rows.length} of {allRows.length} shown
        </span>
        <div className="seg">
          <button className="btn" aria-pressed={view === 'cards'} onClick={() => setView('cards')}>
            Panels
          </button>
          <button className="btn" aria-pressed={view === 'table'} onClick={() => setView('table')}>
            Table
          </button>
        </div>
      </div>

      <div className="legend">
        <span className="pill good">
          <span className="dot" aria-hidden="true" />
          In range
        </span>
        <span className="pill warning">
          <span className="dot" aria-hidden="true" />
          Outside range
        </span>
        <span className="pill critical">
          <span className="dot" aria-hidden="true" />
          Well outside range
        </span>
        <span style={{ color: 'var(--text-muted)' }}>
          Trend column: this analyte across the patient’s reports
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="card empty">No tests match these filters.</div>
      ) : view === 'table' ? (
        <TableView rows={rows} />
      ) : (
        grouped.map(({ panel, rows: prows }) => (
          <Panel
            key={panel.key}
            panel={panel}
            rows={prows}
            series={patient.series}
            defaultOpen={
              prows.some((r) => r.flagged) || onlyFlagged || panelKey !== 'all' || Boolean(query)
            }
          />
        ))
      )}
    </>
  )
}
