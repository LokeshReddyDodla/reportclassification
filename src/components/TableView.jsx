import StatusPill from './StatusPill'
import { formatValue } from '../lib/format'

/** The WCAG-clean twin: every value reachable as text, no colour-only encoding. */
export default function TableView({ rows }) {
  return (
    <div className="tblwrap">
      <table className="data">
        <thead>
          <tr>
            <th>Panel</th>
            <th>Test</th>
            <th>Result</th>
            <th>Unit</th>
            <th>Reference</th>
            <th>Status</th>
            <th>As printed by the lab</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ test, state, panel }) => (
            <tr key={`${panel.key}.${test.key}`}>
              <td className="panelcell">{panel.name}</td>
              <td>{test.name}</td>
              <td className="num"><strong>{formatValue(test.value, test.operator)}</strong></td>
              <td className="panelcell">{test.unit || '—'}</td>
              <td className="num panelcell">{test.ref.text}</td>
              <td><StatusPill state={state} /></td>
              <td className="panelcell">{test.raw_name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
