import { expect, mock, test } from 'claude-code/testing'

import { activityOf, parseSkin, recentOf, resetGlide, statusLine, stripOf, windowLabel } from '../hooks/register'
import { ago, allJobs, ASK_FIRST, findJob, hatOf, jobOfPrompt, jobPrompt, JOBS, parseAdd, RESULT_ASK, resultLine } from '../hooks/quickrun'
import { mascotSvg, PARTY, spriteSvg } from '../hooks/art'
import { strings } from '../hooks/i18n'
import type { PcRole } from '../types'

// Leigh's fork: quick run, opened rows, the council stage strip, the totals

const PANE: any = {
  title: 'Agents',
  isFocused: false,
  bodyColumns: 50,
  placement: 'dock',
  scroll: { offset: 0, bodyRows: 60 },
  view: {},
}
const EN = { options: { language: 'en' } }
const mountPane = ($: any, surface: 'terminal' | 'desktop', props = PANE) =>
  $.ui.mount({ plugin: 'pixel-crew', surface, component: 'Pane', props, requestId: 'pixel-crew-agents' })

test('a job that changes files asks first; a read-only one goes as it is', () => {
  const tidy = JOBS.find(j => j.name === 'Tidy the desktop')!
  expect(tidy.changes).toBe(true)
  expect(jobPrompt(tidy)).toContain(ASK_FIRST)
  const docker = JOBS.find(j => j.name === 'Docker health')!
  expect(docker.changes).toBe(false)
  expect(jobPrompt(docker)).toBe(`${docker.prompt} ${RESULT_ASK}`)
  expect(jobPrompt(docker)).not.toContain(ASK_FIRST)
})

test('a job keeps a one-line result, wears a hat, and is known by its prompt', () => {
  expect(resultLine('Lots of detail\n\n**Result:** 480 GB free · 68 GB clearable')).toBe('480 GB free · 68 GB clearable')
  expect(resultLine('first\nthe last line wins without a tag')).toBe('the last line wins without a tag')
  expect(resultLine(`Result: ${'x'.repeat(100)}`)).toHaveLength(70)
  expect(JOBS.map(hatOf)).toEqual(['hardhat', 'lantern', 'magnifier', 'goggles', 'quill', 'lantern', 'broom', 'broom'])
  expect(hatOf({ name: 'x', blurb: '', prompt: 'organise my photos folder', changes: true })).toBe('broom')
  expect(hatOf({ name: 'x', blurb: '', prompt: 'which ports are open?', changes: false })).toBe('lantern')
  const disk = JOBS.find(j => j.name === 'Disk space on C:')!
  expect(jobOfPrompt([], jobPrompt(disk))?.name).toBe('Disk space on C:')
  expect(jobOfPrompt([], 'hello')).toBeUndefined()
  const t = Date.UTC(2026, 10, 7, 12)
  expect([ago(t, t + 20_000), ago(t, t + 4 * 60_000), ago(t, t + 3 * 3_600_000), ago(t, t + 30 * 3_600_000), ago(t, t + 5 * 86_400_000)]).toEqual(['just now', '4m ago', '3h ago', 'yesterday', '5d ago'])
  // the band's mascot in its job hat differs from the bare one
  expect(mascotSvg('clawd', 'walk', 0, 2, true, 'crew', 'broom').source).not.toBe(mascotSvg('clawd', 'walk').source)
})

test('a quick-run turn: running while it works, then its result and Run again, kept in the store', EN, async ($, on) => {
  mock.store(on, {})
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.toast', () => ({ value: undefined }))
  on('prompt.submit', async (_$: any, e: any) => ({ text: e.text }))
  on('turn.complete', async () => ({ text: '' }))
  const disk = JOBS.find(j => j.name === 'Disk space on C:')!
  await $.prompt.submit({ text: jobPrompt(disk) } as any)
  let ui = await mountPane($, 'desktop')
  expect(await ui.find({ type: 'Text', text: '● running' })).toBeDefined()
  expect(await ui.find({ key: 'run-Disk space on C:' })).toBeUndefined()
  await ui.unmount()
  await $.turn.complete({ answer: 'C: has 480 GB free.\nResult: 480 GB free · 68 GB clearable', durationMs: 10, isAborted: false, turnId: 't', reason: 'completed' } as any)
  for (const surface of ['terminal', 'desktop'] as const) {
    ui = await mountPane($, surface)
    expect(await ui.find({ type: 'Text', text: '✓ just now' })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: '480 GB free · 68 GB clearable' })).toBeDefined()
    expect((await ui.find({ key: 'run-Disk space on C:' }))?.text).toMatch(/Run again/)
    await ui.unmount()
  }
  const listed: any = await $.command.run({ command: 'crew-run', args: '' } as any)
  expect(listed.text).toContain('Disk space on C:: biggest folders, what is safe to clear (✓ just now: 480 GB free · 68 GB clearable)')
  // an ordinary prompt afterwards keeps no result for it
  await $.prompt.submit({ text: 'thanks' } as any)
  await $.turn.complete({ answer: 'Result: nope', durationMs: 10, isAborted: false, turnId: 't2', reason: 'completed' } as any)
  ui = await mountPane($, 'desktop')
  expect(await ui.find({ type: 'Text', text: '480 GB free · 68 GB clearable' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: 'nope' })).toBeUndefined()
  await ui.unmount()
})

