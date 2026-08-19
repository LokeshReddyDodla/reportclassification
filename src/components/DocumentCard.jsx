import { useState } from 'react'
import {
  DOC_TYPE_BY_KEY,
  UNSWEPT,
  PANEL_BY_KEY,
  FAMILY_LABELS,
  docTypeOf,
  fmtDate,
} from '../lib/meta.js'

export default function DocumentCard({ doc }) {
  const [open, setOpen] = useState(false)
  const typeKey = docTypeOf(doc)
  const type = DOC_TYPE_BY_KEY[typeKey] || UNSWEPT
  const cls = doc.classification
  const panels = cls?.panels || []

  return (
    <article className="doc-card">
      <div className="doc-head">
        <div className="doc-title">
          <span className="doc-name" title={doc.file?.name}>
            {doc.file?.name || 'Unnamed document'}
          </span>
          <span className="muted doc-date">
            {fmtDate(doc.metadata?.document_date)} · uploaded {fmtDate(doc.file?.uploaded_at)}
          </span>
        </div>
        <span
          className="type-chip"
          style={{ background: type.tint, color: type.color, borderColor: type.color }}
        >
          {type.label === 'Not swept' ? 'Not classified yet' : type.label}
        </span>
      </div>

      {panels.length > 0 && (
        <div className="chip-row">
          {panels.map((key) => (
            <span key={key} className="panel-chip">
              {PANEL_BY_KEY[key]?.label || key}
            </span>
          ))}
          {cls?.family && (
            <span className="family-chip">{FAMILY_LABELS[cls.family] || cls.family}</span>
          )}
        </div>
      )}

      {cls && (
        <div className="conf-row">
          <span className="muted">Confidence</span>
          <span className="conf-track" aria-hidden="true">
            <span className="conf-fill" style={{ width: `${Math.round(cls.confidence * 100)}%` }} />
          </span>
          <span className="conf-value">{Math.round(cls.confidence * 100)}%</span>
          <button className="link-btn" onClick={() => setOpen(!open)}>
            {open ? 'Hide evidence' : 'Why?'}
          </button>
          {doc.file?.url && (
            <a className="link-btn" href={doc.file.url} target="_blank" rel="noreferrer">
              Open file ↗
            </a>
          )}
        </div>
      )}

      {open && cls && <Evidence cls={cls} />}
    </article>
  )
}

function Evidence({ cls }) {
  const ev = cls.evidence?.doc_type || {}
  const panelEv = cls.evidence?.panels || {}
  return (
    <div className="evidence">
      <table className="evidence-table">
        <tbody>
          <tr>
            <th scope="row">Result lines</th>
            <td>{ev.result_lines ?? 0}</td>
            <th scope="row">Analytes found</th>
            <td>{ev.analyte_hits ?? 0}</td>
          </tr>
          {ev.lab_headers?.length > 0 && (
            <tr>
              <th scope="row">Lab vocabulary</th>
              <td colSpan={3}>{ev.lab_headers.join(', ')}</td>
            </tr>
          )}
          {ev.radiology_hits?.length > 0 && (
            <tr>
              <th scope="row">Radiology vocabulary</th>
              <td colSpan={3}>{ev.radiology_hits.join(', ')}</td>
            </tr>
          )}
          {ev.other_hits?.length > 0 && (
            <tr>
              <th scope="row">Other vocabulary</th>
              <td colSpan={3}>{ev.other_hits.join(', ')}</td>
            </tr>
          )}
          {ev.file_signals?.length > 0 && (
            <tr>
              <th scope="row">File signals</th>
              <td colSpan={3}>{ev.file_signals.join(', ')}</td>
            </tr>
          )}
          {ev.reason && (
            <tr>
              <th scope="row">Reason</th>
              <td colSpan={3}>{ev.reason}</td>
            </tr>
          )}
        </tbody>
      </table>

      {Object.keys(panelEv).length > 0 && (
        <div className="panel-evidence">
          {Object.entries(panelEv).map(([panel, e]) => (
            <div key={panel} className="panel-evidence-row">
              <span className="panel-chip">{PANEL_BY_KEY[panel]?.label || panel}</span>
              <span className="muted">
                {e.anchors?.length
                  ? `anchors: ${e.anchors.join(', ')}`
                  : 'no anchor detail'}
                {e.section_header ? ` · header: “${e.section_header}”` : ''}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="muted engine-line">
        engine v{cls.engine_version} · classified {fmtDate(cls.classified_at)}
      </p>
    </div>
  )
}
