import type { PcHat, PcRole, PcSkin } from '../types'

// Paleta "Argila Claude" da barra principal
export const CLAY = '#D97757'
export const CLAY_LIGHT = '#E8957A'
// o âmbar do "!" do mascote e da barra do terminal quando o Claude espera
// você; no desktop a barra e o "!" usam ALERT_THEMED, o âmbar do tema
export const ALERT = '#F5C542'

/** A colour per theme: the bar paints `dark` by default and `light` on a light card. */
export type Themed = { dark: string; light: string }

/**
 * The desktop "needs you" bar in the amber the alert title is drawn in there,
 * so bar and title are one amber per theme. The title names the theme key
 * 'warning'; only the desktop app draws this SVG bar, and it paints that key
 * with its own token --cds-text-warning: #E49C06 on dark, #794C02 on light
 * (Claude desktop, November 2026; its older palette has #DB9300 and #734500, a
 * shade off). Both read as they are (6.6:1 on #252525, 6.7:1 on #F5F4EF). The
 * terminal's 'warning' is another amber (#FFC107 dark, #966C1E light in Claude
 * Code 2.1.318), but the terminal draws a Raster in ALERT, never this bar. An
 * SVG cannot read a theme key, so if the app changes its token this drifts.
 */
export const ALERT_THEMED: Themed = { dark: '#E49C06', light: '#794C02' }

export type RoleInfo = { label: string; color: string; light: string }

export const ROLES: Record<PcRole, RoleInfo> = {
  developer: { label: "developer", color: "#378ADD", light: "#85B7EB" },
  artist: { label: "artist", color: "#D4537E", light: "#ED93B1" },
  researcher: { label: "researcher", color: "#B8864E", light: "#DDB98A" },
  worker: { label: "worker", color: "#639922", light: "#97C459" },
  boss: { label: "boss", color: "#6A4BE0", light: "#A28CF2" },
  tester: { label: "tester", color: "#F07A1E", light: "#F8B27A" },
  codex: { label: "codex", color: "#10A37F", light: "#6FD3B5" },
  // council stages (see council.ts)
  voter: { label: "voter", color: "#D4A017", light: "#EBC65E" },
  scribe: { label: "scribe", color: "#A04FB8", light: "#C98FDA" },
  skeptic: { label: "skeptic", color: "#1FA8C4", light: "#7BCFE0" },
}

/** The party skin's name and symbol for each role (`/crew-skin party`). */
export const PARTY: Record<PcRole, { label: string; symbol: string }> = {
  developer: { label: 'wizard', symbol: '✶' },
  artist: { label: 'bard', symbol: '♪' },
  researcher: { label: 'ranger', symbol: '➶' },
  worker: { label: 'fighter', symbol: '⚔' },
  boss: { label: 'dungeon master', symbol: '⚅' },
  tester: { label: 'cleric', symbol: '✚' },
  codex: { label: 'warforged', symbol: '⚙' },
  voter: { label: 'herald', symbol: '⚑' },
  scribe: { label: 'sage', symbol: '❦' },
  skeptic: { label: 'rogue', symbol: '†' },
}

export function roleLabel(role: PcRole, skin: PcSkin = 'crew'): string {
  return skin === 'party' ? PARTY[role].label : ROLES[role].label
}

export function roleSymbol(role: PcRole, skin: PcSkin = 'crew'): string {
  return skin === 'party' ? PARTY[role].symbol : ROLE_SYMBOL[role]
}

/** One symbol per role, drawn before the bar and on each panel row. */
export const ROLE_SYMBOL: Record<PcRole, string> = {
  developer: '⌨',
  artist: '✎',
  researcher: '⌕',
  worker: '⚒',
  boss: '♛',
  tester: '✓',
  codex: '⚡',
  voter: '☑',
  scribe: '✒',
  skeptic: '‽',
}

const PAL: Record<string, string> = {
  X: CLAY, E: "#1F1410",
  Y: "#F2C230", y: "#C99A1E", J: "#F08A24", L: "#FFF6C8",
  Q: ALERT, q: "#B8861A", R: "#E24B4A", I: "#534AB7",
  W: "#F4F4F4", K: "#2A2E36", k: "#4A505C", G: "#C9CCD1", g: "#9A9EA6",
  P: "#D93A3A", p: "#A32626", C: "#3B8FE0", H: "#8A5A2B",
  F: "#9A6A3A", f: "#7A4F28", M: "#FFE9A8",
  V: "#F07A1E", v: "#B85A12", N: "#E8D7B5", n: "#888780",
  O: "#E6E8EB", S: "#111418", A: "#10A37F", Z: "#8A8F98", D: "#2C2F33",
  U: "#6A4BE0", u: "#4A32B0",
  // council gear: pale lens glass
  c: "#B9DDF3",
  // the party skin: the ranger's greens
  T: "#3E8A3A", t: "#2C5E28",
  // the scribe's quill: the feather's vane and its highlight, the cream and
  // white of N and W in the dark, their own letters so the light theme can
  // tone the feather alone (markTones) and leave the ballot and tome be
  B: "#E8D7B5", b: "#F4F4F4",
}

const W = 18
const H = 15

type Grid = string[][]

function box(g: Grid, ch: string, x0: number, x1: number, y0: number, y1: number) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (y >= 0 && y < H && x >= 0 && x < W) g[y]![x] = ch
}

function dot(g: Grid, ch: string, ...cells: Array<[number, number]>) {
  for (const [x, y] of cells) box(g, ch, x, x, y, y)
}

// Clawd, o mascote do Claude Code: tronco largo, bracinhos no meio,
// olhos de 1x2 e quatro perninhas
function eyes(g: Grid) {
  box(g, "E", 6, 6, 8, 9)
  box(g, "E", 11, 11, 8, 9)
}

function clawd(g: Grid) {
  box(g, "X", 4, 13, 6, 12)
  box(g, "X", 2, 3, 9, 10)
  box(g, "X", 14, 15, 9, 10)
  for (const x of [4, 6, 11, 13]) box(g, "X", x, x, 13, 14)
  eyes(g)
}

