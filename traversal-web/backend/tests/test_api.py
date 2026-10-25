import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client():
    return TestClient(create_app())


def test_terrains_and_board_generation(client):
    r = client.get("/api/terrains")
    assert r.status_code == 200 and {t["id"] for t in r.json()} >= {"random", "mountains"}
    r = client.post("/api/boards/generate", json={"mode": "valleys", "seed": 5})
    assert r.status_code == 200
    assert len(r.json()["board"]) == 10 and r.json()["seed"] == 5
    assert client.post("/api/boards/generate", json={"mode": "nope"}).status_code == 422


def test_game_flow(client):
    r = client.post("/api/games", json={"terrain": "hell", "mode": "local"})
    assert r.status_code == 201
    game = r.json()
    gid = game["id"]
    assert game["current_turn"] == 1 and len(game["pieces"]) == 12

    assert client.get(f"/api/games/{gid}").status_code == 200
    assert client.get("/api/games/missing").status_code == 404

    moves = client.get(f"/api/games/{gid}/moves").json()
    assert "p1_4" in moves and all(not m["is_attack"] for m in moves["p1_4"])

    bad = client.post(f"/api/games/{gid}/move", json={"piece_id": "p1_4", "to_row": 0, "to_col": 0})
    assert bad.status_code == 422

    first = moves["p1_4"][0]
    ok = client.post(
        f"/api/games/{gid}/move",
        json={"piece_id": "p1_4", "to_row": first["to_row"], "to_col": first["to_col"]},
    )
    assert ok.status_code == 200
    body = ok.json()
    assert body["state"]["current_turn"] == 2 and body["applied"]["piece_id"] == "p1_4"
    assert body["state"]["history"][-1]["notation"].startswith("E e10")

    # Not the bot's turn in a local game.
    assert client.post(f"/api/games/{gid}/bot-move").status_code == 409

    r = client.post(f"/api/games/{gid}/resign", json={"player": 2})
    assert r.status_code == 200 and r.json()["winner"] == 1
    assert client.post(f"/api/games/{gid}/move", json={"piece_id": "p2_4", "to_row": 1, "to_col": 4}).status_code == 409


def test_bot_game(client):
    game = client.post("/api/games", json={"terrain": "hell", "mode": "bot", "seed": 1}).json()
    gid = game["id"]
    assert game["bot_player"] == 2
    assert client.post(f"/api/games/{gid}/bot-move").status_code == 409  # human first
    moves = client.get(f"/api/games/{gid}/moves").json()
    m = moves["p1_2"][0]
    client.post(f"/api/games/{gid}/move", json={"piece_id": "p1_2", "to_row": m["to_row"], "to_col": m["to_col"]})
    # Human cannot move for the bot.
    human_again = client.post(f"/api/games/{gid}/move", json={"piece_id": "p2_2", "to_row": 1, "to_col": 2})
    assert human_again.status_code == 409
    r = client.post(f"/api/games/{gid}/bot-move")
    assert r.status_code == 200 and r.json()["state"]["current_turn"] == 1
