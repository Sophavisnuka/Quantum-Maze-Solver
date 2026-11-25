import type { Pt } from '../types'

export const key = (p: Pt) => `${p[0]},${p[1]}`

export const randomSeed = () => Math.floor(Math.random() * 100000)

export const samePoint = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1]

/** Shortest walk between two open units that avoids `blocked`. */
export function bfs(grid: number[][], from: Pt, to: Pt, blocked: Set<string>): Pt[] | null {
  const prev = new Map<string, Pt | null>([[key(from), null]])
  const queue: Pt[] = [from]
  while (queue.length) {
    const cur = queue.shift()!
    if (samePoint(cur, to)) {
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