// Acessórios de cada papel, desenhados por cima do Clawd
const GEAR: Record<Exclude<PcRole, "codex">, (g: Grid) => void> = {
  // capacete de obra com lanterna + chave inglesa
  worker: g => {
    box(g, "Y", 7, 10, 2, 2)
    box(g, "Y", 6, 11, 3, 4)
    box(g, "J", 8, 9, 3, 3)
    dot(g, "L", [7, 3])
    box(g, "y", 3, 14, 5, 5)
    dot(g, "Z", [0, 5], [2, 5], [0, 6], [1, 6], [2, 6], [1, 7], [1, 8])
  },
  // rei: coroa com rubi, capa roxa com gola de arminho e cetro
  boss: g => {
    box(g, "U", 3, 3, 6, 12)
    box(g, "U", 14, 14, 6, 12)
    box(g, "u", 2, 2, 11, 13)
    box(g, "u", 15, 15, 11, 13)
    box(g, "W", 4, 13, 6, 6)
    dot(g, "K", [5, 6], [8, 6], [11, 6])
    dot(g, "Q", [5, 3], [8, 3], [9, 3], [12, 3])
    box(g, "Q", 5, 12, 4, 5)
    box(g, "R", 8, 9, 4, 4)
    box(g, "Q", 16, 16, 4, 10)
    box(g, "R", 16, 16, 3, 3)
  },
  // fone de ouvido + notebook
  developer: g => {
    box(g, "K", 5, 12, 5, 5)
    dot(g, "K", [4, 5], [13, 5])
    box(g, "K", 3, 4, 6, 9)
    box(g, "K", 13, 14, 6, 9)
    box(g, "k", 3, 3, 7, 8)
    box(g, "k", 14, 14, 7, 8)
    box(g, "g", 5, 12, 10, 10)
    box(g, "G", 5, 12, 11, 12)
    box(g, "I", 8, 9, 11, 11)
  },
  // boina vermelha + pincel erguido + paleta
  artist: g => {
    box(g, "p", 8, 9, 3, 3)
    box(g, "P", 6, 11, 4, 4)
    box(g, "p", 5, 12, 5, 5)
    box(g, "X", 16, 16, 8, 10)
    box(g, "H", 16, 16, 3, 7)
    box(g, "C", 16, 16, 1, 2)
    dot(g, "W", [16, 0])
    box(g, "N", 0, 1, 8, 10)
    dot(g, "R", [0, 9])
    dot(g, "C", [1, 8])
    dot(g, "Y", [1, 10])
  },
  // chapéu de explorador trançado + lampião
  researcher: g => {
    box(g, "F", 6, 11, 3, 4)
    for (let x = 6; x <= 11; x++) dot(g, "f", [x, (x % 2) + 3])
    box(g, "f", 3, 14, 5, 5)
    box(g, "X", 16, 16, 9, 10)
    box(g, "H", 16, 16, 4, 8)
    box(g, "Z", 15, 17, 1, 3)
    dot(g, "M", [16, 2])
  },
  // óculos de proteção laranja + lanterna de cabeça + prancheta
  tester: g => {
    box(g, "v", 4, 13, 6, 6)
    box(g, "M", 8, 9, 5, 5)
    box(g, "V", 5, 7, 7, 10)
    box(g, "V", 10, 12, 7, 10)
    box(g, "V", 8, 9, 8, 8)
    box(g, "N", 0, 1, 8, 11)
    box(g, "Z", 0, 1, 7, 7)
    dot(g, "n", [0, 9], [1, 9], [0, 10])
    eyes(g)
  },
  // right arm raised holding a cream ballot card high (blue header, dark
  // tick), and a gold-and-red rosette pinned on the chest
  voter: g => {
    box(g, ".", 14, 15, 9, 10)
    box(g, "X", 14, 15, 7, 8)
    box(g, "X", 16, 17, 5, 6)
    box(g, "N", 12, 17, 1, 4)
    box(g, "C", 12, 17, 0, 0)
    dot(g, "K", [16, 1], [13, 2], [15, 2], [16, 2], [13, 3], [14, 3], [15, 3], [14, 4])
    box(g, "Q", 7, 9, 10, 12)
    dot(g, "P", [8, 11])
  },
  // round white spectacles, a quill (cream feather, brown shaft) held up in
  // the left hand and an ink pot by the right
  scribe: g => {
    for (const x of [5, 10]) {
      box(g, "W", x, x + 2, 7, 10)
      box(g, "X", x + 1, x + 1, 8, 9)
    }
    box(g, "W", 8, 9, 8, 8)
    eyes(g)
    dot(g, "B", [0, 0], [0, 1], [1, 1], [0, 2], [1, 2], [2, 2], [1, 3], [2, 3], [1, 4], [2, 4], [3, 4], [2, 5], [3, 5])
    dot(g, "b", [1, 1], [1, 2], [2, 3], [2, 4])
    box(g, "H", 3, 3, 6, 7)
    dot(g, "H", [2, 8])
    box(g, "I", 16, 17, 10, 11)
    box(g, "Z", 16, 17, 9, 9)
  },
  // a big magnifying glass held up on the left (brass rim, pale lens with a
  // glint, brown handle), one brow raised and the other eye squinting
  skeptic: g => {
    box(g, "q", 0, 4, 0, 4)
    dot(g, ".", [0, 0], [4, 0], [0, 4], [4, 4])
    box(g, "c", 1, 3, 1, 3)
    dot(g, "W", [1, 1])
    box(g, "H", 3, 3, 5, 8)
    box(g, "X", 6, 6, 8, 8)
    box(g, "E", 5, 7, 9, 9)
    dot(g, "E", [10, 6], [11, 6], [12, 6])
  },
}

// Codex: um robozinho de tela, personagem próprio
function codex(g: Grid, a = "A") {
  box(g, a, 8, 9, 0, 0)
  box(g, "Z", 8, 9, 1, 2)
  box(g, "O", 4, 13, 3, 8)
  box(g, "S", 5, 12, 4, 7)
  box(g, a, 7, 7, 5, 5)
  box(g, a, 10, 10, 5, 5)
  box(g, a, 8, 9, 6, 6)
  box(g, a, 5, 12, 9, 11)
  box(g, "Z", 2, 4, 9, 10)
  box(g, "Z", 13, 15, 9, 10)
  box(g, "D", 6, 7, 12, 13)
  box(g, "D", 10, 11, 12, 13)
}

