"""Grover-based shortest route search (Durr-Hoyer style threshold descent).

Encoding
--------
A candidate is a bitstring of K bits (K qubits). Bit i is the choice taken at
the i-th decision node of the walk (0 = first exit, 1 = second exit; the exit
we came from is never offered). Once the goal is reached the remaining bits
must be 0, so every route has exactly one encoding.

Search
------
Round 1 marks every bitstring that reaches the goal. Grover amplifies them and
we measure one route of length T. Round 2 marks only routes shorter than T, and
so on. When nothing shorter exists the last route found is the shortest.

The oracle is built classically from the maze (that is how Grover demos work:
the circuit is a phase flip on the marked states), so this shows the algorithm
faithfully but gives no real-world speed-up.
"""

from __future__ import annotations

import logging
import math
import time

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import DiagonalGate
from qiskit_aer import AerSimulator

from .maze import Maze

# uvicorn configures this logger, so INFO lines show in the server console
log = logging.getLogger("uvicorn.error")

INF = 1 << 30
MAX_QUBITS = 20
TOP_BARS = 12  # histogram bars returned per round


def _walk_lengths(maze: Maze, k: int) -> np.ndarray:
    """lengths[idx] = route length in cell moves for bitstring idx, or INF if invalid."""
    n = 1 << k
    lengths = np.full(n, INF, dtype=np.int64)
    exits = maze.exits
    goal = maze.goal_node
    for idx in range(n):
        node, came, total, ok = maze.start_node, -1, 0, True
        for i in range(k):
            if node == goal:
                if idx >> i:  # padding bits after the goal must be zero
                    ok = False
                break
            options = [e for e in exits[node] if e.edge_id != came]
            bit = (idx >> i) & 1
            if bit >= len(options):
                ok = False
                break
            ex = options[bit]
            total += ex.length
            came = ex.edge_id
            node = ex.to
        if ok and node == goal:
            lengths[idx] = total
    return lengths


def _decode(maze: Maze, idx: int, k: int) -> list[tuple[int, int]]:
    """Turn a bitstring into the list of cells visited (including the start)."""
    node, came = maze.start_node, -1
    cells = [maze.start]
    for i in range(k):
        if node == maze.goal_node:
            break
        options = [e for e in maze.exits[node] if e.edge_id != came]
        ex = options[(idx >> i) & 1]
        cells.extend(ex.cells)
        came = ex.edge_id
        node = ex.to
    return cells


def _grover_counts(n: int, marked: np.ndarray, iterations: int, backend, shots: int) -> dict[str, int]:
    size = 1 << n
    oracle_diag = np.ones(size)
    oracle_diag[marked] = -1
    diffuser_diag = -np.ones(size)  # 2|0><0| - I (up to global phase)
    diffuser_diag[0] = 1
    oracle = DiagonalGate(oracle_diag.tolist())
    diffuser = DiagonalGate(diffuser_diag.tolist())

    t0 = time.perf_counter()
    qc = QuantumCircuit(n)
    qc.h(range(n))
    for _ in range(iterations):
        qc.append(oracle, range(n))
        qc.h(range(n))
        qc.append(diffuser, range(n))
        qc.h(range(n))
    qc.measure_all()
    t1 = time.perf_counter()
    compiled = transpile(qc, backend)
    t2 = time.perf_counter()
    result = backend.run(compiled, shots=shots).result()
    t3 = time.perf_counter()
    log.info(
        "[grover]   circuit build %.0f ms | transpile %.0f ms | simulate %.0f ms (%d qubits, %d iterations, %d shots)",
        (t1 - t0) * 1000, (t2 - t1) * 1000, (t3 - t2) * 1000, n, iterations, shots,
    )
    return result.get_counts()


def solve(maze: Maze, shots: int = 1024) -> dict:
    k = maze.qubits_needed()
    if k > MAX_QUBITS:
        raise ValueError(f"This maze needs {k} qubits; the limit is {MAX_QUBITS}.")
    k = max(k, 1)
    n = k
    size = 1 << n
    t_start = time.perf_counter()
    log.info("[grover] start: %d qubits, search space %d", n, size)
    lengths = _walk_lengths(maze, n)
    log.info("[grover] classical walk table built in %.0f ms", (time.perf_counter() - t_start) * 1000)
    backend = AerSimulator(method="statevector")

    threshold = INF
    best_idx: int | None = None
    rounds = []
    for round_no in range(1, 50):
        marked = np.flatnonzero(lengths < threshold)
        m = len(marked)
        if m == 0:
            break
        theta = math.asin(math.sqrt(m / size))
        iterations = max(0, int(round(math.pi / (4 * theta) - 0.5)))
        t_round = time.perf_counter()
        counts = _grover_counts(n, marked, iterations, backend, shots)
        round_ms = (time.perf_counter() - t_round) * 1000
        log.info("[grover] round %d: %d marked, %d iterations, took %.0f ms",
                 round_no, m, iterations, round_ms)

        marked_set = set(marked.tolist())
        hits = {int(b, 2): c for b, c in counts.items() if int(b, 2) in marked_set}
        p_marked = sum(hits.values()) / shots
        if not hits:  # extremely unlikely, retry round
            rounds.append({"round": round_no, "threshold": None if threshold == INF else threshold,
                           "marked": m, "iterations": iterations, "p_marked": p_marked,
                           "found_length": None, "time_ms": round_ms})
            continue
        idx = max(hits, key=lambda i: (hits[i], -int(lengths[i])))
        best_idx = idx
        threshold = int(lengths[idx])
        top = sorted(counts.items(), key=lambda kv: -kv[1])[:TOP_BARS]
        # theory curve: P(marked) after k = 0 .. 2*iterations+1 Grover iterations
        curve = [math.sin((2 * k + 1) * theta) ** 2 for k in range(2 * iterations + 2)]
        rounds.append({
            "round": round_no,
            "threshold": None if round_no == 1 else rounds[-1]["found_length"],
            "marked": m,
            "iterations": iterations,
            "time_ms": round_ms,
            "theory_p": math.sin((2 * iterations + 1) * theta) ** 2,
            "p_marked": p_marked,
            "found_length": threshold,
            "shots": shots,
            "distinct_outcomes": len(counts),
            "top": [{"bits": b, "count": c, "marked": int(b, 2) in marked_set,
                     "length": int(lengths[int(b, 2)]) if int(b, 2) in marked_set else None}
                    for b, c in top],
            "curve": curve,
        })

    if best_idx is None:
        raise ValueError("No route from start to goal.")

    cells = _decode(maze, best_idx, n)
    classical_len, _ = maze.dijkstra()
    elapsed_ms = (time.perf_counter() - t_start) * 1000
    log.info("[grover] done: %d rounds, shortest %d steps, total %.0f ms",
             len(rounds), int(lengths[best_idx]), elapsed_ms)
    return {
        "qubits": n,
        "search_space": size,
        "valid_routes": int(np.sum(lengths < INF)),
        "rounds": rounds,
        "length": int(lengths[best_idx]),
        "bitstring": format(best_idx, f"0{n}b"),
        "path": [list(u) for u in maze.cells_to_units(cells)],
        "verified": int(lengths[best_idx]) == classical_len,
        "classical_length": classical_len,
        "elapsed_ms": elapsed_ms,
    }
