import RangeBar from './RangeBar'
import Sparkline from './Sparkline'
import StatusPill from './StatusPill'
import { formatValue } from '../lib/format'

export default function TestRow({ test, state, points }) {
  return (
    <div className="trow">
      <div className="tname">
        {test.name}
        {/* The lab's own wording, kept when it differs from the canonical name —
            a doctor checking against the PDF needs to find the same row. */}
        {test.raw_name && test.raw_name.toLowerCase() !== test.name.toLowerCase() && (
          <span className="method">{test.raw_name}</span>
        )}
      </div>

      {/* The value is always printed — a tooltip never gates it. */}
      <div className="tval">
        {formatValue(test.value, test.operator)}
        {test.unit && <span className="unit">{test.unit}</span>}
      </div>

      <div className="cell-bar">
        <RangeBar test={test} state={state} />
      </div>

      <div><StatusPill state={state} /></div>

      <div className="cell-spark">
        <Sparkline points={points} ref={test.ref} unit={test.unit} />
      </div>
    </div>
  )
}
