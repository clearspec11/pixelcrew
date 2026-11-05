import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { PcAgent, PcFx, PcMain, PcRole, PcTask } from '../types'
import { ALERT, bandRaster, barRaster, barSvg, CLAY, fade, mascotSvg, MAX_RASTER_COLUMNS, ROLE_SYMBOL, ROLES, spriteRaster, spriteSvg } from './art'

// terminal art budgets: the fewest columns worth drawing a band, a panel bar or
// the text beside a sprite, and the title room the band keeps before its art
const BAND_MIN = 12
const BAR_MIN = 4
const TEXT_MIN = 12
const TITLE_MIN = 8
import type { Pose } from './art'
import { langOf, strings, systemLang } from './i18n'
import type { Lang, Strings } from './i18n'
import { parseCouncil, personaOf, STAGE_ROLE } from './council'
import type { CouncilLabel } from './council'

const PANE = 'pixel-crew-agents'

// the texts in the language picked when the module loaded (see register)
let L: Strings = strings('en')

type Price = [number, number, number, number]

// US$ per million tokens: input, output, cache read, cache write (5-minute
// writes, 1.25x input). First-party API list prices as of October 2026; the
// first pattern that matches wins, so each version comes before its family.
// The panel's costs are estimates: a subscription is not billed per token.
const PRICES: Array<[RegExp, Price]> = [
  [/fable-5-1|mythos-5-1/i, [10, 50, 0.25, 12.5]],
  [/fable|mythos/i, [10, 50, 1, 12.5]],
  [/opus-5-5/i, [4, 20, 0.2, 5]],
  [/opus/i, [5, 25, 0.5, 6.25]],
  [/sonnet-5/i, [2, 10, 0.2, 2.5]],
  [/sonnet/i, [3, 15, 0.3, 3.75]],
  [/haiku-5-5/i, [0.1, 0.5, 0.01, 0.125]],
  [/haiku/i, [1, 5, 0.1, 1.25]],
]
// Haiku 5.5 charges more once a request's prompt passes 100K tokens
const HAIKU_55_LONG: Price = [0.5, 2.5, 0.05, 0.625]
// an unknown model is priced as Claude Code's default, Opus 5.5
const DEFAULT_PRICE: Price = [4, 20, 0.2, 5]

/** The price of one request on `model`, whose prompt was `prompt` tokens. */
export function priceOf(model: string, prompt = 0): Price {
  if (/haiku-5-5/i.test(model) && prompt > 100_000) return HAIKU_55_LONG
  return PRICES.find(([re]) => re.test(model))?.[1] ?? DEFAULT_PRICE
}

/**
 * The context window the panel measures an agent against: 1M on current
 * models, 200K on Haiku 4.x, Opus and Sonnet 4.5 and older, and Claude 3.
 * A `[1m]` suffix always means 1M.
 */
export function windowOf(model: string): number {
  const m = model.toLowerCase()
  if (m.includes('[1m]')) return 1_000_000
  if (/claude-3|haiku-4/.test(m)) return 200_000
  const v = /(opus|sonnet)-(\d+)(?:-(\d))?(?!\d)/.exec(m)
  if (v && Number(v[2]) === 4 && Number(v[3] ?? 0) <= 5) return 200_000
  return 1_000_000
}

// the mascot's "done" celebration: confetti, a short quiet hop, or none
type Celebration = 'full' | 'quiet' | 'off'
let celebration: Celebration = 'full'
const CELEBRATE: Record<Celebration, number> = { full: 2500, quiet: 1200, off: 0 }

// the council mod's band: while a round runs it carries the band and pixel-crew steps aside
const councilBand = { plugin: 'council', key: 'band' } as const
const councilBandHidden = { plugin: 'council', key: 'isBandHidden' } as const

const tasks = atom({ plugin: 'pixel-crew', key: 'tasks' } as const, [])
const agents = atom({ plugin: 'pixel-crew', key: 'agents' } as const, [])
const now = atom({ plugin: 'pixel-crew', key: 'now' } as const, 0)
const frame = atom({ plugin: 'pixel-crew', key: 'frame' } as const, 0)
const showDone = atom({ plugin: 'pixel-crew', key: 'showDone' } as const, true)
const bandOn = atom({ plugin: 'pixel-crew', key: 'bandOn' } as const, true)
const IDLE: PcMain = { activity: '', steps: 0, tools: 0, working: false, done: false }
const main = atom({ plugin: 'pixel-crew', key: 'main' } as const, IDLE)
// início do lote atual de subagents: os que começaram desde que nenhum rodava
const batchStart = atom({ plugin: 'pixel-crew', key: 'batchStart' } as const, 0)
const CALM: PcFx = { celebrateUntil: 0, errorUntil: 0, asking: null }
const fx = atom({ plugin: 'pixel-crew', key: 'fx' } as const, CALM)

const SHAKE_MS = 1200
const ERROR = '#E24B4A'

// A barra da faixa desliza até o progresso novo em vez de pular: a cada
// desenho anda uma fração do que falta, pelo tempo passado (não pelo número de
// desenhos). Voltar (um turno novo) é na hora.
let shown = -1
let shownAt = 0
let settling = false

export function glide(target: number, t = Date.now()): number {
  if (shown < 0 || target < shown) shown = target
  else {
    const dt = Math.min(300, Math.max(0, t - shownAt))
    shown += (target - shown) * (1 - Math.exp(-dt / 450))
    if (target - shown < 0.005) shown = target
  }
  shownAt = t
  settling = shown !== target
  return shown
}

