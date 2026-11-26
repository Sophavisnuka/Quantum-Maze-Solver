interface Props {
  stepsTaken: number
  stepsBack: number
  shortest: number | null // Grover's shortest route, once solved
}

export default function StepsPanel({ stepsTaken, stepsBack, shortest }: Props) {
  return (
    <div className="panel side-panel">
      <h2>Steps</h2>
      <dl className="steps">
        <div>
          <dt>Steps taken</dt>
          <dd className="big">{stepsTaken}</dd>
        </div>
        <div>
          <dt>Steps backward</dt>
          <dd>{stepsBack}</dd>
        </div>
        {shortest !== null && (
          <div>
            <dt>Grover shortest</dt>
            <dd>{shortest}</dd>
          </div>
        )}
      </dl>
    </div>
  )
}
