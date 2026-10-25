"""Terrain modes. Parameters feed `generate_board` in `app.terrain.fairness`."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TerrainPreset:
    id: str
    label: str
    description: str
    kind: str = "scramble"  # "scramble" | "mix" | "everest" | "mariana" | "flat"
    landscape_factor: tuple[float, float] = (0.3, 0.7)  # sampled uniformly per board
    push: int = 150
    ring_step: int = 1
    max_height: int = 5


TERRAIN_PRESETS: dict[str, TerrainPreset] = {
    "random": TerrainPreset(
        "random", "Random", "A randomly generated terrain with natural variety.",
        landscape_factor=(0.3, 0.7),
    ),
    "mountains": TerrainPreset(
        "mountains", "Mountains", "High peaks with dramatic elevation changes.",
        landscape_factor=(0.15, 0.3), max_height=6,
    ),
    "valleys": TerrainPreset(
        "valleys", "Valleys", "Deep valleys surrounded by gentle ridges.",
        landscape_factor=(0.7, 0.85), max_height=6,
    ),
    "highlands": TerrainPreset(
        "highlands", "Highlands", "Mountains and valleys combined across a divided landscape.",
        kind="mix", landscape_factor=(0.5, 0.5), push=250, max_height=6,
    ),
    "woodlands": TerrainPreset(
        "woodlands", "Woodlands", "Mostly flat terrain with gentle rolling hills.",
        landscape_factor=(0.4, 0.6), push=80, max_height=3,
    ),
    "desert": TerrainPreset(
        "desert", "Desert", "Extremely flat with rare isolated spikes.",
        landscape_factor=(0.3, 0.3), push=40, max_height=3,
    ),
    "everest": TerrainPreset(
        "everest", "Everest", "Towering peak at the center, edges at sea level.",
        kind="everest", max_height=5,
    ),
    "mariana": TerrainPreset(
        "mariana", "Mariana", "Deep trench at the center, edges at max elevation.",
        kind="mariana", max_height=5,
    ),
    "hell": TerrainPreset("hell", "Hell", "Completely flat. No terrain. No mercy.", kind="flat"),
}

# Modes shown on the home page, in order.
MAIN_MODES = ["random", "mountains", "valleys", "highlands", "woodlands", "desert"]
