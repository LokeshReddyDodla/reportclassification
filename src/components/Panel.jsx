import TestRow from './TestRow'

export default function Panel({ panel, rows, series, defaultOpen }) {
  const flagged = rows.filter((r) => r.flagged).length

  return (
    <details className="panel" open={defaultOpen}>
      <summary>
        <span className="chev" aria-hidden="true">▶</span>
        <h2>{panel.name}</h2>
        {flagged > 0 ? (
          <span className="flagcount">
            <span className="swatch warning" aria-hidden="true" />
            {flagged} outside range
          </span>
        ) : (
          <span className="flagcount muted">All in range</span>
        )}
        <span className="specimen">{rows.length} test{rows.length === 1 ? '' : 's'}</span>
      </summary>

      <div className="panel-body">
        <div className="row-head">
          <span>Test</span>
          <span>Result</span>
          <span>Reference interval</span>
          <span>Status</span>
          <span>Trend</span>
        </div>
        {rows.map(({ test, state }) => (
          <TestRow key={test.key} test={test} state={state} points={series?.[test.key]} />
        ))}
      </div>
    </details>
  )
}
