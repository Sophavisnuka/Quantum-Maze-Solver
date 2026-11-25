import type { MazeData, Solution } from '../types'
import { apiGet } from './client'

interface MazeParams {
  width: number
  height: number
  seed: number
  maxQubits: number
}

const query = ({ width, height, seed, maxQubits }: MazeParams) =>
  `width=${width}&height=${height}&seed=${seed}&max_qubits=${maxQubits}`

export const fetchMaze = (p: MazeParams) => apiGet<MazeData>(`/api/maze?${query(p)}`)

export const fetchSolution = (p: MazeParams) => apiGet<Solution>(`/api/solve?${query(p)}`)
