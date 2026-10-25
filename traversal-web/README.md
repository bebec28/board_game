# Traversal — version web

Implémentation du jeu de plateau 3D **Traversal** (règles officielles : https://www.traversalgame.com/rules), jouable dans le navigateur. Version actuelle : partie locale à deux sur le même écran, ou contre un bot.

- `backend/` — moteur de jeu autoritaire en Python (FastAPI). Règles, génération de terrain, bot.
- `frontend/` — React + Vite + TypeScript, plateau 3D (Three.js / react-three-fiber), UI façon chess.com.
- `docs/reference/` — moteur JS officiel (source de vérité des règles), textes des règles, exemple de plateau.

Le dossier voisin `../board_game/` est le projet d'origine (comptage des terrains) ; sa génération de terrain a été portée dans `backend/app/terrain/generator.py`.

## Prérequis

- [`uv`](https://docs.astral.sh/uv/) (Python 3.12 géré automatiquement)
- Node.js ≥ 20 (installé ici via nvm : `nvm use 24`)

## Lancer en local

Terminal 1 — API sur http://localhost:8000 (doc interactive sur `/docs`) :

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Terminal 2 — interface sur http://localhost:5173 (le proxy Vite redirige `/api` vers :8000) :

```bash
cd frontend
npm install
npm run dev
```

## Tests et qualité

```bash
cd backend && uv run pytest -q        # moteur, terrain, bot, API
cd backend && uv run ruff check app tests
cd frontend && npm run typecheck
cd frontend && npm run build
```

## Architecture

### Backend (`backend/app`)

| Module | Rôle |
|---|---|
| `engine/moves.py` | Génération des coups légaux (BFS avec coût de dénivelé, attaques, arrivées, spéciaux Explorateur). Port de la fonction `A` du moteur de référence. |
| `engine/combat.py` | Forces effectives (hauteur, alliés, renforts). |
| `engine/setup.py` | Position initiale ; avec les variantes, phase « army » où chaque joueur choisit en secret (`submit_army`) la pièce classique ou sa variante (`VARIANT_OF` dans `constants.py`, ex. Explorateur → Messager). |
| `engine/apply.py` | Application d'un coup, fins de partie (2 arrivées, Sentinelle première, élimination, limite de 200 plis, répétition). |
| `engine/notation.py` | Notation des coups (`V d10-d7`, `S f6xf5`, `E e2~off`). |
| `terrain/` | Générateur (marche aléatoire contrainte, |Δh| ≤ 2), presets, contrôle d'équité. |
| `bot/` | Évaluation statique + choix glouton avec vérification de la meilleure réponse adverse ; `army.py` choisit l'armée du bot en mode variantes. |
| `api/` | Routes REST, schémas Pydantic. `store/` : stockage en mémoire derrière un `Protocol`. |

### API

| Route | Description |
|---|---|
| `GET /api/terrains` | Modes de terrain |
| `POST /api/boards/generate` `{mode, seed?}` | Aperçu d'un plateau |
| `POST /api/games` `{terrain, mode: local\|bot, bot_player?, seed?}` | Créer une partie |
| `GET /api/games/{id}` | État |
| `GET /api/games/{id}/moves?piece=&both=` | Coups légaux |
| `POST /api/games/{id}/move` `{piece_id, to_row, to_col}` | Jouer (422 si illégal, 409 si fini / tour du bot) |
| `POST /api/games/{id}/bot-move` | Faire jouer le bot |
| `POST /api/games/{id}/resign` `{player}` | Abandonner |

Conventions : ligne 0 = haut du plateau (départ de Bleu, joueur 2) ; ligne 9 = bas (départ de Rouge, joueur 1, qui commence). Une arrivée est encodée par `to_row = -1` (Rouge) ou `10` (Bleu). `winner = 0` signifie match nul.

### Frontend (`frontend/src`)

- `store/gameStore.ts` — état de la partie (zustand), appels API, enchaînement humain → bot, animations.
- `components/three/` — scène R3F : `Terrain` (100 blocs colorés par hauteur), `PieceMesh` (cône pentagonal / coin / prisme triangulaire), `MoveHighlights` (vert = déplacement, rouge = attaque, violet = spécial, or = sortie), `CameraRig` (orbite + préréglages).
- `components/ui/` — barre latérale : cartes joueurs, fiche de pièce, liste des coups, overlay de fin, panneau d'options (caméra, affichage des déplacements : joueur actif / les deux camps / masqués).
- `lib/replay.ts` + `components/ui/ReplayBanner.tsx` — relecture des coups (← → dans la liste ou au clavier, ↑/Échap pour revenir au direct) ; la position est reconstruite côté client depuis l'historique, et chaque capture affiche le détail du combat enregistré par le moteur (`HistoryEntry.combat`).

## Suite prévue

- Multijoueur en ligne : WebSocket `/ws/games/{id}` poussant l'état, stockage Redis/Postgres via `GameStore`, jeton par siège, lien d'invitation. Le moteur est déjà autoritaire côté serveur.
- Bot plus fort (recherche à 2 plis sous budget de temps), horloges, sons, tutoriel.