// ── a prompt typed while a turn runs waits behind it (prompt.submit carries that turn's id) ──

const DISK = JOBS.find(j => j.name === 'Disk space on C:')!
const DOCKER = JOBS.find(j => j.name === 'Docker health')!
const ended = (turnId: string, answer: string) => ({ answer, durationMs: 10, isAborted: false, turnId, reason: 'completed' }) as any
const engine = (on: any, sent: string[] = []) => {
  mock.store(on, {})
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.toast', () => ({ value: undefined }))
  // the engine beneath: it records what reached it and runs it
  on('prompt.submit', async (_$: any, e: any) => {
    sent.push(e.text)
    return { text: e.text }
  })
  on('turn.start', async (_$: any, e: any) => ({ turnId: e.turnId }))
  on('turn.complete', async () => ({ text: '' }))
}
// a job's row as the panel draws it: its name, status and result (or blurb) in one string
const rowOf = async ($: any, job: string) => {
  const ui = await mountPane($, 'desktop')
  const row = (await ui.find({ key: `job-${job}` }))?.text ?? ''
  await ui.unmount()
  return row
}

test('Run in the panel: the job becomes active when its turn starts, though its own submit never reaches this plugin', EN, async ($, on) => {
  const sent: string[] = []
  engine(on, sent)
  const ui = await mountPane($, 'desktop')
  await ui.press({ key: `run-${DOCKER.name}` })
  await ui.unmount()
  expect(sent).toEqual([jobPrompt(DOCKER)])
  // the engine runs it as a turn of its own; the plugin may never have seen the submit
  await $.turn.start({ text: sent[0], turnId: 't1' } as any)
  expect(await rowOf($, DOCKER.name)).toContain('● running')
  await $.turn.complete(ended('t1', 'Result: 9 containers up, 0 unhealthy'))
  expect(await rowOf($, DOCKER.name)).toBe(`◇Docker health✓ just now9 containers up, 0 unhealthyRun again`)
  // the engine's own frame around a plugin's prompt still names the job
  await $.turn.start({ text: `The pixel-crew plugin sent a message:\n${jobPrompt(DISK)}`, turnId: 't2' } as any)
  expect(await rowOf($, DISK.name)).toContain('● running')
})

test('/crew-run answers first and submits the job a moment later, outside the command hook', EN, async ($, on) => {
  const sent: string[] = []
  engine(on, sent)
  const clock = mock.clock(on)
  const r: any = await $.command.run({ command: 'crew-run', args: 'docker' } as any)
  expect(r.text).toBe('Running "Docker health".')
  expect(sent).toEqual([])
  await clock.advance(200)
  expect(sent).toEqual([jobPrompt(DOCKER)])
})

test('a prompt typed over a job\'s turn leaves the job its hat and its result', EN, async ($, on) => {
  engine(on)
  await $.prompt.submit({ text: jobPrompt(DISK) } as any)
  await $.turn.start({ text: jobPrompt(DISK), turnId: 't1' } as any)
  await $.prompt.submit({ text: 'and check D: as well', turnId: 't1' } as any)
  expect(await rowOf($, DISK.name)).toContain('● running')
  await $.turn.complete(ended('t1', 'Result: 480 GB free · 68 GB clearable'))
  expect(await rowOf($, DISK.name)).toBe('◇Disk space on C:✓ just now480 GB free · 68 GB clearableRun again')
  // the typed follow-up's own turn is an ordinary one: no job, no result
  await $.turn.start({ text: 'and check D: as well', turnId: 't2' } as any)
  await $.turn.complete(ended('t2', 'Result: D: is fine'))
  expect(await rowOf($, DISK.name)).toContain('480 GB free · 68 GB clearable')
})

