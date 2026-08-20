/**
 * Accounts for every lab report between "the engine typed it" and "it appears
 * on a chart". The two numbers differ for real reasons, and a silent gap reads
 * as data loss — so each dropped report is named with its reason.
 */
export default function CoverageNote({ stats, charted, onSeeDocuments }) {
  if (!stats) return null

  const labs = stats.by_type.lab
  const reasons = [
    [stats.reports_dropped_no_rows, 'no value + reference-interval pair could be parsed'],
    [stats.reports_merged_same_day, 'merged into a same-day report'],
    [stats.reports_dropped_duplicate, 'duplicate of another report'],
    [stats.reports_dropped_no_date, 'no usable report date'],
  ].filter(([n]) => n > 0)

  if (labs === charted && !reasons.length) return null

  return (
    <details className="coverage">
      <summary>
        <b>{charted}</b> of <b>{labs}</b> lab report{labs === 1 ? '' : 's'} charted
        {reasons.length > 0 && <span className="muted"> — why?</span>}
      </summary>
      <div className="coverage-body">
        <ul>
          {reasons.map(([n, why]) => (
            <li key={why}>
              <b>{n}</b> {n === 1 ? 'report' : 'reports'}: {why}
            </li>
          ))}
        </ul>
        <p className="src-note" style={{ marginTop: 0 }}>
          A result is charted only when both a value and its reference interval
          parse — nothing is estimated. Reports that carry only narrative findings
          (radiology, histopathology) or that the endpoint returned as an
          abnormals-only summary can be correctly classified as lab reports and
          still yield no plottable rows.
          {stats.docs_summary_only > 0 && (
            <>
              {' '}
              {stats.docs_summary_only} of these came through as{' '}
              <code>summary_text</code> only.
            </>
          )}
        </p>
        <div className="coverage-figs">
          <span>
            <b>{stats.rows_parsed}</b> rows parsed
          </span>
          <span>
            <b>{stats.rows_catalogued}</b> matched a canonical analyte
          </span>
          <span>
            <b>{stats.rows_uncatalogued}</b> lab-specific
          </span>
        </div>
        <button className="btn" onClick={onSeeDocuments}>
          See all documents
        </button>
      </div>
    </details>
  )
}
