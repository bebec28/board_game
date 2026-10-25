import random

from app.bot import choose_army, choose_move
from app.engine.apply import apply_move
from app.engine.moves import find_move
from app.engine.setup import new_game, submit_army
from app.terrain import generate_board

from .conftest import flat_board, make_piece, make_state


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


def test_bot_closes_the_game_with_its_messenger_when_ahead():
    s = make_state(flat_board(), [
        ("p1_4", "messenger", 1, 0, 5),
        ("p1_2", "sentinel", 1, 9, 2),
        ("p2_2", "sentinel", 2, 3, 9),
    ], finished_pieces=["p1_3"], first_to_finish="p1_3")
    s.pieces.append(make_piece("p1_3", "vanguard", 1, 0, 0))
    s.pieces[-1].is_finished = True
    s.scores = [2, 0]
    m = choose_move(s, random.Random(1))
    assert (m.piece_id, m.to_row) == ("p1_4", -1)


def test_bot_does_not_close_the_game_when_behind():
    s = make_state(flat_board(), [
        ("p1_4", "messenger", 1, 0, 5),
        ("p1_2", "sentinel", 1, 9, 2),
        ("p2_2", "sentinel", 2, 3, 9),
    ], finished_pieces=["p2_3"], first_to_finish="p2_3")
    s.pieces.append(make_piece("p2_3", "vanguard", 2, 9, 0))
    s.pieces[-1].is_finished = True
    s.scores = [0, 2]
    m = choose_move(s, random.Random(1))
    assert not (m.piece_id == "p1_4" and m.to_row == -1)


def test_bot_army_choice_is_valid_and_self_play_with_variants_ends():
    rng = random.Random(7)
    for seed in range(2):
        g = new_game(generate_board("woodlands", seed=seed).board, variants=True)
        for player in (1, 2):
            g = submit_army(g, player, choose_army(g, player, rng))
        assert g.phase == "play"
        while not g.game_over:
            m = choose_move(g, rng)
            assert m is not None
            g = apply_move(g, m.piece_id, m.to_row, m.to_col)
