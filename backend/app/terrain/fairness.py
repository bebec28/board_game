"""Board generation entry point with a fairness check.

A board is accepted when the cheapest crossing cost from each side's six starting squares to its
finishing edge is similar for both players and neither half is markedly higher than the other.
"""

from __future__ import annotations

import heapq
import random
from dataclasses import dataclass

from ..engine.combat import step_cost
from ..engine.constants import BOARD_SIZE, ORTHOGONAL, START_LAYOUT
from .generator import (
    Grid,
    board_scramble,
    check_board,
    gen_mix_board,
    interior,
    normalise,
    ring_bounds,
)
from .presets import TERRAIN_PRESETS, TerrainPreset

MAX_ATTEMPTS = 50
COST_TOLERANCE = 4
MEAN_HEIGHT_TOLERANCE = 0.6


@dataclass
class GeneratedBoard:
    board: Grid
    seed: int
    mode: str


def _raw_board(preset: TerrainPreset, rng: random.Random, size: int) -> Grid:
    lo, hi = ring_bounds(size, preset.ring_step)
    if preset.kind == "flat":
        return [[0] * size for _ in range(size)]
    if preset.kind == "everest":
        return normalise(interior(hi), preset.max_height)
    if preset.kind == "mariana":
        return normalise(interior(lo), preset.max_height)
    grid = [[0] * (size + 2) for _ in range(size + 2)]
    lf = rng.uniform(*preset.landscape_factor)
    if preset.kind == "mix":
        gen_mix_board(grid, preset.push, lf, rng, lo, hi)
    else:
        board_scramble(grid, lf, rng, lo, hi, push=preset.push)
    return normalise(interior(grid), preset.max_height)


def crossing_cost(board: Grid, player: int) -> int:
    """Sum over the player's six start squares of the cheapest path cost to its finish edge."""
    size = len(board)
    start_row = size - 1 if player == 1 else 0
    goal_row = 0 if player == 1 else size - 1
    total = 0
    for _, col in START_LAYOUT:
        dist = {(start_row, col): 0}
        heap = [(0, start_row, col)]
        best = None
        while heap:
            d, r, c = heapq.heappop(heap)
            if d > dist.get((r, c), float("inf")):
                continue
            if r == goal_row:
                best = d
                break
            for dr, dc in ORTHOGONAL:
                nr, nc = r + dr, c + dc
                if 0 <= nr < size and 0 <= nc < size:
                    nd = d + step_cost(board, r, c, nr, nc)
                    if nd < dist.get((nr, nc), float("inf")):
                        dist[(nr, nc)] = nd
                        heapq.heappush(heap, (nd, nr, nc))
        total += best if best is not None else size * 3
    return total


def fairness_gap(board: Grid) -> tuple[int, float]:
    size = len(board)
    cost_gap = abs(crossing_cost(board, 1) - crossing_cost(board, 2))
    top = [h for row in board[: size // 2] for h in row]
    bottom = [h for row in board[size // 2 :] for h in row]
    mean_gap = abs(sum(top) / len(top) - sum(bottom) / len(bottom))
    return cost_gap, mean_gap


def is_fair(board: Grid) -> bool:
    cost_gap, mean_gap = fairness_gap(board)
    return cost_gap <= COST_TOLERANCE and mean_gap <= MEAN_HEIGHT_TOLERANCE


def generate_board(mode: str = "random", seed: int | None = None, size: int = BOARD_SIZE) -> GeneratedBoard:
    preset = TERRAIN_PRESETS.get(mode)
    if preset is None:
        raise ValueError(f"unknown terrain mode: {mode}")
    if seed is None:
        seed = random.randrange(1, 2**31)
    rng = random.Random(seed)

    best: Grid | None = None
    best_gap: tuple[int, float] | None = None
    for _ in range(MAX_ATTEMPTS):
        board = _raw_board(preset, rng, size)
        assert check_board(board), "generator produced an invalid board"
        gap = fairness_gap(board)
        if best_gap is None or gap < best_gap:
            best, best_gap = board, gap
        if is_fair(board):
            break
    assert best is not None
    return GeneratedBoard(board=best, seed=seed, mode=mode)
