// Every piece of text pixel-crew draws, in English, Portuguese and Spanish.

import type { CouncilStage } from './council'

export type Lang = 'en' | 'pt' | 'es'

export type Strings = {
  thinking: string
  done: string
  tasks: string
  waiting: (n: number) => string
  team: string
  noAgentsYet: string
  cost: string
  tokens: string
  time: string
  running: (n: number) => string
  finished: (n: number) => string
  nobodyWorking: string
  actions: (n: number) => string
  ready: string
  failed: string
  starting: string
  codexTask: string
  paneOpened: string
  paneWaiting: (reason: string, surfaces: string) => string
  cleared: string
  cmdCrew: string
  cmdClear: string
  cmdBar: string
  barOn: string
  barOff: string
  altBoss: string
  altMascot: string
  altProgress: (what: string) => string
  altCharacter: (role: string) => string
  reading: (file: string) => string
  editing: (file: string) => string
  writing: (file: string) => string
  runningCommand: string
  searchingCode: string
  delegating: (what: string) => string
  searchingWeb: string
  usingSkill: (skill: string) => string
  organizingTasks: string
  waitingForYou: string
  needsPermission: string
  using: (tool: string) => string
  file: string
  /** what each council stage is doing, as it follows a persona's name */
  stages: Record<CouncilStage, string>
  /** a build seat, named by its id (`P13`) */
  seat: (id: string) => string
}

const en: Strings = {
  thinking: 'Thinking',
  done: 'Done',
  tasks: 'Tasks',
  waiting: n => `Waiting for ${n} ${n === 1 ? 'agent' : 'agents'}`,
  team: 'Crew',
  noAgentsYet: 'No agents yet',
  cost: 'Cost',
  tokens: 'Tokens',
  time: 'Time',
  running: n => `Running · ${n}`,
  finished: n => `Finished · ${n}`,
  nobodyWorking: 'No agents working right now.',
  actions: n => `${n} ${n === 1 ? 'action' : 'actions'}`,
  ready: 'done',
  failed: 'failed',
  starting: 'Starting',
  codexTask: 'Task delegated to Codex',
  paneOpened: 'Agents panel opened.',
  paneWaiting: (reason, surfaces) => `Agents panel not drawn here (${reason}); attached surfaces: ${surfaces || 'none'}. It opens when a surface that places panes is attached.`,
  cleared: 'pixel-crew cleared.',
  cmdCrew: 'Open the subagents panel (pixel-crew)',
  cmdClear: 'Clear pixel-crew tasks and agents',
  cmdBar: 'Turn the progress band, and its status line on the phone, on or off (on, off, or nothing to toggle)',
  barOn: 'Progress band on',
  barOff: 'Progress band off. /crew-bar turns it back on',
  altBoss: 'Claude as the boss',
  altMascot: 'Claude mascot',
  altProgress: what => `Progress: ${what}`,
  altCharacter: role => `Character ${role}`,
  reading: f => `Reading ${f}`,
  editing: f => `Editing ${f}`,
  writing: f => `Writing ${f}`,
  runningCommand: 'Running a command',
  searchingCode: 'Searching the code',
  delegating: w => `Delegating: ${w}`,
  searchingWeb: 'Searching the web',
  usingSkill: s => `Using the ${s} skill`,
  organizingTasks: 'Organizing tasks',
  waitingForYou: 'Waiting for your answer',
  needsPermission: 'Waiting for your permission',
  using: t => `Using ${t}`,
  file: 'file',
  stages: {
    preflight: 'preflight checks',
    propose: 'proposing',
    merge: 'merging proposals',
    vote: 'voting',
    build: 'building',
    salvage: 'salvaging',
    verify: 'verifying',
    review: 'reviewing',
    regress: 'regression check',
  },
  seat: id => `Seat ${id}`,
}