// The party skin: the same Clawd, dressed for a D&D table
const PARTY_GEAR: Record<Exclude<PcRole, "codex">, (g: Grid) => void> = {
  // wizard: a tall blue hat with stars, a staff with a glowing orb
  developer: g => {
    dot(g, "C", [10, 0])
    box(g, "C", 9, 10, 1, 1)
    box(g, "C", 8, 11, 2, 2)
    box(g, "C", 7, 11, 3, 3)
    box(g, "C", 6, 12, 4, 4)
    dot(g, "Y", [8, 3], [10, 2])
    box(g, "I", 3, 14, 5, 5)
    // the staff stands on the ground, the hand on it
    box(g, "H", 16, 16, 2, 14)
    box(g, "c", 15, 17, 0, 1)
    dot(g, "W", [15, 0])
    dot(g, "X", [16, 9])
  },
  // cleric: a white hood with gold trim, a holy symbol on the chest, a mace
  tester: g => {
    box(g, "W", 5, 12, 3, 5)
    box(g, "Q", 4, 13, 5, 5)
    dot(g, "Q", [8, 2], [9, 2])
    // the cross sits under the eyes, not through them
    box(g, "Q", 8, 9, 10, 12)
    box(g, "Q", 7, 10, 11, 11)
    box(g, "H", 16, 16, 6, 10)
    box(g, "g", 15, 17, 3, 5)
    dot(g, "G", [16, 4])
  },
  // ranger: a green hood and cloak (the hands out of it, like the boss's
  // cape), a longbow, a quiver with two red-fletched arrows
  researcher: g => {
    box(g, "T", 5, 12, 3, 5)
    dot(g, "T", [13, 3], [13, 4], [14, 4])
    box(g, "t", 3, 3, 6, 12)
    box(g, "t", 14, 14, 6, 12)
    dot(g, "H", [1, 3], [0, 4], [0, 5], [0, 6], [0, 7], [0, 8], [0, 9], [0, 10], [0, 11], [1, 12])
    box(g, "W", 1, 1, 4, 11)
    box(g, "F", 16, 17, 4, 8)
    dot(g, "f", [16, 6], [17, 6])
    dot(g, "P", [16, 2], [17, 1])
    dot(g, "H", [16, 3], [17, 2], [17, 3])
  },
  // fighter: a steel helm with a red plume, a sword, a blue shield
  worker: g => {
    box(g, "g", 5, 12, 3, 5)
    box(g, "G", 6, 11, 3, 3)
    box(g, "K", 5, 12, 5, 5)
    box(g, "P", 8, 9, 1, 2)
    box(g, "W", 16, 16, 0, 7)
    box(g, "Q", 15, 17, 8, 8)
    box(g, "H", 16, 16, 9, 10)
    box(g, "C", 0, 2, 7, 12)
    dot(g, "Q", [1, 9], [1, 10])
  },
  // bard: a red feathered cap and a lute, the hand on its neck and its body
  // below the arm
  artist: g => {
    box(g, "R", 6, 11, 3, 4)
    box(g, "p", 5, 12, 5, 5)
    dot(g, "Y", [11, 2], [12, 1], [13, 0], [12, 2])
    box(g, "F", 15, 17, 11, 13)
    dot(g, "E", [16, 12])
    box(g, "H", 16, 16, 6, 10)
    dot(g, "f", [16, 5], [17, 5])
  },
  // dungeon master: a purple hood and robe, the DM screen, a red d20
  boss: g => {
    box(g, "U", 5, 12, 3, 5)
    dot(g, "U", [8, 2], [9, 2])
    box(g, "u", 3, 3, 6, 13)
    box(g, "u", 14, 14, 6, 13)
    box(g, "H", 5, 12, 11, 12)
    dot(g, "f", [6, 11], [11, 11])
    box(g, "R", 15, 17, 6, 8)
    dot(g, "R", [16, 5], [16, 9])
    dot(g, "W", [16, 7])
  },
  // rogue: a dark hood, a mask across the eyes (the eyes drawn back on it), a dagger
  skeptic: g => {
    box(g, "K", 5, 12, 3, 5)
    dot(g, "K", [4, 5], [13, 5])
    box(g, "k", 4, 13, 8, 9)
    eyes(g)
    box(g, "W", 1, 1, 3, 7)
    box(g, "Q", 0, 2, 8, 8)
    box(g, "H", 1, 1, 9, 10)
  },
  // sage: a grey hood, a white beard, a thick tome tucked under the arm (the
  // arm drawn back over it)
  scribe: g => {
    box(g, "g", 5, 12, 3, 5)
    dot(g, "g", [8, 2], [9, 2])
    box(g, "W", 6, 11, 10, 12)
    eyes(g)
    box(g, "N", 0, 3, 9, 12)
    box(g, "H", 0, 0, 9, 12)
    dot(g, "n", [2, 11], [3, 11])
    box(g, "X", 2, 3, 9, 10)
  },
  // herald: a red-and-gold banner on a pole, the rosette kept
  voter: g => {
    box(g, "H", 17, 17, 0, 12)
    box(g, "P", 13, 16, 1, 4)
    box(g, "Q", 13, 16, 3, 3)
    dot(g, "X", [16, 9], [16, 10])
    box(g, "Q", 7, 9, 10, 12)
    dot(g, "P", [8, 11])
  },
}

// what the band's mascot wears while a quick-run job runs
const HATS: Record<PcHat, (g: Grid) => void> = {
  hardhat: GEAR.worker,
  lantern: GEAR.researcher,
  magnifier: GEAR.skeptic,
  goggles: GEAR.tester,
  quill: GEAR.scribe,
  // a red bandana and a broom with straw bristles
  broom: g => {
    box(g, "R", 5, 12, 4, 5)
    dot(g, "R", [13, 5], [14, 6])
    box(g, "H", 16, 16, 1, 9)
    box(g, "Y", 15, 17, 10, 13)
    box(g, "y", 15, 17, 10, 10)
  },
}

function grid(role: PcRole | "clawd", skin: PcSkin = "crew", hat?: PcHat): Grid {
  const g: Grid = Array.from({ length: H }, () => Array<string>(W).fill("."))
  if (role === "codex") {
    // the warforged: the same robot, amber-eyed, with a leather strap
    codex(g, skin === "party" ? "Q" : "A")
    if (skin === "party") box(g, "H", 4, 13, 8, 8)
  } else {
    clawd(g)
    if (role !== "clawd") (skin === "party" ? PARTY_GEAR : GEAR)[role](g)
    else if (hat) HATS[hat](g)
  }
  return g
}

export type Sprite = { source: string; width: number; height: number }

/**
 * Sprite do personagem em SVG, desenhado como imagem (fundo transparente) e
 * recortado no próprio desenho, para centralizar ao lado de uma barra. Com
 * `bob`, o quadro ímpar sobe 1 pixel: o mod troca o quadro enquanto ele
 * trabalha, então o personagem pula.
 */
export function spriteSvg(role: PcRole | "clawd", px = 2, bob = false, frame = 0, body?: string, skin: PcSkin = "crew"): Sprite {
  const g = grid(role, skin)
  let top = H
  let bottom = 0
  let left = W
  let right = 0
  g.forEach((row, r) =>
    row.forEach((ch, c) => {
      if (!PAL[ch]) return
      top = Math.min(top, r)
      bottom = Math.max(bottom, r)
      left = Math.min(left, c)
      right = Math.max(right, c)
    }),
  )
  const rects = pixelRects(spritePixels(role, bob, frame, body, skin))
  // uma linha a mais em cima para o pulo
  const vw = right - left + 1
  const vh = bottom - top + 2
  const width = vw * px
  const height = vh * px
  return {
    source: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${left} ${top - 1} ${vw} ${vh}" shape-rendering="crispEdges">${rects}</svg>`,
    width,
    height,
  }
}

/** The panel character's pixels, which spriteSvg draws: the grid, bobbed. */
export function spritePixels(role: PcRole | "clawd", bob = false, frame = 0, body?: string, skin: PcSkin = "crew"): Pixel[] {
  const g = grid(role, skin)
  // a council persona's colour paints the body (X) in place of the clay
  const paint = (ch: string) => (ch === "X" && body ? body : PAL[ch])
  const dy = bob && frame % 2 === 1 ? -1 : 0
  const pixels: Pixel[] = []
  g.forEach((row, r) =>
    row.forEach((ch, c) => {
      const fill = paint(ch)
      if (fill) pixels.push({ x: c, y: r + dy, fill, tone: ch === "X" ? undefined : toneOf(g, c, r, ch) })
    }),
  )
  return pixels
}

/**
 * O que o mascote da faixa está fazendo: andando na ponta da barra enquanto
 * trabalha, pulando entre confetes no 100%, dormindo quando nada acontece, de
 * braço erguido quando espera por você, tremendo quando algo falhou.
 */