test('a job queued behind another waits, then wears its hat once its own turn starts', EN, async ($, on) => {
  engine(on)
  await $.prompt.submit({ text: jobPrompt(DISK) } as any)
  await $.turn.start({ text: jobPrompt(DISK), turnId: 't1' } as any)
  await $.prompt.submit({ text: jobPrompt(DOCKER), turnId: 't1' } as any)
  expect(await rowOf($, DISK.name)).toContain('● running')
  expect(await rowOf($, DOCKER.name)).toContain('○ queued')
  await $.turn.complete(ended('t1', 'Result: 480 GB free'))
  expect(await rowOf($, DISK.name)).toContain('480 GB free')
  // A's result is A's alone, and B has no hat or result until its own turn starts
  expect(await rowOf($, DOCKER.name)).toBe(`◇Docker health${DOCKER.blurb}Run`)
  await $.turn.start({ text: jobPrompt(DOCKER), turnId: 't2' } as any)
  expect(await rowOf($, DOCKER.name)).toContain('● running')
  expect(await rowOf($, DISK.name)).not.toContain('● running')
  await $.turn.complete(ended('t2', 'Result: 12 containers up'))
  expect(await rowOf($, DOCKER.name)).toContain('12 containers up')
  expect(await rowOf($, DISK.name)).toContain('480 GB free')
  expect(await rowOf($, DISK.name)).not.toContain('12 containers up')
})

test('a prompt typed over a running turn keeps the band where it is', EN, async ($, on) => {
  engine(on)
  ;(on as any)('tool.call', async () => ({ result: 'ok' }))
  resetGlide()
  await $.prompt.submit({ text: 'look at the art' } as any)
  await $.turn.start({ text: 'look at the art', turnId: 't1' } as any)
  for (let i = 0; i < 4; i++) await ($.tool.call as any)({ tool: 'Read', file_path: 'C:/x/art.ts', tool_use_id: `u${i}` })
  // the band's percentage on each surface
  const band = async () => {
    const out: string[] = []
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'AbovePrompt', props: { isWorking: true, hasSurvey: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} } as any })
      out.push(`${surface} ${(await ui.find({ text: /\d+%/ }))?.text?.match(/\d+%/)?.[0]}`)
      await ui.unmount()
    }
    return out
  }
  // four tools into the turn: the estimate stands at 35%
  expect(await band()).toEqual(['terminal 35%', 'desktop 35%'])
  await $.prompt.submit({ text: 'then the README', turnId: 't1' } as any)
  expect(await band()).toEqual(['terminal 35%', 'desktop 35%'])
  // its own turn, once it starts, begins at 0%
  await $.turn.complete(ended('t1', 'done'))
  await $.turn.start({ text: 'then the README', turnId: 't2' } as any)
  expect(await band()).toEqual(['terminal 0%', 'desktop 0%'])
  resetGlide()
})

test('while a turn runs no job row offers Run, and /crew-run says to wait', EN, async ($, on) => {
  engine(on)
  await $.prompt.submit({ text: jobPrompt(DISK) } as any)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    for (const job of JOBS) expect(await ui.find({ key: `run-${job.name}` })).toBeUndefined()
    expect(await ui.find({ text: 'Run comes back when this turn ends' })).toBeDefined()
    await ui.unmount()
  }
  const busy: any = await $.command.run({ command: 'crew-run', args: 'Docker health' } as any)
  expect(busy.text).toBe('Claude is busy; try again when this turn ends.')
  await $.turn.complete(ended('t1', 'Result: fine'))
  const ui = await mountPane($, 'desktop')
  expect(await ui.find({ key: 'run-Docker health' })).toBeDefined()
  expect(await ui.find({ text: 'Run comes back when this turn ends' })).toBeUndefined()
  await ui.unmount()
  // a slash command answered with text is no turn: the Run buttons stay
  await $.prompt.submit({ text: '/crew-skin party', command: { name: 'crew-skin', args: 'party' } } as any)
  const after = await mountPane($, 'terminal')
  expect(await after.find({ key: 'run-Docker health' })).toBeDefined()
  await after.unmount()
})

