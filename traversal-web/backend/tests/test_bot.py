import random

from app.bot import choose_move
from app.engine.apply import apply_move
from app.engine.moves import find_move
from app.engine.setup import new_game
from app.terrain import generate_board

from .conftest import flat_board, make_state


def test_bot_takes_free_capture():
    s = make_state(flat_board(), [
        ("p1_2", "sentinel", 1, 5, 5),
        ("p2_4", "explorer", 2, 4, 5),
        ("p2_2", "sentinel", 2, 0, 9),
    ])
    m = choose_move(s, random.Random(1))
    assert (m.piece_id, m.to_row, m.to_col) == ("p1_2", 4, 5)


def test_bot_finishes_sentinel_for_instant_win():
    s = make_state(flat_board(), [("p1_2", "sentinel", 1, 1, 5), ("p2_4", "explorer", 2, 5, 0)])
    m = choose_move(s, random.Random(1))
    assert (m.piece_id, m.to_row) == ("p1_2", -1)


def test_self_play_reaches_an_ending():
    rng = random.Random(123)
    endings = set()
    for seed in range(3):
        g = new_game(generate_board("random", seed=seed).board)
        while not g.game_over:
            m = choose_move(g, rng)
            assert m is not None
            assert find_move(g, m.piece_id, m.to_row, m.to_col) is not None
            g = apply_move(g, m.piece_id, m.to_row, m.to_col)
        endings.add(g.win_reason or g.draw_reason)
    assert endings
