import { useEffect, useMemo, useState } from 'react'
import { listAllDocuments } from '../lib/api.js'
import { DOC_TYPES, UNSWEPT, PANELS, docTypeOf } from '../lib/meta.js'
import StatsBar from './StatsBar.jsx'
import PanelBars from './PanelBars.jsx'
import DocumentCard from './DocumentCard.jsx'

export default function ClassifierView({ patient }) {
  const [docs, setDocs] = useState(null)
  const [error, setError] = useState(null)
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

  if (error) return <main className="page"><div className="error-box">{error}</div></main>
  if (!docs) return <main className="page"><p className="muted">Loading documents…</p></main>

  return (
    <main className="page">
      <h2 className="patient-heading">{patient.name}</h2>

      <StatsBar stats={stats} active={typeFilter} onPick={pickType} />

      {stats.byType.unswept > 0 && (
        <p className="notice">
          {stats.byType.unswept} document{stats.byType.unswept > 1 ? 's' : ''} not
          classified yet — run the backend sweep
          (<code>scripts/classify_patient_documents.py --write</code>) to stamp them.
        </p>
      )}

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
    </main>
  )
}
