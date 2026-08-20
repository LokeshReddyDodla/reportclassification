import { statusToken } from '../lib/status'

/**
 * Status colour never travels alone — the dot carries the hue, the text carries
 * the meaning. Required: `warning` sits below 3:1 on the light surface by design.
 */
export default function StatusPill({ state }) {
  const token = statusToken(state)
  return (
    <span className={`pill ${token}`}>
      <span className="dot" aria-hidden="true" />
      {state.label}
    </span>
  )
}