export type Pose = 'walk' | 'jump' | 'sleep' | 'alert' | 'shake'

const CONFETTI = ['#F5C542', '#D4537E', '#378ADD', '#639922', '#FFF6C8', '#F07A1E']
const Z_GLYPH = ['XXXXX', '...X.', '..X..', '.X...', 'XXXXX']
// colunas do confete e onde cada pedaço começa a cair, espalhados à mão
const CONFETTI_X = [0, 3, 5, 8, 10, 13, 15, 17, 1, 6, 11, 16]
const CONFETTI_Y = [3, 0, 5, 2, 6, 1, 4, 0, 6, 3, 2, 5]

/**
 * One pixel of the mascot. `fill` is what the terminal Raster paints; a mark
 * that must read on a light card too (the "!", the sleep Z, the confetti, the
 * quill's feather, a pale pixel on the sprite's edge) also carries `tone`, the
 * colour per theme the desktop SVG paints instead.
 */
export type Pixel = { x: number; y: number; fill: string; tone?: Themed; mark?: '!' | 'z' }

// the "!" (three pixels and a dot) and the Z as cells from their top-left corner
const BANG_CELLS: Array<[number, number]> = [[0, 0], [0, 1], [0, 2], [0, 4]]
const Z_CELLS = Z_GLYPH.flatMap((row, j) => [...row].flatMap((ch, i): Array<[number, number]> => (ch === 'X' ? [[i, j]] : [])))
// where each mark may stand, best first: the "!" over the raised hand (x=17),
// else the nearest column to its left with room, a row higher if need be; the
// Z rising from (12,0) to (13,-1) beside the head, else still in one of them,
// else on the open left side, away from what the hand holds up
const BANG_SPOTS: Array<[number, number]> = [17, 16, 15, 14, 13, 12].flatMap((x): Array<[number, number]> => [[x, 0]]).concat([17, 16, 15, 14, 13, 12].map((x): [number, number] => [x, -1]))
const Z_SPOTS: Array<Array<[number, number]>> = [
  [[12, 0], [13, -1], [0, -1]],
  [[13, -1], [12, 0], [0, -1]],
]

/**
 * The first spot where the mark has a pixel of air all round: none of its
 * cells on the sprite or 4-beside it, so it reads as its own shape and never
 * as the tip of a broom, a lantern or a sceptre.
 */
function clearSpot(g: Grid, cells: Array<[number, number]>, spots: Array<[number, number]>): [number, number] {
  const busy = (x: number, y: number) => {
    const ch = g[y]?.[x]
    return ch !== undefined && ch !== '.'
  }
  const air = ([x0, y0]: [number, number]) =>
    cells.every(([i, j]) => [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].every(([a, b]) => !busy(x0 + i + a!, y0 + j + b!)))
  return spots.find(air) ?? spots[0]!
}

/**
 * How far a shake moves the sprite without anything leaving the frame's
 * columns 0 to 17: `want` (one pixel left or right) when the whole sprite fits
 * there, else 0 when it fits the other way (the shake swings between the
 * middle and the free side). When neither side has a free column (the quill's
 * feather at 0, its ink pot at 17), the body still moves by `want` and `held`
 * names the gear cells that hold still in every frame: each piece of gear
 * (cells that differ from the bare Clawd, joined side by side) that touches
 * column 0 or 17.
 */
function shakeOf(g: Grid, want: number): { dx: number; held: Set<string> } {
  const held = new Set<string>()
  if (!want) return { dx: 0, held }
  const cols = g.flatMap(row => row.flatMap((ch, c) => (ch !== '.' ? [c] : [])))
  const fits = (d: number) => Math.min(...cols) + d >= 0 && Math.max(...cols) + d <= W - 1
  if (fits(want)) return { dx: want, held }
  if (fits(-want)) return { dx: 0, held }
  const bare = grid('clawd')
  const gear = (x: number, y: number) => (g[y]?.[x] ?? '.') !== '.' && g[y]![x] !== bare[y]![x]
  const seen = new Set<string>()
  g.forEach((row, r) =>
    row.forEach((_, c) => {
      if (!gear(c, r) || seen.has(`${c},${r}`)) return
      // one piece: the gear cells joined to this one
      const piece: Array<[number, number]> = []
      const todo: Array<[number, number]> = [[c, r]]
      seen.add(`${c},${r}`)
      while (todo.length) {
        const [x, y] = todo.pop()!
        piece.push([x, y])
        for (const [a, b] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]] as Array<[number, number]>)
          if (gear(a, b) && !seen.has(`${a},${b}`)) seen.add(`${a},${b}`), todo.push([a, b])
      }
      if (piece.some(([x]) => x === 0 || x === W - 1)) for (const [x, y] of piece) held.add(`${x},${y}`)
    }),
  )
  return { dx: want, held }
}

/**
 * Os pixels do mascote numa pose e num quadro, no quadro fixo de 18x16 (y de
 * -1 a 14): o SVG da faixa e o Raster do terminal desenham os mesmos.
 */
