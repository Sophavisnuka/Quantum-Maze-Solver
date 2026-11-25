import { QUBIT_CAPS, SIZES, type SizeOption } from '../config'

interface Props {
  size: SizeOption
  sizeIdx: number
  maxQubits: number
  busy: boolean
  onSizeChange: (i: number) => void
  onQubitsChange: (q: number) => void
  onRegenerate: () => void
}

export default function SettingsPanel({ size, sizeIdx, maxQubits, busy, onSizeChange, onQubitsChange, onRegenerate }: Props) {
  return (
    <div className="panel side-panel">
      <h2>Settings</h2>
      <div className="controls">
        <label>
          Maze size
          <select value={sizeIdx} onChange={(e) => onSizeChange(Number(e.target.value))}>
            {SIZES.map((s, i) => (
              <option key={s.label} value={i}>{s.label}</option>
            ))}
          </select>
        </label>
        <label>
          Qubit limit
          <select value={maxQubits} onChange={(e) => onQubitsChange(Number(e.target.value))}>
            {QUBIT_CAPS.filter((q) => q >= (size.minQ ?? 0)).map((q) => (
              <option key={q} value={q}>{q}{q > 14 ? ' (slow)' : ''}</option>
            ))}
          </select>
        </label>
        <button onClick={onRegenerate} disabled={busy}>Regenerate maze</button>
      </div>
    </div>
  )
}
