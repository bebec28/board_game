import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../api/client'
import type { GameMode, GeneratedBoard, Player, Terrain } from '../api/types'
import { useGameStore } from '../store/gameStore'
import TopBar from '../components/ui/TopBar'
import { heightColor, PLAYER_COLORS } from '../lib/colors'

export default function HomePage() {
  const navigate = useNavigate()
  const newGame = useGameStore((s) => s.newGame)
  const [terrains, setTerrains] = useState<Terrain[]>([])
  const [terrain, setTerrain] = useState('random')
  const [mode, setMode] = useState<GameMode>('local')
  const [botPlayer, setBotPlayer] = useState<Player>(2)
  const [preview, setPreview] = useState<GeneratedBoard | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.listTerrains().then(setTerrains).catch((e) => setError(String(e.message ?? e)))
  }, [])

  useEffect(() => {
    let cancelled = false
    setPreview(null)
    api
      .generateBoard(terrain)
      .then((b) => {
        if (!cancelled) setPreview(b)
      })
      .catch((e) => setError(String(e.message ?? e)))
    return () => {
      cancelled = true
    }
  }, [terrain])

  const regenerate = () => {
    api.generateBoard(terrain).then(setPreview).catch((e) => setError(String(e.message ?? e)))
  }

  const start = async () => {
    setBusy(true)
    setError(null)
    try {
      const g = await newGame({
        terrain,
        mode,
        bot_player: mode === 'bot' ? botPlayer : undefined,
        seed: preview?.seed,
      })
      navigate(`/game/${g.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible de créer la partie')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <TopBar />
      <main className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 lg:grid-cols-[1fr_380px]">
          <section>
            <h1 className="text-3xl font-black tracking-tight">Nouvelle partie</h1>
            <p className="mt-1 text-sm text-ink-muted">
              Choisis un terrain. Chaque partie se joue sur un plateau différent : traverse-le, capture, et fais sortir tes pièces par le bord opposé.
            </p>

            <h2 className="mt-7 text-xs font-semibold uppercase tracking-widest text-ink-muted">Terrain</h2>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {terrains.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTerrain(t.id)}
                  className={`rounded-xl border px-3.5 py-3 text-left transition ${
                    terrain === t.id
                      ? 'border-accent bg-panel-2 shadow-[0_0_0_1px_rgba(129,182,76,0.4)]'
                      : 'border-line bg-panel hover:border-ink-muted/50'
                  }`}
                >
                  <div className="font-semibold">{t.label}</div>
                  <div className="mt-0.5 text-xs leading-snug text-ink-muted">{t.description}</div>
                </button>
              ))}
            </div>

            <h2 className="mt-7 text-xs font-semibold uppercase tracking-widest text-ink-muted">Mode</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Toggle active={mode === 'local'} onClick={() => setMode('local')}>
                Deux joueurs (même écran)
              </Toggle>
              <Toggle active={mode === 'bot'} onClick={() => setMode('bot')}>
                Contre le bot
              </Toggle>
              {mode === 'bot' && (
                <div className="ml-2 flex items-center gap-1.5 text-sm text-ink-muted">
                  Je joue
                  <Toggle small active={botPlayer === 2} onClick={() => setBotPlayer(2)}>
                    <Dot c={PLAYER_COLORS[1]} /> Rouge (commence)
                  </Toggle>
                  <Toggle small active={botPlayer === 1} onClick={() => setBotPlayer(1)}>
                    <Dot c={PLAYER_COLORS[2]} /> Bleu
                  </Toggle>
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                onClick={() => void start()}
                disabled={busy || !preview}
                className="rounded-xl bg-accent px-6 py-3 text-lg font-bold text-black transition hover:bg-accent-strong disabled:opacity-50"
              >
                {busy ? 'Création…' : 'Jouer'}
              </button>
              {error && <span className="text-sm text-red">{error}</span>}
            </div>

            <Rules />
          </section>

          <aside className="lg:sticky lg:top-8 lg:self-start">
            <div className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Aperçu du plateau</div>
                <button onClick={regenerate} className="rounded-md bg-panel-2 px-2.5 py-1 text-xs font-medium hover:bg-line">
                  Régénérer
                </button>
              </div>
              <div className="mt-3">
                {preview ? <BoardPreview board={preview.board} /> : <div className="aspect-square animate-pulse rounded-lg bg-panel-2" />}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-ink-muted">
                <span>Bleu part du haut · Rouge part du bas</span>
                {preview && <span>seed {preview.seed}</span>}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

function BoardPreview({ board }: { board: number[][] }) {
  return (
    <div className="grid aspect-square grid-cols-10 gap-[2px] rounded-lg bg-black/40 p-[2px]">
      {board.flatMap((row, r) =>
        row.map((h, c) => (
          <div
            key={`${r},${c}`}
            className="flex items-center justify-center rounded-[3px] text-[10px] font-semibold text-black/60"
            style={{ background: `#${heightColor(h).getHexString()}` }}
            title={`(${r + 1}, ${String.fromCharCode(97 + c)}) hauteur ${h}`}
          >
            {h}
          </div>
        )),
      )}
    </div>
  )
}

function Toggle({
  active,
  onClick,
  children,
  small,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  small?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg border font-medium transition ${
        small ? 'px-2.5 py-1 text-xs' : 'px-4 py-2 text-sm'
      } ${active ? 'border-accent bg-accent/15 text-ink' : 'border-line bg-panel text-ink-muted hover:text-ink'}`}
    >
      {children}
    </button>
  )
}

function Dot({ c }: { c: string }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ background: c }} />
}

function Rules() {
  return (
    <details className="mt-10 rounded-xl border border-line bg-panel p-4 text-sm text-ink-muted open:bg-panel-2/40">
      <summary className="cursor-pointer font-semibold text-ink">Règles en bref</summary>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 leading-relaxed">
        <li>Plateau 10×10 en relief. Chaque joueur a 6 pièces : 2 Explorateurs (Mouvement 5 / Force 1), 2 Avant-gardes (4 / 2), 2 Sentinelles (3 / 3).</li>
        <li>Les pièces se déplacent en ligne droite ou en tournant, jamais à travers une autre pièce. Un pas sur du plat coûte 1 ; monter ou descendre coûte la différence de hauteur + 1.</li>
        <li>Attaquer une pièce adjacente au chemin : l'attaque réussit si Force ≥ Force du défenseur (égalité pour l'attaquant). +1 en attaquant depuis plus haut, −1 depuis plus bas. Les alliés adjacents à la cible ajoutent leur Force ; les alliés adjacents au défenseur ajoutent +1 chacun.</li>
        <li>Faire sortir une pièce par le bord opposé rapporte sa Force en points. La partie se termine quand <strong>deux pièces au total</strong> sont sorties : le score le plus élevé gagne.</li>
        <li>Si une Sentinelle est la toute première pièce à sortir, son camp gagne immédiatement.</li>
      </ul>
    </details>
  )
}
