import { expect, mock, test } from 'claude-code/testing'

import { ALERT, ALERT_THEMED, bandRaster, barRaster, barSvg, barTones, CLAY, fade, LINE_ART, mascotPixels, mascotSvg, PARTY, ROLES, roleLabel, spriteRaster } from '../hooks/art'
import { langOf, strings } from '../hooks/i18n'
import { activityOf, capCrew, councilTitle, ERROR, estimate, glide, priceOf, resetGlide, roleOf, statusLine, windowOf } from '../hooks/register'
import { parseCouncil, PERSONAS, SPARE } from '../hooks/council'

const BAND: any = {
  isWorking: true,
  hasSurvey: false,
  maxRows: 10,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 10 },
  view: {},
}
const PANE: any = {
  title: 'Agents',
  isFocused: false,
  bodyColumns: 50,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 30 },
  view: {},
}
const EN = { options: { language: 'en' } }
const PT = { options: { language: 'pt' } }
const ES = { options: { language: 'es' } }

test('gives each subagent a role from the first keyword', async () => {
  expect(roleOf('codex:codex-rescue', 'Fix the bug')).toBe('codex')
  expect(roleOf('general-purpose', 'Review the whole kit')).toBe('tester')
  expect(roleOf('Plan', 'Plan the architecture')).toBe('researcher')
  expect(roleOf('general-purpose', 'Pesquisar o fluxo dos testes do plugin')).toBe('researcher')
  expect(roleOf('general-purpose', 'Testar a cobertura dos testes')).toBe('tester')
  expect(roleOf('general-purpose', 'Build: mapear funções do register')).toBe('developer')
  expect(roleOf('general-purpose', 'Design: inventário da paleta dos sprites')).toBe('artist')
  expect(roleOf('Explore', 'Mapear o projeto')).toBe('researcher')
  expect(roleOf('general-purpose', 'Desenhar a tela inicial')).toBe('artist')
  expect(roleOf('general-purpose', 'Design the launch graphics')).toBe('artist')
  expect(roleOf('Explore', 'Research competitor launches')).toBe('researcher')
  expect(roleOf('general-purpose', 'Build the landing page')).toBe('developer')
  expect(roleOf('general-purpose', 'Run the tests')).toBe('tester')
  expect(roleOf('general-purpose', 'Organize things')).toBe('worker')
  // Spanish
  expect(roleOf('general-purpose', 'Draw the app icon')).toBe('artist')
  expect(roleOf('general-purpose', 'Diseñar el logo')).toBe('artist')
  expect(roleOf('general-purpose', 'Probar el login')).toBe('tester')
  expect(roleOf('general-purpose', 'Corregir el error del pago')).toBe('developer')
  expect(roleOf('general-purpose', 'Construir la página')).toBe('developer')
  expect(roleOf('general-purpose', 'Analizar la competencia')).toBe('researcher')
})

test('the boss is never a subagent', async () => {
  for (const d of ['Review the whole kit', 'Coordenar a equipe', 'Plan the release', 'Chefe do projeto', 'Audit the code'])
    expect(roleOf('general-purpose', d)).not.toBe('boss')
})

test('the estimate grows and stays under 90%', async () => {
  expect(estimate(0)).toBe(0)
  expect(estimate(4)).toBeGreaterThan(estimate(2))
  expect(estimate(1000)).toBeLessThanOrEqual(0.9)
})

test('reads a language out of settings and locales', async () => {
  expect(langOf('pt-BR')).toBe('pt')
  expect(langOf('Portuguese')).toBe('pt')
  expect(langOf('es_ES.UTF-8')).toBe('es')
  expect(langOf('Español')).toBe('es')
  expect(langOf('en-US')).toBe('en')
  expect(langOf('english')).toBe('en')
  expect(langOf('fr-FR')).toBeUndefined()
  expect(langOf('C')).toBeUndefined()
  expect(langOf(undefined)).toBeUndefined()
})

test('describes what the agent is doing, in each language', async () => {
  const en = strings('en')
  const pt = strings('pt')
  const es = strings('es')
  expect(activityOf('Read', { file_path: 'C:/x/hooks/art.ts' }, en)).toBe('Reading art.ts')
  expect(activityOf('Read', { file_path: 'C:/x/hooks/art.ts' }, pt)).toBe('Lendo art.ts')
  expect(activityOf('Read', { file_path: 'C:/x/hooks/art.ts' }, es)).toBe('Leyendo art.ts')
  expect(activityOf('Edit', { file_path: '/a/b/register.tsx' }, en)).toBe('Editing register.tsx')
  expect(activityOf('Bash', { description: 'Run the tests' }, en)).toBe('Run the tests')
  expect(activityOf('Bash', {}, es)).toBe('Ejecutando un comando')
  expect(activityOf('Agent', { description: 'Build the page' }, en)).toBe('Delegating: Build the page')
  expect(activityOf('mcp__github__create_issue', {}, pt)).toBe('Usando create_issue')
})

test('the bar glides up and drops at once', async () => {
  resetGlide()
  expect(glide(0.2, 1000)).toBe(0.2)
  const step = glide(0.8, 1300)
  expect(step).toBeGreaterThan(0.2)
  expect(step).toBeLessThan(0.8)
  expect(glide(0.8, 1600)).toBeGreaterThan(step)
  // a new turn starts over right away
  expect(glide(0, 1700)).toBe(0)
  resetGlide()
})

test('the band follows the task list', EN, async ($, on) => {
  resetGlide()
  ;(on as any)('tool.call', { tool: 'TodoWrite' }, async () => ({ result: { oldTodos: [], newTodos: [] } }))
  await ($.tool.call as any)({
    tool: 'TodoWrite',
    input: {
      todos: [
        { content: 'First', status: 'completed', activeForm: 'Doing the first' },
        { content: 'Second', status: 'in_progress', activeForm: 'Doing the second' },
      ],
    },
  } as any)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'AbovePrompt', props: BAND })
    expect(await ui.find({ text: /Doing the second/ })).toBeDefined()
    expect(await ui.find({ text: /50%/ })).toBeDefined()
    await ui.unmount()
  }
})

test('the panel lists a subagent with its role and status', EN, async ($, on) => {
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'agent-1' }))
  on('turn.complete', async () => ({ text: '' }))
  await $.agent.spawn({ prompt: 'go', description: 'Build the landing page', subagentType: 'general-purpose' } as any)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'Pane', props: PANE, requestId: 'pixel-crew-agents' })
    expect(await ui.find({ text: /Build the landing page/ })).toBeDefined()
    expect(await ui.find({ text: /developer/ })).toBeDefined()
    expect(await ui.find({ text: /Running · 1/ })).toBeDefined()
    await ui.unmount()
  }

  await $.turn.complete({ agentId: 'agent-1', answer: 'ok', durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer' } as any)
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'Pane', props: PANE, requestId: 'pixel-crew-agents' })
  expect(await ui.find({ text: /Finished · 1/ })).toBeDefined()
  expect(await ui.find({ text: /Running · 0/ })).toBeDefined()
  expect(await ui.find({ text: /Cost/ })).toBeDefined()
  await ui.unmount()
})

// two subagents, one finished: Claude is the boss and counts 1/2
async function boss($: any, on: any) {
  let n = 0
  on('agent.spawn', async () => ({ model: 'claude-haiku-5-5', agentId: 'ag-' + ++n }))
  on('turn.complete', async () => ({ text: '' }))
  await $.agent.spawn({ prompt: 'a', description: 'Build the page', subagentType: 'general-purpose' } as any)
  await $.agent.spawn({ prompt: 'b', description: 'Design the logo', subagentType: 'general-purpose' } as any)
  await $.turn.complete({ agentId: 'ag-1', answer: 'ok', durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer' } as any)
}

test('Claude becomes the boss and counts finished subagents', EN, async ($, on) => {
  await boss($, on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'AbovePrompt', props: { ...BAND, isWorking: false } })
    expect(await ui.find({ text: /1\/2/ })).toBeDefined()
    expect(await ui.find({ text: /Waiting for 1 agent/ })).toBeDefined()
    if (surface === 'desktop') {
      const svg = await ui.find({ type: 'Svg' })
      expect(svg?.props.alt).toBe('Claude as the boss')
    }
    await ui.unmount()
  }
})

test('the desktop band keeps its height when Claude becomes the boss', EN, async ($, on) => {
  const mascot = async (props: any) => {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props })
    const svg = (await ui.findAll({ type: 'Svg' })).find(s => /^Claude (mascot|as the boss)$/.test(String(s.props.alt)))
    await ui.unmount()
    expect(svg).toBeDefined()
    return { alt: svg!.props.alt, width: svg!.props.width, height: svg!.props.height }
  }
  // the hooks go in before the first mount, so this is boss() split around it
  let n = 0
  on('agent.spawn', async () => ({ model: 'claude-haiku-5-5', agentId: 'ag-' + ++n }))
  on('turn.complete', async () => ({ text: '' }))
  const clawd = await mascot(BAND)
  expect(clawd).toEqual({ alt: 'Claude mascot', width: 36, height: 32 })
  await $.agent.spawn({ prompt: 'a', description: 'Build the page', subagentType: 'general-purpose' } as any)
  await $.agent.spawn({ prompt: 'b', description: 'Design the logo', subagentType: 'general-purpose' } as any)
  await $.turn.complete({ agentId: 'ag-1', answer: 'ok', durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer' } as any)
  const chief = await mascot({ ...BAND, isWorking: false })
  expect(chief).toEqual({ alt: 'Claude as the boss', width: 36, height: 32 })
  expect(chief.height).toBe(clawd.height)
})

