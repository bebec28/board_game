import { useState } from 'react'
import { Link } from 'react-router'
import type { GameState, Player } from '../../api/types'
import { PLAYER_COLORS, PLAYER_NAMES } from '../../lib/colors'

const REASONS: Record<string, string> = {
  sentinel_first: 'Une Sentinelle est sortie en premier',
  score: 'Victoire aux points',
  elimination: 'Victoire par élimination',
  resignation: 'Victoire par abandon',
  move_limit_score: 'Aux points, à la limite de coups',
  move_limit_advancement: "À l'avancement, à la limite de coups",
  equal_score: 'Égalité aux points',
  threefold_repetition: 'Triple répétition de la position',
  move_limit: 'Limite de coups atteinte',
}

const VICTORY_TYPES: Record<string, { title: string; subtitle: string }> = {
  total_domination: { title: 'Domination totale', subtitle: "Tu n'as pas seulement gagné, tu as supprimé toute possibilité de perdre." },
  perfect_game: { title: 'Partie parfaite', subtitle: 'Tu aurais pu finir plus tôt, mais où serait le plaisir ?' },
}

type Outcome = 'victory' | 'defeat' | 'draw'

interface Props {
  game: GameState
  onPlayAgain: (swapSides?: boolean) => void
  onReview: () => void
}

export default function GameOverOverlay({ game, onPlayAgain, onReview }: Props) {
  const [hidden, setHidden] = useState(false)
  if (!game.game_over) return null

  const draw = game.winner === 0 || game.winner === null
  const winner = draw ? null : (game.winner as Player)
  const human: Player | null = game.mode === 'bot' ? (game.bot_player === 1 ? 2 : 1) : null
  const outcome: Outcome = draw ? 'draw' : human === null || winner === human ? 'victory' : 'defeat'
  const reason = REASONS[game.win_reason ?? game.draw_reason ?? ''] ?? ''
  const special = game.victory_type ? VICTORY_TYPES[game.victory_type] : null

  const title =
    outcome === 'draw' ? 'Match nul' : outcome === 'defeat' ? 'Défaite' : human ? 'Victoire !' : `Victoire de ${PLAYER_NAMES[winner!]}`
  const accent = outcome === 'victory' ? '#f5c542' : outcome === 'defeat' ? '#9d9a95' : '#c9c3bb'

  if (hidden) {
    return (
      <button
        onClick={() => setHidden(false)}
        className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 animate-slide-up rounded-full border border-line bg-panel/95 px-4 py-2 text-sm font-semibold shadow-xl backdrop-blur hover:bg-panel-2"
      >
        <span style={{ color: accent }}>{title}</span> · voir le résultat
      </button>
    )
  }

  return (
    <div className="absolute inset-0 z-20 flex animate-fade-in items-center justify-center overflow-hidden bg-black/60 backdrop-blur-[3px]">
      {outcome === 'victory' && <Confetti colors={winner ? [PLAYER_COLORS[winner], '#f5c542', '#ffffff'] : undefined} />}
      <div className="relative w-[min(92vw,420px)] animate-pop rounded-3xl border border-line bg-panel px-6 pb-6 pt-4 text-center shadow-2xl">
        <button
          onClick={() => setHidden(true)}
          className="absolute right-4 top-3 text-ink-muted hover:text-ink"
          aria-label="Fermer et voir le plateau"
          title="Voir le plateau"
        >
          ✕
        </button>

        <div className="mx-auto h-36 w-36">
          {outcome === 'victory' && <VictoryEmblem color={winner ? PLAYER_COLORS[winner] : '#f5c542'} />}
          {outcome === 'defeat' && <DefeatEmblem color={PLAYER_COLORS[human!]} />}
          {outcome === 'draw' && <DrawEmblem />}
        </div>

        <h2
          className="mt-1 animate-slide-up text-4xl font-black tracking-tight [animation-delay:0.25s]"
          style={{ color: outcome === 'victory' ? (winner && !human ? PLAYER_COLORS[winner] : '#f5c542') : outcome === 'defeat' ? '#e6e3df' : undefined }}
        >
          {title}
        </h2>
        {special && <div className="mt-1 text-sm font-bold uppercase tracking-widest text-gold">{special.title}</div>}
        <div className="mt-1 text-sm text-ink-muted">{special ? special.subtitle : outcome === 'defeat' ? defeatLine(reason) : reason}</div>

        <ScoreBoard game={game} winner={winner} />

        <div className="mt-6 grid gap-2">
          <button
            onClick={() => onPlayAgain(false)}
            className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-base font-bold text-black transition hover:bg-accent-strong"
          >
            <ReplayIcon /> Rejouer
          </button>
          <div className="grid grid-cols-2 gap-2">
            {game.mode === 'bot' && (
              <SecondaryButton onClick={() => onPlayAgain(true)}>
                <SwapIcon /> Changer de camp
              </SecondaryButton>
            )}
            <SecondaryButton onClick={onReview}>
              <FilmIcon /> Revoir la partie
            </SecondaryButton>
            <SecondaryButton onClick={() => setHidden(true)}>
              <EyeIcon /> Voir le plateau
            </SecondaryButton>
            <Link
              to="/"
              className={`${game.mode === 'bot' ? '' : 'col-span-2 '}flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold transition hover:bg-panel-2`}
            >
              <HomeIcon /> Nouvelle partie
            </Link>
          </div>
          <Link
            to="/tutoriel"
            className={`mt-1 text-xs transition hover:text-ink ${outcome === 'defeat' ? 'font-semibold text-gold' : 'text-ink-muted'}`}
          >
            {outcome === 'defeat' ? 'Revoir les règles dans le tutoriel →' : 'Tutoriel : les règles en animation →'}
          </Link>
        </div>
      </div>
    </div>
  )
}

