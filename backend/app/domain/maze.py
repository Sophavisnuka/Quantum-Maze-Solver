"""Maze model and reduction to a junction graph.

The maze is a width x height grid of cells. `open_cells[r][c]` holds the
directions (indexes into DIRS) in which the cell has no wall. Generation lives
in `generator.py`.

For the quantum search we do not encode every cell. Corridors with no choice
cost nothing, so the maze is collapsed into a graph whose nodes are the start,
the goal, junctions (degree >= 3) and dead ends (degree 1). A candidate route
is the sequence of left/right style choices made at those nodes, one qubit per
decision.
"""

from __future__ import annotations

import heapq
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
    def open_masks(self) -> list[list[int]]:
        """masks[r][c] has bit d set when cell (r, c) is open towards DIRS[d] (N=1, E=2, S=4, W=8)."""
        return [
            [sum(1 << d for d in self.open_cells[r][c]) for c in range(self.width)]
            for r in range(self.height)
        ]

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
