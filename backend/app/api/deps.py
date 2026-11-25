"""Shared query-parameter dependencies."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Query

from ..core.config import settings


@dataclass
class MazeParams:
    width: int = Query(12, ge=4, le=30)
    height: int = Query(8, ge=4, le=30)
    seed: int = 0
    max_qubits: int = Query(12, ge=4, le=settings.max_qubits)


MazeQuery = Annotated[MazeParams, Depends()]