test('a job prompt a hook dropped starts no turn: Run is back, the band is idle, nothing says running', EN, async ($, on) => {
  mock.store(on, {})
  on('command.register', () => ({ value: { command: 'x' } }))
  on('ui.toast', () => ({ value: undefined }))
  // a settings hook or another plugin refuses the prompt: no turn starts, so no turn.complete ever comes
  on('prompt.submit', async () => ({ drop: 'blocked by a hook' }))
  // an idle band hides itself: what is beneath it (here, an empty row) draws instead
  ;(on as any)('ui.render', { component: 'AbovePrompt' }, async ($: any, e: any) => {
    const { Box } = $.ui.resolve(e)
    return <Box />
  })
  const idle = async () => {
    for (const surface of ['terminal', 'desktop'] as const) {
      const ui = await mountPane($, surface)
      for (const job of JOBS) expect(await ui.find({ key: `run-${job.name}` })).toBeDefined()
      expect(await ui.find({ text: 'Run comes back when this turn ends' })).toBeUndefined()
      expect(await ui.find({ text: /running|queued/ })).toBeUndefined()
      await ui.unmount()
      const band = await $.ui.mount({ plugin: 'pixel-crew', surface, component: 'AbovePrompt', props: { isWorking: false, hasSurvey: false, maxRows: 10, bodyColumns: 100, scroll: { offset: 0, bodyRows: 10 }, view: {} } as any })
      expect(await band.find({ text: /Thinking|\d+%/ })).toBeUndefined()
      await band.unmount()
    }
  }
  await $.prompt.submit({ text: jobPrompt(DISK) } as any)
  await idle()
  // a dropped job prompt typed over a turn is not left queued either
  await $.prompt.submit({ text: jobPrompt(DOCKER), turnId: 't9' } as any)
  await idle()
})

test('/crew-add takes Name | prompt, or the last prompt you typed', () => {
  const job = parseAdd('Restart Plex | restart the plex container and show its logs', '')
  expect(job).toEqual({ name: 'Restart Plex', blurb: 'restart the plex container and show i…', prompt: 'restart the plex container and show its logs', changes: true, own: true })
  expect(parseAdd('List ports', 'which ports are listening on this machine?')).toMatchObject({ name: 'List ports', changes: false })
  expect(parseAdd('', 'x')).toContain('Name the job')
  expect(parseAdd('Nothing', '')).toContain('No prompt to save')
  // one of yours with a default's name replaces it
  const mine = { name: 'docker health', blurb: 'b', prompt: 'p', changes: false, own: true }
  expect(allJobs([mine]).filter(j => j.name.toLowerCase() === 'docker health')).toEqual([mine])
  expect(findJob([], 'disk')?.name).toBe('Disk space on C:')
})

test('the tool arguments are read beside the tool name, as this build sends them', () => {
  expect(recentOf('Edit', { file_path: 'C:/x/CampaignView.jsx' })).toBe('Edit CampaignView.jsx')
  expect(recentOf('Grep', { pattern: 'deleteNpc' })).toBe('Grep "deleteNpc"')
  expect(recentOf('Bash', { description: 'Run the tests', command: 'npm test' })).toBe('Bash: Run the tests')
  expect(activityOf('Read', { tool: 'Read', file_path: 'C:/x/art.ts' }, strings('en'))).toBe('Reading art.ts')
  expect(windowLabel('claude-opus-5-5')).toBe('1M')
  expect(windowLabel('claude-haiku-4-5')).toBe('200K')
})

test('the stage strip follows a council round: done, active and pending stages', () => {
  const a = (id: string, stage: string, status: 'running' | 'done' | 'failed') =>
    ({ id, stage, status, description: id, type: 'g', role: 'worker', model: 'm', startedAt: 0, tokens: 0, costUsd: 0, ctxTokens: 0, steps: 0, tools: 0, tasks: [] }) as any
  const strip = stripOf([
    ...['dot', 'vex', 'mira', 'pip', 'juno'].map(p => a(`p-${p}`, 'propose', 'done')),
    a('m', 'merge', 'done'),
    ...['dot', 'vex', 'mira', 'pip', 'juno'].map(p => a(`v-${p}`, 'vote', 'done')),
    a('b1', 'build', 'done'),
    a('b2', 'build', 'running'),
  ])!
  expect(strip.map(s => `${s.state} ${s.text}`)).toEqual(['done Propose 5', 'done Merge 1', 'done Vote 5', 'active Build 1/2', 'pending Review'])
  expect(stripOf([a('x', undefined as any, 'running')])).toBeNull()
})

