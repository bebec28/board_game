"""Legal move generation. Port of `A` (valid moves), `K` (all moves), `R` (final row)."""

from __future__ import annotations

from collections import deque
from dataclasses import replace

from .combat import combat_breakdown, piece_at, step_cost
from .constants import EXPLORER_SPECIALS, ORTHOGONAL
from .models import GameState, Move, Piece


def is_final_row(piece: Piece, row: int, size: int) -> bool:
    return row == 0 if piece.player == 1 else row == size - 1


def off_board_row(piece: Piece, size: int) -> int:
    """Row index used to encode a finishing move (-1 for player 1, size for player 2)."""
    return -1 if piece.player == 1 else size


def valid_moves(state: GameState, piece_id: str) -> list[Move]:
    piece = state.piece(piece_id)
    if piece is None or not piece.alive or piece.player != state.current_turn:
        return []
    if state.phase != "play":
        return []
    # The Messenger never attacks, and may only step off the board from where it began the turn.
    messenger = piece.type == "messenger"

    board, pieces, size = state.board, state.pieces, state.size
    start = (piece.row, piece.col)

    # Best remaining movement per square (start included; 0 counts as reached).
    remaining: dict[tuple[int, int], int] = {start: piece.movement}
    # Normal destinations (never the start square).
    reach: dict[tuple[int, int], Move] = {}
    # Every enemy square reachable along a path, with the minimal cost to get there.
    attacks: dict[tuple[int, int], tuple[int, Piece]] = {}
    finish_hits: list[tuple[int, int]] = []

    if is_final_row(piece, piece.row, size) and piece.movement >= 1:
        finish_hits.append(start)

    queue: deque[tuple[int, int, int]] = deque([(piece.row, piece.col, piece.movement)])
    while queue:
        r, c, rem = queue.popleft()
        if rem < remaining.get((r, c), -1):
            continue  # stale entry
        if rem >= 1 and (r, c) != start and not messenger and is_final_row(piece, r, size):
            finish_hits.append((r, c))
        for dr, dc in ORTHOGONAL:
            nr, nc = r + dr, c + dc
            if not (0 <= nr < size and 0 <= nc < size):
                continue
            cost = step_cost(board, r, c, nr, nc)
            if cost > rem:
                continue
            occupant = piece_at(pieces, nr, nc)
            if occupant is not None:
                if occupant.player != piece.player and not messenger:
                    spent = piece.movement - rem + cost
                    prev = attacks.get((nr, nc))
                    if prev is None or spent < prev[0]:
                        attacks[(nr, nc)] = (spent, occupant)
                continue
            new_rem = rem - cost
            if new_rem > remaining.get((nr, nc), -1):
                remaining[(nr, nc)] = new_rem
                if (nr, nc) != start:
                    reach[(nr, nc)] = Move(nr, nc, cost=piece.movement - new_rem)
                if new_rem > 0:
                    queue.append((nr, nc, new_rem))

    moves: list[Move] = list(reach.values())

    for (r, c), (min_cost, target) in attacks.items():
        charge = piece.type == "vanguard" and min_cost == 4
        b = combat_breakdown(board, pieces, piece, target, charge=charge)
        if b.attacker_total >= b.defender_total:
            moves.append(
                Move(
                    r, c, cost=min_cost, is_attack=True, captured_id=target.id,
                    attacker_strength=b.attacker_total, defender_strength=b.defender_total,
                    combat=b,
                )
            )

    finish_cols: set[int] = set()
    off_row = off_board_row(piece, size)
    for _, col in finish_hits:
        if col not in finish_cols:
            finish_cols.add(col)
            moves.append(Move(off_row, col, cost=piece.movement, can_finish=True))

    if piece.type == "explorer":
        for dr, dc in EXPLORER_SPECIALS:
            r, c = piece.row + dr, piece.col + dc
            if abs(dr) == 2 or abs(dc) == 2:
                # Leap: the jumped-over square must be on the board and empty.
                mr, mc = piece.row + dr // 2, piece.col + dc // 2
                if not (0 <= mr < size and 0 <= mc < size):
                    continue
                if piece_at(pieces, mr, mc) is not None:
                    continue
            if not (0 <= r < size) and 0 <= c < size:
                forward = dr < 0 if piece.player == 1 else dr > 0
                if forward and c not in finish_cols:
                    finish_cols.add(c)
                    moves.append(
                        Move(off_row, c, cost=piece.movement, can_finish=True, is_special=True)
                    )
                continue
            if not (0 <= r < size and 0 <= c < size):
                continue
            if (r, c) in remaining or (r, c) in attacks:
                continue
            occupant = piece_at(pieces, r, c)
            if occupant is None:
                moves.append(Move(r, c, cost=piece.movement, is_special=True))
            elif occupant.player != piece.player:
                b = combat_breakdown(board, pieces, piece, occupant)
                if b.attacker_total >= b.defender_total:
                    moves.append(
                        Move(
                            r, c, cost=piece.movement, is_attack=True, captured_id=occupant.id,
                            is_special=True, attacker_strength=b.attacker_total,
                            defender_strength=b.defender_total, combat=b,
                        )
                    )
    return moves


def all_valid_moves(state: GameState, include_opponent: bool = False) -> dict[str, list[Move]]:
    """Legal moves for every piece of the side to move (and optionally the other side)."""
    result: dict[str, list[Move]] = {}
    for p in state.pieces:
        if p.player == state.current_turn and p.alive:
            mv = valid_moves(state, p.id)
            if mv:
                result[p.id] = mv
    if include_opponent:
        flipped = replace(state, current_turn=2 if state.current_turn == 1 else 1)
        for p in state.pieces:
            if p.player != state.current_turn and p.alive:
                mv = valid_moves(flipped, p.id)
                if mv:
                    result[p.id] = mv
    return result


def find_move(state: GameState, piece_id: str, to_row: int, to_col: int) -> Move | None:
    for m in valid_moves(state, piece_id):
        if m.to_row == to_row and m.to_col == to_col:
            return m
    return None