// the band's height is the mascot's: no role, skin, hat, mood, frame or confetti may change it
test('the mascot keeps one size in every role, skin, hat, mood and frame', () => {
  const sizes = new Set<string>()
  // mascotSvg sizes its frame from the grid, so a taller hat can't grow the
  // band: box() drops what falls off the grid and the viewBox (rows -1 to 14)
  // cuts what a hop lifts past it. So this also pins who leaves the frame
  // upward. Only the magnifier's and the quill's tips do, at the top of the
  // hop, and a hat comes off when its turn ends, before that hop.
  const cut = new Set<string>()
  for (const role of ['clawd', 'boss'] as const)
    for (const skin of ['crew', 'party'] as const)
      for (const hat of [undefined, 'hardhat', 'lantern', 'magnifier', 'goggles', 'quill', 'broom'] as const)
        for (const pose of ['walk', 'jump', 'sleep', 'alert', 'shake'] as const)
          for (const confetti of [false, true])
            for (let f = 0; f < 40; f++) {
              const s = mascotSvg(role, pose, f, 2, confetti, skin, hat)
              sizes.add(`${s.width}x${s.height}`)
              if (mascotPixels(role, pose, f, confetti, skin, hat).some(p => p.y < -1)) cut.add(`${role} ${hat ?? 'bare'} ${pose}`)
            }
  expect([...sizes]).toEqual(['36x32'])
  expect([...cut]).toEqual(['clawd magnifier jump', 'clawd quill jump'])
})

test('the band speaks Portuguese', PT, async ($, on) => {
  await boss($, on)
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, isWorking: false } })
  expect(await ui.find({ text: /Esperando 1 agent/ })).toBeDefined()
  await ui.unmount()
  const pane = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'Pane', props: PANE, requestId: 'pixel-crew-agents' })
  expect(await pane.find({ text: /Rodando · 1/ })).toBeDefined()
  expect(await pane.find({ text: /Concluídos · 1/ })).toBeDefined()
  await pane.unmount()
})

test('the band speaks Spanish', ES, async ($, on) => {
  await boss($, on)
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, isWorking: false } })
  expect(await ui.find({ text: /Esperando 1 agente/ })).toBeDefined()
  await ui.unmount()
  const pane = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'Pane', props: PANE, requestId: 'pixel-crew-agents' })
  expect(await pane.find({ text: /En curso · 1/ })).toBeDefined()
  expect(await pane.find({ text: /Terminados · 1/ })).toBeDefined()
  await pane.unmount()
})

test('a new prompt does not inherit the last turn’s 100%', EN, async ($, on) => {
  on('turn.complete', async () => ({ text: '' }))
  await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't0', reason: 'answer' } as any)

  for (const surface of ['terminal', 'desktop'] as const) {
    // the app already says "working", but turn.start has not arrived yet
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'AbovePrompt', props: BAND })
    expect(await ui.find({ text: /100%/ })).toBeUndefined()
    expect(await ui.find({ text: /^0%$/ })).toBeDefined()
    expect(await ui.find({ text: /Thinking/ })).toBeDefined()
    await ui.unmount()
  }
})

const CONFETTI = /#F5C542|#D4537E|#378ADD|#639922|#FFF6C8|#F07A1E/

test('a finished turn celebrates with confetti', EN, async ($, on) => {
  on('turn.complete', async () => ({ text: '' }))
  await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't0', reason: 'answer' } as any)

  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, isWorking: false } })
  expect(await ui.find({ text: /^Done$/ })).toBeDefined()
  const mascot = (await ui.findAll({ type: 'Svg' })).find(s => s.props.alt === 'Claude mascot')
  expect(String(mascot?.props.source)).toMatch(CONFETTI)
  await ui.unmount()
})

test('an aborted turn does not celebrate', EN, async ($, on) => {
  // the band hides itself: what is beneath it (here, an empty row) draws instead
  ;(on as any)('ui.render', { component: 'AbovePrompt' }, async ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('turn.complete', async () => ({ text: '' }))
  await $.turn.complete({ answer: '', durationMs: 10, isAborted: true, turnId: 't0', reason: 'aborted' } as any)
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, isWorking: false } })
  expect(await ui.find({ text: /^Done$/ })).toBeUndefined()
  await ui.unmount()
})

test('Claude raises a hand while a question waits for you', EN, async ($, on) => {
  let seen: unknown
  ;(on as any)('tool.call', { tool: 'AskUserQuestion' }, async () => {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'AbovePrompt', props: BAND })
    seen = await ui.find({ text: /Waiting for your answer/ })
    await ui.unmount()
    return { result: { questions: [], answers: {} } }
  })
  await ($.tool.call as any)({ tool: 'AskUserQuestion', input: { questions: [] } })
  expect(seen).toBeDefined()

  // answered: the "!" is gone
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect(await ui.find({ text: /Waiting for your answer/ })).toBeUndefined()
  await ui.unmount()
})

test('a permission prompt shows on the band', PT, async ($, on) => {
  ;(on as any)('tool.check', async () => ({ decision: 'ask' }))
  // beneath pixel-crew, a stand-in for the tool: nothing really runs
  ;(on as any)('tool.call', { tool: 'Bash' }, async () => ({ result: 'ok', text: 'ok' }))
  const input = { command: 'ls build' }
  await ($.tool.check as any)({ tool: 'Bash', input, tool_use_id: 'tu-1' })
  const mount = () => $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  // the bar is the 60x2 Svg; in alert its alt names the wait, not a %
  const barOf = async (ui: any) => String((await ui.findAll({ type: 'Svg' })).find((s: any) => String(s.props.source).includes('viewBox="0 0 60 2"'))!.props.source)
  // waiting for you: the bar and the title turn the theme's amber, the % steps aside
  let ui = await mount()
  const title = await ui.find({ type: 'Text', text: /Esperando sua permissão/ })
  expect(title).toBeDefined()
  expect(title!.props.color).toBe('warning')
  expect(await barOf(ui)).toContain(`.f{fill:${ALERT_THEMED.dark}}`)
  expect(await barOf(ui)).toContain(`.f{fill:${ALERT_THEMED.light}}`)
  expect(await ui.find({ type: 'Text', text: /%/ })).toBeUndefined()
  await ui.unmount()

  // allowed and run: the amber goes and the % is back
  await ($.tool.call as any)({ tool: 'Bash', input, tool_use_id: 'tu-1' })
  ui = await mount()
  expect(await ui.find({ text: /Esperando sua permissão/ })).toBeUndefined()
  expect(await barOf(ui)).not.toContain(ALERT_THEMED.dark)
  expect(await barOf(ui)).not.toContain(ALERT_THEMED.light)
  expect(await ui.find({ type: 'Text', text: /^\d+%$/ })).toBeDefined()
  await ui.unmount()
})

// a screen reader hears what the band shows: waiting for you, not a % it hides
for (const [lang, opts, waiting] of [
  ['en', EN, 'Waiting for your permission'],
  ['pt', PT, 'Esperando sua permissão'],
  ['es', ES, 'Esperando tu permiso'],
] as const)
  test(`the waiting desktop bar's alt says it is waiting, not a percentage (${lang})`, opts, async ($, on) => {
    resetGlide()
    ;(on as any)('tool.call', { tool: 'TodoWrite' }, async () => ({ result: { oldTodos: [], newTodos: [] } }))
    ;(on as any)('tool.call', { tool: 'Bash' }, async () => ({ result: 'ok', text: 'ok' }))
    ;(on as any)('tool.check', async (_: any, e: any, next: any) => (e.tool === 'Bash' ? { decision: 'ask' } : next(e)))
    await ($.tool.call as any)({
      tool: 'TodoWrite',
      input: { todos: [{ content: 'First', status: 'completed', activeForm: 'Doing the first' }, { content: 'Second', status: 'in_progress', activeForm: 'Doing the second' }] },
    } as any)
    const mount = () => $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: BAND })
    const barAlt = async (ui: any) =>
      String((await ui.findAll({ type: 'Svg' })).find((s: any) => String(s.props.source).includes('viewBox="0 0 60 2"'))!.props.alt)
    const input = { command: 'ls build' }
    await ($.tool.check as any)({ tool: 'Bash', input, tool_use_id: 'tu-1' })
    let ui = await mount()
    const alt = await barAlt(ui)
    expect(alt).toBe(waiting)
    expect(alt).not.toContain('%')
    expect(alt).not.toMatch(/progre/i)
    await ui.unmount()
    // answered: the alt is the progress again, with the % the band shows
    await ($.tool.call as any)({ tool: 'Bash', input, tool_use_id: 'tu-1' })
    ui = await mount()
    const back = await barAlt(ui)
    expect(back).toMatch(/progre/i)
    const pct = /\d+%/.exec(back)![0]
    expect(await ui.find({ type: 'Text', text: pct })).toBeDefined()
    await ui.unmount()
  })

