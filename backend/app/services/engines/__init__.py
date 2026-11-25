"""Grover simulation engines (Strategy pattern)."""

from __future__ import annotations

from ...core.config import settings
from .base import GroverEngine
from .numpy_engine import NumpyEngine
from .qiskit_engine import QiskitEngine

_qiskit = QiskitEngine()
_numpy = NumpyEngine()


def pick_engine(n_qubits: int) -> GroverEngine:
    """Qiskit for small mazes, numpy once circuits get too heavy to build."""
    return _qiskit if n_qubits <= settings.qiskit_max_qubits else _numpy


__all__ = ["GroverEngine", "NumpyEngine", "QiskitEngine", "pick_engine"]
