"""Random maze generation (DFS carve + extra loops) and junction-graph build."""

from __future__ import annotations

import random

from .errors import MazeGenerationError
from .maze import DIRS, Exit, Maze


def _carve(width: int, height: int, rng: random.Random, extra_ratio: float):
    open_cells = [[set() for _ in range(width)] for _ in range(height)]
    visited = [[False] * width for _ in range(height)]
    stack = [(0, 0)]
    visited[0][0] = True
    while stack:
        r, c = stack[-1]
        options = []
        for d, (dr, dc) in enumerate(DIRS):
            nr, nc = r + dr, c + dc
            if 0 <= nr < height and 0 <= nc < width and not visited[nr][nc]:
                options.append((d, nr, nc))
        if not options:
            stack.pop()
            continue
        d, nr, nc = rng.choice(options)
        open_cells[r][c].add(d)
        open_cells[nr][nc].add((d + 2) % 4)
        visited[nr][nc] = True
        stack.append((nr, nc))

    # knock out some walls to create loops, so several routes exist
    walls = []
    for r in range(height):
        for c in range(width):
            for d in (1, 2):  # E, S only - each wall once
                dr, dc = DIRS[d]
                nr, nc = r + dr, c + dc
                if 0 <= nr < height and 0 <= nc < width and d not in open_cells[r][c]:
                    walls.append((r, c, d, nr, nc))
    rng.shuffle(walls)
    extra = max(1, int(width * height * extra_ratio))
    for r, c, d, nr, nc in walls:
        if extra == 0:
            break
        # keep every cell at degree <= 3 so each decision needs only one qubit
        if len(open_cells[r][c]) >= 3 or len(open_cells[nr][nc]) >= 3:
            continue
        open_cells[r][c].add(d)
        open_cells[nr][nc].add((d + 2) % 4)
        extra -= 1
    return open_cells


def _build_graph(m: Maze) -> None:
    h, w = m.height, m.width
    is_node = [[False] * w for _ in range(h)]
    for r in range(h):
        for c in range(w):
            deg = len(m.open_cells[r][c])
            if deg != 2 or (r, c) in (m.start, m.goal):
                is_node[r][c] = True
    index: dict[tuple[int, int], int] = {}
    for r in range(h):
        for c in range(w):
            if is_node[r][c]:
                index[(r, c)] = len(m.nodes)
                m.nodes.append((r, c))
    m.exits = [[] for _ in m.nodes]

    edge_ids: dict[tuple, int] = {}
    for (r, c), ni in index.items():
        for d in sorted(m.open_cells[r][c]):
            cells: list[tuple[int, int]] = []
            cr, cc, cd = r, c, d
            while True:
                dr, dc = DIRS[cd]
                cr, cc = cr + dr, cc + dc
                cells.append((cr, cc))
                if is_node[cr][cc]:
                    break
                back = (cd + 2) % 4
                cd = next(x for x in m.open_cells[cr][cc] if x != back)
            arrive_dir = (cd + 2) % 4
            key = min(((r, c, d), (cr, cc, arrive_dir)))
            eid = edge_ids.setdefault(key, len(edge_ids))
            m.exits[ni].append(Exit(eid, index[(cr, cc)], len(cells), cells))
    m.start_node = index[m.start]
    m.goal_node = index[m.goal]


def _try_generate(width: int, height: int, seed: int) -> Maze:
    rng = random.Random(seed)
    m = Maze(width, height, seed, _carve(width, height, rng, extra_ratio=0.1))
    m.goal = (height - 1, width - 1)
    _build_graph(m)
    return m


def _search_seeds(width: int, height: int, seed: int, max_qubits: int, attempts: int | None = None) -> Maze:
    """Generate a maze whose shortest route needs about `max_qubits` decisions.

    Tries seed, seed+1, ... and returns the first maze needing between
    max_qubits-3 and max_qubits qubits (so the puzzle is not trivial). If none
    does, the closest fit at or below the cap is used; if even that is missing
    the smallest maze found is returned and the caller can reject it.
    """
    if attempts is None:
        # big mazes rarely have a short shortest route, so search more seeds (~3 per cell)
        attempts = max(400, 3 * width * height)
    best: Maze | None = None
    best_score = (1, 1 << 30)  # (over cap?, distance below cap)
    for i in range(attempts):
        m = _try_generate(width, height, seed + i)
        # start must offer at most two exits so one bit is enough there too
        if len(m.exits[m.start_node]) > 2:
            continue
        k = m.qubits_needed()
        if max_qubits - 3 <= k <= max_qubits:
            return m
        score = (1, k) if k > max_qubits else (0, max_qubits - k)
        if score < best_score:
            best, best_score = m, score
    assert best is not None
    return best


def generate_maze(width: int, height: int, seed: int, max_qubits: int) -> Maze:
    """Generate a maze needing at most `max_qubits` qubits, or raise MazeGenerationError.

    Big mazes occasionally miss the cap in one seed sweep. If we were close, sweep
    a fresh seed range (the effective seed is on the returned Maze, so solving
    with it reproduces the same maze).
    """
    maze = _search_seeds(width, height, seed, max_qubits)
    k = maze.qubits_needed()
    for retry in range(1, 3):
        if k <= max_qubits or k > max_qubits + 2:
            break
        maze = _search_seeds(width, height, seed + retry * 1_000_000, max_qubits)
        k = maze.qubits_needed()
    if k > max_qubits:
        raise MazeGenerationError(
            f"Could not find a {width}x{height} maze solvable with {max_qubits} qubits "
            f"(best needs {k}). Raise the qubit limit or pick a smaller maze."
        )
    return maze
