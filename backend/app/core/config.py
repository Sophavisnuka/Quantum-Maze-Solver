"""Central settings, read once from environment variables."""

from __future__ import annotations

import os
from dataclasses import dataclass, field

LOCAL_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]


def _int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except ValueError:
        return default


def _origins() -> list[str]:
    # Deployed frontend URL(s), comma separated, e.g. https://my-maze.vercel.app
    extra = [o.strip().rstrip("/") for o in os.getenv("FRONTEND_ORIGINS", "").split(",") if o.strip()]
    return [*LOCAL_ORIGINS, *extra]


@dataclass(frozen=True)
class Settings:
    app_title: str = "Quantum Maze Solver"
    app_description: str = "A FastAPI application for solving mazes using quantum algorithms."
    app_version: str = "1.0.0"

    cors_origins: list[str] = field(default_factory=_origins)

    # Hard cap on qubits the API accepts (2^20 amplitudes ~ 16 MB statevector).
    max_qubits: int = 20
    # Mazes up to this many qubits run on Qiskit Aer; larger ones use the numpy engine,
    # because building/transpiling 2^n-sized Qiskit gates exhausts a 512 MB host.
    qiskit_max_qubits: int = field(default_factory=lambda: _int("QISKIT_MAX_QUBITS", 12))
    shots: int = 1024

    # Solves are CPU/memory heavy: run this many at once, others wait then get 503.
    max_concurrent_solves: int = field(default_factory=lambda: _int("MAX_CONCURRENT_SOLVES", 1))
    solve_wait_seconds: int = 30


settings = Settings()
