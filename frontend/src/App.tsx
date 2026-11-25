import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { CircuitView, Histogram, ProbCurve, type Bar } from './Charts'

type Pt = [number, number]

interface MazeData {
  width: number
  height: number
  seed: number
  grid: number[][]
  start: Pt
  goal: Pt
  qubits: number
  decision_nodes: number
}

interface Round {
  round: number
  threshold: number | null
  marked: number
  iterations: number
  theory_p?: number
  p_marked: number
  found_length: number | null
  time_ms?: number
  shots?: number
  distinct_outcomes?: number
  top?: Bar[]
  curve?: number[]
}

interface Solution {
  qubits: number
  search_space: number
  valid_routes: number
  rounds: Round[]
  length: number
  bitstring: string
  path: Pt[]
  verified: boolean
  classical_length: number
  elapsed_ms?: number
}

const SIZES = [
  { label: 'Small 8 × 6', w: 8, h: 6, q: 8 },
  { label: 'Medium 12 × 8', w: 12, h: 8, q: 10 },
  { label: 'Large 16 × 10', w: 16, h: 10, q: 12 },
  { label: 'Extra large 20 × 13', w: 20, h: 13, q: 14 },
  { label: 'Huge 24 × 16', w: 24, h: 16, q: 14, minQ: 14 },
  { label: 'Giant 30 × 20 (slow)', w: 30, h: 20, q: 16, minQ: 16 },
]

const QUBIT_CAPS = [8, 10, 12, 14, 16]

const fmtTime = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${Math.round(ms)} ms`)

const key = (p: Pt) => `${p[0]},${p[1]}`
const randomSeed = () => Math.floor(Math.random() * 100000)

// Empty in dev (Vite proxies /api). In production set VITE_API_URL to the backend URL.
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function api<T>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Request failed (${res.status})`)
  }
  return res.json()
}

/** Shortest walk between two open units that avoids `blocked`. */
function bfs(grid: number[][], from: Pt, to: Pt, blocked: Set<string>): Pt[] | null {
  const prev = new Map<string, Pt | null>([[key(from), null]])
  const queue: Pt[] = [from]
  while (queue.length) {
    const cur = queue.shift()!
    if (cur[0] === to[0] && cur[1] === to[1]) {
      const out: Pt[] = []
      for (let p: Pt | null = cur; p; p = prev.get(key(p)) ?? null) out.push(p)
      return out.reverse()
    }
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nxt: Pt = [cur[0] + dr, cur[1] + dc]
      const k = key(nxt)
      if (grid[nxt[0]]?.[nxt[1]] !== 0 || prev.has(k) || blocked.has(k)) continue
      prev.set(k, cur)
      queue.push(nxt)
    }
  }
  return null
}

