"""HTTP routes. Thin: validate input, call a service, shape the response."""

from __future__ import annotations

from fastapi import APIRouter

from ..services import maze_service
from .deps import MazeQuery
from .schemas import HealthResponse, MazeResponse

router = APIRouter(prefix="/api")


@router.get("/test", response_model=HealthResponse)
def health_check():
    return {"status": "success", "message": "Quantum Maze Solver API is running!"}


@router.get("/maze", response_model=MazeResponse)
def get_maze(p: MazeQuery):
    maze = maze_service.build_maze(p.width, p.height, p.seed, p.max_qubits)
    return {
        "width": p.width,
        "height": p.height,
        "seed": maze.seed,
        "grid": maze.unit_grid(),
        "start": list(maze.start_unit),
        "goal": list(maze.goal_unit),
        "qubits": maze.qubits_needed(),
        "decision_nodes": len(maze.nodes),
    }


@router.get("/solve")
def solve_maze(p: MazeQuery):
    return maze_service.solve_maze(p.width, p.height, p.seed, p.max_qubits)
