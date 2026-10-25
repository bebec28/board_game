"""Human-readable move notation: columns a..j, ranks 1..10 (rank = row + 1, rank 1 at the top)."""

from __future__ import annotations

from .models import Move, Piece

PIECE_LETTER = {"explorer": "E", "vanguard": "V", "sentinel": "S", "messenger": "M"}


def square_name(row: int, col: int) -> str:
    return f"{chr(ord('a') + col)}{row + 1}"


def move_notation(piece: Piece, move: Move, size: int) -> str:
    origin = square_name(piece.row, piece.col)
    letter = PIECE_LETTER[piece.type]
    sep = "~" if move.is_special else "-"
    if move.to_row < 0 or move.to_row >= size:
        return f"{letter} {origin}{sep}off"
    dest = square_name(move.to_row, move.to_col)
    if move.is_attack:
        return f"{letter} {origin}x{dest}" if not move.is_special else f"{letter} {origin}~x{dest}"
    return f"{letter} {origin}{sep}{dest}"