export function mascotPixels(role: 'clawd' | 'boss', pose: Pose, frame = 0, confetti = true, skin: PcSkin = 'crew', hat?: PcHat): Pixel[] {
  const g = grid(role, skin, hat)
  // o relógio anda a 30 quadros por segundo: passos e pulo trocam a cada 6
  // quadros (5x por segundo) e o confete cai a cada 3, para o Clawd não sair
  // correndo
  const step = Math.floor(frame / 6)
  const fall = Math.floor(frame / 3)
  // passos: um par de pernas levanta a cada passo
  if (pose === 'walk') for (const x of step % 2 ? [6, 11] : [4, 13]) box(g, '.', x, x, 14, 14)
  if (pose === 'sleep') {
    box(g, 'X', 6, 6, 8, 8)
    box(g, 'X', 11, 11, 8, 8)
    // o chefe cochila: a coroa escorrega um pixel para a direita e o capuz do
    // mestre arredonda as pontas, para o Z ter um pixel de ar ao lado da cabeça
    if (role === 'boss' && skin === 'party') dot(g, '.', [5, 3], [12, 3])
    else if (role === 'boss') for (let y = 3; y <= 5; y++) g[y]!.splice(5, 9, '.', ...g[y]!.slice(5, 13))
  }
  if (role === 'clawd' && pose === 'alert') {
    box(g, '.', 14, 15, 9, 10)
    box(g, 'X', 14, 15, 7, 8)
    box(g, 'X', 15, 15, 5, 6)
  }
  if (role === 'clawd' && pose === 'jump') {
    box(g, '.', 2, 3, 9, 10)
    box(g, '.', 14, 15, 9, 10)
    box(g, 'X', 2, 3, 7, 8)
    box(g, 'X', 14, 15, 7, 8)
    box(g, 'X', 2, 2, 5, 6)
    box(g, 'X', 15, 15, 5, 6)
  }
  // o pulo para antes de a ponta do chapéu (a lupa, a pena) sair do quadro
  const top = g.findIndex(row => row.some(ch => ch !== '.'))
  const dy = pose === 'walk' ? -(step % 2) : pose === 'jump' ? Math.max(-[0, 1, 2, 1][step % 4]!, -1 - top) : 0
  // o tremor: um pixel para cada lado, sem nada sair do quadro pelas colunas
  // 0 e 17. Sem espaço de um lado, alterna entre o centro e o lado livre; sem
  // espaço dos dois (a pena e o tinteiro), o corpo treme e a peça na borda
  // fica parada
  const want = pose === 'shake' ? (Math.floor(frame / 2) % 2 ? 1 : -1) : 0
  const { dx, held } = shakeOf(g, want)

  const px: Pixel[] = []
  const marks = markTones()
  const put = (x: number, y: number, fill: string, tone?: Themed, mark?: '!' | 'z') =>
    px.push(mark ? { x, y, fill, tone, mark } : tone ? { x, y, fill, tone } : { x, y, fill })
  // the body first, then any held gear on top of where it slid
  for (const still of [false, true])
    g.forEach((row, r) =>
      row.forEach((ch, c) => {
        const fill = PAL[ch]
        if (!fill || held.has(`${c},${r}`) !== still) return
        if (!still && held.has(`${c + dx},${r}`)) return
        put(still ? c : c + dx, r + dy, fill, toneOf(g, c, r, ch))
      }),
    )
  // o que o personagem ocupa neste quadro, para o confete passar por trás
  const body = (x: number, y: number) => {
    const ch = g[y - dy]?.[x - dx]
    return ch !== undefined && ch !== '.'
  }
  if (pose === 'jump' && confetti) {
    CONFETTI_X.forEach((x, i) => {
      const y = ((fall + CONFETTI_Y[i]!) % 7) - 1
      const c = CONFETTI[i % CONFETTI.length]!
      if (!body(x, y)) put(x, y, c, marks.confetti[c])
    })
  }
  // the marks stand clear of the sprite (dx and dy are 0 in these poses)
  if (pose === 'sleep') {
    // o Z sobe e volta, como quem ronca, onde houver ar para os dois lugares
    const [x0, y0] = clearSpot(g, Z_CELLS, Z_SPOTS[frame % 2]!)
    for (const [i, j] of Z_CELLS) put(x0 + i, y0 + j, PAL.G!, marks.z, 'z')
  }
  if (pose === 'alert') {
    // the terminal keeps ALERT, its bar's amber; the desktop paints the "!"
    // in ALERT_THEMED, the amber of its bar and title
    const [x0, y0] = clearSpot(g, BANG_CELLS, BANG_SPOTS)
    for (const [i, j] of BANG_CELLS) put(x0 + i, y0 + j, PAL.Q!, ALERT_THEMED, '!')
  }
  return px
}

/**
 * O mascote da faixa (o Clawd, ou o boss enquanto delega) numa pose, num
 * quadro fixo de 18x16 pixels: o tamanho não muda entre poses e quadros, então
 * ele anda pela barra sem tremer o layout. Confete, "zz" e "!" ocupam o espaço
 * acima da cabeça.
 */
export function mascotSvg(role: 'clawd' | 'boss', pose: Pose, frame = 0, px = 2, confetti = true, skin: PcSkin = 'crew', hat?: PcHat): Sprite {
  const rects = pixelRects(mascotPixels(role, pose, frame, confetti, skin, hat))
  const vh = H + 1
  return {
    source: `<svg xmlns="http://www.w3.org/2000/svg" width="${W * px}" height="${vh * px}" viewBox="0 -1 ${W} ${vh}" shape-rendering="crispEdges">${rects}</svg>`,
    width: W * px,
    height: vh * px,
  }
}

/**
 * The light theme's tones for the marks that carry meaning. The sleep Z reads
 * at 3:1 like the bar; the confetti and the quill's feather are decoration and
 * only need to show (MARK_MIN), so a pale piece goes a shade darker in its own
 * hue and the rest keep their colour. The feather's highlight stays lighter
 * than its vane, so the quill keeps its two tones. Computed on first use: the
 * contrast helpers are further down the file.
 */
let markCache: { pal: Record<string, Themed>; pale: Record<string, Themed>; z: Themed; confetti: Record<string, Themed> } | undefined
function markTones() {
  if (markCache) return markCache
  const themed = (dark: string, min: number): Themed => ({ dark, light: readable(dark, LIGHT_CARDS, false, min) })
  const confetti: Record<string, Themed> = {}
  for (const c of CONFETTI) if (worst(c, LIGHT_CARDS) < MARK_MIN) confetti[c] = themed(c, MARK_MIN)
  const vane = themed(PAL.B!, FEATHER_MIN)
  const pal: Record<string, Themed> = { B: vane, b: { dark: PAL.b!, light: readable(PAL.N!, LIGHT_CARDS, false, MARK_MIN) } }
  // every other letter too pale for a light card, for the pixels on the edge (toneOf)
  const pale: Record<string, Themed> = {}
  for (const [ch, c] of Object.entries(PAL)) if (ch !== 'X' && !pal[ch] && worst(c, LIGHT_CARDS) < EDGE_MIN) pale[ch] = themed(c, EDGE_MIN)
  return (markCache = { pal, pale, z: themed(PAL.G!, FILL_MIN), confetti })
}

/**
 * A sprite pixel's colour per theme. The quill keeps its own tones (markTones);
 * any other pale pixel with the card beside it (a cell to its side, above or
 * below that the sprite leaves empty, or the grid's edge) goes a shade darker on
 * a light card, in its own hue, until it shows (EDGE_MIN): steel stays cool and
 * bone warm, and a white blade keeps its white core inside a pale grey rim. A
 * pale pixel framed by the sprite on all four sides (the glasses, the codex's
 * face) stays as it is. The edge is read off the grid the frame is drawn from,
 * which a pose changes only in the body, so gear keeps one tone as it moves.
 */
function toneOf(g: Grid, x: number, y: number, ch: string): Themed | undefined {
  const marks = markTones()
  if (marks.pal[ch]) return marks.pal[ch]
  const pale = marks.pale[ch]
  if (!pale) return undefined
  const open = (a: number, b: number) => (g[b]?.[a] ?? '.') === '.'
  return open(x + 1, y) || open(x - 1, y) || open(x, y + 1) || open(x, y - 1) ? pale : undefined
}

/**
 * The sprite's rects. A toned pixel takes its dark colour as the attribute and
 * a class named after its light colour, which one @media rule swaps on a light
 * card, as barSvg does: a renderer that ignores the <style> draws the dark art,
 * and two sprites in one document share a class only when they share a colour.
 */
function pixelRects(px: Pixel[]): string {
  const light = new Map<string, string>()
  let rects = ''
  for (const p of px) {
    const t = p.tone && p.tone.light.toLowerCase() !== p.tone.dark.toLowerCase() ? p.tone : undefined
    const k = t && `pcm-${t.light.slice(1).toLowerCase()}`
    if (k) light.set(k, t!.light)
    rects += `<rect x="${p.x}" y="${p.y}" width="1.02" height="1.02" fill="${p.tone?.dark ?? p.fill}"${k ? ` class="${k}"` : ''}/>`
  }
  if (!light.size) return rects
  const rules = [...light].map(([k, c]) => `.${k}{fill:${c}}`).join('')
  return `<style>@media (prefers-color-scheme: light){${rules}}</style>${rects}`
}

