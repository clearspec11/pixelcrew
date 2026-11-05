export type PcStatus = 'pending' | 'in_progress' | 'completed'

export type PcTask = {
  id: string
  subject: string
  status: PcStatus
  activeForm?: string
}

export type PcRole =
  | 'developer'
  | 'artist'
  | 'researcher'
  | 'worker'
  | 'boss'
  | 'tester'
  | 'codex'
  /** council: casting a ballot in the vote stage */
  | 'voter'
  /** council: merging the proposals into one slate */
  | 'scribe'
  /** council: the review stage's skeptic */
  | 'skeptic'

export type PcAgent = {
  id: string
  description: string
  type: string
  role: PcRole
  model: string
  effort?: string
  status: 'running' | 'done' | 'failed'
  startedAt: number
  endedAt?: number
  tokens: number
  costUsd: number
  ctxTokens: number
  steps: number
  tools: number
  phase?: string
  tasks: PcTask[]
  /** a council workflow agent's stage, from its `stage:target` label */
  stage?: string
  /** a council persona's key (`dot`, `vex`), when the label names one */
  persona?: string
}

/** O que o agent principal (o Claude da conversa) está fazendo no turno atual. */
export type PcMain = {
  activity: string
  /** o papel do que o agent principal fez por último, para o símbolo da faixa */
  role?: Exclude<PcRole, 'boss'>
  steps: number
  tools: number
  working: boolean
  done: boolean
}

/** Efeitos passageiros do mascote da faixa (horários em ms desde a época). */
export type PcFx = {
  /** até quando comemorar o fim do turno (confete no 100%) */
  celebrateUntil: number
  /** até quando tremer depois de uma ferramenta que falhou */
  errorUntil: number
  /** uma pergunta ou um pedido de permissão esperando por você */
  asking: 'question' | 'permission' | null
}

declare module 'claude-code' {
  interface PluginState {
    'pixel-crew': {
      tasks: PcTask[]
      agents: PcAgent[]
      now: number
      frame: number
      showDone: boolean
      /** a faixa acima do prompt aparece (o /crew-bar desliga; guardado entre sessões) */
      bandOn: boolean
      main: PcMain
      batchStart: number
      fx: PcFx
    }
  }
}
