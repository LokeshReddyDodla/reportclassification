import { useRef, useState } from 'react'
import { uploadDocuments, ACCEPTED_UPLOAD_TYPES } from '../lib/api.js'

const MAX_MB = 25

/**
 * Document upload for the open patient.
 *
 * The backend does extraction, summarisation, classification, and embedding
 * synchronously inside the request, so a file takes seconds rather than
 * milliseconds. The two phases are shown separately: a real percentage while
 * bytes are in flight, then an indeterminate "processing" state while the
 * server works — reporting 100% during that second phase would claim the
 * upload had finished when it had not.
 */
export default function UploadPanel({ patient, onUploaded }) {
  const [open, setOpen] = useState(false)
  const [files, setFiles] = useState([])
  const [docType, setDocType] = useState('report')
  const [phase, setPhase] = useState('idle') // idle | sending | processing | done | error
  const [pct, setPct] = useState(0)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const busy = phase === 'sending' || phase === 'processing'

  function addFiles(list) {
    const picked = [...list]
    const tooBig = picked.filter((f) => f.size > MAX_MB * 1024 * 1024)
    if (tooBig.length) {
      setError(`${tooBig.map((f) => f.name).join(', ')} exceeds ${MAX_MB} MB.`)
    }
    const ok = picked.filter((f) => f.size <= MAX_MB * 1024 * 1024)
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
      return [...prev, ...ok.filter((f) => !seen.has(`${f.name}:${f.size}`))]
    })
  }

  function reset() {
    setFiles([])
    setPhase('idle')
    setPct(0)
    setError(null)
    setResult(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  async function submit() {
    if (!files.length || busy) return
    setError(null)
    setResult(null)
    setPhase('sending')
    setPct(0)
    try {
      const data = await uploadDocuments(patient.id, files, {
        documentType: docType,
        onProgress: (p) => {
          setPct(p)
          if (p >= 1) setPhase('processing')
        },
      })
      setPhase('done')
      setResult(data)
      setFiles([])
      if (inputRef.current) inputRef.current.value = ''
      // The new documents arrive already classified, so a refetch is enough --
      // there is no sweep to wait on.
      onUploaded?.()
    } catch (e) {
      setPhase('error')
      setError(e.message)
    }
  }

  if (!open) {
    return (
      <button className="btn btn-primary upload-open" onClick={() => setOpen(true)}>
        ↑ Upload documents
      </button>
    )
  }

  return (
    <section className="card upload-panel">
      <div className="upload-head">
        <b>Upload documents for {patient.name || 'this patient'}</b>
        <button
          className="link-btn"
          onClick={() => {
            reset()
            setOpen(false)
          }}
          disabled={busy}
        >
          Close
        </button>
      </div>

      <div
        className={`dropzone${dragging ? ' dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!busy) addFiles(e.dataTransfer.files)
        }}
        onClick={() => !busy && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
        }}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_UPLOAD_TYPES}
          hidden
          onChange={(e) => addFiles(e.target.files)}
        />
        <div className="dz-main">Drop files here, or click to choose</div>
        <div className="dz-sub">PDF, Word, CSV/Excel, or images · up to {MAX_MB} MB each</div>
      </div>

      {files.length > 0 && (
        <ul className="filelist">
          {files.map((f, i) => (
            <li key={`${f.name}:${f.size}`}>
              <span className="fl-name">{f.name}</span>
              <span className="fl-size">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
              <button
                className="link-btn"
                aria-label={`Remove ${f.name}`}
                disabled={busy}
                onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="upload-controls">
        <label className="dt-label">
          Category
          <select value={docType} onChange={(e) => setDocType(e.target.value)} disabled={busy}>
            <option value="report">Report</option>
            <option value="other">Other</option>
          </select>
        </label>
        <div className="spacer" />
        {files.length > 0 && !busy && (
          <button className="btn" onClick={reset}>
            Clear
          </button>
        )}
        <button className="btn btn-primary" onClick={submit} disabled={!files.length || busy}>
          {busy
            ? 'Uploading…'
            : `Upload ${files.length || ''} file${files.length === 1 ? '' : 's'}`.trim()}
        </button>
      </div>

      {busy && (
        <div className="upload-progress">
          <div className="conf-track">
            <span
              className={`conf-fill${phase === 'processing' ? ' indeterminate' : ''}`}
              style={phase === 'sending' ? { width: `${Math.round(pct * 100)}%` } : undefined}
            />
          </div>
          <span className="muted">
            {phase === 'sending'
              ? `Sending ${Math.round(pct * 100)}%`
              : 'Processing — extracting text, summarising, and classifying'}
          </span>
        </div>
      )}

      {phase === 'done' && (
        <p className="upload-ok">
          Uploaded and classified. {countOf(result)}
        </p>
      )}

      {error && <div className="error-box" style={{ marginTop: 12 }}>{error}</div>}

      <p className="src-note">
        Each file is classified during upload, before it is stored — new documents
        appear here already typed, with no sweep to run.
      </p>
    </section>
  )
}

/** The endpoint returns whatever upload_multiple_documents produced. */
function countOf(result) {
  const data = result?.data
  const n = Array.isArray(data) ? data.length : data ? 1 : 0
  return n ? `${n} document${n === 1 ? '' : 's'} added.` : 'Refreshing the list…'
}
