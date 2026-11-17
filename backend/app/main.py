from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .grover import MAX_QUBITS, solve
from .maze import generate_maze

app = FastAPI(
    title="Quantum Maze Solver",
    description="A FastAPI application for solving mazes using quantum algorithms.",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/test")
def health_check():
    return {
        "status": "success",
        "message": "Quantum Maze Solver API is running!"
    }


def _maze(width: int, height: int, seed: int, max_qubits: int):
    maze = generate_maze(width, height, seed, max_qubits)
    k = maze.qubits_needed()
    if k > max_qubits:
        raise HTTPException(
            422,
            f"Could not find a {width}x{height} maze solvable with {max_qubits} qubits "
            f"(best needs {k}). Raise the qubit limit or pick a smaller maze.",
        )
    return maze, k


@app.get("/api/maze")
def get_maze(
    width: int = Query(12, ge=4, le=30),
    height: int = Query(8, ge=4, le=30),
    seed: int = 0,
    max_qubits: int = Query(12, ge=4, le=MAX_QUBITS),
):
    maze, k = _maze(width, height, seed, max_qubits)
    return {
        "width": width,
        "height": height,
        "seed": maze.seed,  # effective seed - pass it back to /api/solve
        "grid": maze.unit_grid(),
        "start": [2 * maze.start[0] + 1, 2 * maze.start[1] + 1],
        "goal": [2 * maze.goal[0] + 1, 2 * maze.goal[1] + 1],
        "qubits": k,
        "decision_nodes": len(maze.nodes),
    }


@app.get("/api/solve")
def solve_maze(
    width: int = Query(12, ge=4, le=30),
    height: int = Query(8, ge=4, le=30),
    seed: int = 0,
    max_qubits: int = Query(12, ge=4, le=MAX_QUBITS),
):
    maze, _ = _maze(width, height, seed, max_qubits)
    return solve(maze)
