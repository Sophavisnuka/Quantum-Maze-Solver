import type { MazeData } from '../types'
import { samePoint } from '../utils/maze'

interface Props {
  maze: MazeData
  userSet: Set<string>
  groverSet: Set<string>
  onCellClick: (r: number, c: number) => void
}

function cellClass(maze: MazeData, r: number, c: number, userSet: Set<string>, groverSet: Set<string>) {
  const k = `${r},${c}`
  if (maze.grid[r][c] === 1) return 'u wall'
  if (samePoint([r, c], maze.start)) return 'u start'
  if (samePoint([r, c], maze.goal)) return 'u goal'
  return `u${userSet.has(k) ? ' user' : ''}${groverSet.has(k) ? ' grover' : ''}`
}

export default function MazeGrid({ maze, userSet, groverSet, onCellClick }: Props) {
  const cols = maze.grid[0].length
  return (
    <>
      <div
        className="maze"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, maxWidth: `${cols * 28}px` }}
      >
        {maze.grid.map((row, r) =>
          row.map((_, c) => (
            <div key={`${r}-${c}`} className={cellClass(maze, r, c, userSet, groverSet)} onClick={() => onCellClick(r, c)} />
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
  )
}