/** Esquece onde a barra estava: o próximo desenho vai direto ao progresso. */
export function resetGlide() {
  shown = -1
  settling = false
}

type Usage = {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
  model: string
}

type SubRole = Exclude<PcRole, 'boss' | 'codex'>

// em empate, vale a ordem desta lista
const ROLE_WORDS: Array<[SubRole, RegExp]> = [
  // Leigh's words too: walkthrough, usability, probe, smoke, live-check, sanity, GM
  ['tester', /(test|verif|\bqa\b|debug|\bbug|valid|review|revis|audit|prueb|probar|depur|walkthrough|walk-through|usability|\bprobe|\bsmoke|live-?check|sanity|\bgm\b)/],
  ['artist', /(mock-?up|sprite|palette|layout|\btheme|design|\bdraw|desenh|diseñ|disen|dibuj|\bart|graphic|gráfic|grafic|\bimag|\bicon|ícone|logo|visual|\bui\b|\bux\b|style|estilo|\bcss|ilustr|illustr|\banim)/],
  ['researcher', /(research|pesquis|explor|search|busca|investig|\bfind|encontr|\bdocs|analy|anális|analis|analiz|competi|concorr|\bread|\bler\b|\bplan|coorden|coordinat|architect|arquitet|compat|survey|\bbrief|catalog|compar|look into|\bscout|recon)/],
  ['developer', /(build|implement|\bcode|códig|codig|\bfix|corrig|correg|arregl|refactor|refator|feature|\bapi\b|endpoint|component|página|pagina|\bpage|landing|script|develop|desenvolv|\bcri[ae]r?\b|\bcrea|create|write|escrev|escrib|constru|\bport\b|\bwire|migrat|\bpatch|integrat)/],
]

function earliestRole(text: string): SubRole | undefined {
  let best: SubRole | undefined
  let at = Infinity
  for (const [role, re] of ROLE_WORDS) {
    const i = text.search(re)
    if (i >= 0 && i < at) {
      at = i
      best = role
    }
  }
  return best
}

/**
 * O papel de um subagent: o da palavra-chave que aparece primeiro na descrição
 * (normalmente o verbo principal), depois no tipo do agent. O boss nunca sai
 * daqui: ele é o agent principal, que delega; revisões vão para o tester e
 * planejamento para o researcher.
 */
export function roleOf(type: string, description: string): Exclude<PcRole, 'boss'> {
  const d = description.toLowerCase()
  const t = type.toLowerCase()
  if (/codex/.test(`${t} ${d}`)) return 'codex'
  return earliestRole(d) ?? earliestRole(t) ?? 'worker'
}

/** A council agent's row title: who (persona or seat) and what its stage does. */
export function councilTitle(c: CouncilLabel, s: Strings = L): string {
  const doing = s.stages[c.stage]
  const who = c.persona ? personaOf(c.persona).name : c.seat ? s.seat(c.seat) : ''
  return who ? `${who} · ${doing}` : doing.charAt(0).toUpperCase() + doing.slice(1)
}

function shortModel(model: string): string {
  const m = model.replace(/^claude-/, '').replace(/\[.*\]$/, '')
  const match = /^(opus|sonnet|haiku|fable)-(\d+)-(\d+)/i.exec(m)
  if (match) return `${match[1]![0]!.toUpperCase()}${match[1]!.slice(1)} ${match[2]}.${match[3]}`
  return m
}

function effortLabel(effort: string | undefined): string {
  return effort ? ` · ${effort}` : ''
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `${Math.round(n / 1000)}k`
  return String(n)
}

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function fmtCost(usd: number): string {
  return `≈$${usd.toFixed(2)}`
}

function ratioOf(list: readonly PcTask[]): number | null {
  if (list.length === 0) return null
  return list.filter(t => t.status === 'completed').length / list.length
}

/**
 * Progresso estimado quando não há lista de tarefas: cresce rápido no começo e
 * desacelera a cada passo do modelo ou ação, sem passar de 90% até terminar.
 */
export function estimate(work: number): number {
  return 0.9 * (1 - Math.exp(-work / 8))
}

export function agentRatio(a: PcAgent): number {
  if (a.status === 'done') return 1
  const real = ratioOf(a.tasks)
  if (real !== null) return real
  return estimate(a.steps + a.tools)
}

/**
 * O papel do que uma ferramenta do agent principal faz: ler e buscar é do
 * researcher, editar é do developer (do artist em estilos e imagens), e um
 * comando vale pelo que diz, como um subagent pela descrição.
 */
export function toolRole(tool: string, input: any): Exclude<PcRole, 'boss'> {
  switch (tool) {
    case 'Read':
    case 'Grep':
    case 'Glob':
    case 'WebSearch':
    case 'WebFetch':
      return 'researcher'
    case 'Edit':
    case 'MultiEdit':
    case 'Write':
    case 'NotebookEdit':
      return /\.(css|scss|sass|less|svg|png|jpe?g|gif|webp|ico)$/i.test(String(input?.file_path ?? input?.notebook_path ?? ''))
        ? 'artist'
        : 'developer'
    case 'Bash':
    case 'PowerShell':
      return roleOf('', `${input?.description ?? ''} ${input?.command ?? ''}`)
    default:
      return 'worker'
  }
}

function base(path: unknown): string {
  return String(path ?? '').split(/[\\/]/).pop() || L.file
}