test('the stage strip shows a failed stage as ✗ and counts only the agents that finished well', () => {
  const a = (id: string, stage: string, status: 'running' | 'done' | 'failed') =>
    ({ id, stage, status, description: id, type: 'g', role: 'worker', model: 'm', startedAt: 0, tokens: 0, costUsd: 0, ctxTokens: 0, steps: 0, tools: 0, tasks: [] }) as any
  const line = (crew: any[]) => stripOf(crew)!.map(s => `${s.state} ${s.text}`)
  const voted = [a('p1', 'propose', 'done'), a('p2', 'propose', 'failed'), a('m', 'merge', 'done'), a('v', 'vote', 'done')]
  // a build that failed reads ✗ with 2/3, not "done 3/3"; an earlier stage with a failure stays failed
  expect(line([...voted, a('b1', 'build', 'done'), a('b2', 'build', 'failed'), a('b3', 'build', 'done')])).toEqual([
    'failed Propose 1/2', 'done Merge 1', 'done Vote 1', 'failed Build 2/3', 'pending Review',
  ])
  // a stage still running is active even with a failure in it
  expect(line([...voted, a('b1', 'build', 'failed'), a('b2', 'build', 'running')])[3]).toBe('active Build 0/2')
  // every build stopped: 0/3; a failed verify agent is counted beside the builds
  expect(line([...voted, ...['b1', 'b2', 'b3'].map(id => a(id, 'build', 'failed'))])[3]).toBe('failed Build 0/3')
  expect(line([...voted, a('b1', 'build', 'done'), a('t', 'verify', 'failed')])[3]).toBe('failed Build 1/1 1✗')
  expect(stripOf([...voted, a('b1', 'build', 'failed'), a('r', 'review', 'failed')])!.reduce((n, s) => n + s.failed, 0)).toBe(3)
  // an all-success round is unchanged
  expect(line([a('p', 'propose', 'done'), a('b', 'build', 'done'), a('r', 'review', 'done')])).toEqual([
    'done Propose 1', 'pending Merge', 'pending Vote', 'done Build 1/1', 'done Review 1',
  ])
})

test('a council round whose build failed says ✗ Build and "done (1 failed)" in the panel; a clean one says done', EN, async ($, on) => {
  let n = 0
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: `agent-${++n}` }))
  on('turn.complete', async () => ({ text: '' }))
  // the strip header: the only bright "done…" text (an agent row's own "done" is dimmed)
  const header = async (ui: any) => (await ui.findAll({ type: 'Text', text: /^done/ })).filter((e: any) => !e.props.dimColor).map((e: any) => e.text)
  const end = (agentId: string, reason: string) =>
    $.turn.complete({ agentId, answer: 'x', durationMs: 10, isAborted: reason === 'aborted', turnId: agentId, reason } as any)
  // no council agents: no strip
  await $.agent.spawn({ prompt: 'go', description: 'Fix the login bug', subagentType: 'general-purpose' } as any)
  await end('agent-1', 'answer')
  let ui = await mountPane($, 'desktop')
  expect(await ui.find({ text: /Council round/ })).toBeUndefined()
  await ui.unmount()
  await $.agent.spawn({ prompt: 'go', description: 'build:P1', subagentType: 'general-purpose' } as any)
  await end('agent-2', 'answer')
  for (const surface of ['terminal', 'desktop'] as const) {
    ui = await mountPane($, surface)
    expect(await ui.find({ text: /✓ Build 1\/1/ })).toBeDefined()
    expect(await header(ui)).toEqual(['done'])
    await ui.unmount()
  }
  await $.agent.spawn({ prompt: 'go', description: 'build:P2', subagentType: 'general-purpose' } as any)
  await end('agent-3', 'aborted')
  for (const surface of ['terminal', 'desktop'] as const) {
    ui = await mountPane($, surface)
    expect(await ui.find({ text: /✗ Build 1\/2/ })).toBeDefined()
    expect(await ui.find({ text: /✓ Build/ })).toBeUndefined()
    expect(await header(ui)).toEqual(['done (1 failed)'])
    await ui.unmount()
  }
})