function defeatLine(reason: string): string {
  return reason ? reason.replace(/^Victoire/, 'Défaite') : 'Ce sera pour la prochaine.'
}

function ScoreBoard({ game, winner }: { game: GameState; winner: Player | null }) {
  const stats = ([1, 2] as Player[]).map((pl) => ({
    pl,
    score: game.scores[pl - 1],
    captures: game.history.filter((h) => h.player === pl && h.captured_id).length,
    finished: game.history.filter((h) => h.player === pl && h.finished).length,
  }))
  return (
    <div className="mt-5 animate-slide-up rounded-2xl bg-panel-2 p-3 [animation-delay:0.4s]">
      <div className="flex items-center justify-center gap-5">
        {stats.map((s, i) => (
          <div key={s.pl} className={`flex items-center gap-5 ${i === 1 ? 'flex-row-reverse' : ''}`}>
            <div className="flex flex-col items-center">
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: PLAYER_COLORS[s.pl] }}>
                {PLAYER_NAMES[s.pl]} {winner === s.pl && '👑'}
              </span>
              <span className="text-4xl font-black tabular-nums" style={{ color: PLAYER_COLORS[s.pl] }}>
                {s.score}
              </span>
            </div>
            {i === 0 && <span className="text-2xl text-ink-muted">–</span>}
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1 border-t border-line pt-2 text-[11px] text-ink-muted">
        <Stat label="Coups" value={game.history.length} />
        <Stat label="Captures" value={`${stats[0].captures} – ${stats[1].captures}`} />
        <Stat label="Pièces sorties" value={`${stats[0].finished} – ${stats[1].finished}`} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-bold tabular-nums text-ink">{value}</div>
      <div>{label}</div>
    </div>
  )
}

function SecondaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2.5 text-sm font-semibold transition hover:bg-panel-2"
    >
      {children}
    </button>
  )
}