test('the terminal band says it needs you in amber, without the %', EN, async ($, on) => {
  // half the list done, so the bar has a fill to colour
  resetGlide()
  ;(on as any)('tool.call', { tool: 'TodoWrite' }, async () => ({ result: { oldTodos: [], newTodos: [] } }))
  // only the Bash command asks; the list goes through as usual
  ;(on as any)('tool.check', async (_: any, e: any, next: any) => (e.tool === 'Bash' ? { decision: 'ask' } : next(e)))
  await ($.tool.call as any)({
    tool: 'TodoWrite',
    input: {
      todos: [
        { content: 'First', status: 'completed', activeForm: 'Doing the first' },
        { content: 'Second', status: 'in_progress', activeForm: 'Doing the second' },
      ],
    },
  } as any)
  await ($.tool.check as any)({ tool: 'Bash', input: { command: 'ls build' }, tool_use_id: 'tu-1' })
  const mount = (bodyColumns: number) =>
    $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, bodyColumns } })
  let ui = await mount(40)
  const title = await ui.find({ type: 'Text', text: /Waiting for your permission/ })
  expect(title).toBeDefined()
  expect(title!.props.color).toBe('warning')
  // the "!" matches the title: the theme's amber, readable on a light terminal too
  expect((await ui.find({ type: 'Text', text: /!/ }))?.props.color).toBe('warning')
  expect(await ui.find({ type: 'Text', text: /%/ })).toBeUndefined()
  // the count stays: it still says how far the list is
  expect(await ui.find({ text: /^1\/2$/ })).toBeDefined()
  const raster = await ui.find({ type: 'Raster' })
  expect(raster).toBeDefined()
  const colors = new Set(decodeCells(String(raster!.props.cells)).flatMap(([, fg, bg]) => [fg, bg]))
  expect(colors.has(0xf5c542)).toBe(true)
  await ui.unmount()
  // with no % the row still fits: each thing after the title costs its width and a gap
  for (const bodyColumns of [2, 8, 16, 30, 100]) {
    ui = await mount(bodyColumns)
    const rasters = await ui.findAll({ type: 'Raster' })
    const extras = [
      ...(await ui.findAll({ text: /^\d+\/\d+$/ })).map(t => String(t.text).length),
      ...(await ui.findAll({ type: 'Button' })).map(b => String(b.props.label).length),
      ...rasters.map(r => Number(r.props.columns)),
      ...(await ui.findAll({ type: 'Text', text: /!$/ })).map(t => String(t.text).length),
    ]
    const used = extras.reduce((a, w) => a + w + 1, 0)
    expect(used).toBeLessThanOrEqual(bodyColumns)
    if (rasters.length) expect(bodyColumns - used).toBeGreaterThanOrEqual(8)
    expect(await ui.find({ type: 'Text', text: /%/ })).toBeUndefined()
    await ui.unmount()
  }
  // the freed % column keeps the band up where a % alone would not fit
  ui = await mount(1)
  expect(await ui.find({ type: 'Text', text: /%/ })).toBeUndefined()
  expect(await ui.find({ text: /Waiting for your permission/ })).toBeDefined()
  await ui.unmount()
})

// at every width the waiting title outranks the count and the crew button: a
// narrow band that showed only "1/2" would hide that Claude needs you
async function alertAtEveryWidth($: any, on: any, setup: (on: any) => Promise<void>) {
  ;(on as any)('tool.check', async (_: any, e: any, next: any) => (e.tool === 'Bash' ? { decision: 'ask' } : next(e)))
  await setup(on)
  await ($.tool.check as any)({ tool: 'Bash', input: { command: 'ls build' }, tool_use_id: 'tu-1' })
  for (let bodyColumns = 1; bodyColumns <= 20; bodyColumns++) {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, isWorking: false, bodyColumns } })
    const title = await ui.find({ type: 'Text', text: /Waiting for your permission/ })
    if (!title) throw new Error(`no waiting title at ${bodyColumns} columns`)
    expect(await ui.find({ type: 'Text', text: /%/ })).toBeUndefined()
    await ui.unmount()
  }
}

test('the waiting title never gives way to the count', EN, async ($, on) => {
  resetGlide()
  await alertAtEveryWidth($, on, async on => {
    on('tool.call', { tool: 'TodoWrite' }, async () => ({ result: { oldTodos: [], newTodos: [] } }))
    await ($.tool.call as any)({
      tool: 'TodoWrite',
      input: { todos: [{ content: 'First', status: 'completed', activeForm: 'Doing the first' }, { content: 'Second', status: 'in_progress', activeForm: 'Doing the second' }] },
    } as any)
  })
})

test('the waiting title never gives way to the crew button', EN, async ($, on) => {
  await alertAtEveryWidth($, on, async on => {
    let n = 0
    on('agent.spawn', async () => ({ model: 'claude-haiku-5-5', agentId: 'ag-' + ++n }))
    on('turn.complete', async () => ({ text: '' }))
    await $.agent.spawn({ prompt: 'a', description: 'Build the page', subagentType: 'general-purpose' } as any)
    await $.turn.complete({ agentId: 'ag-1', answer: 'ok', durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer' } as any)
  })
})

test('the waiting title never gives way to the count and crew together', EN, async ($, on) => {
  await alertAtEveryWidth($, on, async on => boss($, on))
})

test('a failed tool turns the bar red for a moment', EN, async ($, on) => {
  ;(on as any)('tool.call', { tool: 'Bash' }, async () => ({ isError: true, result: 'boom', text: 'boom' }))
  await ($.tool.call as any)({ tool: 'Bash', input: { command: 'exit 1', description: 'Run the build' } })
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const svgs = await ui.findAll({ type: 'Svg' })
  expect(svgs.some(s => String(s.props.source).includes('#E24B4A'))).toBe(true)
  await ui.unmount()
})

test('/crew-bar turns the band off and on', EN, async ($, on) => {
  // with the band off, what is beneath it (here, an empty row) draws instead
  ;(on as any)('ui.render', { component: 'AbovePrompt' }, async ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const run = (args: string) => ($.command.run as any)({ command: 'crew-bar', args })
  const thinking = async () => {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: BAND })
    const found = await ui.find({ text: /Thinking/ })
    await ui.unmount()
    return found
  }

  expect((await run('off')).text).toMatch(/Progress band off/)
  expect(await thinking()).toBeUndefined()
  expect((await run('')).text).toBe('Progress band on')
  expect(await thinking()).toBeDefined()
  expect((await run('desligar')).text).toMatch(/off/)
  expect((await run('on')).text).toBe('Progress band on')
})

test('/crew returns the crew as text when no surface draws the pane', EN, async ($, on) => {
  ;(on as any)('ui.open', () => ({ value: { isPlaced: false, reason: 'no-surface' } }))
  await boss($, on)
  const out = await ($.command.run as any)({ command: 'crew', args: '' })
  expect(out.text).toMatch(/No surface draws the Agents panel here/)
  expect(out.text).toMatch(/Running · 1/)
  expect(out.text).toMatch(/● Design the logo — /)
  expect(out.text).toMatch(/Finished · 1/)
  expect(out.text).toMatch(/✓ Build the page — /)
  expect(out.text).toMatch(/Cost ≈?\$/)
})

test('/crew reports the pane opened when a surface places it', EN, async ($, on) => {
  ;(on as any)('ui.open', () => ({ value: { isPlaced: true } }))
  const out = await ($.command.run as any)({ command: 'crew', args: '' })
  expect(out.text).toBe('Agents panel opened.')
})

// ── Terminal pixel art ───────────────────────────────────────────────────
// A Raster's cells are base64 of little-endian u32 triplets [codePoint, fg, bg];
// this decoder reads them back so a test can look at single cells.
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
function decodeCells(cells: string): Array<[number, number, number]> {
  const bytes: number[] = []
  const clean = cells.replace(/=+$/, '')
  for (let i = 0; i < clean.length; i += 4) {
    const n = [0, 1, 2, 3].map(k => (i + k < clean.length ? B64.indexOf(clean[i + k]!) : 0))
    const v = (n[0]! << 18) | (n[1]! << 12) | (n[2]! << 6) | n[3]!
    bytes.push((v >> 16) & 255, (v >> 8) & 255, v & 255)
  }
  const out: Array<[number, number, number]> = []
  const u32 = (o: number) => (bytes[o]! | (bytes[o + 1]! << 8) | (bytes[o + 2]! << 16) | (bytes[o + 3]! << 24)) >>> 0
  for (let o = 0; o + 12 <= bytes.length; o += 12) out.push([u32(o), u32(o + 4), u32(o + 8)])
  return out
}
const DEFAULT = 0x01000000
const UPPER = 0x2580
const LOWER = 0x2584

const QUADRANTS = [0x20, 0x2597, 0x2596, 0x2584, 0x259d, 0x2590, 0x259e, 0x259f, 0x2598, 0x259a, 0x258c, 0x2599, 0x2580, 0x259c, 0x259b, 0x2588]

test('each role is a one-line quadrant character in its own colour', async () => {
  const body: Record<string, number> = {
    developer: 0x378add,
    artist: 0xd4537e,
    researcher: 0xb8864e,
    worker: 0x639922,
    tester: 0xf07a1e,
    boss: 0x6a4be0,
  }
  for (const role of ['developer', 'artist', 'researcher', 'worker', 'tester', 'boss', 'codex'] as const) {
    const r = spriteRaster(role, role)
    expect(r.rows).toBe(1)
    expect(r.columns).toBe(5)
    const cells = decodeCells(r.cells)
    for (const [cp] of cells) expect(QUADRANTS).toContain(cp)
    const colors = new Set(cells.flatMap(([, fg, bg]) => [fg, bg]))
    if (role === 'codex') {
      // a white robot with green eyes
      expect(colors.has(0xe6e8eb)).toBe(true)
      expect(colors.has(0x10a37f)).toBe(true)
    } else {
      expect(colors.has(body[role]!)).toBe(true)
      expect(colors.has(0x1f1410)).toBe(true)
    }
  }
})

test('the terminal bar fills from the left with a highlight on top', async () => {
  const r = barRaster({ key: 'b', columns: 20, ratio: 0.5, color: '#639922', frame: 0 })
  const cells = decodeCells(r.cells)
  expect(r.rows).toBe(1)
  expect(cells).toHaveLength(20)
  // filled half: the bottom pixel is the role colour (or the sweeping glint)
  const filledBg = cells.slice(0, 10).map(([, , bg]) => bg)
  expect(filledBg.filter(bg => bg === 0x639922).length).toBeGreaterThan(5)
  // empty half: the dark track, never the role colour
  for (const [, fg, bg] of cells.slice(10)) {
    expect(bg).not.toBe(0x639922)
    expect(fg).not.toBe(0x639922)
  }
  // an indeterminate bar still draws something
  const busy = decodeCells(barRaster({ key: 'b', columns: 20, ratio: null, color: '#639922', frame: 7 }).cells)
  expect(busy.some(([, , bg]) => bg === 0x639922)).toBe(true)
})

test('the terminal panel draws each subagent as pixel art, not glyphs', EN, async ($, on) => {
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'agent-1' }))
  on('turn.complete', async () => ({ text: '' }))
  await $.agent.spawn({ prompt: 'go', description: 'Organize the files', subagentType: 'general-purpose' } as any)
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'Pane', props: PANE, requestId: 'pixel-crew-agents' })
  const rasters = await ui.findAll({ type: 'Raster' })
  // the character and its progress bar, each one line tall
  expect(rasters.length).toBeGreaterThanOrEqual(2)
  for (const r of rasters) {
    expect(r.props.columns).toBeLessThanOrEqual(PANE.bodyColumns)
    expect(r.props.rows).toBe(1)
  }
  expect(await ui.find({ text: /▐▛█▜▌/ })).toBeUndefined()
  expect(await ui.find({ text: /Organize the files/ })).toBeDefined()
  await ui.unmount()
})

