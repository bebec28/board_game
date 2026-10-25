"""Terrain generation.

Pure-Python port of `gen_board`, `board_scramble`, `gen_mix_board` and `check_board` from the
original `board_game/game.py`. The board is generated on a padded (size+2)x(size+2) grid whose
outer ring is a wall fixed at height 0; the playable interior is returned.

Differences from the original:
- the random walk has a retry cap (the original can loop forever),
- the ring bounds are parameterised (`ring_step`) instead of hard-coded to 2,
- the result is normalised so the minimum height is 0 and clamped to `max_height`
  (clamping is 1-Lipschitz so the |dh| <= 2 invariant survives).
"""

from __future__ import annotations

import random

Grid = list[list[int]]

MAX_NEIGHBOR_DIFF = 2


def _padded(size: int) -> Grid:
    return [[0] * (size + 2) for _ in range(size + 2)]


def ring_bounds(size: int, ring_step: int) -> tuple[Grid, Grid]:
    """boardMin / boardMax: each ring inward may go `ring_step` further from the wall."""
    lo, hi = _padded(size), _padded(size)
    n = size + 2
    for i in range(1, size // 2 + 1):
        for r in range(i, n - i):
            for c in range(i, n - i):
                lo[r][c] -= ring_step
                hi[r][c] += ring_step
    return lo, hi


def _violates(grid: Grid, lo: Grid, hi: Grid, i: int, j: int) -> bool:
    h = grid[i][j]
    return (
        abs(h - grid[i - 1][j]) > MAX_NEIGHBOR_DIFF
        or abs(h - grid[i][j - 1]) > MAX_NEIGHBOR_DIFF
        or abs(h - grid[i + 1][j]) > MAX_NEIGHBOR_DIFF
        or abs(h - grid[i][j + 1]) > MAX_NEIGHBOR_DIFF
        or h > hi[i][j]
        or h < lo[i][j]
    )


def gen_board(
    grid: Grid,
    push: int,
    a_lo: int,
    a_hi: int,
    landscape_factor: float,
    rng: random.Random,
    lo: Grid,
    hi: Grid,
    max_strikes: int = 100_000,
) -> Grid:
    """Random walk: `push` successful +/-1 nudges on cells in [a_lo, a_hi). In place.

    A nudge goes up with probability (1 - landscape_factor), down otherwise, and is
    rolled back when it breaks the neighbour or bound constraints.
    """
    moves = 0
    strikes = 0
    while moves < push and strikes < max_strikes:
        up = rng.random() >= landscape_factor
        i = rng.randrange(a_lo, a_hi)
        j = rng.randrange(a_lo, a_hi)
        grid[i][j] += 1 if up else -1
        if _violates(grid, lo, hi, i, j):
            grid[i][j] -= 1 if up else -1
            strikes += 1
        else:
            moves += 1
    return grid


def board_scramble(
    grid: Grid, landscape_factor: float, rng: random.Random, lo: Grid, hi: Grid, push: int = 150
) -> Grid:
    """Four passes on shrinking regions, as in the original (1..10, 2..9, 3..8, 4..7)."""
    size = len(grid) - 2
    for k in range(4):
        gen_board(grid, push, 1 + k, size + 1 - k, landscape_factor, rng, lo, hi)
    return grid


def gen_mix_board(
    grid: Grid, push: int, landscape_factor: float, rng: random.Random, lo: Grid, hi: Grid,
    max_strikes: int = 100_000,
) -> Grid:
    """Mixed mountains & valleys: a mask decides which cells only rise and which only sink."""
    n = len(grid)
    size = n - 2
    mask = [[False] * n for _ in range(n)]
    if rng.random() >= 0.5:
        for i in range(n):
            for j in range(n):
                if j > i:
                    mask[i][j] = True
                elif j == i:
                    mask[i][j] = rng.random() >= 0.5
    else:
        split = size // 2
        for i in range(n):
            for j in range(n):
                if 1 <= j <= split - 1:
                    mask[i][j] = True
                elif split <= j <= split + 1:
                    mask[i][j] = rng.random() >= 0.5
    if rng.random() >= 0.5:  # rotate the mask 180 degrees
        mask = [row[::-1] for row in mask[::-1]]

    moves = strikes = 0
    while moves < push and strikes < max_strikes:
        i = rng.randrange(1, size + 1)
        j = rng.randrange(1, size + 1)
        up = mask[i][j]
        grid[i][j] += 1 if up else -1
        if _violates(grid, lo, hi, i, j):
            grid[i][j] -= 1 if up else -1
            strikes += 1
        else:
            moves += 1
            strikes = 0
    return grid


def check_board(board: Grid) -> bool:
    """True when every orthogonal neighbour pair differs by at most 2 (borderless check)."""
    n = len(board)
    for r in range(n):
        for c in range(len(board[r])):
            h = board[r][c]
            if r + 1 < n and abs(h - board[r + 1][c]) > MAX_NEIGHBOR_DIFF:
                return False
            if c + 1 < len(board[r]) and abs(h - board[r][c + 1]) > MAX_NEIGHBOR_DIFF:
                return False
    return True


def interior(grid: Grid) -> Grid:
    return [row[1:-1] for row in grid[1:-1]]


def normalise(board: Grid, max_height: int | None) -> Grid:
    """Shift so the minimum is 0, then clamp to [0, max_height]."""
    low = min(min(row) for row in board)
    out = [[h - low for h in row] for row in board]
    if max_height is not None:
        out = [[min(h, max_height) for h in row] for row in out]
    return out
