import { useCallback, useEffect, useState } from 'react'
import Login from './components/Login.jsx'
import PatientSearch from './components/PatientSearch.jsx'
import ClassifierView from './components/ClassifierView.jsx'
import { isAuthed, clearSession } from './lib/api.js'

/** `null` follows the OS; an explicit choice stamps the root and wins both ways. */
function useTheme() {
  const [theme, setTheme] = useState(null)
  useEffect(() => {
    if (theme) document.documentElement.dataset.theme = theme
    else delete document.documentElement.dataset.theme
  }, [theme])
  const toggle = useCallback(() => {
    setTheme((t) => {
      const dark = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
      return dark ? 'light' : 'dark'
    })
  }, [])
  return [theme, toggle]
}

export default function App() {
  const [authed, setAuthed] = useState(isAuthed())
  const [patient, setPatient] = useState(null)
  const [theme, toggleTheme] = useTheme()

  if (!authed) return <Login onLogin={() => setAuthed(true)} />

  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true" />
          Lab Report Classifier
        </div>
        <button className="link-btn" onClick={toggleTheme} title="Toggle light / dark">
          {theme === 'dark' ? '☀ Light' : '☾ Dark'}
        </button>
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

      <div className="app">
        {patient ? (
          <ClassifierView patient={patient} />
        ) : (
          <PatientSearch onSelect={setPatient} />
        )}
      </div>
    </>
  )
}
