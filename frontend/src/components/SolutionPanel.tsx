import type { MazeData, Solution } from '../types'
import { fmtTime } from '../utils/format'

interface Props {
  solution: Solution
  maze: MazeData
}

export default function SolutionPanel({ solution, maze }: Props) {
  return (
    <div className="panel">
      <h2>Grover search result</h2>
      <div className="stats">
        <div className="stat"><b>{solution.qubits}</b><span>qubits</span></div>
        <div className="stat"><b>{solution.search_space.toLocaleString()}</b><span>candidate routes (2^n)</span></div>
        <div className="stat"><b>{solution.valid_routes}</b><span>valid routes to the exit</span></div>
        <div className="stat"><b>{solution.length}</b><span>steps in shortest route</span></div>
        {solution.elapsed_ms != null && (
          <div className="stat"><b>{fmtTime(solution.elapsed_ms)}</b><span>time to find it</span></div>
        )}
        <div className="stat">
          <b style={{ color: solution.verified ? 'var(--ok)' : 'var(--bad)' }}>{solution.verified ? 'Yes' : 'No'}</b>
          <span>matches classical Dijkstra ({solution.classical_length})</span>
        </div>
      </div>
      <p className="hint" style={{ textAlign: 'left' }}>
        Each qubit is one left/right choice at a junction (the maze has {maze.decision_nodes} junctions and dead ends).
        Every round marks only routes shorter than the previous result, until none remain. Best bitstring: <code>{solution.bitstring}</code>
      </p>
      <table>
        <thead>
          <tr><th>Round</th><th>Marks routes shorter than</th><th>Marked</th><th>Grover iterations</th><th>P(marked)</th><th>Measured route</th><th>Time</th></tr>
        </thead>
        <tbody>
          {solution.rounds.map((r) => (
            <tr key={r.round}>
              <td>{r.round}</td>
              <td>{r.threshold ?? '∞'}</td>
              <td>{r.marked}</td>
              <td>{r.iterations}</td>
              <td>{(r.p_marked * 100).toFixed(0)}%</td>
              <td>{r.found_length ?? '–'} steps</td>
              <td>{r.time_ms != null ? fmtTime(r.time_ms) : '–'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <details className="explain">
        <summary>How to read this</summary>
        <h3>What is a round?</h3>
        <p>
          Grover can only boost routes we mark, and we do not know the shortest route in advance. So the search
          improves step by step. Round 1 marks every route that reaches the exit and measures one random route.
          Each next round marks only routes <em>shorter</em> than the last result and measures again. When a round
          finds nothing shorter, the last route found is the shortest.
        </p>
        <p>
          The number of rounds depends on the maze and on luck (each measurement picks a random marked route), not
          on how you played. A lucky early pick near the shortest route means fewer rounds.
        </p>
        <h3>What is “repeat × N”?</h3>
        <p>
          One Grover iteration is the oracle (flips the sign of the marked routes) followed by the diffuser
          (boosts whatever was flipped). The circuit draws that block once with “repeat × N” around it, where N
          is the number of iterations in the round.
        </p>
        <p>
          N is chosen so the chance of measuring a marked route peaks, about (π/4)·√(candidates ÷ marked). Early
          rounds have many marked routes, so few repeats. Later rounds have fewer, so many more repeats. Too few or
          too many both lower the odds, as the probability curve shows.
        </p>
      </details>
    </div>
  )
}
