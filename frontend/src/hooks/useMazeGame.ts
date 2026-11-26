import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchMaze, fetchSolution } from '../api/maze'
import { DEFAULT_SIZE_INDEX, SIZES } from '../config'
import type { MazeData, Pt, Solution, Verdict } from '../types'
import { DIRS, key, neighbour, randomSeed, samePoint } from '../utils/maze'

// Arrow key -> index into DIRS (N, E, S, W)
const ARROWS: Record<string, number> = {
  ArrowUp: 0,
  ArrowRight: 1,
  ArrowDown: 2,
  ArrowLeft: 3,
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
  // One step = one cell moved. Both counters only go up until reset/new maze.
  const [stepsTaken, setStepsTaken] = useState(0) // every move, forward or back
  const [stepsBack, setStepsBack] = useState(0) // the moves that went back along your trail
  // Which request the current maze answers; differs from `requestKey` while a new one loads.
  const [loadedKey, setLoadedKey] = useState('')

  const size = SIZES[sizeIdx]
  const requestKey = `${size.w}x${size.h}:${seed}:${maxQubits}`
  const loadingMaze = loadedKey !== requestKey

  // Load a new maze whenever the size, seed or qubit limit changes.
  useEffect(() => {
    let cancelled = false
    fetchMaze({ width: size.w, height: size.h, seed, maxQubits })
      .then((m) => {
        if (cancelled) return
        setMaze(m)
        setPath([m.start])
        setStepsTaken(0)
        setStepsBack(0)
        setSolution(null)
        setShowGrover(false)
        setVerdict(null)
        setError('')
        setLoadedKey(requestKey)
      })
      .catch((e: Error) => {
        if (cancelled) return
        setError(e.message)
        setLoadedKey(requestKey) // stop the spinner; the error is shown instead
      })
    return () => {
      cancelled = true
    }
  }, [size.w, size.h, seed, maxQubits, requestKey])

  const userSet = useMemo(() => new Set(path.map(key)), [path])
  const groverPath = useMemo<Pt[]>(
    () => (showGrover && solution ? solution.path : []),
    [showGrover, solution],
  )

  // Step forward onto an untouched neighbouring cell.
  const stepForward = (to: Pt) => {
    setStepsTaken((n) => n + 1)
    setPath([...path, to])
  }

  // Walk back along the trail to path[idx]. Each cell undone is still a step taken.
  const stepBackTo = (idx: number) => {
    const back = path.length - 1 - idx
    if (back <= 0) return
    setStepsTaken((n) => n + back)
    setStepsBack((n) => n + back)
    setPath(path.slice(0, idx + 1))
  }

  // Arrow key: move one cell through an opening. Only the cell you just came from can be
  // undone this way; any other cell on your trail is off limits even if it sits right next to you.
  const move = (dir: number) => {
    if (!maze || loadingMaze || path.length === 0) return
    const head = path[path.length - 1]
    const to = neighbour(maze, head, dir)
    if (!to) return // wall
    setVerdict(null)
    const prev = path[path.length - 2]
    if (prev && samePoint(prev, to)) {
      stepBackTo(path.length - 2)
    } else if (!userSet.has(key(to)) && !samePoint(head, maze.goal)) {
      stepForward(to)
    }
  }

  // Click: next to the head through an opening = one step forward; a cell on your trail = undo back to it.
  const onCellClick = (r: number, c: number) => {
    if (!maze || loadingMaze) return
    const idx = path.findIndex((p) => p[0] === r && p[1] === c)
    if (idx >= 0) {
      setVerdict(null)
      stepBackTo(idx)
      return
    }
    const head = path[path.length - 1]
    const dir = DIRS.findIndex((d) => head[0] + d[0] === r && head[1] + d[1] === c)
    if (dir >= 0) move(dir)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const dir = ARROWS[e.key]
      if (dir === undefined || busy) return
      const tag = (e.target as HTMLElement | null)?.tagName
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      move(dir)
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
    const route = path.length - 1 // length of the route you ended with
    const extra = route - s.length
    const wasted = stepsTaken - s.length // every move you made beyond Grover's shortest
    setShowGrover(true)
    if (extra > 0) {
      setVerdict({ ok: false, text: `Valid route, but ${route} steps. Grover found ${s.length} steps (${extra} fewer).` })
    } else if (wasted > 0) {
      // Your final route is the shortest one, but moving backward cost extra steps along the way.
      setVerdict({
        ok: true,
        text: `You found the shortest route (${s.length} steps), but it took you ${stepsTaken} steps because you moved backward ${stepsBack} time${stepsBack === 1 ? '' : 's'}. Grover needs only ${s.length}.`,
      })
    } else {
      setVerdict({ ok: true, text: `Perfect! You found the shortest route in ${s.length} steps, same as Grover.` })
    }
  }

  const resetPath = () => {
    if (!maze) return
    setPath([maze.start])
    setStepsTaken(0)
    setStepsBack(0)
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
    size, sizeIdx, maxQubits, maze, solution, roundIdx, busy, loadingMaze, error, verdict, path, groverPath,
    stepsTaken,
    stepsBack,
    // actions
    onCellClick, solve, checkPath, resetPath, changeSize, setMaxQubits, setRoundIdx, regenerate,
  }
}
