import numpy as np

from app.domain.generator import generate_maze
from app.services import grover_solver
from app.services.engines import NumpyEngine, QiskitEngine


def test_numpy_engine_amplifies_marked_state():
    marked = np.array([5])
    counts = NumpyEngine().run(4, marked, iterations=3, shots=1000)
    assert counts.get("0101", 0) > 900


def test_engines_agree_on_peak():
    marked = np.array([3, 9])
    q = QiskitEngine().run(4, marked, iterations=2, shots=1000)
    n = NumpyEngine().run(4, marked, iterations=2, shots=1000)
    top = lambda c: {k for k, _ in sorted(c.items(), key=lambda kv: -kv[1])[:2]}
    assert top(q) == top(n) == {"0011", "1001"}


def test_numpy_solver_finds_shortest_route():
    maze = generate_maze(10, 8, seed=3, max_qubits=10)
    result = grover_solver.solve(maze, engine=NumpyEngine())
    assert result["verified"]
    assert result["engine"] == "numpy"