// panel text on the real cards: a theme key resolved the way each host paints
// it, or a hex, must reach 4.5:1 as text on both. The terminal reads Claude Code
// 2.1.318's theme tables. The desktop app, whose cards these are, paints the
// keys with its own tokens (--cds-text-success, -danger and -primary, November
// 2026; primary is 93% white and 90% black, here flattened onto the cards).
const CARDS = { dark: '#252525', light: '#F5F4EF' }
const THEME: Record<string, Array<{ dark: string; light: string }>> = {
  success: [{ dark: '#4EBA65', light: '#2C7A39' }, { dark: '#53C556', light: '#006C10' }],
  error: [{ dark: '#FF6B80', light: '#AB2B3F' }, { dark: '#F17778', light: '#A42528' }],
  text: [{ dark: '#FFFFFF', light: '#000000' }, { dark: '#F0F0F0', light: '#181817' }],
}
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!
}
const ratio = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05)
/** the weakest of both cards and both hosts; a key it doesn't know, or no colour at all, fails */
const textContrast = (color: unknown) => {
  const tones = typeof color !== 'string' ? undefined : THEME[color] ?? (/^#[0-9a-f]{6}$/i.test(color) ? [{ dark: color, light: color }] : undefined)
  if (!tones) throw new Error(`not a colour this test can measure: ${String(color)}`)
  return Math.min(...tones.flatMap(t => [ratio(t.dark, CARDS.dark), ratio(t.light, CARDS.light)]))
}

test('the old literals failed on the light card; no single hex can pass on both', () => {
  expect(ratio('#3FB27F', CARDS.light)).toBeLessThan(4.5)
  expect(ratio('#D97757', CARDS.light)).toBeLessThan(4.5)
  // 4.5:1 on #252525 needs luminance ≥ 0.258, on #F5F4EF ≤ 0.162: a theme key per card it is
  expect(4.5 * (lum(CARDS.dark) + 0.05) - 0.05).toBeGreaterThan((lum(CARDS.light) + 0.05) / 4.5 - 0.05)
})

test('done, running and failed text in the panel reads at 4.5:1 on the dark and the light card', EN, async ($, on) => {
  let n = 0
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: `agent-${++n}` }))
  on('turn.complete', async () => ({ text: '' }))
  on('prompt.submit', async (_$: any, e: any) => ({ text: e.text }))
  const end = (agentId: string, reason: string) =>
    $.turn.complete({ agentId, answer: 'x', durationMs: 10, isAborted: reason === 'aborted', turnId: agentId, reason } as any)
  const reads = async (ui: any, text: RegExp | string) => {
    const el = await ui.find({ type: 'Text', text })
    expect(el).toBeDefined()
    expect(textContrast(el.props.color)).toBeGreaterThanOrEqual(4.5)
    return el
  }
  // a round with a failed proposal, a done merge and a build still running
  await $.agent.spawn({ prompt: 'go', description: 'propose:ines', subagentType: 'general-purpose' } as any)
  await $.agent.spawn({ prompt: 'go', description: 'propose:vex', subagentType: 'general-purpose' } as any)
  await end('agent-1', 'answer')
  await end('agent-2', 'aborted')
  await $.agent.spawn({ prompt: 'go', description: 'merge', subagentType: 'general-purpose' } as any)
  await end('agent-3', 'answer')
  await $.agent.spawn({ prompt: 'go', description: 'build:B3', subagentType: 'general-purpose' } as any)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface, { ...PANE, bodyColumns: 60 })
    await reads(ui, /^✗ Propose 1\/2/)
    await reads(ui, /^✓ Merge 1/)
    // running is the plain text colour; bold and the ● say it, not a tint
    expect((await reads(ui, /^● Build 0\/1/)).props.bold).toBe(true)
    // each row's mark: ● running, ✓ done, ✗ failed
    for (const mark of ['●', '✓', '✗']) await reads(ui, mark)
    await ui.unmount()
  }
  // the round ends: the strip's header
  await end('agent-4', 'answer')
  let ui = await mountPane($, 'desktop')
  await reads(ui, 'done (1 failed)')
  await ui.unmount()
  // a quick-run job: running, then a good result, then a failed one
  const disk = JOBS.find(j => j.name === 'Disk space on C:')!
  for (const [reason, status] of [['completed', '✓ just now'], ['error', '✗ just now']] as const) {
    await $.prompt.submit({ text: jobPrompt(disk) } as any)
    ui = await mountPane($, 'desktop')
    await reads(ui, '● running')
    await ui.unmount()
    await $.turn.complete({ answer: 'Result: 480 GB free', durationMs: 10, isAborted: false, turnId: `t-${reason}`, reason } as any)
    ui = await mountPane($, 'desktop')
    await reads(ui, status)
    await ui.unmount()
  }
})

