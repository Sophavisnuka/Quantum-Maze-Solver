import type { Verdict } from '../types'

interface Props {
  ready: boolean
  busy: boolean
  error: string
  verdict: Verdict | null
  onCheck: () => void
  onSolve: () => void
  onReset: () => void
}

export default function ActionsPanel({ ready, busy, error, verdict, onCheck, onSolve, onReset }: Props) {
  const disabled = !ready || busy
  return (
    <div className="panel side-panel">
      <h2>Actions</h2>
      <div className="actions">
        <button className="primary" onClick={onCheck} disabled={disabled}>
          {busy ? 'Running Grover…' : 'Check my path'}
        </button>
        <button onClick={onSolve} disabled={disabled}>Solve with Grover</button>
        <button onClick={onReset} disabled={disabled}>Reset path</button>
      </div>
      <div className={`status ${verdict ? (verdict.ok ? 'ok' : 'bad') : error ? 'bad' : ''}`}>
        {error || verdict?.text}
      </div>
    </div>
  )
}
