import type { PcRole } from '../types'

// Leigh's improvement council: its Workflow agents are labelled `stage:target`
// (`propose:dot`, `vote:vex`, `build:P13`, `merge`). The stage picks the
// character's gear, a persona picks its colour and name.

export type CouncilStage = 'preflight' | 'propose' | 'merge' | 'vote' | 'build' | 'salvage' | 'verify' | 'review' | 'regress'

export const STAGES: readonly CouncilStage[] = ['preflight', 'propose', 'merge', 'vote', 'build', 'salvage', 'verify', 'review', 'regress']

type StageRole = Exclude<PcRole, 'boss' | 'codex'>

/** The character each stage draws: the gear says what kind of work it is. */
export const STAGE_ROLE: Record<CouncilStage, StageRole> = {
  preflight: 'worker',
  propose: 'researcher',
  merge: 'scribe',
  vote: 'voter',
  build: 'developer',
  salvage: 'worker',
  verify: 'tester',
  review: 'skeptic',
  regress: 'tester',
}

export type Persona = { name: string; color: string }

/** The council's personas across Leigh's projects, each with a fixed colour. */
export const PERSONAS: Record<string, Persona> = {
  // character_constructor
  mira: { name: 'Mira', color: '#4FB3EC' },
  grimble: { name: 'Grimble', color: '#A67A4E' },
  pip: { name: 'Pip', color: '#B9D23C' },
  dot: { name: 'Dot', color: '#9A74E8' },
  // loot-crates
  tam: { name: 'Tam', color: '#D9B23A' },
  orla: { name: 'Orla', color: '#2FA3A8' },
  wren: { name: 'Wren', color: '#6FA33F' },
  // both
  juno: { name: 'Juno', color: '#F27BB5' },
  vex: { name: 'Vex', color: '#7A8FBF' },
}

// colours for a persona not in the table, picked by a hash of its key
const SPARE = ['#E8A33B', '#C47FD8', '#4EC4CF', '#8FBF6E', '#3D7FD4', '#D48C9E']

export type CouncilLabel = { stage: CouncilStage; persona?: string; seat?: string }

/**
 * A council agent's label, or undefined for any other description. The target
 * is a persona when it is a lowercase word (`dot`), else a seat id (`P13`).
 */
export function parseCouncil(label: string): CouncilLabel | undefined {
  const m = /^([a-z]+)(?::([\w-]+))?$/.exec(label.trim())
  if (!m || !(STAGES as readonly string[]).includes(m[1]!)) return undefined
  const stage = m[1] as CouncilStage
  const target = m[2]
  if (!target) return { stage }
  return /^[a-z][a-z-]*$/.test(target) ? { stage, persona: target } : { stage, seat: target }
}

export function personaOf(key: string): Persona {
  const known = PERSONAS[key]
  if (known) return known
  let h = 0
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return { name: key.charAt(0).toUpperCase() + key.slice(1), color: SPARE[h % SPARE.length]! }
}