/** Uma frase curta do que uma ferramenta do agent principal está fazendo. */
export function activityOf(tool: string, input: any, s: Strings = L): string {
  switch (tool) {
    case 'Read':
      return s.reading(base(input?.file_path))
    case 'Edit':
    case 'MultiEdit':
      return s.editing(base(input?.file_path))
    case 'Write':
      return s.writing(base(input?.file_path))
    case 'Bash':
    case 'PowerShell':
      return String(input?.description || s.runningCommand)
    case 'Grep':
    case 'Glob':
      return s.searchingCode
    case 'Agent':
    case 'Task':
      return s.delegating(String(input?.description || 'subagent'))
    case 'WebSearch':
    case 'WebFetch':
      return s.searchingWeb
    case 'Skill':
      return s.usingSkill(String(input?.skill || '')).replace(/\s+/g, ' ').trim()
    case 'TodoWrite':
    case 'TaskCreate':
    case 'TaskUpdate':
      return s.organizingTasks
    case 'AskUserQuestion':
      return s.waitingForYou
    default:
      return s.using(tool.startsWith('mcp__') ? String(tool.split('__').pop()) : tool)
  }
}

function applyTaskTool(list: readonly PcTask[], tool: string, input: any, result: any): PcTask[] | null {
  if (tool === 'TodoWrite' && Array.isArray(input?.todos)) {
    return input.todos.map((t: any, i: number) => ({
      id: String(i),
      subject: String(t.content ?? ''),
      status: t.status,
      activeForm: t.activeForm,
    }))
  }
  if (tool === 'TaskCreate') {
    const id = result?.task?.id
    if (!id) return null
    return [...list, { id: String(id), subject: String(input?.subject ?? ''), status: 'pending', activeForm: input?.activeForm }]
  }
  if (tool === 'TaskUpdate' && input?.taskId) {
    const id = String(input.taskId)
    if (input.status === 'deleted') return list.filter(t => t.id !== id)
    return list.map(t =>
      t.id === id
        ? {
            ...t,
            status: input.status ?? t.status,
            subject: input.subject ?? t.subject,
            activeForm: input.activeForm ?? t.activeForm,
          }
        : t,
    )
  }
  return null
}

async function patchAgent($: EngineInterface, id: string, fn: (a: PcAgent) => PcAgent) {
  await update($, agents, list => list.map(a => (a.id === id ? fn(a) : a)))
}

async function addAgent($: EngineInterface, agent: PcAgent) {
  const before = await read($, agents)
  const wasIdle = !before.some(a => a.status === 'running')
  await update($, agents, list => [...list.filter(a => a.id !== agent.id), agent].slice(-40))
  await update($, now, () => agent.startedAt)
  if (wasIdle) {
    await update($, batchStart, () => agent.startedAt)
    $.ui.open({ id: PANE, title: 'Agents' }).catch(() => {})
  }
}

type BandView = {
  title: string
  /** progress, 0 to 1, before the band's glide */
  target: number
  count: string
  pose: Pose
  delegating: boolean
  shaking: boolean
  /** the role of what the main agent did last, for its symbol */
  role?: Exclude<PcRole, 'boss'>
  /** agents in the panel, running or finished */
  crew: number
}

/**
 * What the band shows right now, or null when it has nothing to show. The
 * band draws it; the status line (for the mobile app, which draws no band)
 * says it in one line. `appWorking` is the app's own word that a turn runs.
 */
async function bandView($: EngineInterface, appWorking: boolean, t = Date.now()): Promise<BandView | null> {
  const list = await read($, tasks)
  const crew = await read($, agents)
  const stored = await read($, main)
  const effects = await read($, fx)
  // o app já diz "trabalhando" mas o estado ainda é do turno que acabou: é um turno novo
  const fresh = appWorking && !stored.working
  const m: PcMain = fresh ? { activity: L.thinking, steps: 0, tools: 0, working: true, done: false } : stored
  const since = await read($, batchStart)
  const running = crew.filter(a => a.status === 'running').length
  const isWorking = m.working || appWorking
  const celebrating = !fresh && !isWorking && t < effects.celebrateUntil
  const asking = effects.asking
  if (list.length === 0 && running === 0 && !isWorking && !celebrating && !asking) return null

  // o lote atual de subagents: os que começaram desde que nenhum rodava
  const batch = crew.filter(a => a.startedAt >= since)
  const delegating = running > 0
  const doneTasks = list.filter(x => x.status === 'completed').length

  // progresso: lista de tarefas > média dos subagents do lote > estimativa do turno
  const target = list.length
    ? doneTasks / list.length
    : delegating && batch.length
      ? batch.reduce((s, a) => s + agentRatio(a), 0) / batch.length
      : m.done || celebrating
        ? 1
        : estimate(m.steps + m.tools)
  const count = delegating
    ? `${batch.filter(a => a.status !== 'running').length}/${batch.length}`
    : list.length
      ? `${doneTasks}/${list.length}`
      : ''

  // o que o mascote faz: esperar você > tremer > comemorar > andar > dormir
  const shaking = t < effects.errorUntil
  const pose: Pose = asking
    ? 'alert'
    : shaking
      ? 'shake'
      : celebrating
        ? 'jump'
        : isWorking || delegating
          ? 'walk'
          : 'sleep'

  const active = list.find(x => x.status === 'in_progress')
  const title = asking
    ? asking === 'permission'
      ? L.needsPermission
      : L.waitingForYou
    : celebrating
      ? L.done
      : isWorking
        ? m.activity && m.activity !== L.thinking
          ? m.activity
          : active?.activeForm || L.thinking
        : delegating
          ? L.waiting(running)
          : active?.activeForm || active?.subject || L.tasks

  return { title, target, count, pose, delegating, shaking, role: m.role, crew: crew.length }
}

