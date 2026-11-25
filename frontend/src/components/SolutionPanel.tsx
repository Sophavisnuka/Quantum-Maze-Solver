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
    </div>
  )
}
