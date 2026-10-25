from __future__ import annotations

import random
from dataclasses import asdict

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..bot import choose_army, choose_move
from ..engine import (
    ArmyError,
    GameState,
    IllegalMoveError,
    all_valid_moves,
    apply_move,
    explain_move,
    new_game,
    resign,
    submit_army,
    valid_moves,
)
from ..store import GameStore
from ..terrain import generate_board
from .deps import get_store
from .schemas import (
    ArmyIn,
    CreateGameIn,
    ExplanationOut,
    GameStateOut,
    HintOut,
    HistoryEntryOut,
    MoveOut,
    MoveResultOut,
    PlayMoveIn,
    ResignIn,
)

router = APIRouter(prefix="/games", tags=["games"])


def _state_out(state: GameState) -> GameStateOut:
    d = state.to_dict()
    d.pop("position_history", None)
    # Army choices stay secret until both are in (they are then visible on the pieces).
    d["army_ready"] = [c is not None for c in d.pop("army_choices")]
    return GameStateOut.model_validate(d)


def _load(store: GameStore, game_id: str) -> GameState:
    state = store.get(game_id)
    if state is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Game not found")
    return state


@router.post("", response_model=GameStateOut, status_code=status.HTTP_201_CREATED)
def create_game(body: CreateGameIn, store: GameStore = Depends(get_store)) -> GameStateOut:
    try:
        generated = generate_board(body.terrain, body.seed)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    bot_player = (body.bot_player or 2) if body.mode == "bot" else None
    state = new_game(
        generated.board, mode=body.mode, bot_player=bot_player,
        terrain=generated.mode, seed=generated.seed, variants=body.variants,
    )
    if state.phase == "army" and bot_player is not None:
        state = submit_army(state, bot_player, choose_army(state, bot_player, random.Random()))
    store.put(state)
    return _state_out(state)


@router.post("/{game_id}/army", response_model=GameStateOut)
def choose_army_route(game_id: str, body: ArmyIn, store: GameStore = Depends(get_store)) -> GameStateOut:
    state = _load(store, game_id)
    if state.mode == "bot" and body.player == state.bot_player:
        raise HTTPException(status.HTTP_409_CONFLICT, "The bot picks its own army")
    try:
        new_state = submit_army(state, body.player, body.choices)
    except ArmyError as exc:
        code = status.HTTP_409_CONFLICT if state.phase != "army" else 422
        raise HTTPException(code, str(exc)) from exc
    store.put(new_state)
    return _state_out(new_state)


@router.get("/{game_id}", response_model=GameStateOut)
def get_game(game_id: str, store: GameStore = Depends(get_store)) -> GameStateOut:
    return _state_out(_load(store, game_id))


@router.get("/{game_id}/moves", response_model=dict[str, list[MoveOut]])
def get_moves(
    game_id: str,
    piece: str | None = Query(default=None),
    both: bool = Query(default=False),
    store: GameStore = Depends(get_store),
) -> dict[str, list[MoveOut]]:
    state = _load(store, game_id)
    if state.game_over:
        return {}
    if piece is not None:
        moves = {piece: valid_moves(state, piece)}
    else:
        moves = all_valid_moves(state, include_opponent=both)
    return {pid: [MoveOut.model_validate(asdict(m)) for m in mv] for pid, mv in moves.items()}


@router.get("/{game_id}/explain", response_model=ExplanationOut)
def explain(
    game_id: str,
    piece: str,
    row: int,
    col: int,
    store: GameStore = Depends(get_store),
) -> ExplanationOut:
    state = _load(store, game_id)
    try:
        ex = explain_move(state, piece, row, col)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    return ExplanationOut.model_validate(asdict(ex))


@router.get("/{game_id}/hint", response_model=HintOut)
def hint(game_id: str, store: GameStore = Depends(get_store)) -> HintOut:
    state = _load(store, game_id)
    if state.game_over:
        raise HTTPException(status.HTTP_409_CONFLICT, "Game is over")
    if state.phase != "play":
        raise HTTPException(status.HTTP_409_CONFLICT, "Armies are not chosen yet")
    if state.mode == "bot" and state.current_turn == state.bot_player:
        raise HTTPException(status.HTTP_409_CONFLICT, "It is the bot's turn")
    choice = choose_move(state, random.Random())
    if choice is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "No legal move")
    return HintOut(piece_id=choice.piece_id, to_row=choice.to_row, to_col=choice.to_col)


def _play(store: GameStore, state: GameState, piece_id: str, to_row: int, to_col: int) -> MoveResultOut:
    try:
        new_state = apply_move(state, piece_id, to_row, to_col)
    except IllegalMoveError as exc:
        code = status.HTTP_409_CONFLICT if state.game_over or state.phase != "play" else 422
        raise HTTPException(code, str(exc)) from exc
    store.put(new_state)
    return MoveResultOut(
        state=_state_out(new_state),
        applied=HistoryEntryOut.model_validate(asdict(new_state.history[-1])),
    )


@router.post("/{game_id}/move", response_model=MoveResultOut)
def play_move(game_id: str, body: PlayMoveIn, store: GameStore = Depends(get_store)) -> MoveResultOut:
    state = _load(store, game_id)
    if state.mode == "bot" and state.current_turn == state.bot_player:
        raise HTTPException(status.HTTP_409_CONFLICT, "It is the bot's turn")
    return _play(store, state, body.piece_id, body.to_row, body.to_col)


@router.post("/{game_id}/bot-move", response_model=MoveResultOut)
def bot_move(game_id: str, store: GameStore = Depends(get_store)) -> MoveResultOut:
    state = _load(store, game_id)
    if state.game_over:
        raise HTTPException(status.HTTP_409_CONFLICT, "Game is over")
    if state.phase != "play":
        raise HTTPException(status.HTTP_409_CONFLICT, "Armies are not chosen yet")
    if state.mode != "bot" or state.current_turn != state.bot_player:
        raise HTTPException(status.HTTP_409_CONFLICT, "It is not the bot's turn")
    choice = choose_move(state, random.Random())
    if choice is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Bot has no legal move")
    return _play(store, state, choice.piece_id, choice.to_row, choice.to_col)


@router.post("/{game_id}/resign", response_model=GameStateOut)
def resign_game(game_id: str, body: ResignIn, store: GameStore = Depends(get_store)) -> GameStateOut:
    state = _load(store, game_id)
    try:
        new_state = resign(state, body.player)
    except IllegalMoveError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    store.put(new_state)
    return _state_out(new_state)
