import { useEffect, useMemo, useState } from 'react'
import { listAllDocuments } from '../lib/api.js'
import { DOC_TYPES, UNSWEPT, PANELS, docTypeOf } from '../lib/meta.js'
import { buildDataset } from '../lib/buildDataset.js'
import { shortDate } from '../lib/format.js'
import StatsBar from './StatsBar.jsx'
import PanelBars from './PanelBars.jsx'
import DocumentCard from './DocumentCard.jsx'
import TrendsTab from './TrendsTab.jsx'
import ReportsTab from './ReportsTab.jsx'

export default function ClassifierView({ patient }) {
  const [docs, setDocs] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('trends')
  const [typeFilter, setTypeFilter] = useState('all')
  const [panelFilter, setPanelFilter] = useState(null)

  useEffect(() => {
    let alive = true
    setDocs(null)
    setError(null)
    listAllDocuments(patient.id)
      .then((d) => alive && setDocs(d))
      .catch((e) => alive && setError(e.message))
    return () => {
      alive = false
    }
  }, [patient.id])

  const stats = useMemo(() => {
    if (!docs) return null
    const byType = Object.fromEntries([...DOC_TYPES, UNSWEPT].map((t) => [t.key, 0]))
    const byPanel = Object.fromEntries(PANELS.map((p) => [p.key, 0]))
    for (const doc of docs) {
      byType[docTypeOf(doc)] += 1
      for (const panel of doc.classification?.panels || []) {
        if (panel in byPanel) byPanel[panel] += 1
      }
    }
    return { byType, byPanel, total: docs.length }
  }, [docs])

  // The analyte-level dataset: values recovered from each lab report's text,
  // folded onto canonical analytes, then trended across reports.
  const built = useMemo(() => {
    if (!docs) return null
    const stamped = docs.map((d) => ({ ...d, patient_id: d.patient_id || patient.id }))
    return buildDataset(stamped)
  }, [docs, patient.id])

  const parsed = built?.patients[0] || null
  const trendCount = parsed ? Object.keys(parsed.series || {}).length : 0
  const reportCount = parsed?.reports.length || 0

  const visible = useMemo(() => {
    if (!docs) return []
    let out = docs
    if (typeFilter !== 'all') out = out.filter((d) => docTypeOf(d) === typeFilter)
    if (typeFilter === 'lab_report' && panelFilter) {
      out = out.filter((d) => (d.classification?.panels || []).includes(panelFilter))
    }
    return [...out].sort((a, b) => {
      const da = a.metadata?.document_date || a.file?.uploaded_at || ''
      const db = b.metadata?.document_date || b.file?.uploaded_at || ''
      return String(db).localeCompare(String(da))
    })
  }, [docs, typeFilter, panelFilter])

  function pickType(key) {
    setTypeFilter(key)
    if (key !== 'lab_report') setPanelFilter(null)
  }

  if (error)
    return (
      <main className="page">
        <div className="error-box">{error}</div>
      </main>
    )
  if (!docs)
    return (
      <main className="page">
        <p className="muted">Loading documents…</p>
      </main>
    )

  const unswept = stats.byType.unswept
  const engineVersion = Object.keys(built?.stats.engine_versions || {}).sort().at(-1)

  return (
    <main className="page">
      <header className="rpt-head">
        <h1>{patient.name || 'Unnamed patient'}</h1>
        <div className="rpt-meta">
          <span>{docs.length} document{docs.length === 1 ? '' : 's'}</span>
          <span className="sep">|</span>
          <span>
            {stats.byType.lab_report} lab report{stats.byType.lab_report === 1 ? '' : 's'}
          </span>
          {reportCount > 0 && (
            <>
              <span className="sep">|</span>
              <span>
                {shortDate(parsed.reports[0].date)} → {shortDate(parsed.reports.at(-1).date)}
              </span>
            </>
          )}
          {engineVersion && (
            <>
              <span className="sep">|</span>
              <span className="mono">engine {engineVersion}</span>
            </>
          )}
        </div>
      </header>

      <div className="seg tabs">
        <button className="btn" aria-pressed={tab === 'trends'} onClick={() => setTab('trends')}>
          Trends{trendCount ? ` (${trendCount})` : ''}
        </button>
        <button className="btn" aria-pressed={tab === 'reports'} onClick={() => setTab('reports')}>
          Reports{reportCount ? ` (${reportCount})` : ''}
        </button>
        <button className="btn" aria-pressed={tab === 'documents'} onClick={() => setTab('documents')}>
          Documents ({docs.length})
        </button>
      </div>

      {unswept > 0 && (
        <p className="notice">
          {unswept} document{unswept > 1 ? 's' : ''} not classified by the backend yet —
          run the sweep (<code>scripts/classify_patient_documents.py --write</code>) to
          stamp {unswept > 1 ? 'them' : 'it'}. Until then {unswept > 1 ? 'they are' : 'it is'} typed
          here by content heuristic instead.
        </p>
      )}

      {tab === 'trends' &&
        (parsed ? (
          <TrendsTab
            patient={parsed}
            reportCount={reportCount}
            onSeeReports={() => setTab('reports')}
          />
        ) : (
          <NoValues stats={built?.stats} onSeeDocuments={() => setTab('documents')} />
        ))}

      {tab === 'reports' &&
        (parsed ? (
          <ReportsTab patient={parsed} />
        ) : (
          <NoValues stats={built?.stats} onSeeDocuments={() => setTab('documents')} />
        ))}

      {tab === 'documents' && (
        <>
          <StatsBar stats={stats} active={typeFilter} onPick={pickType} />

          {typeFilter === 'lab_report' && (
            <PanelBars
              byPanel={stats.byPanel}
              active={panelFilter}
              onPick={(k) => setPanelFilter(panelFilter === k ? null : k)}
            />
          )}

          <p className="muted count-line">
            {visible.length} document{visible.length === 1 ? '' : 's'}
          </p>

          <div className="doc-list">
            {visible.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        </>
      )}
    </main>
  )
}

/**
 * A lab report with no parseable rows is the common case when the API returns
 * only `summary_text` and the lab summarised in prose. Saying so beats an empty
 * grid that reads as "this patient has no results".
 */
function NoValues({ stats, onSeeDocuments }) {
  const labs = stats?.by_type.lab || 0
  return (
    <div className="card empty">
      {labs === 0 ? (
        <>No document here classified as a lab report, so there are no values to chart.</>
      ) : (
        <>
          {labs} lab report{labs === 1 ? '' : 's'} found, but no result rows parsed out of{' '}
          {labs === 1 ? 'it' : 'them'}. A row needs both a value and a reference interval —
          nothing is estimated.
        </>
      )}
      <br />
      <button className="btn" style={{ marginTop: 12 }} onClick={onSeeDocuments}>
        See the documents
      </button>
    </div>
  )
}
