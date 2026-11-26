import './App.css'
import ActionsPanel from './components/ActionsPanel'
import CircuitPanel from './components/CircuitPanel'
import MazeGrid from './components/MazeGrid'
import SettingsPanel from './components/SettingsPanel'
import SolutionPanel from './components/SolutionPanel'
import StepsPanel from './components/StepsPanel'
import { useMazeGame } from './hooks/useMazeGame'

export default function App() {
  const game = useMazeGame()
  const { maze, solution } = game

  return (
    <>
      <h1>Quantum Maze Solver</h1>
      <p className="sub">Draw your own route by clicking, then check it against the shortest route found with Grover search.</p>

      <div className="layout">
        <main className="main">
          {maze && (
            <MazeGrid
              maze={maze}
              userPath={game.path}
              groverPath={game.groverPath}
              loading={game.loadingMaze}
              onCellClick={game.onCellClick}
            />
          )}
          {!maze && !game.error && (
            <p className="hint loading-first"><span className="spinner" />Generating maze…</p>
          )}

          {solution && maze && <SolutionPanel solution={solution} maze={maze} />}
          {solution && maze && (
            <CircuitPanel solution={solution} roundIdx={game.roundIdx} onRoundChange={game.setRoundIdx} />
          )}
        </main>

        <aside className="sidebar">
          <SettingsPanel
            size={game.size}
            sizeIdx={game.sizeIdx}
            maxQubits={game.maxQubits}
            busy={game.busy}
            loading={game.loadingMaze}
            onSizeChange={game.changeSize}
            onQubitsChange={game.setMaxQubits}
            onRegenerate={game.regenerate}
          />
          <StepsPanel
            stepsTaken={game.stepsTaken}
            stepsBack={game.stepsBack}
            shortest={solution ? solution.length : null}
          />
          <ActionsPanel
            ready={!!maze && !game.loadingMaze}
            busy={game.busy}
            error={game.error}
            verdict={game.verdict}
            onCheck={game.checkPath}
            onSolve={game.solve}
            onReset={game.resetPath}
          />
        </aside>
      </div>
    </>
  )
}
