import { useState } from 'react'
import Login from './components/Login.jsx'
import PatientSearch from './components/PatientSearch.jsx'
import ClassifierView from './components/ClassifierView.jsx'
import { isAuthed, clearSession } from './lib/api.js'

export default function App() {
  const [authed, setAuthed] = useState(isAuthed())
  const [patient, setPatient] = useState(null)

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Lab Report Classifier
        </div>
        {patient && (
          <button className="link-btn" onClick={() => setPatient(null)}>
            ← All patients
          </button>
        )}
        <button
          className="link-btn"
          onClick={() => {
            clearSession()
            setAuthed(false)
            setPatient(null)
          }}
        >
          Sign out
        </button>
      </header>

      {patient ? (
        <ClassifierView patient={patient} />
      ) : (
        <PatientSearch onSelect={setPatient} />
      )}
    </div>
  )
}