export type BarOpts = {
  ratio: number | null
  /** one colour, toned per theme by barTones, or one colour for each theme */
  color: string | Themed
  frame?: number
  /** a finished agent's bar: no sweeping glint, so every frame draws the same */
  still?: boolean
}

const COLS = 60
const ROWS = 2
// the terminal's empty track: a cell can't blend, so it gets a fixed dark tone
const TRACK = "#2A2725"
// the desktop track is the bar's own colour, see-through, so it reads on dark
// and light cards alike and turns red or purple with the fill; a finished
// (faded, still) bar keeps a touch more so its track does not vanish. These are
// floors: barTones raises one only until the track shows on its card.
const TRACK_ALPHA = 0.33
const TRACK_ALPHA_STILL = 0.35

function mix(hex: string, to: string, t: number): string {
  const a = parseInt(hex.slice(1), 16)
  const b = parseInt(to.slice(1), 16)
  const ch = (s: number) => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t)
  return "#" + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, "0")
}

/** A finished agent's colour: the role colour mostly greyed, a hint of it left. */
export function fade(color: string): string {
  return mix(color, '#7A7F88', 0.7)
}

// ── Contraste: a barra no cartão escuro e no claro ──────────────────────
// Os cartões reais do app: escuro #252525 (e #262624) e claro #F5F4EF, mais
// as superfícies do app instalado: #191919 e #1F1F1F no escuro, #FFFFFF no claro.
export const DARK_CARDS = ['#252525', '#262624', '#191919', '#1F1F1F'] as const
export const LIGHT_CARDS = ['#F5F4EF', '#FFFFFF'] as const
// a little above the WCAG 3:1 for graphics, and the 1.4 a track needs, so a
// card a shade off still passes
const FILL_MIN = 3.1
const TRACK_MIN = 1.45
// the light track stays under this: an empty bar is a hint, not a slab
const TRACK_MAX_LIGHT = 2.5
// the light bar's two rows differ by at least this, so it stays two tones
const ROW_STEP = 1.3
// a mark that is decoration (a confetti piece, the feather's highlight) shows
// at this on every light card; the feather's vane, its outline, a step more
const MARK_MIN = 1.5
const FEATHER_MIN = 2
// a pale sprite pixel on the silhouette's edge (a blade, a cap, a shell) shows
// at this on a light card, a touch over the 1.4 a track needs
const EDGE_MIN = 1.45

