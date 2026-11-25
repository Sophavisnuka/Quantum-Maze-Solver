"""Domain errors. The API layer maps all of them to HTTP 422."""


class QuantumMazeError(ValueError):
    """Base class for errors caused by the requested maze / solve parameters."""


class MazeGenerationError(QuantumMazeError):
    """No maze could be generated within the qubit limit."""


class TooManyQubitsError(QuantumMazeError):
    """The maze needs more qubits than the solver allows."""


class NoRouteError(QuantumMazeError):
    """Grover search found no route from start to goal."""