test('the terminal band is one line: the mascot walks inside the bar', EN, async ($, on) => {
  await boss($, on)
  for (const maxRows of [10, 4]) {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, maxRows } })
    const raster = await ui.find({ type: 'Raster' })
    expect(raster).toBeDefined()
    // the mascot walks inside the bar's own line
    expect(raster!.props.rows).toBe(1)
    expect(raster!.props.columns).toBeLessThanOrEqual(BAND.bodyColumns)
    // before the bar, only the boss's crown, in purple: no block glyph
    expect(await ui.find({ text: /▐▛█▜▌/ })).toBeUndefined()
    const icon = await ui.find({ type: 'Text', text: /♛/ })
    expect(icon?.text).toBe('♛')
    expect(String(icon?.props.color).toLowerCase()).toBe('#6a4be0')
    expect(await ui.find({ text: /1\/2/ })).toBeDefined()
    await ui.unmount()
  }
})

test('before any tool the band shows no symbol; a failure adds the ✗ mark', EN, async ($, on) => {
  ;(on as any)('tool.call', { tool: 'Bash' }, async () => ({ isError: true, result: 'boom', text: 'boom' }))
  const mount = () => $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  // working: nothing before the bar, neither the block glyph nor a crown
  let ui = await mount()
  expect(await ui.find({ text: /▐▛█▜▌|♛/ })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /^(✦|zz|!|✗)$/ })).toBeUndefined()
  await ui.unmount()
  // a failed build: the developer's symbol, then the ✗ mark, in the error red
  await ($.tool.call as any)({ tool: 'Bash', input: { command: 'exit 1', description: 'Run the build' } })
  ui = await mount()
  const mark = await ui.find({ type: 'Text', text: /✗/ })
  expect(mark?.text).toBe('⌨ ✗')
  expect(String(mark?.props.color).toUpperCase()).toBe('#E24B4A')
  expect(await ui.find({ text: /▐▛█▜▌/ })).toBeUndefined()
  await ui.unmount()
})

test('the band symbol is the kind of work Claude just did, in that role\'s colour', EN, async ($, on) => {
  for (const tool of ['Edit', 'Write', 'Grep', 'Bash']) (on as any)('tool.call', { tool }, async () => ({ result: 'ok', text: 'ok' }))
  const symbol = async (tool: string, input: any) => {
    await ($.tool.call as any)({ tool, input })
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'AbovePrompt', props: BAND })
    const t = await ui.find({ type: 'Text', text: /^[⌨✎⌕⚒✓⚡♛]/ })
    const out = t ? [String(t.text), String(t.props.color).toUpperCase()] : undefined
    await ui.unmount()
    return out
  }
  expect(await symbol('Edit', { file_path: '/x/app.ts', old_string: 'a', new_string: 'b' })).toEqual(['⌨', '#378ADD'])
  expect(await symbol('Write', { file_path: '/x/theme.css', content: 'a{}' })).toEqual(['✎', '#D4537E'])
  expect(await symbol('Grep', { pattern: 'x' })).toEqual(['⌕', '#B8864E'])
  expect(await symbol('Bash', { command: 'yarn test', description: 'Run the tests' })).toEqual(['✓', '#F07A1E'])
  expect(await symbol('Bash', { command: 'codex exec review', description: 'Ask Codex' })).toEqual(['⚡', '#10A37F'])
  expect(await symbol('Bash', { command: 'ls', description: 'List files' })).toEqual(['⚒', '#639922'])
})

test('each terminal panel row shows its role symbol, greyed once finished', EN, async ($, on) => {
  await boss($, on)
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'Pane', requestId: 'pixel-crew-agents', props: PANE } as any)
  // 'Design the logo' is still running: the artist's brush in pink
  const brush = await ui.find({ type: 'Text', text: /^✎$/ })
  expect(String(brush?.props.color).toUpperCase()).toBe('#D4537E')
  // 'Build the page' finished: the developer's keyboard, faded toward grey
  const keys = await ui.find({ type: 'Text', text: /^⌨$/ })
  expect(String(keys?.props.color).toUpperCase()).toBe(fade('#378ADD').toUpperCase())
  await ui.unmount()
})

test('the terminal bar puts a highlight on top of the fill and never passes 512 columns', async () => {
  // #639922 mixed 45% toward white, the fill's top pixel row
  const HI = 0xa9c785
  const cells = decodeCells(barRaster({ key: 'b', columns: 30, ratio: 1, color: '#639922', frame: 0 }).cells)
  expect(cells.filter(([, fg]) => fg === HI).length).toBeGreaterThan(20)
  expect(cells.filter(([, , bg]) => bg === 0x639922).length).toBeGreaterThan(20)
  for (const columns of [512, 513, 1000]) {
    const r = barRaster({ key: 'b', columns, ratio: 0.5, color: '#639922' })
    expect(r.columns).toBe(Math.min(512, columns))
    expect(decodeCells(r.cells)).toHaveLength(r.columns)
  }
})

