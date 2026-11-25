"""Grover round on a real Qiskit circuit, simulated with Aer."""

from __future__ import annotations

import logging
import time

import numpy as np
from qiskit import QuantumCircuit, transpile
from qiskit.circuit.library import DiagonalGate
from qiskit_aer import AerSimulator

log = logging.getLogger("uvicorn.error")


class QiskitEngine:
    name = "qiskit"

    def __init__(self) -> None:
        self._backend = AerSimulator(method="statevector")

    def run(self, n_qubits: int, marked: np.ndarray, iterations: int, shots: int) -> dict[str, int]:
        size = 1 << n_qubits
        oracle_diag = np.ones(size)
        oracle_diag[marked] = -1
        diffuser_diag = -np.ones(size)  # 2|0><0| - I (up to global phase)
        diffuser_diag[0] = 1
        oracle = DiagonalGate(oracle_diag.tolist())
        diffuser = DiagonalGate(diffuser_diag.tolist())

        t0 = time.perf_counter()
        qc = QuantumCircuit(n_qubits)
        qc.h(range(n_qubits))
        for _ in range(iterations):
            qc.append(oracle, range(n_qubits))
            qc.h(range(n_qubits))
            qc.append(diffuser, range(n_qubits))
            qc.h(range(n_qubits))
        qc.measure_all()
        t1 = time.perf_counter()
        compiled = transpile(qc, self._backend)
        t2 = time.perf_counter()
        result = self._backend.run(compiled, shots=shots).result()
        t3 = time.perf_counter()
        log.info(
            "[qiskit] build %.0f ms | transpile %.0f ms | simulate %.0f ms (%d qubits, %d iterations, %d shots)",
            (t1 - t0) * 1000, (t2 - t1) * 1000, (t3 - t2) * 1000, n_qubits, iterations, shots,
        )
        return result.get_counts()
