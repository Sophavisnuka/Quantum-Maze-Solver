import type { MazeData, Pt } from '../types'

export const key = (p: Pt) => `${p[0]},${p[1]}`

export const randomSeed = () => Math.floor(Math.random() * 100000)

export const samePoint = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1]

/** Directions in the same order as the backend bits: N=1, E=2, S=4, W=8. */
export const DIRS: Pt[] = [[-1, 0], [0, 1], [1, 0], [0, -1]]

export const hasOpening = (maze: MazeData, [r, c]: Pt, dir: number) => ((maze.cells[r]?.[c] ?? 0) & (1 << dir)) !== 0

/** The neighbouring cell in direction `dir`, or null when a wall is in the way. */
export function neighbour(maze: MazeData, from: Pt, dir: number): Pt | null {
  if (!hasOpening(maze, from, dir)) return null
  return [from[0] + DIRS[dir][0], from[1] + DIRS[dir][1]]
}
