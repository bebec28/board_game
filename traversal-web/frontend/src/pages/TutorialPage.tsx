import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import TopBar from '../components/ui/TopBar'
import TutorialScene, { type PlayClock } from '../components/tutorial/TutorialScene'
import { LESSONS, type Lesson } from '../tutorial/lessons'
import { buildTimeline } from '../tutorial/timeline'

const SEEN_KEY = 'traversal.tutorial.seen'

function loadSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function saveSeen(ids: string[]) {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids))
  } catch {
    // Private mode or blocked storage: progress just isn't remembered.
  }
}

export default function TutorialPage() {
  const { lesson: lessonId } = useParams<{ lesson?: string }>()
  const navigate = useNavigate()
  const index = Math.max(0, LESSONS.findIndex((l) => l.id === lessonId))
  const lesson = LESSONS[index]
  const [seen, setSeen] = useState<string[]>(loadSeen)

  useEffect(() => {
    setSeen((s) => {
      if (s.includes(lesson.id)) return s
      const next = [...s, lesson.id]
      saveSeen(next)
      return next
    })
  }, [lesson.id])

  const go = (i: number) => {
    if (i >= 0 && i < LESSONS.length) navigate(`/tutoriel/${LESSONS[i].id}`)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="flex h-full flex-col">
      <TopBar
        right={
          <Link to="/" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-black transition hover:bg-accent-strong">
            Jouer une partie
          </Link>
        }
      />
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <nav className="scrollbar-thin flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-panel p-2 lg:w-64 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <div className="hidden px-2 pb-2 pt-1 lg:block">
            <div className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Tutoriel</div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-panel-2">
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(seen.filter((id) => LESSONS.some((l) => l.id === id)).length / LESSONS.length) * 100}%` }} />
            </div>
          </div>
          {LESSONS.map((l, i) => (
            <button
              key={l.id}
              onClick={() => go(i)}
              className={`flex shrink-0 items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition ${
                i === index ? 'bg-panel-2 text-ink' : 'text-ink-muted hover:bg-panel-2/60 hover:text-ink'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  i === index ? 'bg-accent text-black' : seen.includes(l.id) ? 'bg-accent/25 text-accent' : 'bg-panel-2 text-ink-muted'
                }`}
              >
                {seen.includes(l.id) && i !== index ? '✓' : i + 1}
              </span>
              <span className="min-w-0">
                <span className="block whitespace-nowrap text-sm font-semibold lg:whitespace-normal">{l.title}</span>
                <span className="hidden text-[11px] leading-snug text-ink-muted lg:block">{l.short}</span>
              </span>
            </button>
          ))}
        </nav>

        <LessonView key={lesson.id} lesson={lesson} index={index} onGo={go} />
      </div>
    </div>
  )
}

function LessonView({ lesson, index, onGo }: { lesson: Lesson; index: number; onGo: (i: number) => void }) {
  const timeline = useMemo(
    () => (lesson.scene ? buildTimeline(lesson.scene.board, lesson.scene.pieces, lesson.scene.script) : null),
    [lesson],
  )
  const clock = useRef<PlayClock>({ t: 0, playing: true, speed: 1 })
  const [caption, setCaption] = useState(-1)
  const [playing, setPlaying] = useState(true)
  const [slow, setSlow] = useState(false)
  const last = index === LESSONS.length - 1

  const togglePlay = () => {
    clock.current.playing = !clock.current.playing
    setPlaying(clock.current.playing)
  }
  const restart = () => {
    clock.current.t = 0
    clock.current.playing = true
    setPlaying(true)
  }
  const toggleSlow = () => {
    clock.current.speed = slow ? 1 : 0.5
    setSlow(!slow)
  }
  const jumpTo = (i: number) => {
    if (!timeline) return
    clock.current.t = timeline.captions[i].t0
    clock.current.playing = true
    setPlaying(true)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <>
      <section className="relative min-h-[340px] flex-1">
        {lesson.scene && timeline ? (
          <>
            <TutorialScene board={lesson.scene.board} timeline={timeline} clock={clock} onCaption={setCaption} />
            <div className="absolute left-3 top-3 flex gap-1.5">
              <SceneButton onClick={togglePlay} title="Espace">{playing ? '❚❚ Pause' : '▶ Lecture'}</SceneButton>
              <SceneButton onClick={restart}>↻ Recommencer</SceneButton>
              <SceneButton onClick={toggleSlow} active={slow}>Ralenti</SceneButton>
            </div>
            <div className="pointer-events-none absolute left-3 top-14 flex flex-col gap-1 text-[10px] text-ink-muted">
              <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-red" /> sortie de Rouge</span>
              <span className="flex items-center gap-1.5"><span className="h-1 w-4 rounded bg-blue" /> sortie de Bleu</span>
            </div>
            {caption >= 0 && (
              <div className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center px-4">
                <div key={caption} className="max-w-xl animate-slide-up rounded-2xl border border-line bg-panel/95 px-4 py-2.5 text-center text-sm font-medium shadow-2xl backdrop-blur">
                  {timeline.captions[caption].text}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-6">
            <div className="w-full max-w-sm animate-pop rounded-3xl border border-line bg-panel p-6 text-center shadow-2xl">
              <div className="text-xs font-semibold uppercase tracking-widest text-ink-muted">Tutoriel terminé</div>
              <h2 className="mt-2 text-3xl font-black">Prêt à jouer ?</h2>
              <p className="mt-2 text-sm text-ink-muted">Pendant la partie, le bouton « Pourquoi ? » explique tout coup impossible, et « Indice » te souffle un coup.</p>
              <Link to="/" className="mt-5 block rounded-xl bg-accent px-4 py-3 text-lg font-bold text-black transition hover:bg-accent-strong">
                Lancer une partie
              </Link>
            </div>
          </div>
        )}
      </section>

      <aside className="scrollbar-thin flex shrink-0 flex-col border-t border-line bg-panel lg:w-[380px] lg:border-l lg:border-t-0">
        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Leçon {index + 1} / {LESSONS.length}
          </div>
          <h1 className="mt-1 text-2xl font-black tracking-tight">{lesson.title}</h1>
          <div className="lesson-body mt-3 space-y-3 text-sm leading-relaxed text-ink-muted">{lesson.body}</div>

          {timeline && timeline.captions.length > 0 && (
            <div className="mt-5">
              <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">L’animation, étape par étape</div>
              <ol className="space-y-1">
                {timeline.captions.map((c, i) => (
                  <li key={i}>
                    <button
                      onClick={() => jumpTo(i)}
                      className={`flex w-full gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition ${
                        i === caption ? 'bg-accent/15 text-ink' : i < caption ? 'text-ink-muted' : 'text-ink-muted/60 hover:text-ink-muted'
                      }`}
                    >
                      <span className={`font-bold ${i === caption ? 'text-accent' : ''}`}>{i + 1}.</span>
                      {c.text}
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
        <div className="flex gap-2 border-t border-line p-3">
          <button
            onClick={() => onGo(index - 1)}
            disabled={index === 0}
            className="flex-1 rounded-lg bg-panel-2 px-3 py-2 text-sm font-semibold transition hover:bg-line disabled:opacity-40"
          >
            ← Précédent
          </button>
          {last ? (
            <Link to="/" className="flex-1 rounded-lg bg-accent px-3 py-2 text-center text-sm font-bold text-black transition hover:bg-accent-strong">
              Jouer !
            </Link>
          ) : (
            <button
              onClick={() => onGo(index + 1)}
              className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-bold text-black transition hover:bg-accent-strong"
            >
              Suivant →
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

function SceneButton({ children, onClick, active, title }: { children: React.ReactNode; onClick: () => void; active?: boolean; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold backdrop-blur-sm transition ${
        active ? 'bg-accent text-black' : 'bg-black/45 text-ink hover:bg-black/60'
      }`}
    >
      {children}
    </button>
  )
}