function Confetti({ colors = ['#f5c542', '#e24a4a', '#3b82f6', '#81b64c', '#ffffff'] }: { colors?: string[] }) {
  const [bits] = useState(() =>
      Array.from({ length: 70 }, (_, i) => ({
        left: Math.random() * 100,
        color: colors[i % colors.length],
        drift: `${(Math.random() - 0.5) * 220}px`,
        spin: `${(Math.random() - 0.5) * 1440}deg`,
        dur: `${2.6 + Math.random() * 2.2}s`,
        delay: `${Math.random() * 0.9}s`,
        w: 5 + Math.random() * 6,
      })),
  )
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {bits.map((b, i) => (
        <span
          key={i}
          className="confetti"
          style={
            {
              left: `${b.left}%`,
              width: b.w,
              background: b.color,
              '--drift': b.drift,
              '--spin': b.spin,
              '--dur': b.dur,
              '--delay': b.delay,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  )
}

/** Gold trophy in a laurel wreath, with slowly turning rays behind it. */
function VictoryEmblem({ color }: { color: string }) {
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const a = ((115 + i * 19) * Math.PI) / 180
    const x = 60 + Math.cos(a) * 46
    const y = 62 + Math.sin(a) * 46
    const rot = 115 + i * 19 + 90
    return { x, y, rot }
  })
  return (
    <div className="relative h-full w-full">
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full animate-spin-slow opacity-60" aria-hidden>
        <defs>
          <radialGradient id="ray" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5c542" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#f5c542" stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 12 }, (_, i) => (
          <path key={i} d="M60 60 L56 0 L64 0 Z" fill="url(#ray)" transform={`rotate(${i * 30} 60 60)`} />
        ))}
      </svg>
      <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full animate-emblem" aria-hidden>
        <defs>
          <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe8a3" />
            <stop offset="45%" stopColor="#f5c542" />
            <stop offset="100%" stopColor="#b8860b" />
          </linearGradient>
          <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a8d26b" />
            <stop offset="100%" stopColor="#4f7d2c" />
          </linearGradient>
        </defs>
        <g>
          {leaves.map((l, i) => (
            <ellipse key={`l${i}`} cx={l.x} cy={l.y} rx="8" ry="3.4" fill="url(#leaf)" transform={`rotate(${l.rot} ${l.x} ${l.y})`} />
          ))}
          <g transform="translate(120 0) scale(-1 1)">
            {leaves.map((l, i) => (
              <ellipse key={`r${i}`} cx={l.x} cy={l.y} rx="8" ry="3.4" fill="url(#leaf)" transform={`rotate(${l.rot} ${l.x} ${l.y})`} />
            ))}
          </g>
        </g>
        <g className="animate-shimmer">
          <path d="M40 30 H30 C30 44 36 51 45 53" fill="none" stroke="url(#gold)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M80 30 H90 C90 44 84 51 75 53" fill="none" stroke="url(#gold)" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M38 24 H82 V46 C82 61 72 71 60 71 C48 71 38 61 38 46 Z" fill="url(#gold)" />
          <path d="M44 28 H50 V46 C50 54 53 60 57 64 C48 62 44 55 44 46 Z" fill="#fff6d6" opacity="0.5" />
          <rect x="55.5" y="70" width="9" height="12" fill="url(#gold)" />
          <rect x="45" y="82" width="30" height="7" rx="2" fill="url(#gold)" />
          <rect x="40" y="89" width="40" height="9" rx="2.5" fill={color} />
          <path d="M60 36 L62.9 42 L69.5 42.6 L64.5 47 L66 53.5 L60 50 L54 53.5 L55.5 47 L50.5 42.6 L57.1 42 Z" fill="#fff6d6" />
        </g>
      </svg>
    </div>
  )
}

/** Cracked steel shield that drops in and splits. */
function DefeatEmblem({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full animate-emblem-fall" aria-hidden>
      <defs>
        <linearGradient id="steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8d8a86" />
          <stop offset="55%" stopColor="#56534f" />
          <stop offset="100%" stopColor="#34322f" />
        </linearGradient>
      </defs>
      <path d="M60 12 L98 25 V57 C98 83 81 99 60 110 C39 99 22 83 22 57 V25 Z" fill="url(#steel)" stroke="#2a2826" strokeWidth="2" />
      <path d="M60 22 L88 32 V57 C88 77 76 90 60 99 C44 90 32 77 32 57 V32 Z" fill={color} opacity="0.35" />
      <path d="M60 22 V99" stroke="#2a2826" strokeWidth="1.5" opacity="0.4" />
      <path
        d="M63 12 L55 34 L67 49 L52 66 L63 82 L57 110"
        fill="none"
        stroke="#1a1917"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeDasharray="120"
        className="animate-crack"
      />
      <path d="M55 34 L46 38 M67 49 L76 46 M52 66 L42 70" stroke="#1a1917" strokeWidth="2" strokeDasharray="120" className="animate-crack" />
    </svg>
  )
}

/** Two crossed swords, one per side. */
function DrawEmblem() {
  const sword = (fill: string) => (
    <g>
      <path d="M57.5 14 L60 6 L62.5 14 V78 H57.5 Z" fill="#d9d6d1" stroke="#7a7672" strokeWidth="0.8" />
      <rect x="47" y="78" width="26" height="5" rx="2" fill={fill} />
      <rect x="57.5" y="83" width="5" height="15" rx="1.5" fill="#5a4632" />
      <circle cx="60" cy="101" r="4" fill={fill} />
    </g>
  )
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full animate-emblem" aria-hidden>
      <g transform="rotate(-40 60 60)">{sword(PLAYER_COLORS[1])}</g>
      <g transform="rotate(40 60 60)">{sword(PLAYER_COLORS[2])}</g>
    </svg>
  )
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

function ReplayIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}
function SwapIcon() {
  return (
    <svg {...iconProps}>
      <path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7" />
    </svg>
  )
}
function FilmIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 4v16l14-8z" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M3 11 12 3l9 8M5 9.5V21h14V9.5" />
    </svg>
  )
}