const pt: Strings = {
  thinking: 'Pensando',
  done: 'Pronto',
  tasks: 'Tarefas',
  waiting: n => `Esperando ${n} ${n === 1 ? 'agent' : 'agents'}`,
  team: 'Equipe',
  noAgentsYet: 'Nenhum agent ainda',
  cost: 'Custo',
  tokens: 'Tokens',
  time: 'Tempo',
  running: n => `Rodando · ${n}`,
  finished: n => `Concluídos · ${n}`,
  nobodyWorking: 'Nenhum agent trabalhando agora.',
  actions: n => `${n} ${n === 1 ? 'ação' : 'ações'}`,
  ready: 'pronto',
  failed: 'falhou',
  starting: 'Começando',
  codexTask: 'Tarefa delegada ao Codex',
  paneOpened: 'Painel dos agents aberto.',
  paneWaiting: (reason, surfaces) => `Painel dos agents não desenhado aqui (${reason}); superfícies ligadas: ${surfaces || 'nenhuma'}. Abre quando uma superfície que coloca painéis estiver ligada.`,
  cleared: 'pixel-crew limpo.',
  cmdCrew: 'Abre o painel dos subagents (pixel-crew)',
  cmdClear: 'Limpa as tarefas e os agents do pixel-crew',
  cmdBar: 'Liga ou desliga a barra de progresso e a linha de status no celular (on, off, ou nada para alternar)',
  barOn: 'Barra de progresso ligada',
  barOff: 'Barra de progresso desligada. /crew-bar liga de novo',
  altBoss: 'Claude como boss',
  altMascot: 'Mascote do Claude',
  altProgress: what => `Progresso: ${what}`,
  altCharacter: role => `Personagem ${role}`,
  reading: f => `Lendo ${f}`,
  editing: f => `Editando ${f}`,
  writing: f => `Escrevendo ${f}`,
  runningCommand: 'Rodando um comando',
  searchingCode: 'Procurando no código',
  delegating: w => `Delegando: ${w}`,
  searchingWeb: 'Pesquisando na web',
  usingSkill: s => `Usando a skill ${s}`,
  organizingTasks: 'Organizando as tarefas',
  waitingForYou: 'Esperando sua resposta',
  needsPermission: 'Esperando sua permissão',
  using: t => `Usando ${t}`,
  file: 'arquivo',
  stages: {
    preflight: 'checagem inicial',
    propose: 'propondo',
    merge: 'juntando as propostas',
    vote: 'votando',
    build: 'construindo',
    salvage: 'resgatando',
    verify: 'verificando',
    review: 'revisando',
    regress: 'checagem de regressão',
  },
  seat: id => `Assento ${id}`,
}

const es: Strings = {
  thinking: 'Pensando',
  done: 'Listo',
  tasks: 'Tareas',
  waiting: n => `Esperando ${n} ${n === 1 ? 'agente' : 'agentes'}`,
  team: 'Equipo',
  noAgentsYet: 'Todavía no hay agentes',
  cost: 'Costo',
  tokens: 'Tokens',
  time: 'Tiempo',
  running: n => `En curso · ${n}`,
  finished: n => `Terminados · ${n}`,
  nobodyWorking: 'Ningún agente trabajando ahora.',
  actions: n => `${n} ${n === 1 ? 'acción' : 'acciones'}`,
  ready: 'listo',
  failed: 'falló',
  starting: 'Empezando',
  codexTask: 'Tarea delegada a Codex',
  paneOpened: 'Panel de agentes abierto.',
  paneWaiting: (reason, surfaces) => `Panel de agentes no dibujado aquí (${reason}); superficies conectadas: ${surfaces || 'ninguna'}. Se abre cuando haya una superficie que coloque paneles.`,
  cleared: 'pixel-crew limpio.',
  cmdCrew: 'Abre el panel de subagentes (pixel-crew)',
  cmdClear: 'Limpia las tareas y los agentes de pixel-crew',
  cmdBar: 'Activa o desactiva la barra de progreso y su línea de estado en el móvil (on, off, o nada para alternar)',
  barOn: 'Barra de progreso activada',
  barOff: 'Barra de progreso desactivada. /crew-bar la vuelve a activar',
  altBoss: 'Claude como jefe',
  altMascot: 'Mascota de Claude',
  altProgress: what => `Progreso: ${what}`,
  altCharacter: role => `Personaje ${role}`,
  reading: f => `Leyendo ${f}`,
  editing: f => `Editando ${f}`,
  writing: f => `Escribiendo ${f}`,
  runningCommand: 'Ejecutando un comando',
  searchingCode: 'Buscando en el código',
  delegating: w => `Delegando: ${w}`,
  searchingWeb: 'Buscando en la web',
  usingSkill: s => `Usando la skill ${s}`,
  organizingTasks: 'Organizando las tareas',
  waitingForYou: 'Esperando tu respuesta',
  needsPermission: 'Esperando tu permiso',
  using: t => `Usando ${t}`,
  file: 'archivo',
  stages: {
    preflight: 'chequeo inicial',
    propose: 'proponiendo',
    merge: 'uniendo las propuestas',
    vote: 'votando',
    build: 'construyendo',
    salvage: 'rescatando',
    verify: 'verificando',
    review: 'revisando',
    regress: 'prueba de regresión',
  },
  seat: id => `Asiento ${id}`,
}

const DICTS: Record<Lang, Strings> = { en, pt, es }

export function strings(lang: Lang): Strings {
  return DICTS[lang]
}

/**
 * Reads a language out of a setting or a locale: "pt-BR", "portuguese",
 * "Español", "es_ES.UTF-8", "english"... Undefined when it names none of ours.
 */
export function langOf(value: unknown): Lang | undefined {
  const v = String(value ?? '').trim().toLowerCase()
  if (!v || v === 'c' || v === 'posix') return undefined
  if (/^(pt|portu)/.test(v)) return 'pt'
  if (/^(es|span|espa)/.test(v)) return 'es'
  if (/^(en|engl|ingl)/.test(v)) return 'en'
  return undefined
}

/** The language the system reports through Intl, if it is one of ours. */
export function systemLang(): Lang | undefined {
  try {
    return langOf(Intl.DateTimeFormat().resolvedOptions().locale)
  } catch {
    return undefined
  }
}
