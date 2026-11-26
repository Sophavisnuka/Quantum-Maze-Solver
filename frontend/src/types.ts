import type { Bar } from './components/Charts'

export type Pt = [number, number]

export interface MazeData {
  width: number
  height: number
  seed: number
  /** cells[r][c]: open sides as bits N=1, E=2, S=4, W=8 (a missing bit is a wall). */
  cells: number[][]
  start: Pt // [row, col]
  goal: Pt // [row, col]
  qubits: number
  decision_nodes: number
}

export interface Round {
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

export interface Solution {
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

export interface Verdict {
  ok: boolean
  text: string
}
