"""Grover round applied directly to a numpy statevector.

Same maths as the circuit, without building or transpiling 2^n-sized gates:
  oracle   : flip the sign of marked amplitudes
  diffuser : H^n (2|0><0| - I) H^n = 2|s><s| - I, i.e. reflect about the mean
"""

from __future__ import annotations

import logging
import time

import numpy as np

log = logging.getLogger("uvicorn.error")


class NumpyEngine:
    name = "numpy"

    def run(self, n_qubits: int, marked: np.ndarray, iterations: int, shots: int) -> dict[str, int]:
        t0 = time.perf_counter()
        size = 1 << n_qubits
        state = np.full(size, 1.0 / np.sqrt(size))
        for _ in range(iterations):
            state[marked] *= -1
            state = 2.0 * state.mean() - state
        probs = state * state
        probs /= probs.sum()
        samples = np.random.multinomial(shots, probs)
        counts = {format(int(i), f"0{n_qubits}b"): int(c) for i, c in enumerate(samples) if c}
        log.info("[numpy] simulated in %.0f ms (%d qubits, %d iterations, %d shots)",
                 (time.perf_counter() - t0) * 1000, n_qubits, iterations, shots)
        return counts