const chan = (hex: string) => [16, 8, 0].map(s => (parseInt(hex.slice(1), 16) >> s) & 255)
const lin = (v: number) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
const lumOf = (rgb: number[]) => 0.2126 * lin(rgb[0]!) + 0.7152 * lin(rgb[1]!) + 0.0722 * lin(rgb[2]!)
const ratioOf = (a: number[], b: number[]) => {
  const [x, y] = [lumOf(a), lumOf(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
/** WCAG contrast of `color` at `alpha` over `card`, as the eye sees it. */
export function contrastOn(color: string, card: string, alpha = 1): number {
  const bg = chan(card)
  return ratioOf(chan(color).map((v, i) => v * alpha + bg[i]! * (1 - alpha)), bg)
}
const worst = (color: string, cards: readonly string[], alpha = 1) => Math.min(...cards.map(c => contrastOn(color, c, alpha)))

function toHsl(hex: string): [number, number, number] {
  const [r, g, b] = chan(hex).map(v => v / 255) as [number, number, number]
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
function fromHsl(h: number, s: number, l: number): string {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const f = (t: number) => {
    t = (t + 1) % 1
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p
  }
  const ch = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255)
  return '#' + ((ch(f(h + 1 / 3)) << 16) | (ch(f(h)) << 8) | ch(f(h - 1 / 3))).toString(16).padStart(6, '0')
}

/**
 * The colour itself if it already reads on the cards; else the same hue and
 * saturation, lighter (dark cards) or darker (light cards), just until it does.
 * Keeping the saturation is what keeps the amber amber instead of olive.
 */
function readable(color: string, cards: readonly string[], lighten: boolean, min = FILL_MIN): string {
  if (worst(color, cards) >= min) return color
  const [h, s, l0] = toHsl(color)
  for (let i = 1; i <= 100; i++) {
    const l = lighten ? l0 + ((1 - l0) * i) / 100 : l0 * (1 - i / 100)
    const c = fromHsl(h, s, l)
    if (worst(c, cards) >= min) return c
  }
  return lighten ? '#FFFFFF' : '#000000'
}

// ── O símbolo do papel no terminal ──────────────────────────────────────
// The terminal's role symbol is text, and no role or persona hex reaches 4.5:1
// on both a dark and a light terminal (the two luminance ranges don't meet).
// The host hands a ui.render no theme and no background, and has no theme key
// per role; it does list the person's theme setting ($.config.list, 'theme').
// So the symbol takes its role's hue at the tone that theme reads (dark: the
// app's dark cards and #000000; light: the light cards and #FFFFFF), and the
// host's 'text' key whenever the theme says nothing of its background ('auto'
// follows the terminal, which the plugin can't see).
export type TermShade = 'dark' | 'light'
export const TERM_DARK = [...DARK_CARDS, '#000000'] as const
export const TERM_LIGHT = [...LIGHT_CARDS] as const
export const SYMBOL_MIN = 4.5

/** Which background a Claude Code theme setting draws on: 'dark', 'light-ansi'… or unknown. */
export function shadeOf(theme: unknown): TermShade | undefined {
  if (typeof theme !== 'string') return undefined
  return theme.startsWith('light') ? 'light' : theme.startsWith('dark') ? 'dark' : undefined
}

/** A role or persona colour as terminal text: its hue at 4.5:1 on that shade, or the 'text' key. */
export function symbolTone(color: string, shade: TermShade | undefined): string {
  if (!shade) return 'text'
  return shade === 'dark' ? readable(color, TERM_DARK, true, SYMBOL_MIN) : readable(color, TERM_LIGHT, false, SYMBOL_MIN)
}

/** The least track alpha, from the floor up, that shows the track on every card. */
function trackAlpha(fill: string, cards: readonly string[], floor: number): number {
  for (let a = Math.round(floor * 100); a <= 100; a++) if (worst(fill, cards, a / 100) >= TRACK_MIN) return a / 100
  return 1
}

export type BarTone = { fill: string; hi: string; glint: string; track: number }

/**
 * The two rows of the light bar. The top row is the fill lightened by up to
 * 25% white, only as far as it still reads; where the fill sits right at the
 * line (a colour readable() had to darken) the top row stays there and the
 * bottom row goes darker from it instead, until the two differ by ROW_STEP.
 * So both rows of the 6pt bar read on every light card, not just the bottom.
 */
function lightRows(base: string): { fill: string; hi: string } {
  let hi = base
  for (let i = 1; i <= 25; i++) {
    const c = mix(base, '#FFFFFF', i / 100)
    if (worst(c, LIGHT_CARDS) < FILL_MIN) break
    hi = c
  }
  if (contrastOn(base, hi) >= ROW_STEP) return { fill: base, hi }
  const [h, s, l0] = toHsl(hi)
  for (let i = 1; i <= 100; i++) {
    const c = fromHsl(h, s, l0 * (1 - i / 100))
    if (contrastOn(c, hi) >= ROW_STEP) return { fill: c, hi }
  }
  return { fill: '#000000', hi }
}

/**
 * The bar's tones for each theme, derived from the colour passed in, so every
 * role, persona and faded colour gets one rule instead of a hand table. Dark
 * keeps the terminal's highlight (45% white) and glint (80%); on a light card
 * both rows have to read (lightRows), and the glint is the top row lightened.
 */
export function barTones(color: string | Themed, still = false): { dark: BarTone; light: BarTone } {
  const floor = still ? TRACK_ALPHA_STILL : TRACK_ALPHA
  const [cd, cl] = typeof color === 'string' ? [color, color] : [color.dark, color.light]
  const d = readable(cd, DARK_CARDS, true)
  const l = lightRows(readable(cl, LIGHT_CARDS, false))
  let lightTrack = trackAlpha(l.fill, LIGHT_CARDS, floor)
  while (lightTrack > 0.05 && worst(l.fill, LIGHT_CARDS, lightTrack) >= TRACK_MAX_LIGHT) lightTrack = Math.round(lightTrack * 100 - 1) / 100
  return {
    dark: { fill: d, hi: mix(d, '#FFFFFF', 0.45), glint: mix(d, '#FFFFFF', 0.8), track: trackAlpha(d, DARK_CARDS, floor) },
    light: { fill: l.fill, hi: l.hi, glint: mix(l.hi, '#FFFFFF', 0.6), track: lightTrack },
  }
}

/**
 * Barra de carregamento "brilho que passa", em duas linhas de pixels como a do
 * terminal: a de cima é o brilho, a de baixo o preenchimento, e um reflexo
 * diagonal de dois pixels varre a parte cheia a cada quadro. O trilho vazio é
 * a própria cor da barra, translúcida. Cada tema tem seus tons (barTones): os
 * atributos dos rects levam os do escuro, e um <style> com
 * `prefers-color-scheme: light` troca para os do claro. Um renderizador que
 * ignore o <style> desenha a barra escura de sempre. As classes levam a cor no
 * nome, para que duas barras no mesmo documento não se pintem uma à outra.
 * `ratio` null é uma barra indeterminada (um bloco que vai e volta).
 * Desenhada larga e sem proporção fixa, ela estica até a largura do espaço,
 * na altura que o elemento pedir.
 */
export function barSvg({ ratio, color, frame = 0, still = false }: BarOpts): string {
  const { dark, light } = barTones(color, still)
  const hex = typeof color === 'string' ? color.slice(1) : `${color.dark.slice(1)}-${color.light.slice(1)}`
  const k = `pcb-${hex.toLowerCase()}${still ? 's' : ''}`
  const rules = (t: BarTone) =>
    `.${k} .t{fill:${t.fill};fill-opacity:${t.track}}.${k} .f{fill:${t.fill}}.${k} .h{fill:${t.hi}}.${k} .g{fill:${t.glint}}`
  const style = `<style>${rules(dark)}@media (prefers-color-scheme: light){${rules(light)}}</style>`
  const rect = (x: number, y: number, w: number, h: number, cls: 'f' | 'h' | 'g') =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${dark[cls === 'f' ? 'fill' : cls === 'h' ? 'hi' : 'glint']}" class="${cls}"/>`

  let from = 0
  let to = 0
  if (ratio === null) {
    const chunk = 12
    const span = COLS - chunk
    const t = frame % (span * 2)
    from = t <= span ? t : span * 2 - t
    to = from + chunk
  } else {
    to = Math.round(COLS * Math.max(0, Math.min(1, ratio)))
  }

  let body = `<rect x="0" y="0" width="${COLS}" height="${ROWS}" fill="${dark.fill}" fill-opacity="${dark.track}" class="t"/>`
  if (to > from) {
    body += rect(from, 0, to - from, ROWS, 'f') + rect(from, 0, to - from, 1, 'h')
    if (!still) {
      const period = to - from + ROWS + 8
      const x0 = from + (frame % period) - ROWS
      for (let r = 0; r < ROWS; r++) {
        const a = x0 + ROWS - 1 - r
        const b = a + 1
        if (a >= from && a < to) body += rect(a, r, 1, 1, 'g')
        if (b >= from && b < to) body += rect(b, r, 1, 1, 'h')
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" class="${k}" width="2000" height="${ROWS * 3}" viewBox="0 0 ${COLS} ${ROWS}" preserveAspectRatio="none" shape-rendering="crispEdges">${style}${body}</svg>`
}

// ── Terminal: pixel art in a Raster ─────────────────────────────────────
// A terminal cell is twice as tall as it is wide, so one cell holds two
// pixels stacked: "▀" painted with the top pixel as foreground and the bottom
// pixel as background. A pixel nobody drew is the terminal's own background
// (bit 24 alone), so the art sits on any theme without a box around it.

export type RasterSpec = { key: string; columns: number; rows: number; cells: string }

const TERM_DEFAULT = 0x01000000
// the widest Raster the terminal surface accepts
export const MAX_RASTER_COLUMNS = 512
const fitColumns = (n: number) => Math.max(1, Math.min(MAX_RASTER_COLUMNS, Math.floor(n)))
const UPPER = 0x2580
const LOWER = 0x2584
const SPACE = 0x20
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

const rgb = (hex: string) => parseInt(hex.slice(1), 16)

/** Little-endian u32 words as standard padded base64, the Raster's `cells`. */
function encodeCells(words: number[]): string {
  const bytes: number[] = []
  for (const w of words) bytes.push(w & 255, (w >>> 8) & 255, (w >>> 16) & 255, (w >>> 24) & 255)
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i]! << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out += B64[(n >> 18) & 63]! + B64[(n >> 12) & 63]!
    out += i + 1 < bytes.length ? B64[(n >> 6) & 63]! : '='
    out += i + 2 < bytes.length ? B64[n & 63]! : '='
  }
  return out
}

/** A canvas of hex colours (undefined: nothing drawn) as half-block cells. */
function halfBlocks(key: string, canvas: Array<Array<string | undefined>>, columns: number): RasterSpec {
  const rows = Math.max(1, Math.ceil(canvas.length / 2))
  const words: number[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < columns; c++) {
      const top = canvas[r * 2]?.[c]
      const bottom = canvas[r * 2 + 1]?.[c]
      if (top && bottom) words.push(UPPER, rgb(top), rgb(bottom))
      else if (top) words.push(UPPER, rgb(top), TERM_DEFAULT)
      else if (bottom) words.push(LOWER, rgb(bottom), TERM_DEFAULT)
      else words.push(SPACE, TERM_DEFAULT, TERM_DEFAULT)
    }
  }
  return { key, columns, rows, cells: encodeCells(words) }
}


/** The bar's two pixel rows: track, fill with a highlight on top, and the glint. */
function barPixels(columns: number, ratio: number | null, color: string, frame: number, still = false) {
  const hi = mix(color, '#FFFFFF', 0.45)
  const glint = mix(color, '#FFFFFF', 0.8)
  const rows: Array<Array<string | undefined>> = [Array(columns).fill(TRACK), Array(columns).fill(TRACK)]
  let from = 0
  let to = 0
  if (ratio === null) {
    const chunk = Math.max(4, Math.round(columns / 5))
    const span = Math.max(1, columns - chunk)
    const t = frame % (span * 2)
    from = t <= span ? t : span * 2 - t
    to = from + chunk
  } else {
    to = Math.round(columns * Math.max(0, Math.min(1, ratio)))
  }
  for (let x = from; x < to && x < columns; x++) {
    rows[0]![x] = hi
    rows[1]![x] = color
  }
  if (to > from && !still) {
    // the glint: a two-pixel diagonal sweeping across the filled part
    const period = to - from + 2 + 8
    const x0 = from + (frame % period) - 2
    for (let r = 0; r < 2; r++) {
      const a = x0 + 1 - r
      if (a >= from && a < to && a < columns) rows[r]![a] = glint
      if (a + 1 >= from && a + 1 < to && a + 1 < columns) rows[r]![a + 1] = hi
    }
  }
  return rows
}

/** The progress bar as one Raster row, for the terminal Agents panel. */
export function barRaster({ key, columns, ratio, color, frame = 0, still = false }: BarOpts & { key: string; columns: number }): RasterSpec {
  const n = fitColumns(columns)
  return halfBlocks(key, barPixels(n, ratio, color, frame, still), n)
}

// ── Terminal: one line, quadrant pixels ─────────────────────────────────
// A cell split in four (the quadrant blocks ▘▝▖▗▀▄▌▐▚▞▛▜▙▟█) holds 2x2
// pixels, so one terminal line holds a character two pixels tall: the body
// with its eyes on top, the legs below. A cell can show only two colours (a
// foreground and a background), so every drawing keeps to two colours per
// 2x2 block (the eyes sit only over solid body), and a drawing only ever
// moves by whole cells.

// one-line drawings, 10x2 pixels (five cells); X is the body, recoloured per role
export const LINE_ART: Record<string, [string, string]> = {
  clawd: ['XXEXXXXEXX', 'X.XX..XX.X'],
  step: ['XXEXXXXEXX', '.XXX..XXX.'],
  sleep: ['XXXXXXXXXX', 'X.XX..XX.X'],
  boss: ['UXEXXXXEXU', 'UXXX..XXXU'],
  codex: ['OOAOOOOAOO', 'O.OO..OO.O'],
}
const LINE_W = 10
const EYE_ON_BODY = new Set([PAL.E!])

// tl=8, tr=4, bl=2, br=1: the block whose set quadrants are the foreground
const QUADRANT = [0x20, 0x2597, 0x2596, 0x2584, 0x259d, 0x2590, 0x259e, 0x259f, 0x2598, 0x259a, 0x258c, 0x2599, 0x2580, 0x259c, 0x259b, 0x2588]

/** Two pixel rows as quadrant cells: two pixels per column of a cell. */
function quadrants(key: string, top: Array<string | undefined>, bottom: Array<string | undefined>): RasterSpec {
  const columns = Math.ceil(top.length / 2)
  const words: number[] = []
  for (let c = 0; c < columns; c++) {
    const px = [top[2 * c], top[2 * c + 1], bottom[2 * c], bottom[2 * c + 1]]
    const count = new Map<string, number>()
    for (const p of px) if (p) count.set(p, (count.get(p) ?? 0) + 1)
    const painted = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([color]) => color)
    if (painted.length === 0) {
      words.push(SPACE, TERM_DEFAULT, TERM_DEFAULT)
      continue
    }
    const fg = painted[0]!
    // the second colour: another painted one, else the terminal's background
    const bg = painted[1]
    let bits = 0
    px.forEach((p, i) => {
      if (p === fg) bits |= 8 >> i
    })
    words.push(QUADRANT[bits]!, rgb(fg), bg ? rgb(bg) : TERM_DEFAULT)
  }
  return { key, columns, rows: 1, cells: encodeCells(words) }
}

function linePixels(name: keyof typeof LINE_ART, body: string): [Array<string | undefined>, Array<string | undefined>] {
  const paint = (row: string) => [...row].map(ch => (ch === 'X' ? body : ch === '.' ? undefined : PAL[ch]))
  const [a, b] = LINE_ART[name]!
  return [paint(a), paint(b)]
}

/**
 * A role's one-line character for the terminal Agents panel: the Clawd in
 * the role's colour (the codex robot is its own drawing), five cells wide.
 * While it works its legs step; once finished it is greyed out.
 */
export function spriteRaster(role: PcRole | 'clawd', key: string, walking = false, frame = 0, faded = false, bodyColor?: string): RasterSpec {
  const name = role === 'codex' ? 'codex' : role === 'boss' ? 'boss' : walking && Math.floor(frame / 6) % 2 ? 'step' : 'clawd'
  const body = bodyColor ?? (role === 'clawd' || role === 'codex' ? CLAY : ROLES[role].color)
  const [top, bottom] = linePixels(name, body)
  // a finished agent greys out, its dark eyes kept
  const tone = (p: string | undefined) => (p && faded && !EYE_ON_BODY.has(p) ? fade(p) : p)
  return quadrants(key, top.map(tone), bottom.map(tone))
}

/**
 * The terminal band in one line: the bar, with the mascot standing at the
 * edge of what is done. Its five cells take the place of the bar under it.
 */
export function bandRaster(opts: {
  key: string
  columns: number
  role: 'clawd' | 'boss'
  pose: Pose
  frame?: number
  ratio: number | null
  color: string
}): RasterSpec {
  const columns = fitColumns(opts.columns)
  const frame = opts.frame ?? 0
  const step = Math.floor(frame / 6) % 2 === 1
  const name: keyof typeof LINE_ART =
    opts.role === 'boss' ? 'boss' : opts.pose === 'sleep' ? 'sleep' : (opts.pose === 'walk' || opts.pose === 'jump') && step ? 'step' : 'clawd'
  const bar = barPixels(columns, opts.ratio, opts.color, frame)
  const top: Array<string | undefined> = []
  const bottom: Array<string | undefined> = []
  for (let c = 0; c < columns; c++) top.push(bar[0]![c], bar[0]![c]), bottom.push(bar[1]![c], bar[1]![c])
  const cells = LINE_W / 2
  if (columns >= cells) {
    const ratio = Math.max(0, Math.min(1, opts.ratio ?? 0))
    // a failed step shakes the mascot one cell to each side
    const shake = opts.pose === 'shake' ? (Math.floor(frame / 2) % 2 ? 1 : -1) : 0
    const c0 = Math.max(0, Math.min(columns - cells, Math.round((columns - cells) * ratio) + shake))
    const [mt, mb] = linePixels(name, CLAY)
    for (let i = 0; i < LINE_W; i++) {
      top[c0 * 2 + i] = mt[i]
      bottom[c0 * 2 + i] = mb[i]
    }
  }
  return quadrants(opts.key, top, bottom)
}