test('a clean council round says done in the theme\'s own green', EN, async ($, on) => {
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'agent-1' }))
  on('turn.complete', async () => ({ text: '' }))
  await $.agent.spawn({ prompt: 'go', description: 'build:B3', subagentType: 'general-purpose' } as any)
  await $.turn.complete({ agentId: 'agent-1', answer: 'x', durationMs: 10, isAborted: false, turnId: 't', reason: 'answer' } as any)
  const ui = await mountPane($, 'desktop')
  const header = (await ui.findAll({ type: 'Text', text: 'done' })).find((e: any) => !e.props.dimColor)
  expect(header?.props.color).toBe('success')
  expect(textContrast(header?.props.color)).toBeGreaterThanOrEqual(4.5)
  await ui.unmount()
})

test('with nobody working, quick run fills the panel; a job name shows its prompt; Run sends it', EN, async ($, on) => {
  const sent: string[] = []
  on('prompt.submit', async (_$: any, e: any) => {
    sent.push(e.text)
    return { text: e.text }
  })
  on('ui.toast', () => ({ value: undefined }))
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    expect(await ui.find({ key: 'fold-quick' })).toBeDefined()
    expect(await ui.find({ key: 'run-Docker health' })).toBeDefined()
    expect(await ui.find({ text: /reads only · ◆ changes files after your OK/ })).toBeDefined()
    await ui.unmount()
  }
  const ui = await mountPane($, 'desktop')
  await ui.press({ key: 'jobname-Tidy the desktop' })
  expect(await ui.find({ text: /wait for my OK/ })).toBeDefined()
  await ui.press({ key: 'run-Tidy the desktop' })
  expect(sent.at(-1)).toContain('Tidy my Desktop folder')
  expect(sent.at(-1)).toContain(ASK_FIRST)
  await ui.unmount()
})

test('while agents work, quick run is one folded line, and a row opens to its task, steps and last tools', EN, async ($, on) => {
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'agent-1' }))
  ;(on as any)('tool.call', async () => ({ result: 'ok' }))
  await $.agent.spawn({ prompt: 'Build P15: deleting waits behind Undo', description: 'build:P15', subagentType: 'general-purpose' } as any)
  await ($.tool.call as any)({ tool: 'Grep', pattern: 'deleteNpc', agentId: 'agent-1', tool_use_id: 'u1' })
  await ($.tool.call as any)({ tool: 'Edit', file_path: 'C:/x/CampaignView.jsx', agentId: 'agent-1', tool_use_id: 'u2' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface, { ...PANE, bodyColumns: 60 })
    expect(await ui.find({ key: 'run-Docker health' })).toBeUndefined()
    expect((await ui.find({ key: 'fold-quick' }))?.text).toMatch(/▸ Quick run/)
    expect(await ui.find({ text: /Task/ })).toBeUndefined()
    expect(await ui.find({ text: /of 1M/ })).toBeDefined()
    // the stage strip names the build stage of the round in flight
    expect(await ui.find({ text: /● Build 0\/1/ })).toBeDefined()
    await ui.press({ key: 'open-agent-1' })
    expect(await ui.find({ text: /Build P15: deleting waits behind Undo/ })).toBeDefined()
    expect(await ui.find({ text: 'Edit CampaignView.jsx' })).toBeDefined()
    expect(await ui.find({ text: 'Grep "deleteNpc"' })).toBeDefined()
    await ui.press({ key: 'open-agent-1' })
    await ui.unmount()
  }
})

test('a failed agent says why, and the totals count it', EN, async ($, on) => {
  on('agent.spawn', async () => ({ model: 'claude-sonnet-5-5', agentId: 'agent-9' }))
  on('turn.complete', async () => ({ text: '' }))
  await $.agent.spawn({ prompt: 'go', description: 'Fix the login bug', subagentType: 'general-purpose' } as any)
  await $.turn.complete({ agentId: 'agent-9', answer: 'working\nAPI error: overloaded', durationMs: 10, isAborted: false, turnId: 't', reason: 'error' } as any)
  const ui = await mountPane($, 'desktop')
  expect((await ui.find({ key: 'toggle-done' }))?.text).toMatch(/Finished · 1 \(1 failed\)/)
  expect(await ui.find({ text: /0✓ 1✗/ })).toBeDefined()
  await ui.press({ key: 'open-agent-9' })
  expect(await ui.find({ text: /Why it stopped: error: API error: overloaded/ })).toBeDefined()
  await ui.unmount()
})