export default function App() {
  const [sizeIdx, setSizeIdx] = useState(1)
  const [maxQubits, setMaxQubits] = useState(SIZES[1].q)
  const [seed, setSeed] = useState(randomSeed)
  const [maze, setMaze] = useState<MazeData | null>(null)
  const [path, setPath] = useState<Pt[]>([])
  const [solution, setSolution] = useState<Solution | null>(null)
  const [showGrover, setShowGrover] = useState(false)
  const [roundIdx, setRoundIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [verdict, setVerdict] = useState<{ ok: boolean; text: string } | null>(null)

  const size = SIZES[sizeIdx]

  useEffect(() => {
    let cancelled = false
    api<MazeData>(`/api/maze?width=${size.w}&height=${size.h}&seed=${seed}&max_qubits=${maxQubits}`)
      .then((m) => {
        if (cancelled) return
        setMaze(m)
        setPath([m.start])
        setSolution(null)
        setShowGrover(false)
        setVerdict(null)
        setError('')
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [size.w, size.h, seed, maxQubits])

  const userSet = useMemo(() => new Set(path.map(key)), [path])
  const groverSet = useMemo(
    () => new Set(showGrover && solution ? solution.path.map(key) : []),
    [showGrover, solution],
  )

  const onCellClick = (r: number, c: number) => {
    if (!maze || maze.grid[r]?.[c] !== 0) return
    setVerdict(null)
    const idx = path.findIndex((p) => p[0] === r && p[1] === c)
    if (idx >= 0) {
      setPath(path.slice(0, idx + 1)) // clicking your own trail undoes back to it
      return
    }
    const head = path[path.length - 1]
    if (head[0] === maze.goal[0] && head[1] === maze.goal[1]) return // already at the exit
    const seg = bfs(maze.grid, head, [r, c], userSet)
    if (!seg) return
    // No auto-routing: only allow a single step from the end of the path.
    if (seg.length > 3) return
    setPath([...path, ...seg.slice(1)])
  }

  // Arrow keys move the end of the path one cell; moving back onto the trail undoes a step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key]
      if (!d || !maze || busy || path.length === 0) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      const head = path[path.length - 1]
      onCellClick(head[0] + d[0], head[1] + d[1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const runGrover = useCallback(async (): Promise<Solution | null> => {
    if (!maze) return null
    if (solution) return solution
    setBusy(true)
    setError('')
    try {
      const s = await api<Solution>(
        `/api/solve?width=${maze.width}&height=${maze.height}&seed=${maze.seed}&max_qubits=${maxQubits}`,
      )
      setSolution(s)
      setRoundIdx(Math.max(0, s.rounds.length - 1)) // show the final round by default
      return s
    } catch (e) {
      setError((e as Error).message)
      return null
    } finally {
      setBusy(false)
    }
  }, [maze, maxQubits, solution])

  const onSolve = async () => {
    const s = await runGrover()
    if (s) setShowGrover(true)
  }

  const onCheck = async () => {
    if (!maze) return
    const head = path[path.length - 1]
    const reached = head[0] === maze.goal[0] && head[1] === maze.goal[1]
    if (!reached) {
      setVerdict({ ok: false, text: 'Your path has not reached the green exit yet.' })
      return
    }
    const s = await runGrover()
    if (!s) return
    const steps = (path.length - 1) / 2
    const diff = steps - s.length
    setShowGrover(true)
    setVerdict(
      diff === 0
        ? { ok: true, text: `Perfect! Your route (${steps} steps) matches the Grover shortest route.` }
        : { ok: false, text: `Valid route, but ${steps} steps. Grover found ${s.length} steps (${diff} fewer).` },
    )
  }

  const reset = () => {
    if (!maze) return
    setPath([maze.start])
    setVerdict(null)
    setShowGrover(false)
  }

  const cellClass = (r: number, c: number) => {
    if (!maze) return 'u'
    const k = `${r},${c}`
    if (maze.grid[r][c] === 1) return 'u wall'
    if (r === maze.start[0] && c === maze.start[1]) return 'u start'
    if (r === maze.goal[0] && c === maze.goal[1]) return 'u goal'
    return `u${userSet.has(k) ? ' user' : ''}${groverSet.has(k) ? ' grover' : ''}`
  }

  return (
    <>
      <h1>Quantum Maze Solver</h1>
      <p className="sub">Draw your own route by clicking, then check it against the shortest route found with Grover search.</p>

      <div className="layout">
      <main className="main">
      {maze && (
        <>
          <div
            className="maze"
            style={{ gridTemplateColumns: `repeat(${maze.grid[0].length}, 1fr)`, maxWidth: `${maze.grid[0].length * 28}px` }}
          >
            {maze.grid.map((row, r) =>
              row.map((_, c) => (
                <div key={`${r}-${c}`} className={cellClass(r, c)} onClick={() => onCellClick(r, c)} />
              )),
            )}
          </div>
          <div className="legend">
            <span><i style={{ background: 'var(--start)' }} />Start</span>
            <span><i style={{ background: 'var(--goal)' }} />Exit</span>
            <span><i style={{ background: 'var(--user)' }} />Your path</span>
            <span><i style={{ background: 'var(--grover)' }} />Grover path</span>
          </div>
          <p className="hint">Use the arrow keys, or click the next open cell beside the end of your path, to extend it one step at a time. Click a cell on your path to undo back to it.</p>
        </>
      )}
      {!maze && !error && <p className="hint">Generating maze…</p>}

      {solution && maze && (
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
      )}

      {solution && maze && (() => {
        const rd = solution.rounds[Math.min(roundIdx, solution.rounds.length - 1)]
        if (!rd) return null
        return (
          <div className="panel">
            <h2>Quantum circuit &amp; measurements</h2>
            <div className="controls" style={{ justifyContent: 'flex-start' }}>
              <label>
                Round
                <select value={roundIdx} onChange={(e) => setRoundIdx(Number(e.target.value))}>
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
      })()}
      </main>

      <aside className="sidebar">
      <div className="panel side-panel">
        <h2>Settings</h2>
        <div className="controls">
        <label>
          Maze size
          <select
            value={sizeIdx}
            onChange={(e) => {
              const i = Number(e.target.value)
              setSizeIdx(i)
              setMaxQubits(SIZES[i].q)
            }}
          >
            {SIZES.map((s, i) => (
              <option key={s.label} value={i}>{s.label}</option>
            ))}
          </select>
        </label>
        <label>
          Qubit limit
          <select value={maxQubits} onChange={(e) => setMaxQubits(Number(e.target.value))}>
            {QUBIT_CAPS.filter((q) => q >= (('minQ' in size && size.minQ) || 0)).map((q) => (
              <option key={q} value={q}>{q}{q > 14 ? ' (slow)' : ''}</option>
            ))}
          </select>
        </label>
        <button onClick={() => setSeed(randomSeed())} disabled={busy}>Regenerate maze</button>
        </div>
      </div>

      <div className="panel side-panel">
        <h2>Actions</h2>
        <div className="actions">
          <button className="primary" onClick={onCheck} disabled={!maze || busy}>
            {busy ? 'Running Grover…' : 'Check my path'}
          </button>
          <button onClick={onSolve} disabled={!maze || busy}>Solve with Grover</button>
          <button onClick={reset} disabled={!maze || busy}>Reset path</button>
        </div>
        <div className={`status ${verdict ? (verdict.ok ? 'ok' : 'bad') : error ? 'bad' : ''}`}>
          {error || verdict?.text}
        </div>
      </div>
      </aside>
      </div>
    </>
  )
}