/** The band in one line: the mood or role symbol, what is happening, progress and count. */
export function statusLine(v: BandView): string {
  const mood = { walk: '', jump: '✦', sleep: 'zz', alert: '!', shake: '✗' }[v.pose]
  const who = v.delegating ? 'boss' : v.role
  const icon = mood || (who ? ROLE_SYMBOL[who] : '')
  // in steps of 5%, so the phone is not sent a new line for every point
  const pct = v.pose === 'alert' ? '' : `${Math.round(v.target * 20) * 5}%`
  return [icon ? `${icon} ${v.title}` : v.title, pct, v.count].filter(Boolean).join(' · ')
}

const STATUS_MS = 1000
let statusText: string | undefined
let statusBusy = false

/**
 * Keeps the status line in step with the band while the mobile app is
 * attached, where no band is drawn; elsewhere the band says it and the line
 * stays clear. Off with the band (/crew-bar), and quiet during a council
 * round, whose own status line follows the round.
 */
async function updateStatus($: EngineInterface) {
  let text: string | undefined
  const round = (await $.state.get(councilBand)).value
  if ((await read($, bandOn)) && !(round && !round.isFinished)) {
    const view = await bandView($, false)
    if (view) text = statusLine(view)
  }
  if (text !== undefined && !(await $.session.surfaces()).includes('mobile')) text = undefined
  if (text === statusText) return
  statusText = text
  $.ui.status(text)
}

