from __future__ import annotations

import pytest

from app.engine.constants import BOARD_SIZE, PIECE_STATS
from app.engine.models import GameState, Piece

PieceSpec = tuple[str, str, int, int, int]  # (id, type, player, row, col)


def flat_board(size: int = BOARD_SIZE, height: int = 0) -> list[list[int]]:
    return [[height] * size for _ in range(size)]


def make_piece(pid: str, ptype: str, player: int, row: int, col: int) -> Piece:
    stats = PIECE_STATS[ptype]
    return Piece(pid, ptype, player, row, col, stats["movement"], stats["strength"])


def make_state(
    board: list[list[int]], pieces: list[PieceSpec], turn: int = 1, **kwargs
) -> GameState:
    return GameState(
        id="test",
        board=board,
        pieces=[make_piece(*spec) for spec in pieces],
        current_turn=turn,
        **kwargs,
    )


def targets(moves) -> set[tuple[int, int]]:
    return {(m.to_row, m.to_col) for m in moves}


@pytest.fixture
def flat():
    return flat_board()
