"""Engine interface: runs one Grover search round and returns measurement counts."""

from __future__ import annotations

from typing import Protocol

import numpy as np


class GroverEngine(Protocol):
    name: str

    def run(self, n_qubits: int, marked: np.ndarray, iterations: int, shots: int) -> dict[str, int]:
        """Return {bitstring: count}. Bitstring `b` encodes index `int(b, 2)` (qubit 0 rightmost)."""
        ...
