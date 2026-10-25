"""Board queries and combat maths. Ports of `j`, `$`, `B`, `D`, `H` in the reference engine."""

from __future__ import annotations

from .constants import ORTHOGONAL
from .models import Board, CombatBreakdown, Piece


def step_cost(board: Board, r: int, c: int, nr: int, nc: int) -> int:
    """Cost of stepping from (r, c) to (nr, nc): 1 on flat ground, |dh| + 1 otherwise."""
    dh = board[nr][nc] - board[r][c]
    return abs(dh) + 1 if dh != 0 else 1


def piece_at(pieces: list[Piece], row: int, col: int) -> Piece | None:
    for p in pieces:
        if p.alive and p.row == row and p.col == col:
            return p
    return None


def reinforcements(pieces: list[Piece], defender: Piece, size: int) -> int:
    """Number of friendly pieces orthogonally adjacent to the defender (+1 defence each)."""
    count = 0
    for dr, dc in ORTHOGONAL:
        r, c = defender.row + dr, defender.col + dc
        if 0 <= r < size and 0 <= c < size:
            p = piece_at(pieces, r, c)
            if p and p.player == defender.player:
                count += 1
    return count


def allied_strength(
    pieces: list[Piece], row: int, col: int, player: int, exclude_id: str, size: int
) -> int:
    """Sum of base strength of `player`'s pieces (other than the attacker) adjacent to (row, col)."""
    total = 0
    for dr, dc in ORTHOGONAL:
        r, c = row + dr, col + dc
        if 0 <= r < size and 0 <= c < size:
            p = piece_at(pieces, r, c)
            if p and p.player == player and p.id != exclude_id:
                total += p.strength
    return total


def combat_breakdown(
    board: Board, pieces: list[Piece], attacker: Piece, defender: Piece, charge: bool = False
) -> CombatBreakdown:
    """Every term of the combat formula, so the UI can explain why a capture succeeded."""
    size = len(board)
    dh = board[attacker.row][attacker.col] - board[defender.row][defender.col]
    height_mod = 1 if dh > 0 else -1 if dh < 0 else 0
    allies = allied_strength(pieces, defender.row, defender.col, attacker.player, attacker.id, size)
    reinf = reinforcements(pieces, defender, size)
    charge_bonus = 1 if charge else 0
    return CombatBreakdown(
        attacker_id=attacker.id,
        attacker_type=attacker.type,
        attacker_base=attacker.strength,
        height_mod=height_mod,
        allies=allies,
        charge=charge_bonus,
        attacker_total=attacker.strength + height_mod + allies + charge_bonus,
        defender_id=defender.id,
        defender_type=defender.type,
        defender_base=defender.strength,
        reinforcements=reinf,
        defender_total=defender.strength + reinf,
        attacker_height=board[attacker.row][attacker.col],
        defender_height=board[defender.row][defender.col],
    )


def compute_strengths(
    board: Board, pieces: list[Piece], attacker: Piece, defender: Piece
) -> tuple[int, int]:
    """Effective (attacker, defender) strengths, without the Vanguard charge bonus."""
    b = combat_breakdown(board, pieces, attacker, defender)
    return b.attacker_total, b.defender_total
