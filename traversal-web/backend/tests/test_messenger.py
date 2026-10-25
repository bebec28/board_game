import pytest

from app.engine.apply import apply_move
from app.engine.explain import explain_move
from app.engine.models import ArmyError, IllegalMoveError
from app.engine.moves import valid_moves
from app.engine.setup import new_game, submit_army

from .conftest import flat_board, make_state, targets


def finishes(moves):
    return [m for m in moves if m.can_finish]


def test_messenger_moves_six_on_flat_ground():
    s = make_state(flat_board(), [("p1_4", "messenger", 1, 9, 4)])
    reach = targets(valid_moves(s, "p1_4"))
    assert (3, 4) in reach  # 6 rows straight ahead
    assert (2, 4) not in reach


def test_messenger_cannot_attack():
    s = make_state(flat_board(), [
        ("p1_4", "messenger", 1, 5, 5),
        ("p2_4", "explorer", 2, 4, 5),
    ])
    moves = valid_moves(s, "p1_4")
    assert not any(m.is_attack for m in moves)
    assert (4, 5) not in targets(moves)
    assert explain_move(s, "p1_4", 4, 5).reason == "cannot_attack"


def test_anything_captures_a_lone_messenger_even_uphill():
    board = flat_board()
    board[4][5] = 1  # messenger stands higher: the explorer attacks at 1 - 1 = 0 >= 0
    s = make_state(board, [
        ("p1_4", "messenger", 1, 4, 5),
        ("p2_4", "explorer", 2, 4, 6),
    ], turn=2)
    attack = next(m for m in valid_moves(s, "p2_4") if m.is_attack)
    assert attack.attacker_strength == 0 and attack.defender_strength == 0


def test_messenger_reinforced_defends_and_adds_nothing_as_ally():
    board = flat_board()
    board[4][5] = 1
    pieces = [
        ("p1_4", "messenger", 1, 4, 5),
        ("p1_3", "vanguard", 1, 5, 5),  # +1 reinforcement for the messenger
        ("p2_4", "explorer", 2, 4, 6),
    ]
    # Uphill explorer: 1 - 1 = 0 < 0 + 1.
    attacks = [m for m in valid_moves(make_state(board, pieces, turn=2), "p2_4") if m.is_attack]
    assert attacks == []
    # On level ground the explorer still gets through: 1 >= 0 + 1.
    attack = next(m for m in valid_moves(make_state(flat_board(), pieces, turn=2), "p2_4") if m.is_attack)
    assert attack.defender_strength == 1

    s2 = make_state(flat_board(), [
        ("p1_3", "vanguard", 1, 6, 5),
        ("p1_4", "messenger", 1, 5, 6),  # adjacent to the target, adds its strength (0)
        ("p2_4", "explorer", 2, 5, 5),
    ])
    attack = next(m for m in valid_moves(s2, "p1_3") if m.is_attack)
    assert attack.combat.allies == 0


def test_messenger_finishes_only_from_where_it_started():
    # Reaches row 0 with movement to spare, but did not start there: no finish.
    s = make_state(flat_board(), [("p1_4", "messenger", 1, 2, 5)])
    assert finishes(valid_moves(s, "p1_4")) == []
    # Starting on the final row: it may step straight off, and only from its own column.
    s2 = make_state(flat_board(), [("p1_4", "messenger", 1, 0, 5)])
    assert [(m.to_row, m.to_col) for m in finishes(valid_moves(s2, "p1_4"))] == [(-1, 5)]


def test_messenger_finish_scores_zero_but_ends_the_game():
    s = make_state(flat_board(), [
        ("p1_3", "vanguard", 1, 1, 2),
        ("p1_4", "messenger", 1, 0, 5),
        ("p1_2", "sentinel", 1, 9, 2),
        ("p2_2", "sentinel", 2, 0, 9),
    ])
    n = apply_move(s, "p1_3", -1, 2)  # 2 points for red
    n = apply_move(n, "p2_2", 1, 9)
    n = apply_move(n, "p1_4", -1, 5)  # second finish: game over, messenger adds 0
    assert n.game_over and n.winner == 1 and n.win_reason == "score"
    assert n.scores == [2, 0]
    assert n.history[-1].notation == "M f1-off" and n.history[-1].points == 0


def test_messenger_first_out_is_not_a_sentinel_win():
    s = make_state(flat_board(), [
        ("p1_4", "messenger", 1, 0, 5),
        ("p1_2", "sentinel", 1, 9, 2),
        ("p2_2", "sentinel", 2, 0, 9),
    ])
    n = apply_move(s, "p1_4", -1, 5)
    assert not n.game_over and n.scores == [0, 0] and n.first_to_finish == "p1_4"


# --- Army phase -------------------------------------------------------------------------


def test_classic_game_starts_in_play_phase():
    g = new_game(flat_board())
    assert g.phase == "play" and not g.variants


def test_army_phase_blocks_play_until_both_armies_are_in():
    g = new_game(flat_board(), variants=True)
    assert g.phase == "army"
    assert valid_moves(g, "p1_4") == []
    with pytest.raises(IllegalMoveError):
        apply_move(g, "p1_4", 8, 4)

    g = submit_army(g, 1, {"p1_4": "messenger"})
    assert g.phase == "army"
    assert g.piece("p1_4").type == "explorer"  # still secret
    g = submit_army(g, 2, {})
    assert g.phase == "play"
    m = g.piece("p1_4")
    assert (m.type, m.movement, m.strength) == ("messenger", 6, 0)
    assert g.piece("p1_5").type == "explorer"
    assert all(p.type != "messenger" for p in g.pieces if p.player == 2)
    assert valid_moves(g, "p1_4")


def test_army_choices_are_validated():
    g = new_game(flat_board(), variants=True)
    with pytest.raises(ArmyError):
        submit_army(g, 1, {"p2_4": "messenger"})  # not your piece
    with pytest.raises(ArmyError):
        submit_army(g, 1, {"p1_3": "messenger"})  # vanguard has no messenger variant
    g = submit_army(g, 1, {"p1_4": "explorer"})  # keeping the classic type is fine
    with pytest.raises(ArmyError):
        submit_army(g, 1, {})  # already submitted
    g = submit_army(g, 2, {"p2_4": "messenger", "p2_5": "messenger"})
    with pytest.raises(ArmyError):
        submit_army(g, 1, {})  # phase is over