test('the terminal band shows the mascot, fits narrow bands and draws nothing without rows', EN, async ($, on) => {
  // beneath the plugin, an empty row: what draws when the band steps aside
  ;(on as any)('ui.render', { component: 'AbovePrompt' }, async ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  await boss($, on)
  const mount = (props: any) =>
    $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'AbovePrompt', props: { ...BAND, ...props } })
  // the boss walks the bar in its purple cape, eyes and all
  let ui = await mount({})
  const raster = await ui.find({ type: 'Raster' })
  const colors = new Set(decodeCells(String(raster!.props.cells)).flatMap(([, fg, bg]) => [fg, bg]))
  expect(colors.has(0x1f1410)).toBe(true)
  expect(colors.has(0x6a4be0)).toBe(true)
  await ui.unmount()
  // the whole row fits the band at any width: the title truncates, and what
  // follows it (art, percentage, count, crew button, one gap each) is counted
  for (const bodyColumns of [3, 8, 16, 30, 100]) {
    for (const maxRows of [1, 10]) {
      ui = await mount({ bodyColumns, maxRows })
      const pctText = await ui.find({ text: /^\d+%$/ })
      expect(pctText).toBeDefined()
      const rasters = await ui.findAll({ type: 'Raster' })
      for (const r of rasters) expect(Number(r.props.rows)).toBeLessThanOrEqual(maxRows)
      const extras = [
        ...(await ui.findAll({ text: /^\d+\/\d+$/ })).map(t => String(t.text).length),
        ...(await ui.findAll({ type: 'Button' })).map(b => String(b.props.label).length),
        ...rasters.map(r => Number(r.props.columns)),
        ...(await ui.findAll({ type: 'Text', text: /^([⌨✎⌕⚒✓⚡♛]( (✦|zz|!|✗))?|✦|zz|!|✗)$/ })).map(t => String(t.text).length),
      ]
      // the title, when drawn, costs at least its gap even when truncated to nothing
      const titleGap = (await ui.find({ text: /Waiting for/ })) ? 1 : 0
      const used = String(pctText!.text).length + extras.reduce((a, w) => a + w + 1, 0) + titleGap
      expect(used).toBeLessThanOrEqual(bodyColumns)
      // a band only as wide as the percentage draws nothing else
      if (bodyColumns === 3) expect(used).toBe(3)
      // the art only joins when a few title columns are still left beside it
      if (rasters.length) expect(bodyColumns - used).toBeGreaterThanOrEqual(9)
      await ui.unmount()
    }
  }
  // too narrow even for the percentage: the band steps aside
  ui = await mount({ bodyColumns: 0 })
  expect(await ui.find({ text: /%/ })).toBeUndefined()
  await ui.unmount()
  // no rows: the band is not drawn at all; what is beneath it answers instead
  ui = await mount({ maxRows: 0 })
  expect(await ui.find({ type: 'Raster' })).toBeUndefined()
  expect(await ui.find({ text: /1\/2/ })).toBeUndefined()
  await ui.unmount()
})

test('the terminal panel keeps every Raster inside the pane at any width, with unique keys', EN, async ($, on) => {
  let n = 0
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'ag-' + ++n }))
  on('turn.complete', async () => ({ text: '' }))
  await $.agent.spawn({ prompt: 'a', description: 'Organize the files', subagentType: 'general-purpose' } as any)
  await $.agent.spawn({ prompt: 'b', description: 'Run the tests', subagentType: 'general-purpose' } as any)
  for (const bodyColumns of [8, 30, 50, 531, 1000]) {
    const ui = await $.ui.mount({
      plugin: 'pixel-crew',
      surface: 'terminal',
      component: 'Pane',
      props: { ...PANE, bodyColumns },
      requestId: 'pixel-crew-agents',
    })
    const rasters = await ui.findAll({ type: 'Raster' })
    const names = rasters.map(r => String(r.props['key']))
    expect(new Set(names).size).toBe(names.length)
    for (const r of rasters) expect(r.props.columns).toBeLessThanOrEqual(Math.min(512, bodyColumns))
    // a sprite and its bar sit side by side with one column of gap
    const sprites = rasters.filter(r => String(r.props['key']).startsWith('s-'))
    for (const sp of sprites) {
      const id = String(sp.props['key']).slice(2)
      const bar = rasters.find(r => r.props['key'] === 'b-' + id)
      if (bar) expect(Number(sp.props.columns) + 1 + Number(bar.props.columns)).toBeLessThanOrEqual(bodyColumns)
    }
    if (bodyColumns >= 50) expect(sprites).toHaveLength(2)
    if (bodyColumns <= 8) expect(sprites).toHaveLength(0)
    await ui.unmount()
  }
})

test('every one-line drawing keeps two colours per cell, so each cell can be drawn', async () => {
  for (const [name, rows] of Object.entries(LINE_ART)) {
    expect(rows).toHaveLength(2)
    const w = rows[0]!.length
    expect(rows[1]!.length).toBe(w)
    expect(w % 2).toBe(0)
    for (let x = 0; x < w; x += 2) {
      const block = new Set([rows[0]![x], rows[0]![x + 1], rows[1]![x], rows[1]![x + 1]])
      if (block.size > 2) throw new Error(`${name}: cell ${x / 2} needs ${block.size} colours`)
    }
  }
})

test('the one-line band puts the mascot at the edge of the fill', async () => {
  const at = (ratio: number) => {
    const cells = decodeCells(bandRaster({ key: 'b', columns: 40, ratio, color: '#639922', frame: 0, role: 'clawd', pose: 'walk' }).cells)
    return cells.findIndex(([, fg, bg]) => fg === 0x1f1410 || bg === 0x1f1410)
  }
  const r = bandRaster({ key: 'b', columns: 40, ratio: 0.5, color: '#639922', frame: 0, role: 'clawd', pose: 'walk' })
  expect(r.rows).toBe(1)
  expect(r.columns).toBe(40)
  expect(at(0)).toBeLessThanOrEqual(1)
  expect(at(0.5)).toBeGreaterThan(14)
  expect(at(0.5)).toBeLessThan(22)
  expect(at(1)).toBeGreaterThan(33)
  // the fill is left of the mascot and the dark track right of it
  const cells = decodeCells(r.cells)
  expect(cells.slice(0, 15).filter(([, , bg]) => bg === 0x639922).length).toBeGreaterThan(10)
  for (const [, fg, bg] of cells.slice(25)) expect([fg, bg]).not.toContain(0x639922)
})

test('a still bar has no sweeping glint: every frame is the same', async () => {
  const still = (frame: number) => barRaster({ key: 'b', columns: 30, ratio: 1, color: '#639922', frame, still: true }).cells
  expect(still(5)).toBe(still(0))
  expect(still(17)).toBe(still(0))
  // #639922 mixed 80% toward white: the glint's colour, absent from a still bar
  const GLINT = 0xe0ebd3
  const cells = decodeCells(still(5))
  for (const [, fg, bg] of cells) expect([fg, bg]).not.toContain(GLINT)
  // a moving bar still sweeps
  expect(barRaster({ key: 'b', columns: 30, ratio: 1, color: '#639922', frame: 5 }).cells).not.toBe(still(5))
})

test('finished agents are grey and still; running ones keep their colour', EN, async ($, on) => {
  let n = 0
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'ag-' + ++n }))
  on('turn.complete', async () => ({ text: '' }))
  // two workers (green): the first finishes, the second keeps running
  await $.agent.spawn({ prompt: 'a', description: 'Organize the files', subagentType: 'general-purpose' } as any)
  await $.agent.spawn({ prompt: 'b', description: 'Organize the notes', subagentType: 'general-purpose' } as any)
  await $.turn.complete({ agentId: 'ag-1', answer: 'ok', durationMs: 10, isAborted: false, turnId: 't1', reason: 'answer' } as any)
  const GREEN = 0x639922

  // terminal: the finished row's character and bar carry no role green
  const term = await $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'Pane', props: { ...PANE, bodyColumns: 60 }, requestId: 'pixel-crew-agents' })
  const rasters = await term.findAll({ type: 'Raster' })
  const colors = (k: string) => {
    const r = rasters.find(x => x.props['key'] === k)
    return new Set(decodeCells(String(r!.props.cells)).flatMap(([, fg, bg]) => [fg, bg]))
  }
  // the worker green mixed 70% toward a neutral grey
  const FADED = 0x738769
  expect(colors('s-ag-1').has(GREEN)).toBe(false)
  expect(colors('b-ag-1').has(GREEN)).toBe(false)
  expect(colors('b-ag-1').has(FADED)).toBe(true)
  // the running character keeps its colour (its bar may still be empty at the start)
  expect(colors('s-ag-2').has(GREEN)).toBe(true)
  await term.unmount()

  // desktop: the finished row's bar is drawn without the role green too
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'Pane', props: PANE, requestId: 'pixel-crew-agents' })
  const bars = (await ui.findAll({ type: 'Svg' })).filter(s => /progress/i.test(String(s.props.alt)))
  const finished = bars.find(s => /files/.test(String(s.props.alt)))
  expect(String(finished!.props.source)).not.toMatch(/#639922/i)
  expect(String(finished!.props.source)).toMatch(/#738769/i)
  await ui.unmount()
})

// ── Leigh's fork ─────────────────────────────────────────────────────────

test('reads council labels: stage, persona or seat', async () => {
  expect(parseCouncil('propose:dot')).toEqual({ stage: 'propose', persona: 'dot' })
  expect(parseCouncil('build:P13')).toEqual({ stage: 'build', seat: 'P13' })
  expect(parseCouncil('salvage:B1')).toEqual({ stage: 'salvage', seat: 'B1' })
  expect(parseCouncil('merge')).toEqual({ stage: 'merge' })
  expect(parseCouncil('Build the landing page')).toBeUndefined()
  expect(parseCouncil('review the diff')).toBeUndefined()
  expect(parseCouncil('deploy:prod')).toBeUndefined()
  const en = strings('en')
  expect(councilTitle({ stage: 'vote', persona: 'vex' }, en)).toBe('Vex · voting')
  expect(councilTitle({ stage: 'build', seat: 'P13' }, en)).toBe('Seat P13 · building')
  expect(councilTitle({ stage: 'merge' }, en)).toBe('Merging proposals')
  expect(councilTitle({ stage: 'propose', persona: 'nova' }, en)).toBe('Nova · proposing')
  expect(councilTitle({ stage: 'vote', persona: 'dot' }, strings('pt'))).toBe('Dot · votando')
})

