import pytest

from app.terrain import MAIN_MODES, TERRAIN_PRESETS, generate_board
from app.terrain.fairness import is_fair
from app.terrain.generator import check_board


@pytest.mark.parametrize("mode", list(TERRAIN_PRESETS))
def test_every_mode_produces_a_valid_board(mode):
    g = generate_board(mode, seed=42)
    b = g.board
    assert len(b) == 10 and all(len(row) == 10 for row in b)
    assert check_board(b)
    assert min(min(r) for r in b) == 0
    assert max(max(r) for r in b) <= TERRAIN_PRESETS[mode].max_height


def test_seed_is_reproducible():
    assert generate_board("mountains", seed=7).board == generate_board("mountains", seed=7).board
    assert generate_board("mountains", seed=7).board != generate_board("mountains", seed=8).board


@pytest.mark.parametrize("mode", MAIN_MODES)
def test_main_modes_are_fair_most_of_the_time(mode):
    fair = sum(is_fair(generate_board(mode, seed=s).board) for s in range(10))
    # Highlands splits the map in two halves by design, so it is harder to balance.
    assert fair >= (5 if mode == "highlands" else 8)


def test_main_modes_have_relief():
    g = generate_board("mountains", seed=3)
    assert max(max(r) for r in g.board) >= 3
