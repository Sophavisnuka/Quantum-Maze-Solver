import { useMemo } from 'react'
import type { MazeData, Pt } from '../types'
import { hasOpening } from '../utils/maze'

interface Props {
  maze: MazeData
  userPath: Pt[]
  groverPath: Pt[]
  loading: boolean
  onCellClick: (r: number, c: number) => void
}

// The maze is drawn on a (2H+1) x (2W+1) grid of squares: cell (r, c) is the square at
// (2r+1, 2c+1), the square between two cells is their doorway, everything else is wall.
// Game logic only ever sees cells; this is purely how it is drawn.
const unitOf = ([r, c]: Pt): Pt => [2 * r + 1, 2 * c + 1]

/** Squares covered by a walk: every cell plus the doorway between consecutive cells. */
function unitsOf(path: Pt[]): Set<string> {
  const out = new Set<string>()
  path.forEach((p, i) => {
    const [y, x] = unitOf(p)
    out.add(`${y},${x}`)
    if (i > 0) out.add(`${p[0] + path[i - 1][0] + 1},${p[1] + path[i - 1][1] + 1}`)
  })
  return out
}

function squareKind(maze: MazeData, y: number, x: number): 'cell' | 'door' | 'wall' {
  const oddY = y % 2 === 1
  const oddX = x % 2 === 1
  if (oddY && oddX) return 'cell'
  if (oddY && !oddX) {
    // doorway between (r, x/2 - 1) and (r, x/2)
    const left = x / 2 - 1
    return left >= 0 && left < maze.width - 1 && hasOpening(maze, [(y - 1) / 2, left], 1) ? 'door' : 'wall'
  }
  if (!oddY && oddX) {
    const above = y / 2 - 1
    return above >= 0 && above < maze.height - 1 && hasOpening(maze, [above, (x - 1) / 2], 2) ? 'door' : 'wall'
  }
  return 'wall'
}

export default function MazeGrid({ maze, userPath, groverPath, loading, onCellClick }: Props) {
  const rows = 2 * maze.height + 1
  const cols = 2 * maze.width + 1
  const userUnits = useMemo(() => unitsOf(userPath), [userPath])
  const groverUnits = useMemo(() => unitsOf(groverPath), [groverPath])
  const [startY, startX] = unitOf(maze.start)
  const [goalY, goalX] = unitOf(maze.goal)

  const squares = []
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const kind = squareKind(maze, y, x)
      let cls = 'u'
      if (kind === 'wall') cls += ' wall'
      else if (y === startY && x === startX) cls += ' start'
      else if (y === goalY && x === goalX) cls += ' goal'
      else {
        const k = `${y},${x}`
        if (userUnits.has(k)) cls += ' user'
        if (groverUnits.has(k)) cls += ' grover'
      }
      squares.push(
        <div
          key={`${y}-${x}`}
          className={cls}
          onClick={kind === 'cell' ? () => onCellClick((y - 1) / 2, (x - 1) / 2) : undefined}
        />,
      )
    }
  }

  return (
    <>
      <div className="maze-wrap" style={{ maxWidth: `${cols * 28}px` }} aria-busy={loading}>
        <div className={`maze${loading ? ' loading' : ''}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {squares}
        </div>
        {loading && (
          <div className="maze-loading" role="status">
            <span className="spinner" />
            Generating maze…
          </div>
        )}
      </div>
      <div className="legend">
        <span><i style={{ background: 'var(--start)' }} />Start</span>
        <span><i style={{ background: 'var(--goal)' }} />Exit</span>
        <span><i style={{ background: 'var(--user)' }} />Your path</span>
        <span><i style={{ background: 'var(--grover)' }} />Grover path</span>
      </div>
      <p className="hint">Use the arrow keys, or click a neighbouring room, to move one step. Moving back to the room you came from undoes that step; click any room on your path to undo back to it.</p>
    </>
  )
}