export const register: Register = (on, options) => {
  // language: the option, or with "auto" (the default) the system's, refined
  // at session start by Claude Code's own "language" setting and LANG/LC_*
  const choice = String(options.language ?? 'auto')
  const fixed = choice === 'auto' ? undefined : langOf(choice)
  let lang: Lang = fixed ?? systemLang() ?? 'en'
  L = strings(lang)
  const wanted = String(options.celebration ?? 'full')
  celebration = wanted === 'quiet' || wanted === 'off' ? wanted : 'full'

  on('session.start', async ($, e, next) => {
    if (!fixed) {
      try {
        const settings: any = await $.settings.read()
        const found =
          langOf(settings?.language) ??
          langOf(await $.env.get('LC_ALL')) ??
          langOf(await $.env.get('LC_MESSAGES')) ??
          langOf(await $.env.get('LANG'))
        if (found && found !== lang) {
          lang = found
          L = strings(lang)
        }
      } catch {}
    }
    await $.command.register({ name: 'crew', description: L.cmdCrew })
    await $.command.register({ name: 'crew-clear', description: L.cmdClear })
    await $.command.register({ name: 'crew-bar', description: L.cmdBar })
    // a escolha do /crew-bar vale para as próximas sessões também
    const saved = await $.store.get('bandOn').catch(() => undefined)
    if (typeof saved === 'boolean') await update($, bandOn, () => saved)

    // Relógio da animação: troca o quadro 30x por segundo enquanto há agent
    // rodando ou tarefa em andamento; parado, não escreve nada.
    let ticks = 0
    let idle = 0
    let ticking = false
    $.clock.every(33, () => {
      // um tique que ainda não acabou faz o próximo esperar a vez
      if (ticking) return
      ticking = true
      void (async () => {
        const list = await read($, agents)
        const busy = list.some(a => a.status === 'running')
        const list2 = await read($, tasks)
        const working = (await read($, main)).working || list2.some(t => t.status === 'in_progress')
        const effects = await read($, fx)
        const t0 = Date.now()
        // comemoração, tremida e a barra deslizando também animam; com um
        // quadro a mais no fim, para a faixa sumir quando a comemoração acaba
        const band = await read($, bandOn)
        const lively =
          settling || effects.asking !== null || t0 < effects.celebrateUntil + 400 || t0 < effects.errorUntil + 400
        // com a faixa desligada, só o painel (agents rodando) anima
        if (!band && !busy) return
        if (!busy && !working && !lively) {
          // dormindo (tarefas na faixa, ninguém trabalhando): o "zz" respira devagar
          if (list2.length && ++idle % 24 === 0) await update($, frame, n => (n + 1) % 100000)
          return
        }
        await update($, frame, n => (n + 1) % 100000)
        if (!busy) return
        ticks += 1
        if (ticks % 30 === 0) await update($, now, () => Date.now())
        // a cada ~5s confere com a lista do engine (agents interrompidos ou mortos)
        if (ticks % 150 !== 0) return
        const live = await $.agent.list()
        const ended = new Map(
          live
            .filter(a => a.status === 'completed' || a.status === 'failed' || a.status === 'killed')
            .map(a => [a.id, a.status]),
        )
        if (ended.size === 0) return
        const t = Date.now()
        await update($, agents, all =>
          all.map(a =>
            a.status === 'running' && ended.has(a.id)
              ? { ...a, status: ended.get(a.id) === 'completed' ? ('done' as const) : ('failed' as const), endedAt: t }
              : a,
          ),
        )
      })()
        .catch(() => {})
        .finally(() => {
          ticking = false
        })
    })

    // the status line for the mobile app, checked once a second
    $.clock.every(STATUS_MS, () => {
      if (statusBusy) return
      statusBusy = true
      void updateStatus($)
        .catch(() => {})
        .finally(() => {
          statusBusy = false
        })
    })

    return next(e)
  })

  on('command.run', { command: 'crew' }, async $ => {
    const opened = await $.ui.open({ id: PANE, title: 'Agents' })
    if (opened.isPlaced) return { text: L.paneOpened }
    return { text: crewText(await read($, agents), await read($, now), await read($, tasks)) }
  })

  // /crew-bar alterna; /crew-bar on|off (ou ligar/desligar, activar/desactivar) escolhe
  on('command.run', { command: 'crew-bar' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    const want = /^(off|desl|desa|desact|apag|no|não|nao)/.test(arg)
      ? false
      : /^(on|lig|ativ|activ|encend|yes|sim|s[ií])/.test(arg)
        ? true
        : !(await read($, bandOn))
    await update($, bandOn, () => want)
    await $.store.set('bandOn', want).catch(() => {})
    return { text: want ? L.barOn : L.barOff }
  })

  on('command.run', { command: 'crew-clear' }, async $ => {
    await update($, tasks, () => [])
    await update($, agents, () => [])
    return { text: L.cleared }
  })

  on('agent.spawn', async ($, e, next) => {
    const r = await next(e)
    try {
      if (r.agentId) {
        // a council workflow agent (`propose:dot`) is drawn by its stage and persona
        const council = parseCouncil(e.description)
        await addAgent($, {
          id: r.agentId,
          description: council ? councilTitle(council) : e.description || e.subagentType,
          type: e.subagentType,
          role: council ? STAGE_ROLE[council.stage] : roleOf(e.subagentType, e.description),
          ...(council ? { stage: council.stage } : {}),
          ...(council?.persona ? { persona: council.persona } : {}),
          model: r.model,
          status: 'running',
          startedAt: Date.now(),
          tokens: 0,
          costUsd: 0,
          ctxTokens: 0,
          steps: 0,
          tools: 0,
          tasks: [],
        })
      }
    } catch {}
    return r
  })

  // ── O agent principal: um turno começa, dá passos e termina ─────────────
  // zera já no envio do prompt: o app marca "trabalhando" antes do turn.start,
  // e sem isso a faixa mostraria por um instante os 100% do turno anterior
  on('prompt.submit', async ($, e, next) => {
    await update($, main, () => ({ activity: L.thinking, steps: 0, tools: 0, working: true, done: false })).catch(
      () => {},
    )
    await update($, fx, () => CALM).catch(() => {})
    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    await update($, main, () => ({ activity: L.thinking, steps: 0, tools: 0, working: true, done: false })).catch(
      () => {},
    )
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    if (!e.agentId) {
      await update($, main, m => ({ ...m, working: true, done: false })).catch(() => {})
    }
    const r = yield* next(e)
    if (!e.agentId) {
      await update($, main, m => ({ ...m, steps: m.steps + 1 })).catch(() => {})
    }
    if (e.agentId && r?.usage) {
      const u = r.usage as Usage
      const prompt = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      const [pi, po, pr, pw] = priceOf(u.model || e.model, prompt)
      const cost =
        (u.input_tokens * pi + u.output_tokens * po + u.cache_read_input_tokens * pr + u.cache_creation_input_tokens * pw) /
        1_000_000
      const fresh = u.input_tokens + u.output_tokens + u.cache_creation_input_tokens
      const ctx = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      await patchAgent($, e.agentId, a => ({
        ...a,
        model: u.model || a.model,
        effort: e.effort === undefined ? a.effort : String(e.effort),
        tokens: a.tokens + fresh,
        costUsd: a.costUsd + cost,
        ctxTokens: ctx,
        steps: a.steps + 1,
      })).catch(() => {})
    }
    return r
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) {
      const id = e.agentId
      const failed = e.reason === 'error' || e.reason === 'aborted' || e.reason === 'refusal'
      await patchAgent($, id, a => ({
        ...a,
        status: failed ? 'failed' : 'done',
        endedAt: Date.now(),
        tasks: failed ? a.tasks : a.tasks.map(t => ({ ...t, status: 'completed' as const })),
      })).catch(() => {})
    } else {
      await update($, main, m => ({ ...m, activity: L.done, working: false, done: true })).catch(() => {})
      // fim do turno: confete, se terminou bem e ninguém da equipe ainda trabalha
      const ok = e.reason !== 'error' && e.reason !== 'aborted' && e.reason !== 'refusal'
      const crewBusy = (await read($, agents).catch(() => [] as PcAgent[])).some(a => a.status === 'running')
      await update($, fx, f => ({
        ...f,
        asking: null,
        celebrateUntil: ok && !crewBusy && celebration !== 'off' ? Date.now() + CELEBRATE[celebration] : 0,
      })).catch(() => {})
    }
    return next(e)
  })

  on('tool.call', async ($, e, next) => {
    const tool = String(e.tool)
    const input = (e as any).input
    const agentId = e.agentId
    const isCodexBash = !agentId && tool === 'Bash' && /codex/i.test(String(input?.command ?? ''))

    if (isCodexBash) {
      await addAgent($, {
        id: e.tool_use_id,
        description: String(input?.description ?? L.codexTask),
        type: 'codex',
        role: 'codex',
        model: 'codex',
        status: 'running',
        startedAt: Date.now(),
        tokens: 0,
        costUsd: 0,
        ctxTokens: 0,
        steps: 0,
        tools: 0,
        tasks: [],
      }).catch(() => {})
    }
    if (agentId) {
      await patchAgent($, agentId, a => ({ ...a, tools: a.tools + 1, phase: activityOf(tool, input) })).catch(() => {})
    } else {
      const activity = activityOf(tool, input)
      const role = toolRole(tool, input)
      await update($, main, m => ({ ...m, activity, role, tools: m.tools + 1, working: true, done: false })).catch(() => {})
    }

    const asks = tool === 'AskUserQuestion' || tool === 'ExitPlanMode'
    if (asks) await update($, fx, f => ({ ...f, asking: 'question' as const })).catch(() => {})

    const r = await next(e)

    // respondida (ou recusada) a pergunta ou a permissão, o "!" sai; uma
    // ferramenta do agent principal que falhou faz o mascote tremer
    const failed = !agentId && (r as any).isError === true
    await update($, fx, f =>
      f.asking || failed ? { ...f, asking: null, errorUntil: failed ? Date.now() + SHAKE_MS : f.errorUntil } : f,
    ).catch(() => {})
    if (!agentId) {
      await update($, main, m => (m.working ? { ...m, activity: L.thinking } : m)).catch(() => {})
    }

    try {
      if (isCodexBash) {
        await patchAgent($, e.tool_use_id, a => ({
          ...a,
          status: (r as any).isError || (r as any).deny ? 'failed' : 'done',
          endedAt: Date.now(),
        }))
      }
      if (!(r as any).deny && /^(TodoWrite|TaskCreate|TaskUpdate)$/.test(tool)) {
        const result = (r as any).result
        if (agentId) {
          await patchAgent($, agentId, a => ({ ...a, tasks: applyTaskTool(a.tasks, tool, input, result) ?? a.tasks }))
        } else {
          await update($, tasks, list => applyTaskTool(list, tool, input, result) ?? list)
        }
      }
    } catch {}
    return r
  })

  // um pedido de permissão: o Claude (ou um subagent) espera você aprovar
  on('tool.check', async ($, e, next) => {
    const r = await next(e)
    if (r.decision === 'ask' && e.tool_use_id) {
      await update($, fx, f => ({ ...f, asking: f.asking ?? ('permission' as const) })).catch(() => {})
    }
    return r
  })

  // ── Faixa acima do prompt ──────────────────────────────────────────────
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!(await read($, bandOn))) return next(e)
    // a council round in progress has the band: its own shows the round
    const round = (await $.state.get(councilBand)).value
    if (round && !round.isFinished && !(await $.state.get(councilBandHidden)).value) return next(e)
    if (e.props.hasSurvey) return next(e)
    const t = Date.now()
    const view = await bandView($, e.props.isWorking, t)
    if (!view) return next(e)
    const { title, count, pose, delegating, shaking } = view
    const f = await read($, frame)
    const ratio = glide(view.target, t)
    const pct = `${Math.round(ratio * 100)}%`
    // esperando você (permissão ou pergunta): barra e título em âmbar, e sem
    // porcentagem, que agora não importa (como na linha de status)
    const alerting = pose === 'alert'

    const color = shaking ? ERROR : alerting ? ALERT : delegating ? ROLES.boss.color : CLAY
    const els: any = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const openPane = () => $.ui.open({ id: PANE, title: 'Agents' }).catch(() => {})

    if (e.surface === 'terminal') {
      // sem linha nenhuma a faixa não desenha nada: quem está por baixo decide
      if (e.props.maxRows <= 0) return next(e)
      // uma linha só: o mascote, em pixels de quadrante, anda dentro da própria
      // barra, ao lado do título e da porcentagem. A arte só entra quando cabe
      // com o texto ao lado; numa faixa estreita fica só o texto
      const { Raster } = els
      // a faixa cabe em bodyColumns inteira: depois do título vêm, por ordem de
      // importância, a porcentagem, a contagem e o botão da equipe, cada um
      // com sua coluna de espaço; o que não cabe sai, e sem lugar nem para a
      // porcentagem a faixa dá a vez a quem está por baixo
      const width = Math.max(0, e.props.bodyColumns)
      const pctShown = alerting ? '' : pct
      if (width < (pctShown.length || 1)) return next(e)
      const crewLabel = `×${view.crew}`
      let budget = width - pctShown.length
      const showCount = count !== '' && budget >= count.length + 1
      if (showCount) budget -= count.length + 1
      const showCrew = view.crew > 0 && budget >= crewLabel.length + 1
      if (showCrew) budget -= crewLabel.length + 1
      // antes da barra, só símbolos: o do papel de quem trabalha (a coroa
      // enquanto delega), na cor desse papel, e a marca do humor
      const mood = { walk: '', jump: '✦', sleep: 'zz', alert: '!', shake: '✗' }[pose]
      const who = delegating ? 'boss' : view.role
      const icon = [who ? ROLE_SYMBOL[who] : '', mood].filter(Boolean).join(' ')
      const iconColor = shaking || alerting || !who ? color : ROLES[who].color
      const showIcon = icon !== '' && budget >= icon.length + 1 + 1 + TITLE_MIN
      if (showIcon) budget -= icon.length + 1
      // o título (e a arte ao lado dele) ocupa o resto, menos a coluna antes da
      // porcentagem; sem porcentagem, essa coluna também é dele
      const showTitle = budget >= 1
      const room = pctShown ? budget - 1 : budget
      const columns = Math.min(60, Math.floor(room * 0.6), room - 1 - TITLE_MIN)
      const art = columns < BAND_MIN ? null : bandRaster({
        key: 'band',
        columns,
        role: delegating ? 'boss' : 'clawd',
        pose,
        frame: f,
        ratio,
        color,
      })
      return (
        <Box flexDirection="row" gap={1}>
          {showTitle && (
            <Box flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
              <Text bold wrap="truncate" color={alerting ? ALERT : undefined}>{title}</Text>
            </Box>
          )}
          {showIcon && <Text color={iconColor}>{icon}</Text>}
          {art && (
            <Box flexShrink={0}>
              <Raster {...art} />
            </Box>
          )}
          {pctShown && <Text bold>{pctShown}</Text>}
          {showCount && <Text dimColor>{count}</Text>}
          {showCrew && <Button key="crew" plain label={crewLabel} onPress={openPane} />}
        </Box>
      )
    }

    const { Svg } = els
    // o mascote anda em cima da barra, na ponta do que já está pronto: dois
    // espaçadores dividem a sobra na proporção do progresso. Enquanto delega
    // ele é o boss, de coroa e capa. O boss usa o mesmo px do Clawd: a faixa
    // não pode mudar de altura quando ele delega (o terminal também não muda).
    const confetti = celebration === 'full'
    const sprite = mascotSvg(delegating ? 'boss' : 'clawd', pose, f, 2, confetti)
    return (
      <Box flexDirection="row" alignItems="center" gap={1} paddingX={1}>
        <Box width="30%" flexShrink={0} overflow="hidden">
          <Text bold wrap="truncate" color={alerting ? ALERT : undefined}>{title}</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
          <Box flexDirection="row" alignItems="flex-end">
            <Box flexGrow={ratio} flexShrink={1} />
            <Box flexShrink={0}>
              <Svg
                source={sprite.source}
                alt={delegating ? L.altBoss : L.altMascot}
                width={sprite.width}
                height={sprite.height}
              />
            </Box>
            <Box flexGrow={1 - ratio} flexShrink={1} />
          </Box>
          <Box overflow="hidden" justifyContent="center">
            <Svg source={barSvg({ ratio, color, frame: f })} alt={L.altProgress(pct)} height={6} />
          </Box>
        </Box>
        <Box flexShrink={0} flexDirection="row" gap={1} alignItems="center">
          {!alerting && <Text bold>{pct}</Text>}
          {count !== '' && <Text dimColor>{count}</Text>}
          {view.crew > 0 && <Button key="crew" plain label={`×${view.crew}`} onPress={openPane} />}
        </Box>
      </Box>
    )
  })

  // o que uma linha diz de um agent, para o painel e para o texto do /crew
  const facts = (a: PcAgent, clock: number) => {
    const doneN = a.tasks.filter(x => x.status === 'completed').length
    const progress = a.tasks.length
      ? `${doneN}/${a.tasks.length}`
      : a.status === 'running'
        ? L.actions(a.tools)
        : a.status === 'done'
          ? L.ready
          : L.failed
    const phase = a.status === 'running' ? (a.tasks.find(x => x.status === 'in_progress')?.activeForm ?? a.phase ?? L.starting) : ''
    const ctxPct = Math.round((a.ctxTokens / windowOf(a.model)) * 100)
    const took = fmtTime((a.endedAt ?? clock) - a.startedAt)
    const stats = a.role === 'codex' && a.steps === 0
      ? took
      : `ctx ${ctxPct}%  ${fmtTokens(a.tokens)} ${fmtCost(a.costUsd)} ${took}`
    const mark = a.status === 'running' ? '●' : a.status === 'done' ? '✓' : '✗'
    const sub = `${a.role === 'codex' ? 'Codex' : shortModel(a.model)}${effortLabel(a.effort)}`
    return { progress, phase, stats, mark, sub }
  }

  // o painel em texto, para quem vê a sessão de fora (telefone, web, app
  // remoto): nenhuma superfície desenha painéis ali, só o texto do comando chega
  const crewText = (crew: PcAgent[], t: number, mainTasks: { status: string; subject?: string }[]) => {
    const clock = Math.max(t, Date.now())
    const running = crew.filter(a => a.status === 'running')
    const finished = crew.filter(a => a.status !== 'running')
    const cost = crew.reduce((s, a) => s + a.costUsd, 0)
    const tokensTotal = crew.reduce((s, a) => s + a.tokens, 0)
    const first = crew.reduce((m, a) => Math.min(m, a.startedAt), Infinity)
    const last = running.length ? clock : crew.reduce((m, a) => Math.max(m, a.endedAt ?? a.startedAt), 0)
    const elapsed = crew.length ? last - first : 0
    const kit = mainTasks.find(x => x.status === 'in_progress')?.subject ?? (crew.length ? L.team : L.noAgentsYet)
    const line = (a: PcAgent) => {
      const { progress, phase, stats, mark, sub } = facts(a, clock)
      const label = (a.persona ? personaOf(a.persona)?.name : undefined) ?? ROLES[a.role].label
      return `${mark} ${a.description} — ${label} · ${sub} · ${progress}${phase ? ` · ${phase}` : ''} · ${stats.replace(/\s+/g, ' ')}`
    }
    const out = [
      L.paneText,
      kit,
      `${L.cost} ${fmtCost(cost)} · ${L.tokens} ${fmtTokens(tokensTotal)} · ${L.time} ${fmtTime(elapsed)}`,
      L.running(running.length),
      ...(running.length ? running.map(line) : [L.nobodyWorking]),
    ]
    if (finished.length) out.push(L.finished(finished.length), ...finished.slice().reverse().map(line))
    return out.join('\n')
  }

  // ── Painel lateral dos agents ─────────────────────────────────────────
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const crew = await read($, agents)
    const t = await read($, now)
    const f = await read($, frame)
    const expanded = await read($, showDone)
    const els: any = $.ui.resolve(e)
    const { Box, Text, Button } = els
    const isTerm = e.surface === 'terminal'
    const clock = Math.max(t, Date.now())

    const running = crew.filter(a => a.status === 'running')
    const finished = crew.filter(a => a.status !== 'running')
    const cost = crew.reduce((s, a) => s + a.costUsd, 0)
    const tokensTotal = crew.reduce((s, a) => s + a.tokens, 0)
    const first = crew.reduce((m, a) => Math.min(m, a.startedAt), Infinity)
    const last = running.length ? clock : crew.reduce((m, a) => Math.max(m, a.endedAt ?? a.startedAt), 0)
    const elapsed = crew.length ? last - first : 0
    const mainTasks = await read($, tasks)
    const kit = mainTasks.find(x => x.status === 'in_progress')?.subject ?? (crew.length ? L.team : L.noAgentsYet)

    const metric = (label: string, value: string, key: string) => (
      <Box key={key} flexDirection="column" borderStyle="round" borderDimColor paddingX={1} flexGrow={1}>
        <Text dimColor>{label}</Text>
        <Text bold>{value}</Text>
      </Box>
    )

    const row = (a: PcAgent) => {
      const info = ROLES[a.role]
      // a council persona keeps its own colour; the gear still says the stage
      const persona = a.persona ? personaOf(a.persona) : undefined
      const tint = persona?.color ?? info.color
      const ratio = a.status === 'failed' ? (ratioOf(a.tasks) ?? estimate(a.steps + a.tools)) : agentRatio(a)
      const { progress, phase, stats, mark, sub } = facts(a, clock)
      const markColor = a.status === 'running' ? CLAY : a.status === 'done' ? '#3FB27F' : '#E24B4A'
      // a finished agent's row goes still and grey: no sweeping glint, the role colour faded
      const done = a.status !== 'running'
      const barColor = done ? fade(tint) : tint
      const barFrame = done ? 0 : f

      if (isTerm) {
        // o personagem numa linha, em pixels de quadrante e na cor do papel,
        // no lugar dos glifos de uma cor só; a barra embaixo do texto
        const { Raster } = els
        // o personagem só entra se sobrar espaço para o texto ao lado; a
        // barra ocupa o resto da linha, até o limite de colunas do Raster
        const sprite = spriteRaster(a.role, `s-${a.id}`, !done, f, done, persona?.color)
        const width = Math.max(0, e.props.bodyColumns)
        const art = width >= sprite.columns + 1 + TEXT_MIN ? sprite : null
        const barCols = Math.min(MAX_RASTER_COLUMNS, art ? width - art.columns - 1 : width)
        return (
          <Box key={`a-${a.id}`} flexDirection="row" gap={1} marginBottom={1}>
            {art && (
              <Box flexShrink={0}>
                <Raster {...art} />
              </Box>
            )}
            <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
              <Box flexDirection="row" justifyContent="space-between" gap={1}>
                <Box flexDirection="row" gap={1} flexShrink={1} minWidth={0} overflow="hidden">
                  <Text color={done ? fade(tint) : tint}>{ROLE_SYMBOL[a.role]}</Text>
                  <Text bold wrap="truncate">{a.description}</Text>
                </Box>
                <Text color={markColor}>{mark}</Text>
              </Box>
              <Box flexDirection="row" gap={1}>
                <Text color={tint}>{info.label}</Text>
                <Text dimColor>{sub}</Text>
              </Box>
              <Box flexDirection="row" justifyContent="space-between" gap={1}>
                <Text dimColor wrap="truncate">{progress}{phase ? ` · ${phase}` : ''}</Text>
                <Text dimColor>{stats}</Text>
              </Box>
              {barCols >= BAR_MIN && (
                <Raster {...barRaster({ key: `b-${a.id}`, columns: barCols, ratio, color: barColor, frame: barFrame, still: done })} />
              )}
            </Box>
          </Box>
        )
      }

      const { Svg } = els
      const sprite = spriteSvg(a.role, 2, a.status === 'running', Math.floor(f / 9), persona?.color)
      return (
        <Box key={`a-${a.id}`} flexDirection="row" gap={1} paddingY={1} alignItems="flex-start">
          <Box flexShrink={0} alignItems="center">
            <Svg source={sprite.source} alt={L.altCharacter(info.label)} width={sprite.width} height={sprite.height} />
          </Box>
          <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0} overflow="hidden">
            <Box flexDirection="row" justifyContent="space-between" gap={1}>
              <Text bold wrap="truncate">{a.description}</Text>
              <Text color={markColor}>{mark}</Text>
            </Box>
            <Box flexDirection="row" gap={1}>
              <Text color={tint}>{info.label}</Text>
              <Text dimColor>{sub}</Text>
            </Box>
            <Box flexDirection="row" justifyContent="space-between" gap={1}>
              <Text dimColor wrap="truncate">{progress}{phase ? ` · ${phase}` : ''}</Text>
              <Text dimColor>{stats}</Text>
            </Box>
            <Box marginTop={1} overflow="hidden">
              <Svg source={barSvg({ ratio, color: barColor, frame: barFrame, still: done })} alt={L.altProgress(a.description)} height={6} />
            </Box>
          </Box>
        </Box>
      )
    }

    return (
      <Box flexDirection="column" gap={1}>
        <Text bold>{kit}</Text>
        <Box flexDirection="row" gap={1}>
          {metric(L.cost, fmtCost(cost), 'm-cost')}
          {metric(L.tokens, fmtTokens(tokensTotal), 'm-tok')}
          {metric(L.time, fmtTime(elapsed), 'm-time')}
        </Box>
        <Text dimColor>{L.running(running.length)}</Text>
        {running.length === 0 && <Text dimColor>{L.nobodyWorking}</Text>}
        {running.map(row)}
        {finished.length > 0 && (
          <Button
            key="toggle-done"
            plain
            label={`${expanded ? '▾' : '▸'} ${L.finished(finished.length)}`}
            onPress={() => update($, showDone, v => !v)}
          />
        )}
        {expanded && finished.slice().reverse().map(row)}
      </Box>
    )
  })
}
