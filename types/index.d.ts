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
  /** the task the agent was given, as the spawn's prompt said it */
  prompt?: string
  /** its last few tool uses, newest last ("Edit CampaignView.jsx") */
  recent?: string[]
  /** why it stopped, when it failed */
  reason?: string
}

/** A ready-made job the Agents panel runs with one press: a prompt handed to Claude. */
export type PcJob = {
  name: string
  /** one line under the name */
  blurb: string
  prompt: string
  /** it changes files (listed first, done only after your OK); else it only reads */
  changes: boolean
  /** saved with /crew-add, not one of the defaults */
  own?: boolean
  /** what the band's mascot wears while the job runs (guessed from the prompt when unset) */
  hat?: PcHat
}

/** The look of the crew: today's workers, or a D&D adventuring party (`/crew-skin`). */
export type PcSkin = 'crew' | 'party'

/** A quick-run job's hat on the band's mascot. */
export type PcHat = 'hardhat' | 'lantern' | 'magnifier' | 'goggles' | 'quill' | 'broom'

/** A quick-run job's last run: when it ended, whether it went well, and its one-line result. */
export type PcResult = { at: number; ok: boolean; line: string }

/** The quick-run job whose turn is running now. */
export type PcActiveJob = { name: string; hat: PcHat; startedAt: number }

/** The council round in flight, from the Workflow call that launched it. */
export type PcRound = { round: number; mode: string; project: string; startedAt: number }

/** The quick-run list: open by itself while nobody works, else folded; or as the person set it. */
export type PcQuick = 'auto' | 'open' | 'closed'

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
      /** jobs saved with /crew-add (kept in $.store too) */
      jobs: PcJob[]
      /** the quick-run job whose prompt is shown, or '' */
      openJob: string
      quick: PcQuick
      /** agent rows opened to show their task, steps and last tools */
      openRows: string[]
      /** the council round in flight, or null */
      round: PcRound | null
      /** the person's last typed prompt, for /crew-add Name */
      lastPrompt: string
      /** the crew's look (kept in $.store too) */
      skin: PcSkin
      /** the quick-run job running now, or null */
      activeJob: PcActiveJob | null
      /** each quick-run job's last result, by job name (kept in $.store too) */
      results: Record<string, PcResult>
    }
  }
}