test("Leigh's words pick a role", async () => {
  expect(roleOf('general-purpose', 'GM usability walkthrough on cc-dev')).toBe('tester')
  expect(roleOf('general-purpose', 'Smoke the release build')).toBe('tester')
  expect(roleOf('general-purpose', 'Probe the dice tray overlap')).toBe('tester')
  expect(roleOf('general-purpose', 'Live-check the crate import')).toBe('tester')
  expect(roleOf('general-purpose', 'Foundry v14 compat survey')).toBe('researcher')
  expect(roleOf('general-purpose', 'Competitor modules and GM wishes')).toBe('researcher')
  expect(roleOf('general-purpose', 'Mockup the fortune ticket')).toBe('artist')
  expect(roleOf('general-purpose', 'Port the namegen to v14')).toBe('developer')
  // the old words still work
  expect(roleOf('general-purpose', 'Build the landing page')).toBe('developer')
  expect(roleOf('general-purpose', 'Organize things')).toBe('worker')
})

test('prices and context windows follow the model', async () => {
  expect(priceOf('claude-fable-5-1')).toEqual([10, 50, 0.25, 12.5])
  expect(priceOf('claude-opus-5-5')).toEqual([4, 20, 0.2, 5])
  expect(priceOf('claude-opus-4-8')).toEqual([5, 25, 0.5, 6.25])
  expect(priceOf('claude-sonnet-5-5')).toEqual([2, 10, 0.2, 2.5])
  expect(priceOf('claude-sonnet-4-6')).toEqual([3, 15, 0.3, 3.75])
  expect(priceOf('claude-haiku-5-5')[0]).toBe(0.1)
  expect(priceOf('claude-haiku-5-5', 150_000)[0]).toBe(0.5)
  expect(priceOf('claude-haiku-4-5-20251001')[0]).toBe(1)
  expect(priceOf('something-new')).toEqual([4, 20, 0.2, 5])
  expect(windowOf('claude-opus-5-5')).toBe(1_000_000)
  expect(windowOf('claude-fable-5-1')).toBe(1_000_000)
  expect(windowOf('claude-opus-4-6')).toBe(1_000_000)
  expect(windowOf('claude-haiku-4-5-20251001')).toBe(200_000)
  expect(windowOf('claude-sonnet-4-5-20250929')).toBe(200_000)
  expect(windowOf('claude-opus-4-20250514')).toBe(200_000)
  expect(windowOf('claude-sonnet-4-5[1m]')).toBe(1_000_000)
})

test('a council agent shows its persona, stage character and colour', EN, async ($, on) => {
  let n = 0
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'c-' + ++n }))
  await $.agent.spawn({ prompt: 'p', description: 'propose:dot', subagentType: 'general-purpose' } as any)
  await $.agent.spawn({ prompt: 'p', description: 'vote:vex', subagentType: 'general-purpose' } as any)
  await $.agent.spawn({ prompt: 'p', description: 'build:P13', subagentType: 'general-purpose' } as any)

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'Pane', props: PANE, requestId: 'pixel-crew-agents' })
    expect(await ui.find({ text: /Dot · proposing/ })).toBeDefined()
    expect(await ui.find({ text: /Vex · voting/ })).toBeDefined()
    expect(await ui.find({ text: /Seat P13 · building/ })).toBeDefined()
    // the stage picks the character, the persona its colour
    const researcher = (await ui.findAll({ type: 'Text' })).find(t => t.text === 'researcher')
    expect(researcher?.props.color).toBe(PERSONAS.dot!.color)
    const voter = (await ui.findAll({ type: 'Text' })).find(t => t.text === 'voter')
    expect(voter?.props.color).toBe(PERSONAS.vex!.color)
    expect(await ui.find({ text: 'developer' })).toBeDefined()
    if (surface === 'desktop') {
      const sprites = (await ui.findAll({ type: 'Svg' })).map(s => String(s.props.source))
      expect(sprites.some(src => src.includes(PERSONAS.dot!.color))).toBe(true)
    }
    await ui.unmount()
  }
})

// stand-ins for the council mod, loaded beside pixel-crew: `/council` writes its band's state.
// An inline plugin runs in its own environment, so each one spells its values out.
const liveCouncil = {
  name: 'council',
  register: ((on: any) => {
    on('command.run', { command: 'council' }, async ($: any) => {
      await $.state.set({ plugin: 'council', key: 'band' }, { runId: 'wf', round: 33, mode: 'full', seats: 2, hasRegression: false, startedAt: 0, isFinished: false, agents: [] })
      await $.state.set({ plugin: 'council', key: 'isBandHidden' }, false)
      return { text: 'ok' }
    })
  }) as any,
}
const finishedCouncil = {
  name: 'council',
  register: ((on: any) => {
    on('command.run', { command: 'council' }, async ($: any) => {
      await $.state.set({ plugin: 'council', key: 'band' }, { runId: 'wf', round: 33, mode: 'full', seats: 2, hasRegression: false, startedAt: 0, isFinished: true, agents: [] })
      await $.state.set({ plugin: 'council', key: 'isBandHidden' }, false)
      return { text: 'ok' }
    })
  }) as any,
}
const hiddenCouncil = {
  name: 'council',
  register: ((on: any) => {
    on('command.run', { command: 'council' }, async ($: any) => {
      await $.state.set({ plugin: 'council', key: 'band' }, { runId: 'wf', round: 33, mode: 'full', seats: 2, hasRegression: false, startedAt: 0, isFinished: false, agents: [] })
      await $.state.set({ plugin: 'council', key: 'isBandHidden' }, true)
      return { text: 'ok' }
    })
  }) as any,
}

// what is beneath pixel-crew draws a marker, so a band that steps aside shows it
async function councilRound($: any, on: any) {
  on('ui.render', { component: 'AbovePrompt' }, async ($: any, e: any) => {
    const { Text } = $.ui.resolve(e)
    return <Text>beneath</Text>
  })
  await $.command.run({ command: 'council', args: '' } as any)
}

test('the band steps aside while a council round runs', { options: { language: 'en' }, plugins: [liveCouncil] }, async ($, on) => {
  await councilRound($, on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'AbovePrompt', props: BAND })
    expect(await ui.find({ text: 'beneath' })).toBeDefined()
    expect(await ui.find({ text: /Thinking/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('the band comes back once the round finishes', { options: { language: 'en' }, plugins: [finishedCouncil] }, async ($, on) => {
  await councilRound($, on)
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect(await ui.find({ text: /Thinking/ })).toBeDefined()
  expect(await ui.find({ text: 'beneath' })).toBeUndefined()
  await ui.unmount()
})

test('a hidden council band does not hide pixel-crew', { options: { language: 'en' }, plugins: [hiddenCouncil] }, async ($, on) => {
  await councilRound($, on)
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'terminal', component: 'AbovePrompt', props: BAND })
  expect(await ui.find({ text: /Thinking/ })).toBeDefined()
  await ui.unmount()
})

test('a quiet celebration hops without confetti', { options: { language: 'en', celebration: 'quiet' } }, async ($, on) => {
  on('turn.complete', async () => ({ text: '' }))
  await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't0', reason: 'answer' } as any)
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, isWorking: false } })
  expect(await ui.find({ text: /^Done$/ })).toBeDefined()
  const mascot = (await ui.findAll({ type: 'Svg' })).find(s => s.props.alt === 'Claude mascot')
  expect(String(mascot?.props.source)).not.toMatch(CONFETTI)
  await ui.unmount()
})

test('celebration off skips the done moment', { options: { language: 'en', celebration: 'off' } }, async ($, on) => {
  ;(on as any)('ui.render', { component: 'AbovePrompt' }, async ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  on('turn.complete', async () => ({ text: '' }))
  await $.turn.complete({ answer: 'ok', durationMs: 10, isAborted: false, turnId: 't0', reason: 'answer' } as any)
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: { ...BAND, isWorking: false } })
  expect(await ui.find({ text: /^Done$/ })).toBeUndefined()
  await ui.unmount()
})

// ── the status line, for the mobile app (it draws no band) ──────────────

async function session($: any, on: any, surfaces: string[]) {
  const clock = mock.clock(on, { now: 1_000 })
  mock.store(on, {})
  const lines: Array<string | undefined> = []
  on('ui.status', (_$: any, e: any) => {
    lines.push(e.text)
    return { value: undefined }
  })
  on('session.surfaces', () => ({ value: surfaces }))
  on('command.register', () => ({ value: { command: 'crew' } }))
  on('session.start', (_$: any, e: any) => ({ cwd: e.cwd }))
  ;(on as any)('tool.call', { tool: 'TodoWrite' }, async () => ({ result: { oldTodos: [], newTodos: [] } }))
  await $.session.start({ source: 'startup', cwd: '/x', surface: surfaces[0], isInteractive: true } as any)
  await ($.tool.call as any)({
    tool: 'TodoWrite',
    input: {
      todos: [
        { content: 'First', status: 'completed', activeForm: 'Doing the first' },
        { content: 'Second', status: 'in_progress', activeForm: 'Doing the second' },
      ],
    },
  })
  await clock.advance(1_000)
  return { clock, lines }
}

