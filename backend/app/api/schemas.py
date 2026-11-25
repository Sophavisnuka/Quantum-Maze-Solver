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
    grid: list[list[int]]
    start: list[int]
    goal: list[int]
    qubits: int
    decision_nodes: int
