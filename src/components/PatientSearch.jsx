import { useState } from 'react'
import { listPatients } from '../lib/api.js'

export default function PatientSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function search(e) {
    e.preventDefault()
    if (!query.trim()) return
    setBusy(true)
    setError(null)
    try {
      const data = await listPatients(query.trim())
      const patients = Array.isArray(data) ? data : data?.patients || []
      setResults(patients)
    } catch (err) {
      setError(err.message)
      setResults(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <form className="search-row" onSubmit={search}>
        <input
          type="search"
          placeholder="Search patients by name or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search patients"
        />
        <button type="submit" disabled={busy || !query.trim()}>
          {busy ? 'Searching…' : 'Search'}
        </button>
      </form>

      {error && <div className="error-box">{error}</div>}

      {results && results.length === 0 && (
        <p className="muted">No patients matched “{query}”.</p>
      )}

      {results && results.length > 0 && (
        <ul className="patient-list">
          {results.map((p) => {
            const id = p.id || p.patient_id
            const name =
              p.name ||
              [p.first_name, p.last_name].filter(Boolean).join(' ') ||
              id
            return (
              <li key={id}>
                <button className="patient-row" onClick={() => onSelect({ ...p, id, name })}>
                  <span className="patient-name">{name}</span>
                  <span className="muted">
                    {[p.gender, p.age && `${p.age}y`, p.phone_number].filter(Boolean).join(' · ')}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!results && !error && (
        <p className="muted hint">
          Search for a patient to see their documents, sorted by the
          backend classifier: lab reports (with panel subtypes), radiology,
          and other documents.
        </p>
      )}
    </main>
  )
}
