"""Response models (the shape the frontend's `types.ts` expects)."""

from __future__ import annotations

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    message: str


class MazeResponse(BaseModel):
    width: int
    height: int
    seed: int  # effective seed - pass it back to /api/solve
    cells: list[list[int]]  # cells[r][c]: open sides as bits N=1, E=2, S=4, W=8
    start: list[int]  # [row, col]
    goal: list[int]  # [row, col]
    qubits: int
    decision_nodes: int
