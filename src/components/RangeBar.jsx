import { useState } from 'react'
import { domainFor, bandBounds, pct, clamp, statusToken, DIRECTION } from '../lib/status'
import { formatValue } from '../lib/format'

/**
 * Value against its reference interval. The geometry is the honest part: the
 * distance between the marker and the band edge IS how far outside the value
 * sits, in the same units the lab printed.
 */
export default function RangeBar({ test, state }) {
  const [tip, setTip] = useState(null)
  const { ref, value, unit, operator } = test

  if (ref.type === 'qualitative') {
    return (
      <div className="rangebar-none">
        Expected <strong style={{ color: 'var(--text-secondary)' }}>{ref.expected}</strong>
      </div>
    )
  }
  if (ref.type === 'none') return <div className="rangebar-none">No reference interval</div>

  const domain = domainFor(ref, value)
  const band = bandBounds(ref)
  if (!domain || !band) return <div className="rangebar-none">No reference interval</div>
  const token = statusToken(state)

  // An open side runs to the edge of the rail rather than stopping at a number.
  const bandLeft = band.openLow ? 0 : clamp(pct(band.low, domain))
  const bandRight = band.openHigh ? 100 : clamp(pct(band.high, domain))
  const markerLeft = clamp(pct(value, domain))

  const lowTick = ref.type === 'max' ? null : ref.low
  const highTick = ref.type === 'min' ? null : ref.high

  return (
    <div
      className="rangebar"
      onMouseEnter={() => setTip(true)}
      onMouseLeave={() => setTip(null)}
      onFocus={() => setTip(true)}
      onBlur={() => setTip(null)}
      tabIndex={0}
      style={{ position: 'relative', outline: 'none' }}
    >
      <div className="rail">
        <div
          className="band"
          style={{
            left: `${bandLeft}%`,
            width: `${Math.max(bandRight - bandLeft, 1)}%`,
            // An open-ended interval ("≤ 149.9") shouldn't grow a rounded cap
            // on the side it doesn't actually bound.
            borderTopLeftRadius: band.openLow ? 0 : undefined,
            borderBottomLeftRadius: band.openLow ? 0 : undefined,
            borderTopRightRadius: band.openHigh ? 0 : undefined,
            borderBottomRightRadius: band.openHigh ? 0 : undefined,
          }}
        />
        <div className={`marker ${token}`} style={{ left: `${markerLeft}%` }} />
      </div>

      <div className="ticks">
        <span>{lowTick !== null ? lowTick : ''}</span>
        <span>{highTick !== null ? highTick : ''}</span>
      </div>

      {tip && (
        <div className="tip" style={{ left: `${markerLeft}%`, top: 0 }}>
          <div>
            <b>{formatValue(value, operator)}</b> {unit}
          </div>
          <div className="tip-date">
            {state.direction === DIRECTION.NORMAL ? 'Within' : 'Reference'} {ref.text} {unit}
          </div>
        </div>
      )}
    </div>
  )
}
