import type { Solution } from '../types'
import { CircuitView, Histogram, ProbCurve } from './Charts'

interface Props {
  solution: Solution
  roundIdx: number
  onRoundChange: (i: number) => void
}

export default function CircuitPanel({ solution, roundIdx, onRoundChange }: Props) {
  const rd = solution.rounds[Math.min(roundIdx, solution.rounds.length - 1)]
  if (!rd) return null

  return (
    <div className="panel">
      <h2>Quantum circuit &amp; measurements</h2>
      <div className="controls" style={{ justifyContent: 'flex-start' }}>
        <label>
          Round
          <select value={roundIdx} onChange={(e) => onRoundChange(Number(e.target.value))}>
            {solution.rounds.map((r, i) => (
              <option key={r.round} value={i}>
                {r.round} ({r.marked} marked, {r.iterations} iterations)
              </option>
            ))}
          </select>
        </label>
      </div>

      <h3>Circuit ({solution.qubits} qubits)</h3>
      <p className="hint" style={{ textAlign: 'left' }}>
        Hadamards put all {solution.search_space.toLocaleString()} routes in superposition. Each Grover
        iteration flips the sign of the {rd.marked} marked routes (oracle) and reflects every amplitude about
        the mean (diffuser). Measurement then collapses to a route.
      </p>
      <CircuitView qubits={solution.qubits} iterations={rd.iterations} />

      {rd.top && rd.shots && (
        <>
          <h3>Measurement histogram ({rd.shots} shots)</h3>
          <p className="hint" style={{ textAlign: 'left' }}>
            Top {rd.top.length} of {rd.distinct_outcomes} distinct outcomes.
            <span className="key marked" /> marked route <span className="key other" /> not marked.
            P(marked) measured {(rd.p_marked * 100).toFixed(1)}%
            {rd.theory_p != null && <> vs theory {(rd.theory_p * 100).toFixed(1)}%</>}.
          </p>
          <Histogram bars={rd.top} shots={rd.shots} />
        </>
      )}

      {rd.curve && (
        <>
          <h3>Success probability vs iterations</h3>
          <p className="hint" style={{ textAlign: 'left' }}>
            Theory curve sin²((2k+1)θ). Too few or too many iterations lowers the odds; the big dot is the
            count used and the ring is the measured result.
          </p>
          <ProbCurve curve={rd.curve} chosen={rd.iterations} measured={rd.p_marked} />
        </>
      )}
    </div>
  )
}
