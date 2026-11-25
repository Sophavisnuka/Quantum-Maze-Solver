"""Use-cases the API calls: build a maze, solve a maze (with a concurrency limit)."""

from __future__ import annotations

import logging
import threading
import time

from ..core.config import settings
from ..domain.generator import generate_maze
from ..domain.maze import Maze
from . import grover_solver

log = logging.getLogger("uvicorn.error")

_solve_slots = threading.BoundedSemaphore(settings.max_concurrent_solves)


class ServerBusyError(RuntimeError):
    """Too many solves already running."""


def build_maze(width: int, height: int, seed: int, max_qubits: int) -> Maze:
    t0 = time.perf_counter()
    maze = generate_maze(width, height, seed, max_qubits)
    log.info("[maze] %dx%d seed=%d cap=%d -> needs %d qubits, generated in %.0f ms",
             width, height, seed, max_qubits, maze.qubits_needed(), (time.perf_counter() - t0) * 1000)
    return maze


def solve_maze(width: int, height: int, seed: int, max_qubits: int) -> dict:
    t0 = time.perf_counter()
    maze = build_maze(width, height, seed, max_qubits)
    if not _solve_slots.acquire(timeout=settings.solve_wait_seconds):
        raise ServerBusyError("The solver is busy with another request. Try again shortly.")
    try:
        result = grover_solver.solve(maze)
    finally:
        _solve_slots.release()
    log.info("[solve] request finished in %.0f ms total", (time.perf_counter() - t0) * 1000)
    return result

