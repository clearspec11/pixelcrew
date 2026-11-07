import { expect, mock, test } from 'claude-code/testing'

import { activityOf, parseSkin, recentOf, statusLine, stripOf, windowLabel } from '../hooks/register'
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
