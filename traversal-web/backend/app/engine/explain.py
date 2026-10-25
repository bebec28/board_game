"""Explain why a piece can (or cannot) reach a square. Powers the in-game "Pourquoi ?" help.

The engine only returns a reason code and the facts behind it (paths, costs, blockers, combat
terms); the UI turns them into sentences.
"""

from __future__ import annotations

import heapq
from dataclasses import dataclass, field, replace

from .combat import combat_breakdown, piece_at, step_cost
from .constants import EXPLORER_SPECIALS, ORTHOGONAL
from .models import CombatBreakdown, GameState, Piece
from .moves import find_move

Square = tuple[int, int]

# Reason codes, in the order they are checked.
GAME_OVER = "game_over"
PIECE_GONE = "piece_gone"
SAME_SQUARE = "same_square"
OWN_PIECE = "own_piece"
CANNOT_ATTACK = "cannot_attack"
LEGAL = "legal"
LEAP_BLOCKED = "leap_blocked"
COMBAT_TOO_WEAK = "combat_too_weak"
TOO_FAR = "too_far"
BLOCKED = "blocked"


@dataclass
class Explanation:
    piece_id: str
    to_row: int
    to_col: int
    reason: str
    legal: bool
    movement: int
    # True when the piece belongs to the side not to move: the answer is "if it were its turn".
    hypothetical: bool = False
    # Cheapest route ignoring other pieces (start .. target) and the cost of each step.
    path: list[Square] = field(default_factory=list)
    step_costs: list[int] = field(default_factory=list)
    path_cost: int | None = None
    # Cheapest route that avoids every piece (None when no such route exists).
    free_path: list[Square] = field(default_factory=list)
    free_cost: int | None = None
    # Pieces standing on `path` (they force the detour or block the way).
    blockers: list[str] = field(default_factory=list)
    occupant_id: str | None = None
    is_special: bool = False
    combat: CombatBreakdown | None = None


def _cheapest_path(
    state: GameState, piece: Piece, target: Square, avoid_pieces: bool
) -> tuple[int, list[Square]] | None:
    """Dijkstra from the piece to `target`. The target itself may hold a piece (attack).

    With `avoid_pieces=False`, squares holding pieces are allowed but each one adds a
    tie-breaking penalty, so the returned route crosses as few pieces as possible.
    """
    board, size = state.board, state.size
    start = (piece.row, piece.col)
    best: dict[Square, tuple[int, int]] = {start: (0, 0)}
    prev: dict[Square, Square] = {}
    heap: list[tuple[int, int, Square]] = [(0, 0, start)]
    while heap:
        cost, crossed, sq = heapq.heappop(heap)
        if best.get(sq) != (cost, crossed):
            continue
        if sq == target:
            path = [sq]
            while path[-1] != start:
                path.append(prev[path[-1]])
            return cost, path[::-1]
        r, c = sq
        for dr, dc in ORTHOGONAL:
            nr, nc = r + dr, c + dc
            if not (0 <= nr < size and 0 <= nc < size) or (nr, nc) == start:
                continue
            nxt = (nr, nc)
            occupied = nxt != target and piece_at(state.pieces, nr, nc) is not None
            if occupied and avoid_pieces:
                continue
            cand = (cost + step_cost(board, r, c, nr, nc), crossed + (1 if occupied else 0))
            if cand < best.get(nxt, (1 << 30, 0)):
                best[nxt] = cand
                prev[nxt] = sq
                heapq.heappush(heap, (cand[0], cand[1], nxt))
    return None


def _special_offset(piece: Piece, target: Square) -> tuple[int, int] | None:
    if piece.type != "explorer":
        return None
    d = (target[0] - piece.row, target[1] - piece.col)
    return d if d in EXPLORER_SPECIALS else None


def explain_move(state: GameState, piece_id: str, to_row: int, to_col: int) -> Explanation:
    piece = state.piece(piece_id)
    if piece is None:
        raise ValueError(f"Unknown piece {piece_id}")
    target = (to_row, to_col)
    if not (0 <= to_row < state.size and 0 <= to_col < state.size):
        raise ValueError("Target square is off the board")

    hypothetical = piece.player != state.current_turn
    if hypothetical:
        state = replace(state, current_turn=piece.player)

    ex = Explanation(
        piece_id=piece_id, to_row=to_row, to_col=to_col, reason=LEGAL, legal=False,
        movement=piece.movement, hypothetical=hypothetical,
    )
    if state.game_over or state.phase != "play":
        ex.reason = GAME_OVER
        return ex
    if not piece.alive:
        ex.reason = PIECE_GONE
        return ex
    if target == (piece.row, piece.col):
        ex.reason = SAME_SQUARE
        return ex

    occupant = piece_at(state.pieces, to_row, to_col)
    ex.occupant_id = occupant.id if occupant else None
    if occupant is not None and occupant.player == piece.player:
        ex.reason = OWN_PIECE
        return ex
    if occupant is not None and piece.type == "messenger":
        ex.reason = CANNOT_ATTACK
        return ex

    ignoring = _cheapest_path(state, piece, target, avoid_pieces=False)
    if ignoring is not None:
        ex.path_cost, ex.path = ignoring
        ex.step_costs = [
            step_cost(state.board, *a, *b) for a, b in zip(ex.path, ex.path[1:], strict=False)
        ]
        ex.blockers = [
            p.id for sq in ex.path[1:-1] if (p := piece_at(state.pieces, *sq)) is not None
        ]
    free = _cheapest_path(state, piece, target, avoid_pieces=True)
    if free is not None:
        ex.free_cost, ex.free_path = free

    offset = _special_offset(piece, target)
    walkable = ex.free_cost is not None and ex.free_cost <= piece.movement
    ex.is_special = offset is not None and not walkable

    if occupant is not None:
        charge = piece.type == "vanguard" and walkable and ex.free_cost == 4
        ex.combat = combat_breakdown(state.board, state.pieces, piece, occupant, charge=charge)

    move = find_move(state, piece_id, to_row, to_col)
    if move is not None:
        ex.legal = True
        ex.reason = LEGAL
        ex.is_special = move.is_special
        if move.combat is not None:
            ex.combat = move.combat
        return ex

    if offset is not None and (abs(offset[0]) == 2 or abs(offset[1]) == 2):
        mid = piece_at(state.pieces, piece.row + offset[0] // 2, piece.col + offset[1] // 2)
        if mid is not None and not walkable:
            ex.reason = LEAP_BLOCKED
            ex.blockers = [mid.id]
            return ex

    if occupant is not None and (walkable or offset is not None):
        # The piece can get there; the fight itself is lost.
        ex.reason = COMBAT_TOO_WEAK
        return ex

    if ex.path_cost is not None and ex.path_cost > piece.movement:
        ex.reason = TOO_FAR
    else:
        ex.reason = BLOCKED
    return ex
