import type { Bar } from './components/Charts'

export type Pt = [number, number]

export interface MazeData {
  width: number
  height: number
  seed: number
  grid: number[][]
  start: Pt
  goal: Pt
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