test('/crew-add saves a job across sessions and /crew-remove takes it out', EN, async ($, on) => {
  mock.store(on, {})
  on('command.register', () => ({ value: { command: 'x' } }))
  on('prompt.submit', async (_$: any, e: any) => ({ text: e.text }))
  await $.prompt.submit({ text: 'which ports are listening on this machine?' } as any)
  const added: any = await $.command.run({ command: 'crew-add', args: 'Ports' } as any)
  expect(added.text).toContain('Saved "Ports" (◇ reads only)')
  const listed: any = await $.command.run({ command: 'crew-run', args: '' } as any)
  expect(listed.text).toContain('◇ Ports: which ports are listening on this mac…')
  const removed: any = await $.command.run({ command: 'crew-remove', args: 'ports' } as any)
  expect(removed.text).toBe('Removed "Ports".')
  const builtIn: any = await $.command.run({ command: 'crew-remove', args: 'Docker health' } as any)
  expect(builtIn.text).toContain('built-in job')
})

// ── the party skin (/crew-skin) ──

test('/crew-skin party|crew picks the look, and nothing (or any other word) switches it', () => {
  expect(parseSkin('party', 'crew')).toBe('party')
  expect(parseSkin('D&D', 'crew')).toBe('party')
  expect(parseSkin('dnd', 'crew')).toBe('party')
  expect(parseSkin('party', 'party')).toBe('party')
  expect(parseSkin('crew', 'party')).toBe('crew')
  expect(parseSkin('off', 'party')).toBe('crew')
  expect(parseSkin('default', 'crew')).toBe('crew')
  expect(parseSkin('', 'crew')).toBe('party')
  expect(parseSkin('', 'party')).toBe('crew')
  expect(parseSkin('whatever', 'party')).toBe('crew')
})

test('the party skin dresses every role differently, in the panel and on the band', () => {
  for (const role of Object.keys(PARTY) as PcRole[]) {
    expect(spriteSvg(role, 2, false, 0, undefined, 'party').source).not.toBe(spriteSvg(role).source)
  }
  expect(mascotSvg('boss', 'walk', 0, 2, true, 'party').source).not.toBe(mascotSvg('boss', 'walk').source)
  // the mascot itself (Claude, not delegating) is the same Clawd in both looks
  expect(mascotSvg('clawd', 'walk', 0, 2, true, 'party').source).toBe(mascotSvg('clawd', 'walk').source)
  const view = { title: 'Editing art.ts', target: 0.5, count: '', pose: 'walk' as const, delegating: false, shaking: false, role: 'developer' as const, crew: 0 }
  expect(statusLine(view, 'party')).toBe('✶ Editing art.ts · 50%')
  expect(statusLine(view)).toBe('⌨ Editing art.ts · 50%')
})

test('/crew-skin party names a developer agent the wizard in the panel, and /crew-skin alone goes back', EN, async ($, on) => {
  mock.store(on, {})
  on('command.register', () => ({ value: { command: 'x' } }))
  on('agent.spawn', async () => ({ model: 'claude-opus-5-5', agentId: 'agent-w' }))
  await $.agent.spawn({ prompt: 'go', description: 'Build the page', subagentType: 'general-purpose' } as any)

  const party: any = await $.command.run({ command: 'crew-skin', args: 'party' } as any)
  expect(party.text).toContain('D&D party')
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    expect(await ui.find({ text: 'wizard' })).toBeDefined()
    expect(await ui.find({ text: 'developer' })).toBeUndefined()
    if (surface === 'terminal') expect(await ui.find({ text: '✶' })).toBeDefined()
    await ui.unmount()
  }

  const back: any = await $.command.run({ command: 'crew-skin', args: '' } as any)
  expect(back.text).toContain('work clothes')
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await mountPane($, surface)
    expect(await ui.find({ text: 'developer' })).toBeDefined()
    expect(await ui.find({ text: 'wizard' })).toBeUndefined()
    if (surface === 'terminal') expect(await ui.find({ text: '⌨' })).toBeDefined()
    await ui.unmount()
  }
})