test('the phone gets the band as a status line', EN, async ($, on) => {
  const { lines } = await session($, on, ['mobile'])
  expect(lines.at(-1)).toBe('⚒ Doing the second · 50% · 1/2')
})

test('no status line without the phone: the band says it', EN, async ($, on) => {
  const { lines } = await session($, on, ['terminal'])
  expect(lines.filter(l => l !== undefined)).toEqual([])
})

test('/crew-bar off clears the status line too', EN, async ($, on) => {
  const { clock, lines } = await session($, on, ['mobile', 'desktop'])
  expect(lines.at(-1)).toContain('Doing the second')
  await $.command.run({ command: 'crew-bar', args: 'off' } as any)
  await clock.advance(1_000)
  expect(lines.at(-1)).toBeUndefined()
})

test('the status line says what the band says', async () => {
  const base = { target: 0.43, count: '', delegating: false, shaking: false, crew: 0 }
  expect(statusLine({ ...base, title: 'Editing art.ts', pose: 'walk', role: 'developer' } as any)).toBe('⌨ Editing art.ts · 45%')
  expect(statusLine({ ...base, title: 'Waiting for 2 agents', pose: 'walk', delegating: true, count: '1/3' } as any)).toBe('♛ Waiting for 2 agents · 45% · 1/3')
  expect(statusLine({ ...base, title: 'Waiting for your permission', pose: 'alert' } as any)).toBe('! Waiting for your permission')
  expect(statusLine({ ...base, title: 'Done', pose: 'jump', target: 1 } as any)).toBe('✦ Done · 100%')
})

// ── The slim desktop bar ─────────────────────────────────────────────────
// The desktop bar is two pixel rows (highlight over fill) like the terminal's,
// and its empty track is the bar's own colour, see-through, not a fixed dark tone.

const trackOf = (src: string) => {
  const m = /<rect x="0" y="0" width="60" height="2" fill="(#[0-9A-Fa-f]{6})" fill-opacity="([\d.]+)" class="t"\/>/.exec(src)
  expect(m).not.toBeNull()
  return { fill: m![1]!, alpha: Number(m![2]) }
}
const lum = (rgb: number[]) => {
  const [r, g, b] = rgb.map(v => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const rgbOf = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16))
const contrast = (a: number[], b: number[]) => {
  const [x, y] = [lum(a), lum(b)]
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
/** a colour at an opacity over the card, as the eye sees it, against the card */
const seenOn = (fill: string, card: string, alpha = 1) => {
  const bg = rgbOf(card)
  return contrast(rgbOf(fill).map((v, i) => v * alpha + bg[i]! * (1 - alpha)), bg)
}
// the app's real cards
const DARK = '#252525'
const LIGHT = '#F5F4EF'

test('the desktop band bar is 6pt tall with no fixed dark track', EN, async ($, on) => {
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'AbovePrompt', props: BAND })
  const bar = (await ui.findAll({ type: 'Svg' })).find(s => /progress/i.test(String(s.props.alt)))
  expect(bar).toBeDefined()
  expect(bar!.props.height).toBe(6)
  expect(String(bar!.props.source)).not.toMatch(/#2A2725/i)
  await ui.unmount()
})

test('the desktop bar is two pixel rows with a see-through track in the bar colour', async () => {
  const src = barSvg({ ratio: 0, color: CLAY })
  expect(src).not.toMatch(/#2A2725/i)
  expect(/viewBox="([^"]+)"/.exec(src)![1]).toBe('0 0 60 2')
  // the attributes carry the dark tones, so a renderer that drops <style> draws today's bar
  const t = trackOf(src)
  expect(t.fill).toBe(CLAY)
  expect(t.alpha).toBeGreaterThanOrEqual(0.15)
  expect(t.alpha).toBeLessThanOrEqual(0.4)
  // the error red tints its own track
  expect(trackOf(barSvg({ ratio: 0.4, color: ERROR })).fill).toBe(ERROR)
  // a finished (still) bar keeps at least as much track as the same colour running
  const green = fade('#639922')
  const done = trackOf(barSvg({ ratio: 1, color: green, still: true }))
  expect(done.fill).toBe(green)
  expect(done.alpha).toBeGreaterThanOrEqual(trackOf(barSvg({ ratio: 1, color: green })).alpha)
  expect(done.alpha).toBeLessThanOrEqual(0.4)
})

// Every colour barSvg is asked to draw: the band's (clay, amber, boss, error),
// every role and every council persona, running and finished (faded, still).
// The party skin renames roles but keeps ROLES' colours, so its bars are the
// same hexes; the loop goes through both skins to say so.
const barColours = () => {
  const out: Array<[string, string | typeof ALERT_THEMED]> = [['clay', CLAY], ['alert', ALERT], ['alert:themed', ALERT_THEMED], ['boss', ROLES.boss.color], ['error', ERROR]]
  for (const skin of ['crew', 'party'] as const)
    for (const role of Object.keys(ROLES) as Array<keyof typeof ROLES>) {
      expect(roleLabel(role, skin)).toBe(skin === 'party' ? PARTY[role].label : ROLES[role].label)
      out.push([`${skin}:${role}`, ROLES[role].color])
    }
  for (const [k, p] of Object.entries(PERSONAS)) out.push([`persona:${k}`, p.color])
  SPARE.forEach((c, i) => out.push([`spare:${i}`, c]))
  return out
}

test('every bar colour reads on the dark and the light card, fill and empty track', async () => {
  const bad: string[] = []
  for (const [name, base] of barColours())
    for (const still of [false, true]) {
      // a themed colour is never faded: only finished agents' bars are still
      if (still && typeof base !== 'string') continue
      const color = still && typeof base === 'string' ? fade(base) : base
      const src = barSvg({ ratio: 0.4, color, still })
      const [dark, light] = src.split('@media (prefers-color-scheme: light)')
      const tones = barTones(color, still)
      for (const [theme, card, t, css] of [['dark', DARK, tones.dark, dark!], ['light', LIGHT, tones.light, light!]] as const) {
        // the tones measured are the ones the svg paints in that theme
        expect(css).toContain(`.t{fill:${t.fill};fill-opacity:${t.track}}`)
        expect(css).toContain(`.f{fill:${t.fill}}`)
        expect(css).toContain(`.h{fill:${t.hi}}`)
        const fill = seenOn(t.fill, card)
        const track = seenOn(t.fill, card, t.track)
        const tag = `${name}${still ? ' (still)' : ''} on ${theme}`
        if (fill < 3) bad.push(`${tag}: fill ${fill.toFixed(2)}`)
        if (track < 1.4) bad.push(`${tag}: track ${track.toFixed(2)}`)
        // the empty bar is a hint, not a heavy slab
        if (theme === 'light' && track >= 3) bad.push(`${tag}: track ${track.toFixed(2)} is a slab`)
      }
    }
  expect(bad).toEqual([])
})

test('the light theme darkens the amber and the clay, the dark theme lifts the boss', async () => {
  // the 'needs you' amber was 1.47:1 on the light card, the boss 2.70:1 on dark
  expect(barTones(ALERT).light.fill).not.toBe(ALERT)
  expect(barTones(CLAY).light.fill).not.toBe(CLAY)
  expect(barTones(ROLES.boss.color).dark.fill).not.toBe(ROLES.boss.color)
  // a colour that already reads keeps its own hex
  expect(barTones(CLAY).dark.fill).toBe(CLAY)
  expect(barTones(ROLES.boss.color).light.fill).toBe(ROLES.boss.color)
  // the light highlight row still reads, so the bar keeps both its rows
  for (const c of [CLAY, ALERT, ROLES.boss.color, ERROR]) expect(seenOn(barTones(c).light.hi, LIGHT)).toBeGreaterThanOrEqual(1.4)
})

// the alert title is the theme key 'warning'; the bar paints that key's own hex
// per theme (Claude Code 2.1.318's tables), so the two are one amber
test("the waiting bar is the theme's 'warning' amber in each theme", async () => {
  const t = barTones(ALERT_THEMED)
  expect(t.dark.fill).toBe('#FFC107')
  expect(t.light.fill).toBe('#966C1E')
  // and those read as they are: no toning needed on either card
  expect(seenOn(t.dark.fill, DARK)).toBeGreaterThanOrEqual(3)
  expect(seenOn(t.light.fill, LIGHT)).toBeGreaterThanOrEqual(3)
  expect(seenOn(t.dark.fill, DARK, t.dark.track)).toBeGreaterThanOrEqual(1.4)
  expect(seenOn(t.light.fill, LIGHT, t.light.track)).toBeGreaterThanOrEqual(1.4)
  // its class is its own: a plain #FFC107 bar can't repaint it
  const root = (s: string) => /<svg[^>]* class="([^"]+)"/.exec(s)![1]
  expect(root(barSvg({ ratio: 0.5, color: ALERT_THEMED }))).not.toBe(root(barSvg({ ratio: 0.5, color: '#FFC107' })))
})

