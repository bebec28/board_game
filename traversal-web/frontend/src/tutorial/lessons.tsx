import type { ReactNode } from 'react'
import type { Action, TutPiece } from './timeline'

export interface Lesson {
  id: string
  title: string
  /** One line for the lesson list. */
  short: string
  body: ReactNode
  scene?: { board: number[][]; pieces: TutPiece[]; script: Action[] }
}

const flat = (rows: number, cols: number, h = 1) => Array.from({ length: rows }, () => Array(cols).fill(h) as number[])

const B = ({ children }: { children: ReactNode }) => <strong className="text-ink">{children}</strong>

export const LESSONS: Lesson[] = [
  {
    id: 'but',
    title: 'Le but du jeu',
    short: 'Traverser le plateau et sortir de l’autre côté',
    body: (
      <>
        <p>
          Deux joueurs, six pièces chacun, un plateau 10×10 en relief. <B>Rouge</B> part du bas et doit sortir par le bord du
          haut ; <B>Bleu</B> fait l’inverse.
        </p>
        <p>
          Chaque pièce qui sort rapporte des points égaux à sa <B>Force</B>. Dès que <B>deux pièces au total</B> sont sorties
          (peu importe à qui), la partie s’arrête et le meilleur score gagne.
        </p>
      </>
    ),
    scene: {
      board: [
        [1, 1, 1, 1, 2],
        [1, 1, 1, 1, 2],
        [0, 1, 1, 1, 1],
        [0, 1, 1, 1, 1],
        [1, 1, 1, 1, 0],
        [1, 1, 1, 1, 0],
      ],
      pieces: [
        { id: 're', type: 'explorer', player: 1, at: [5, 1] },
        { id: 'rs', type: 'sentinel', player: 1, at: [5, 0] },
        { id: 'bv', type: 'vanguard', player: 2, at: [0, 3] },
        { id: 'bs', type: 'sentinel', player: 2, at: [0, 4] },
      ],
      script: [
        { do: 'say', text: 'Rouge commence en bas et doit traverser jusqu’au bord du haut.' },
        { do: 'move', id: 're', path: [[4, 1], [3, 1], [2, 1], [1, 1]], costs: true },
        { do: 'clear' },
        { do: 'say', text: 'Bleu fait la course dans l’autre sens.' },
        { do: 'move', id: 'bv', path: [[1, 3], [2, 3], [3, 3]], costs: true },
        { do: 'clear' },
        { do: 'say', text: 'Sur la dernière rangée, avec du mouvement en réserve : la pièce sort !' },
        { do: 'move', id: 're', path: [[0, 1]] },
        { do: 'finish', id: 're', label: '+1 point' },
        { do: 'move', id: 'bv', path: [[4, 3], [5, 3]] },
        { do: 'finish', id: 'bv', label: '+2 points' },
        { do: 'say', text: 'Deux pièces sont sorties : fin de la partie. Bleu gagne 2 à 1.' },
      ],
    },
  },
  {
    id: 'pieces',
    title: 'Les trois pièces',
    short: 'Explorateur, Avant-garde, Sentinelle',
    body: (
      <>
        <p>
          Chaque camp a <B>2 Explorateurs</B>, <B>2 Avant-gardes</B> et <B>2 Sentinelles</B>. Le <B>Mouvement</B> d’une pièce
          (nombre de côtés de sa base) et sa <B>Force</B> (pointes au sommet) font toujours 6 : plus une pièce est rapide, plus
          elle est faible.
        </p>
        <PieceTable />
      </>
    ),
    scene: {
      board: flat(7, 5),
      pieces: [
        { id: 'e', type: 'explorer', player: 1, at: [6, 0] },
        { id: 'v', type: 'vanguard', player: 1, at: [6, 2] },
        { id: 's', type: 'sentinel', player: 1, at: [6, 4] },
      ],
      script: [
        { do: 'say', text: 'Explorateur : 5 de Mouvement, mais seulement 1 de Force.' },
        { do: 'move', id: 'e', path: [[5, 0], [4, 0], [3, 0], [2, 0], [1, 0]], costs: true },
        { do: 'say', text: 'Avant-garde : 4 de Mouvement, 2 de Force.' },
        { do: 'move', id: 'v', path: [[5, 2], [4, 2], [3, 2], [2, 2]], costs: true },
        { do: 'say', text: 'Sentinelle : 3 de Mouvement, 3 de Force.' },
        { do: 'move', id: 's', path: [[5, 4], [4, 4], [3, 4]], costs: true },
        { do: 'clear' },
        { do: 'label', at: [1, 0], text: 'Force 1', tone: 'info' },
        { do: 'label', at: [2, 2], text: 'Force 2', tone: 'info' },
        { do: 'label', at: [3, 4], text: 'Force 3', tone: 'info' },
        { do: 'say', text: 'Mouvement + Force = 6 : la vitesse se paie en force.' },
      ],
    },
  },
  {
    id: 'deplacement',
    title: 'Se déplacer sur le relief',
    short: 'Plat = 1, pente = différence + 1',
    body: (
      <>
        <p>
          À ton tour, tu déplaces <B>une seule pièce</B>, case par case, en avant, en arrière ou sur les côtés (jamais en
          diagonale), en changeant de direction si tu veux. Chaque pas coûte des points de Mouvement :
        </p>
        <ul>
          <li>
            <B>Plat</B> (même hauteur) : 1 point.
          </li>
          <li>
            <B>Monter ou descendre</B> : différence de hauteur + 1. De 2 à 4 coûte 3, et de 4 à 2 aussi.
          </li>
        </ul>
        <p>Le chemin le plus court en cases n’est donc pas toujours le moins cher : contourner une colline peut coûter moins que la franchir.</p>
      </>
    ),
    scene: {
      board: [
        [0, 0, 0, 0, 0],
        [0, 1, 2, 1, 0],
        [0, 2, 3, 2, 0],
        [0, 1, 2, 1, 0],
        [0, 0, 0, 0, 0],
      ],
      pieces: [{ id: 'v', type: 'vanguard', player: 1, at: [4, 2] }],
      script: [
        { do: 'say', text: 'L’Avant-garde a 4 points de Mouvement. Tout droit, il y a une colline.' },
        { do: 'move', id: 'v', path: [[3, 2]], costs: true },
        { do: 'bump', id: 'v', to: [2, 2], label: '+2 · 5/4 ✕' },
        { do: 'say', text: 'Monter de 0 à 2 coûte 3, puis de 2 à 3 coûte 2 : 5 points, c’est trop.' },
        { do: 'clear' },
        { do: 'place', id: 'v', at: [4, 2] },
        { do: 'say', text: 'En passant par le plat : plus de cases, mais moins cher.' },
        { do: 'move', id: 'v', path: [[4, 3], [4, 4], [3, 4], [2, 4]], costs: true },
        { do: 'say', text: 'Arrivée en dépensant 4 points pile.' },
      ],
    },
  },
  {
    id: 'obstacles',
    title: 'Les obstacles',
    short: 'On ne traverse pas les pièces',
    body: (
      <>
        <ul>
          <li>
            On ne traverse <B>aucune pièce</B>, ni alliée ni ennemie : il faut les contourner.
          </li>
          <li>On peut tourner autant qu’on veut pendant un déplacement.</li>
          <li>
            On ne peut pas <B>revenir sur sa case de départ</B> dans le même tour.
          </li>
          <li>Après le déplacement (ou une attaque), le tour passe à l’adversaire.</li>
        </ul>
      </>
    ),
    scene: {
      board: flat(5, 5),
      pieces: [
        { id: 's', type: 'sentinel', player: 1, at: [4, 2] },
        { id: 'e', type: 'explorer', player: 1, at: [3, 2] },
        { id: 'b', type: 'vanguard', player: 2, at: [1, 1] },
      ],
      script: [
        { do: 'say', text: 'La Sentinelle ne peut pas passer à travers une pièce, même alliée.' },
        { do: 'bump', id: 's', to: [3, 2], label: 'bloqué ✕' },
        { do: 'say', text: 'Elle la contourne : on peut tourner en cours de route.' },
        { do: 'move', id: 's', path: [[4, 3], [3, 3], [2, 3]], costs: true },
        { do: 'clear' },
        { do: 'place', id: 's', at: [4, 2] },
        { do: 'say', text: 'Interdit en revanche de revenir sur sa case de départ.' },
        { do: 'move', id: 's', path: [[4, 1]] },
        { do: 'bump', id: 's', to: [4, 2], label: 'départ ✕' },
      ],
    },
  },
  {
    id: 'explorateur',
    title: 'Les sauts de l’Explorateur',
    short: 'Diagonale ou saut de 2, sans coût de relief',
    body: (
      <>
        <p>
          Au lieu de son déplacement normal, l’Explorateur peut faire <B>un coup spécial</B> depuis sa case de départ, sans
          tenir compte de la hauteur :
        </p>
        <ul>
          <li>
            <B>1 pas en diagonale</B> ;
          </li>
          <li>
            <B>un saut de 2 cases</B> en ligne droite (avant, arrière, gauche, droite).
          </li>
        </ul>
        <p>Ces coups ne se combinent pas avec un déplacement normal, et le saut ne passe pas par-dessus une pièce.</p>
      </>
    ),
    scene: {
      board: [
        [0, 0, 0, 0, 0],
        [0, 1, 2, 1, 0],
        [1, 2, 4, 2, 1],
        [0, 1, 2, 1, 0],
        [0, 0, 0, 0, 0],
      ],
      pieces: [
        { id: 'e', type: 'explorer', player: 1, at: [4, 2] },
        { id: 'b', type: 'sentinel', player: 2, at: [3, 4] },
      ],
      script: [
        { do: 'say', text: 'À pied, gravir le sommet coûterait 3 + 3 = 6 : trop pour l’Explorateur (5).' },
        { do: 'move', id: 'e', path: [[3, 2]], costs: true },
        { do: 'bump', id: 'e', to: [2, 2], label: '+3 · 6/5 ✕' },
        { do: 'clear' },
        { do: 'place', id: 'e', at: [4, 2] },
        { do: 'say', text: 'Mais il peut sauter 2 cases en ligne droite, en ignorant le relief !' },
        { do: 'jump', id: 'e', to: [2, 2], label: 'saut' },
        { do: 'say', text: 'Ou faire un pas en diagonale, lui aussi sans coût de relief.' },
        { do: 'jump', id: 'e', to: [1, 3], label: 'diagonale' },
        { do: 'clear' },
        { do: 'place', id: 'e', at: [4, 4] },
        { do: 'say', text: 'Le saut ne passe pas par-dessus une pièce.' },
        { do: 'bump', id: 'e', to: [2, 4], jump: true, label: 'saut bloqué ✕' },
      ],
    },
  },
  {
    id: 'combat',
    title: 'Attaquer',
    short: 'Force attaquant ≥ Force défenseur',
    body: (
      <>
        <p>
          Au lieu d’aller sur une case vide, une pièce peut <B>attaquer</B> une pièce ennemie qu’elle peut atteindre : elle
          entre sur sa case et la capture.
        </p>
        <p>
          L’attaque n’est autorisée que si la <B>Force de l’attaquant est au moins égale</B> à celle du défenseur (l’égalité
          profite à l’attaquant). Une attaque termine le tour. Les pièces capturées sont retirées définitivement.
        </p>
      </>
    ),
    scene: {
      board: flat(5, 5),
      pieces: [
        { id: 'rv', type: 'vanguard', player: 1, at: [4, 1] },
        { id: 're', type: 'explorer', player: 1, at: [4, 3] },
        { id: 'be', type: 'explorer', player: 2, at: [1, 1] },
        { id: 'bs', type: 'sentinel', player: 2, at: [1, 3] },
      ],
      script: [
        { do: 'say', text: 'L’Avant-garde (Force 2) attaque l’Explorateur bleu (Force 1).' },
        { do: 'move', id: 'rv', path: [[3, 1], [2, 1]], costs: true },
        { do: 'capture', id: 'rv', target: 'be', label: '2 ≥ 1 ✓' },
        { do: 'say', text: 'Le défenseur est capturé : l’attaquant prend sa case et le tour s’arrête.' },
        { do: 'clear' },
        { do: 'say', text: 'L’Explorateur rouge (1) contre la Sentinelle (3) : attaque interdite.' },
        { do: 'move', id: 're', path: [[3, 3], [2, 3]], costs: true },
        { do: 'bump', id: 're', to: [1, 3], label: '1 < 3 ✕' },
      ],
    },
  },
  {
    id: 'hauteur',
    title: 'Hauteur et renforts',
    short: '+1 en descendant, −1 en montant, +1 par renfort',
    body: (
      <>
        <ul>
          <li>
            <B>Attaquer en descendant</B> (depuis une case plus haute que la cible) : <span className="text-accent">+1</span>.
          </li>
          <li>
            <B>Attaquer en montant</B> : <span className="text-red">−1</span>.
          </li>
          <li>
            <B>Renforts</B> : chaque pièce alliée collée au défenseur lui donne <span className="text-accent">+1</span> en défense.
          </li>
        </ul>
        <p>La hauteur compte depuis la case où l’attaquant a commencé son tour.</p>
      </>
    ),
    scene: {
      board: [
        [0, 0, 0, 0, 0, 0],
        [0, 0, 1, 0, 2, 0],
        [0, 1, 1, 1, 2, 1],
        [0, 1, 2, 1, 0, 0],
        [0, 0, 1, 0, 0, 0],
      ],
      pieces: [
        { id: 'rv', type: 'vanguard', player: 1, at: [3, 2] },
        { id: 'bv', type: 'vanguard', player: 2, at: [2, 2] },
        { id: 'be', type: 'explorer', player: 2, at: [1, 2] },
        { id: 'rs', type: 'sentinel', player: 1, at: [3, 4] },
        { id: 'bs', type: 'sentinel', player: 2, at: [2, 4] },
      ],
      script: [
        { do: 'say', text: 'L’Avant-garde rouge est en hauteur 2, sa cible en hauteur 1 : +1 en descendant.' },
        { do: 'label', at: [3, 2], text: '2 + 1 = 3', tone: 'red' },
        { do: 'say', text: 'L’Explorateur bleu collé au défenseur lui donne +1 de renfort.' },
        { do: 'mark', squares: [[1, 2]], tone: 'blue' },
        { do: 'label', at: [2, 2], text: '2 + 1 = 3', tone: 'blue' },
        { do: 'say', text: '3 contre 3 : égalité, l’attaquant gagne.' },
        { do: 'capture', id: 'rv', target: 'bv', label: '3 ≥ 3 ✓' },
        { do: 'clear' },
        { do: 'say', text: 'À l’inverse, attaquer en montant coûte −1.' },
        { do: 'label', at: [3, 4], text: '3 − 1 = 2', tone: 'red' },
        { do: 'label', at: [2, 4], text: '3', tone: 'blue' },
        { do: 'bump', id: 'rs', to: [2, 4], label: '2 < 3 ✕' },
      ],
    },
  },
  {
    id: 'allies',
    title: 'Attaquer à plusieurs',
    short: 'Les alliés autour de la cible ajoutent leur Force',
    body: (
      <>
        <p>
          Quand tu attaques, chacune de tes autres pièces <B>collée à la cible</B> ajoute sa <B>Force de base</B> à l’attaque.
          C’est la clé pour abattre une Sentinelle avec des pièces plus faibles.
        </p>
        <p className="rounded-lg bg-panel-2 px-3 py-2 text-xs">
          Attaque = Force + hauteur (±1) + Force des alliés autour de la cible (+1 charge d’Avant-garde)
          <br />
          Défense = Force + 1 par allié collé au défenseur
        </p>
      </>
    ),
    scene: {
      board: flat(5, 5),
      pieces: [
        { id: 'bs', type: 'sentinel', player: 2, at: [1, 2] },
        { id: 'rv', type: 'vanguard', player: 1, at: [1, 1] },
        { id: 're', type: 'explorer', player: 1, at: [3, 2] },
      ],
      script: [
        { do: 'say', text: 'Seul, l’Explorateur (Force 1) ne battrait pas la Sentinelle (Force 3)…' },
        { do: 'say', text: '…mais l’Avant-garde rouge collée à la cible ajoute sa Force : +2.' },
        { do: 'mark', squares: [[1, 1]], tone: 'red' },
        { do: 'label', at: [1, 1], text: '+2 allié', tone: 'red' },
        { do: 'move', id: 're', path: [[2, 2]], costs: true },
        { do: 'label', at: [2, 2], text: '1 + 2 = 3', tone: 'red' },
        { do: 'capture', id: 're', target: 'bs', label: '3 ≥ 3 ✓' },
        { do: 'say', text: 'Attention : les alliés du défenseur, eux, ne donnent que +1 chacun.' },
      ],
    },
  },
  {
    id: 'charge',
    title: 'La charge de l’Avant-garde',
    short: '+1 si la cible est à 4 points pile',
    body: (
      <>
        <p>
          Une Avant-garde gagne <span className="text-accent">+1</span> en attaque quand elle <B>doit utiliser ses 4 points de
          Mouvement</B> pour atteindre la cible (le chemin le plus court coûte exactement 4).
        </p>
        <p>Avec le relief, une cible proche en cases peut se trouver à 4 points pile : une montée ou une descente compte.</p>
      </>
    ),
    scene: {
      board: flat(5, 5),
      pieces: [
        { id: 'bs', type: 'sentinel', player: 2, at: [0, 2] },
        { id: 'a', type: 'vanguard', player: 1, at: [0, 4] },
        { id: 'v', type: 'vanguard', player: 1, at: [4, 2] },
      ],
      script: [
        { do: 'say', text: 'À 2 points de la Sentinelle, une Avant-garde n’a que sa Force : 2 contre 3.' },
        { do: 'move', id: 'a', path: [[0, 3]], costs: true },
        { do: 'bump', id: 'a', to: [0, 2], label: '2 < 3 ✕' },
        { do: 'clear' },
        { do: 'place', id: 'a', at: [0, 4] },
        { do: 'say', text: 'À 4 points pile, elle charge : +1.' },
        { do: 'move', id: 'v', path: [[3, 2], [2, 2], [1, 2]], costs: true },
        { do: 'capture', id: 'v', target: 'bs', label: '4/4 → 2 + 1 = 3 ≥ 3 ✓' },
      ],
    },
  },
  {
    id: 'score',
    title: 'Sortir et marquer',
    short: 'Dernière rangée + au moins 1 de Mouvement',
    body: (
      <>
        <p>
          Pour sortir, une pièce doit être sur la <B>dernière rangée</B> (celle du bord adverse) et avoir encore <B>au moins 1
          point de Mouvement</B>. Elle quitte le plateau et rapporte sa <B>Force</B> en points.
        </p>
        <p>
          La partie s’arrête quand <B>2 pièces au total</B> sont sorties : le meilleur score gagne, l’égalité donne un match nul.
        </p>
        <p>
          <B>Limite de coups</B> : à 200 coups, la partie s’arrête. Le meilleur score gagne ; si personne n’a marqué, c’est le
          camp dont la pièce est la plus proche de la sortie qui l’emporte.
        </p>
      </>
    ),
    scene: {
      board: [
        [1, 1, 1, 1, 1],
        [1, 1, 1, 2, 1],
        [1, 1, 1, 2, 1],
        [1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1],
      ],
      pieces: [
        { id: 'v', type: 'vanguard', player: 1, at: [3, 1] },
        { id: 'b', type: 'sentinel', player: 2, at: [0, 4] },
      ],
      script: [
        { do: 'say', text: 'L’Avant-garde atteint la dernière rangée en dépensant 3 points sur 4.' },
        { do: 'move', id: 'v', path: [[2, 1], [1, 1], [0, 1]], costs: true },
        { do: 'say', text: 'Il lui reste 1 point : elle peut sortir dans le même tour.' },
        { do: 'clear' },
        { do: 'finish', id: 'v', label: '+2 points' },
        { do: 'say', text: 'Elle rapporte sa Force : 2 points pour Rouge.' },
      ],
    },
  },
  {
    id: 'sentinelle',
    title: 'La victoire de la Sentinelle',
    short: 'Première pièce sortie = victoire immédiate',
    body: (
      <>
        <p>
          Si une <B>Sentinelle</B> est la <B>toute première pièce</B> à sortir (tous camps confondus), son camp <B>gagne
          immédiatement</B>, quel que soit le score.
        </p>
        <p>C’est la pièce la plus lente mais la plus dangereuse : l’adversaire doit toujours surveiller ses Sentinelles.</p>
      </>
    ),
    scene: {
      board: flat(5, 5),
      pieces: [
        { id: 'bs', type: 'sentinel', player: 2, at: [2, 2] },
        { id: 're', type: 'explorer', player: 1, at: [3, 0] },
        { id: 'rv', type: 'vanguard', player: 1, at: [1, 4] },
      ],
      script: [
        { do: 'say', text: 'Aucune pièce n’est encore sortie. La Sentinelle bleue file vers le bas.' },
        { do: 'move', id: 'bs', path: [[3, 2], [4, 2]], costs: true },
        { do: 'clear' },
        { do: 'finish', id: 'bs', label: 'Victoire immédiate !' },
        { do: 'say', text: 'Première pièce sortie, et c’est une Sentinelle : Bleu gagne tout de suite.' },
      ],
    },
  },
  {
    id: 'strategie',
    title: 'Conseils de stratégie',
    short: 'Hauteurs, formations, course ou combat',
    body: (
      <ul className="space-y-2">
        <li>
          <B>Tiens les hauteurs.</B> Attaquer en descendant donne +1, et l’ennemi qui monte vers toi perd 1.
        </li>
        <li>
          <B>Le gambit de la Sentinelle.</B> La faire sortir en premier gagne la partie, mais elle est lente : ouvre-lui la voie
          avec les autres pièces.
        </li>
        <li>
          <B>Défends en formation.</B> Des pièces collées se renforcent (+1 chacune), mais un groupe compact avance moins vite.
        </li>
        <li>
          <B>Prépare la charge.</B> Place tes Avant-gardes à 4 points pile d’une cible pour leur +1.
        </li>
        <li>
          <B>Contourne avec les Explorateurs.</B> Leurs diagonales et sauts surprennent, mais évite les combats directs.
        </li>
        <li>
          <B>Course ou combat ?</B> Parfois le plus rapide est d’éviter tout combat ; parfois une capture change tout le score.
        </li>
      </ul>
    ),
  },
]

function PieceTable() {
  const rows = [
    ['Explorateur', 'Cône pentagonal', 5, 1, 'Diagonale ou saut de 2, sans coût de relief'],
    ['Avant-garde', 'Coin en losange', 4, 2, '+1 en attaque à 4 points pile'],
    ['Sentinelle', 'Prisme triangulaire', 3, 3, 'Sortie en premier = victoire'],
  ] as const
  return (
    <table className="mt-2 w-full text-left text-xs">
      <thead className="text-ink-muted">
        <tr>
          <th className="py-1 font-semibold">Pièce</th>
          <th className="py-1 text-center font-semibold">Mvt</th>
          <th className="py-1 text-center font-semibold">Force</th>
          <th className="py-1 font-semibold">Spécial</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, shape, m, f, special]) => (
          <tr key={name} className="border-t border-line">
            <td className="py-1.5">
              <div className="font-semibold text-ink">{name}</div>
              <div className="text-[10px]">{shape}</div>
            </td>
            <td className="py-1.5 text-center text-base font-bold text-ink">{m}</td>
            <td className="py-1.5 text-center text-base font-bold text-ink">{f}</td>
            <td className="py-1.5">{special}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
