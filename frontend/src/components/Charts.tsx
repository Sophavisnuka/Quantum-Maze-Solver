export interface Bar {
  bits: string
  count: number
  marked: boolean
  length: number | null
}

/** Grover circuit drawn from its structure: H, then (oracle, H, diffuser, H) x k, then measure. */
export function CircuitView({ qubits, iterations }: { qubits: number; iterations: number }) {
  const gap = qubits > 14 ? 16 : 22
  const top = 34
  const left = 44
  const height = top + qubits * gap + 14
  const colX = [left + 20, left + 90, left + 160, left + 250, left + 320]
  const endX = left + 420
  const y = (i: number) => top + i * gap + gap / 2
  const wireBottom = y(qubits - 1)
  const box = (x: number, w: number, label: string, cls: string) => (
    <g key={label + x}>
      <rect x={x - w / 2} y={y(0) - gap / 2 + 2} width={w} height={wireBottom - y(0) + gap - 4} rx={4} className={cls} />
      <text x={x} y={(y(0) + wireBottom) / 2 + 4} textAnchor="middle" className="c-label">{label}</text>
    </g>
  )
  const hGates = (x: number) =>
    Array.from({ length: qubits }, (_, i) => (
      <g key={`h${x}-${i}`}>
        <rect x={x - 9} y={y(i) - gap / 2 + 3} width={18} height={gap - 6} rx={2} className="c-gate" />
        {gap >= 20 && <text x={x} y={y(i) + 4} textAnchor="middle" className="c-small">H</text>}
      </g>
    ))
  return (
    <div className="chart-scroll">
      <svg viewBox={`0 0 ${endX + 50} ${height}`} className="circuit" role="img" aria-label="Grover circuit">
        {Array.from({ length: qubits }, (_, i) => (
          <g key={i}>
            <line x1={left} x2={endX + 30} y1={y(i)} y2={y(i)} className="c-wire" />
            <text x={left - 8} y={y(i) + 4} textAnchor="end" className="c-small">q{i}</text>
          </g>
        ))}
        {hGates(colX[0])}
        <rect x={colX[1] - 38} y={top - 22} width={colX[4] - colX[1] + 76} height={wireBottom - top + gap + 16} rx={6} className="c-repeat" />
        <text x={colX[1] - 32} y={top - 8} className="c-small">repeat × {iterations}</text>
        {box(colX[1], 52, 'Oracle', 'c-oracle')}
        {hGates(colX[2])}
        {box(colX[3], 62, 'Diffuser', 'c-diff')}
        {hGates(colX[4])}
        {Array.from({ length: qubits }, (_, i) => (
          <g key={`m${i}`}>
            <rect x={endX - 9} y={y(i) - gap / 2 + 3} width={18} height={gap - 6} rx={2} className="c-meas" />
            {gap >= 20 && <text x={endX} y={y(i) + 4} textAnchor="middle" className="c-small">M</text>}
          </g>
        ))}
      </svg>
    </div>
  )
}

/** Bars of measurement counts; marked (valid, shorter) routes are highlighted. */
export function Histogram({ bars, shots }: { bars: Bar[]; shots: number }) {
  const max = Math.max(1, ...bars.map((b) => b.count))
  return (
    <div className="hist">
      {bars.map((b) => (
        <div className="hist-row" key={b.bits}>
          <code className="hist-bits">{b.bits}</code>
          <div className="hist-track">
            <div className={`hist-bar ${b.marked ? 'marked' : 'other'}`} style={{ width: `${(b.count / max) * 100}%` }} />
          </div>
          <span className="hist-n">
            {b.count} <small>({((b.count / shots) * 100).toFixed(1)}%)</small>
          </span>
          <span className="hist-len">{b.length != null ? `${b.length} steps` : ''}</span>
        </div>
      ))}
    </div>
  )
}

/** Theoretical P(marked) after k Grover iterations, with the chosen k highlighted. */
export function ProbCurve({ curve, chosen, measured }: { curve: number[]; chosen: number; measured: number }) {
  const w = 420
  const h = 150
  const pad = { l: 36, r: 12, t: 12, b: 28 }
  const n = curve.length
  const px = (k: number) => pad.l + (n === 1 ? 0 : (k / (n - 1)) * (w - pad.l - pad.r))
  const py = (p: number) => pad.t + (1 - p) * (h - pad.t - pad.b)
  const d = curve.map((p, k) => `${k === 0 ? 'M' : 'L'}${px(k).toFixed(1)},${py(p).toFixed(1)}`).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="curve" role="img" aria-label="Success probability by iteration">
      {[0, 0.5, 1].map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={w - pad.r} y1={py(t)} y2={py(t)} className="c-grid" />
          <text x={pad.l - 6} y={py(t) + 4} textAnchor="end" className="c-small">{t}</text>
        </g>
      ))}
      <path d={d} className="curve-line" />
      {curve.map((p, k) => (
        <circle key={k} cx={px(k)} cy={py(p)} r={k === chosen ? 5 : 2.5} className={k === chosen ? 'curve-dot chosen' : 'curve-dot'} />
      ))}
      <circle cx={px(chosen)} cy={py(measured)} r={4} className="curve-measured" />
      {curve.map((_, k) => (k % Math.max(1, Math.ceil(n / 12)) === 0 ? (
        <text key={k} x={px(k)} y={h - 10} textAnchor="middle" className="c-small">{k}</text>
      ) : null))}
      <text x={(w + pad.l) / 2} y={h - 0} textAnchor="middle" className="c-small">Grover iterations</text>
    </svg>
  )
}
