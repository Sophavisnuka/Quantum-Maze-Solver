"""Maze generation and reduction to a junction graph.

The maze is drawn on a "thick wall" unit grid of (2H+1) x (2W+1) units. Cell
(r, c) lives at unit (2r+1, 2c+1); the unit between two cells is the passage.
`grid[y][x] == 1` means wall, `0` means open.

For the quantum search we do not encode every cell. Corridors with no choice
cost nothing, so the maze is collapsed into a graph whose nodes are the start,
the goal, junctions (degree >= 3) and dead ends (degree 1). A candidate route
is the sequence of left/right style choices made at those nodes, one qubit per
decision.
"""

from __future__ import annotations

import heapq
import random
from dataclasses import dataclass, field

# N, E, S, W
DIRS = [(-1, 0), (0, 1), (1, 0), (0, -1)]


@dataclass
class Exit:
    edge_id: int
    to: int
    length: int  # number of cell-to-cell moves along the corridor
    cells: list[tuple[int, int]]  # cells visited after leaving the node (ends at `to`)


@dataclass
class Maze:
    width: int
    height: int
    seed: int
    open_cells: list[list[set[int]]]  # open_cells[r][c] = set of open direction indexes
    start: tuple[int, int] = (0, 0)
    goal: tuple[int, int] = (0, 0)
    nodes: list[tuple[int, int]] = field(default_factory=list)
    exits: list[list[Exit]] = field(default_factory=list)
    start_node: int = 0
    goal_node: int = 0

    # ---- rendering ---------------------------------------------------
    def unit_grid(self) -> list[list[int]]:
        grid = [[1] * (2 * self.width + 1) for _ in range(2 * self.height + 1)]
        for r in range(self.height):
            for c in range(self.width):
                grid[2 * r + 1][2 * c + 1] = 0
                for d in self.open_cells[r][c]:
                    dr, dc = DIRS[d]
                    grid[2 * r + 1 + dr][2 * c + 1 + dc] = 0
        return grid

    def cells_to_units(self, cells: list[tuple[int, int]]) -> list[tuple[int, int]]:
        """Convert a list of adjacent cells to unit coordinates (adds passage units)."""
        units: list[tuple[int, int]] = []
        for i, (r, c) in enumerate(cells):
            if i > 0:
                pr, pc = cells[i - 1]
                units.append((r + pr + 1, c + pc + 1))
            units.append((2 * r + 1, 2 * c + 1))
        return units

    # ---- classical reference (used only to size the search & to verify) ----
    def dijkstra(self) -> tuple[int, list[int]]:
        """Shortest route length (cell moves) and the node sequence."""
        dist = {self.start_node: 0}
        prev: dict[int, int] = {}
        heap = [(0, self.start_node)]
        while heap:
            d, u = heapq.heappop(heap)
            if d > dist.get(u, 1 << 30):
                continue
            for ex in self.exits[u]:
                nd = d + ex.length
                if nd < dist.get(ex.to, 1 << 30):
                    dist[ex.to] = nd
                    prev[ex.to] = u
                    heapq.heappush(heap, (nd, ex.to))
        seq = [self.goal_node]
        while seq[-1] != self.start_node:
            seq.append(prev[seq[-1]])
        seq.reverse()
        return dist[self.goal_node], seq

    def min_hops_of_shortest(self) -> int:
        _, seq = self.dijkstra()
        return len(seq) - 1

    def qubits_needed(self) -> int:
        """One qubit per decision, plus 2 spare so detours (longer routes) exist."""
        return self.min_hops_of_shortest() + 2


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


def generate_maze(width: int, height: int, seed: int, max_qubits: int, attempts: int = 400) -> Maze:
    """Generate a maze whose shortest route needs about `max_qubits` decisions.

    Tries seed, seed+1, ... and returns the first maze needing between
    max_qubits-3 and max_qubits qubits (so the puzzle is not trivial). If none
    does, the closest fit at or below the cap is used; if even that is missing
    the smallest maze found is returned and the caller can reject it.
    """
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
