import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMaze, fetchSolution } from '../api/maze'
import { DEFAULT_SIZE_INDEX, SIZES } from '../config'
import type { MazeData, Pt, Solution, Verdict } from '../types'
import { bfs, key, randomSeed, samePoint } from '../utils/maze'

const ARROWS: Record<string, Pt> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
}

export function useMazeGame() {
  const [sizeIdx, setSizeIdx] = useState(DEFAULT_SIZE_INDEX)
  const [maxQubits, setMaxQubits] = useState(SIZES[DEFAULT_SIZE_INDEX].q)
  const [seed, setSeed] = useState(randomSeed)
  const [maze, setMaze] = useState<MazeData | null>(null)
  const [path, setPath] = useState<Pt[]>([])
  const [solution, setSolution] = useState<Solution | null>(null)
  const [showGrover, setShowGrover] = useState(false)
  const [roundIdx, setRoundIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [verdict, setVerdict] = useState<Verdict | null>(null)

  const size = SIZES[sizeIdx]

  // Load a new maze whenever the size, seed or qubit limit changes.
  useEffect(() => {
    let cancelled = false
    fetchMaze({ width: size.w, height: size.h, seed, maxQubits })
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
    if (samePoint(head, maze.goal)) return // already at the exit
    const seg = bfs(maze.grid, head, [r, c], userSet)
    if (!seg) return
    // No auto-routing: only allow a single step from the end of the path.
    if (seg.length > 3) return
    setPath([...path, ...seg.slice(1)])
  }

  // Arrow keys move the end of the path one cell; moving back onto the trail undoes a step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = ARROWS[e.key]
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
      const s = await fetchSolution({ width: maze.width, height: maze.height, seed: maze.seed, maxQubits })
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

  const solve = async () => {
    const s = await runGrover()
    if (s) setShowGrover(true)
  }

  const checkPath = async () => {
    if (!maze) return
    const head = path[path.length - 1]
    if (!samePoint(head, maze.goal)) {
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

  const resetPath = () => {
    if (!maze) return
    setPath([maze.start])
    setVerdict(null)
    setShowGrover(false)
  }

  const changeSize = (i: number) => {
    setSizeIdx(i)
    setMaxQubits(SIZES[i].q)
  }

  const regenerate = () => setSeed(randomSeed())

  return {
    // state
    size, sizeIdx, maxQubits, maze, solution, roundIdx, busy, error, verdict, userSet, groverSet,
    // actions
    onCellClick, solve, checkPath, resetPath, changeSize, setMaxQubits, setRoundIdx, regenerate,
  }
}