test('bars of different colours keep their styles apart', async () => {
  const a = barSvg({ ratio: 0.5, color: CLAY })
  const b = barSvg({ ratio: 0.5, color: CLAY, still: true })
  const c = barSvg({ ratio: 0.5, color: ERROR })
  const root = (s: string) => /<svg[^>]* class="([^"]+)"/.exec(s)![1]
  expect(new Set([root(a), root(b), root(c)]).size).toBe(3)
  for (const s of [a, b, c]) expect(s).toContain(`.${root(s)} .f{`)
})

test('the indeterminate desktop bar moves and stays inside its 60 columns', async () => {
  const a = barSvg({ ratio: null, color: CLAY, frame: 0 })
  const b = barSvg({ ratio: null, color: CLAY, frame: 30 })
  expect(a).not.toBe(b)
  for (const src of [a, b])
    for (const m of src.matchAll(/<rect x="(-?\d+)" y="(\d+)" width="(\d+)" height="(\d+)"/g)) {
      expect(Number(m[1])).toBeGreaterThanOrEqual(0)
      expect(Number(m[1]) + Number(m[3])).toBeLessThanOrEqual(60)
      expect(Number(m[2]) + Number(m[4])).toBeLessThanOrEqual(2)
    }
})

test('the desktop and terminal bars draw the same pixels', async () => {
  // paint the svg's rects onto a 60x2 grid; the track rect (with opacity) stays empty
  const paint = (src: string) => {
    const grid: Array<Array<number | undefined>> = [Array(60).fill(undefined), Array(60).fill(undefined)]
    for (const m of src.matchAll(/<rect x="(\d+)" y="(\d+)" width="(\d+)" height="(\d+)" fill="#([0-9a-fA-F]{6})"(\s+fill-opacity)?/g)) {
      if (m[6]) continue
      for (let y = +m[2]!; y < +m[2]! + +m[4]!; y++) for (let x = +m[1]!; x < +m[1]! + +m[3]!; x++) grid[y]![x] = parseInt(m[5]!, 16)
    }
    return grid
  }
  const TRACK = 0x2a2725
  for (const [ratio, frame] of [[0.5, 0], [0.5, 7], [1, 13], [0.25, 3], [null, 0], [null, 30]] as const) {
    const svg = paint(barSvg({ ratio, color: CLAY, frame }))
    const cells = decodeCells(barRaster({ key: 'b', columns: 60, ratio, color: CLAY, frame }).cells)
    cells.forEach(([, fg, bg], x) => {
      expect(svg[0]![x]).toBe(fg === TRACK ? undefined : fg)
      expect(svg[1]![x]).toBe(bg === TRACK ? undefined : bg)
    })
  }
})

// ── The 40-row cap: trimmed agents stay in the totals, running ones stay on the list ──
const crewOf = (statuses: Array<'running' | 'done' | 'failed'>) =>
  statuses.map(
    (status, i) =>
      ({ id: `a${i + 1}`, status, description: `Agent ${i + 1}`, type: 'g', role: 'worker', model: 'm', startedAt: i, tokens: 0, costUsd: 0, ctxTokens: 0, steps: 0, tools: 0, tasks: [] }) as any,
  )

test('the cap drops the oldest finished agents first and keeps a running one', () => {
  const list = crewOf(['running', ...Array(44).fill('done')])
  const { kept, dropped } = capCrew([...list, crewOf(Array(46).fill('running'))[45]], 40)
  expect(kept.length).toBe(40)
  expect(kept[0]!.id).toBe('a1')
  expect(kept[39]!.id).toBe('a46')
  expect(dropped.map(a => a.id)).toEqual(['a2', 'a3', 'a4', 'a5', 'a6', 'a7'])
  // under the cap nothing moves
  expect(capCrew(list.slice(0, 40), 40).dropped).toEqual([])
})

test('the cap keeps every running agent, even past 40', () => {
  const { kept, dropped } = capCrew(crewOf(Array(50).fill('running')), 40)
  expect(kept.length).toBe(50)
  expect(dropped).toEqual([])
  // finished agents still make way for them
  const mixed = capCrew(crewOf([...Array(5).fill('done'), ...Array(45).fill('running')]), 40)
  expect(mixed.kept.length).toBe(45)
  expect(mixed.dropped.map(a => a.id)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5'])
})

test('45 finished agents: the totals count all 45 and say 5 were folded in', EN, async ($, on) => {
  ;(on as any)('ui.open', () => ({ value: { isPlaced: false, reason: 'no-surface' } }))
  // the first five ran on Sonnet 5.1 and cost more; they are the ones the cap trims
  const modelOf = (n: number) => (n <= 5 ? 'claude-sonnet-5-1' : 'claude-opus-5-5')
  let n = 0
  on('agent.spawn', async () => ({ model: modelOf(n + 1), agentId: `ag-${++n}` }))
  on('turn.step', async function* (_$: any, e: any) {
    const k = Number(String(e.agentId).slice(3))
    return {
      turnId: e.turnId,
      index: e.index,
      answer: '',
      toolUses: [],
      stopReason: 'end_turn',
      usage: { model: modelOf(k), input_tokens: 0, output_tokens: k <= 5 ? 50_000 : 10_000, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    }
  } as any)
  on('turn.complete', async () => ({ text: '' }))
  for (let k = 1; k <= 45; k++) {
    await $.agent.spawn({ prompt: 'go', description: `Check part ${k}`, subagentType: 'general-purpose' } as any)
    const stream = ($.turn as any).step({ turnId: `t${k}`, index: 0, model: modelOf(k), agentId: `ag-${k}` })
    for await (const _ of stream);
    // the second agent failed: trimmed off the list, it must still show in the ✗ count
    const reason = k === 2 ? 'error' : 'answer'
    await $.turn.complete({ agentId: `ag-${k}`, answer: 'ok', durationMs: 10, isAborted: false, turnId: `t${k}`, reason } as any)
  }
  // 5 × 50k on Sonnet 5.1 ($10/M out) + 40 × 10k on Opus 5.5 ($20/M out)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'Pane', props: PANE, requestId: 'pixel-crew-agents' })
    expect(await ui.find({ text: '≈$10.50' })).toBeDefined()
    expect(await ui.find({ text: '650k' })).toBeDefined()
    expect(await ui.find({ text: '44✓ 1✗' })).toBeDefined()
    expect(await ui.find({ text: '+5 earlier agents folded into the totals' })).toBeDefined()
    expect(await ui.find({ text: /^Sonnet 5\.1 ≈\$2\.50 · 250k$/ })).toBeDefined()
    expect(await ui.find({ text: /^Opus 5\.5 ≈\$8\.00 · 400k$/ })).toBeDefined()
    // the rows are the 40 newest; the list header counts what it opens
    expect(await ui.find({ text: /Finished · 40/ })).toBeDefined()
    expect(await ui.find({ text: /Check part 45$/ })).toBeDefined()
    expect(await ui.find({ text: /Check part 5$/ })).toBeUndefined()
    await ui.unmount()
  }
  const out = await ($.command.run as any)({ command: 'crew', args: '' })
  expect(out.text).toMatch(/Cost ≈\$10\.50 · Tokens 650k/)
  expect(out.text).toMatch(/\+5 earlier agents folded into the totals/)
  // /crew-clear empties the folded totals with the rows
  await ($.command.run as any)({ command: 'crew-clear', args: '' })
  const ui = await $.ui.mount({ plugin: 'pixel-crew', surface: 'desktop', component: 'Pane', props: PANE, requestId: 'pixel-crew-agents' })
  expect(await ui.find({ text: /folded into the totals/ })).toBeUndefined()
  expect(await ui.find({ text: '≈$0.00' })).toBeDefined()
  await ui.unmount()
})

test('a long round keeps its oldest agent on the panel while it still runs', EN, async ($, on) => {
  let n = 0
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: `ag-${++n}` }))
  on('turn.complete', async () => ({ text: '' }))
  await $.agent.spawn({ prompt: 'go', description: 'Watch the long migration', subagentType: 'general-purpose' } as any)
  for (let k = 2; k <= 45; k++) {
    await $.agent.spawn({ prompt: 'go', description: `Check part ${k}`, subagentType: 'general-purpose' } as any)
    await $.turn.complete({ agentId: `ag-${k}`, answer: 'ok', durationMs: 10, isAborted: false, turnId: `t${k}`, reason: 'answer' } as any)
  }
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'Pane', props: PANE, requestId: 'pixel-crew-agents' })
    expect(await ui.find({ text: /Running · 1/ })).toBeDefined()
    expect(await ui.find({ text: /Watch the long migration/ })).toBeDefined()
    expect(await ui.find({ text: '1● 44✓' })).toBeDefined()
    expect(await ui.find({ text: '+5 earlier agents folded into the totals' })).toBeDefined()
    await ui.unmount()
    // the band's crew button counts the same 45, not the 40 rows left
    const band = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'AbovePrompt', props: { ...BAND, isWorking: false } })
    expect((await band.find({ key: 'crew' }))?.props.label).toBe('×45')
    await band.unmount()
  }
})
