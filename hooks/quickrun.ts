import type { PcHat, PcJob } from '../types'

// Leigh's fork: the Agents panel's quick-run list. Each job is a prompt handed
// to Claude as a turn of its own. A job that changes files says so (◆) and
// asks Claude to list every change and wait for an OK first.

export const ASK_FIRST =
  'Before changing anything, list every file you would move, rename or change and wait for my OK; change nothing until I say so. Never delete anything permanently: use the Recycle Bin.'

export const JOBS: readonly PcJob[] = [
  {
    name: 'Docker health',
    hat: 'hardhat',
    blurb: 'unhealthy, restarting, disk use',
    changes: false,
    prompt:
      'Check the health of my Docker setup: run `docker ps -a` and `docker system df`, list every container that is unhealthy, restarting or exited with an error, show the last 20 log lines of each, and say what you think is wrong. Read only: restart, remove or change nothing.',
  },
  {
    name: 'Disk space on C:',
    hat: 'lantern',
    blurb: 'biggest folders, what is safe to clear',
    changes: false,
    prompt:
      'Find what is using the space on my C: drive: the free space, the 15 biggest folders in my user folder, and the caches that are usually safe to clear, with their sizes. Read only: delete nothing, just report.',
  },
  {
    name: 'Review my diff',
    hat: 'magnifier',
    blurb: 'bugs and risks in my changes',
    changes: false,
    prompt:
      'Review the uncommitted changes in this repo (`git diff` and `git diff --staged`) for bugs, risks and missing tests. Report the findings ranked by severity, with file:line. Change no files.',
  },
  {
    name: 'Run the tests',
    hat: 'goggles',
    blurb: 'find them, explain failures',
    changes: false,
    prompt:
      "Find how this project runs its tests, run them, and explain each failure with its likely cause. Change no files.",
  },
  {
    name: 'Summarize this repo',
    hat: 'quill',
    blurb: 'what it is, how to run it',
    changes: false,
    prompt:
      'Summarize the project in the current folder: what it is, how it is laid out, how to run and test it, and anything that looks broken or unfinished. Read only.',
  },
  {
    name: 'Outdated dependencies',
    hat: 'lantern',
    blurb: 'what is behind, safe or breaking',
    changes: false,
    prompt:
      "List this project's outdated dependencies (npm outdated, pip list --outdated, or whatever it uses) and say which updates look safe and which could break something. Install nothing.",
  },
  {
    name: 'Tidy the desktop',
    hat: 'broom',
    blurb: 'lists moves, then asks',
    changes: true,
    prompt: 'Tidy my Desktop folder (and the OneDrive Desktop, if there is one): propose folders that group the loose files by type or project.',
  },
  {
    name: 'Clean up Downloads',
    hat: 'broom',
    blurb: 'old and duplicate files, then asks',
    changes: true,
    prompt:
      'Look through my Downloads folder: group what is there by type, and find old installers, duplicates and files over 500 MB. Propose what to file into folders and what to send to the Recycle Bin.',
  },
]

// a prompt that asks for any of these changes files; anything else only reads
const CHANGES =
  /\b(move|rename|delete|remove|clean|tidy|organi[sz]e|sort|write|edit|change|fix|install|update|upgrade|commit|push|deploy|restart|stop|kill|format|refactor|create|make|add)\b/i

export function changesFiles(prompt: string): boolean {
  return CHANGES.test(prompt)
}

/** The line every job's prompt ends with, so the panel can keep a one-line result. */
export const RESULT_ASK = 'End your reply with one line that starts with "Result:" and sums up the outcome in under 60 characters.'

/** What a job hands Claude: its prompt, for one that changes files the ask-first rule, and the result line. */
export function jobPrompt(job: PcJob): string {
  const base = !job.changes || /wait for my ok/i.test(job.prompt) ? job.prompt.trim() : `${job.prompt.trim()} ${ASK_FIRST}`
  return `${base} ${RESULT_ASK}`
}

/** The job a submitted prompt came from, when it is one of the quick-run prompts. */
export function jobOfPrompt(own: readonly PcJob[], text: string): PcJob | undefined {
  const t = text.trim()
  const all = allJobs(own)
  return all.find(j => jobPrompt(j) === t) ?? all.find(j => t.includes(j.prompt.trim()))
}

const HAT_WORDS: Array<[PcHat, RegExp]> = [
  ['broom', /\b(tidy|clean|organi[sz]e|sort|declutter)/i],
  ['goggles', /\btests?\b/i],
  ['magnifier', /\b(review|audit|diff)/i],
  ['quill', /\b(summar|document|write up|explain)/i],
  ['hardhat', /\b(docker|container|server|restart|deploy|install)/i],
]

/** The job's hat: its own, else one guessed from its prompt (a lantern for anything that looks around). */
export function hatOf(job: PcJob): PcHat {
  return job.hat ?? HAT_WORDS.find(([, re]) => re.test(job.prompt))?.[0] ?? 'lantern'
}

/** The one-line result in a finished job's answer: its `Result:` line, else its last line. */
export function resultLine(answer: string): string {
  const lines = String(answer ?? '').split('\n').map(l => l.replace(/[*_`]/g, '').trim()).filter(Boolean)
  const tagged = [...lines].reverse().find(l => /^result:/i.test(l))
  const line = (tagged ? tagged.replace(/^result:\s*/i, '') : lines.at(-1) ?? '').replace(/\s+/g, ' ')
  return line.length > 70 ? `${line.slice(0, 69).trimEnd()}…` : line
}

/** How long ago `at` was, short: "just now", "4m ago", "3h ago", "yesterday", "5d ago". */
export function ago(at: number, now = Date.now()): string {
  const m = Math.floor(Math.max(0, now - at) / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return d === 1 ? 'yesterday' : `${d}d ago`
}

/**
 * `/crew-add Name | prompt` saves a job; `/crew-add Name` alone saves the last
 * prompt you typed under that name. Answers the job, or why it can't.
 */
export function parseAdd(args: string, lastPrompt: string): PcJob | string {
  const [rawName = '', ...rest] = args.split('|')
  const name = rawName.trim().replace(/\s+/g, ' ')
  const prompt = (rest.length ? rest.join('|') : lastPrompt).trim()
  if (!name) return 'Name the job: /crew-add Name | what Claude should do (or /crew-add Name to save your last prompt).'
  if (name.length > 40) return 'Keep the job name under 40 characters.'
  if (!prompt) return `No prompt to save under "${name}": type one after a |, or send a prompt first and run /crew-add ${name} again.`
  const changes = changesFiles(prompt)
  const blurb = prompt.length > 38 ? `${prompt.slice(0, 37).trimEnd()}…` : prompt
  return { name, blurb, prompt, changes, own: true }
}

/** The default jobs, then yours; one of yours with a default's name replaces it. */
export function allJobs(own: readonly PcJob[]): PcJob[] {
  const mine = new Map(own.map(j => [j.name.toLowerCase(), j]))
  return [...JOBS.filter(j => !mine.has(j.name.toLowerCase())), ...own]
}

export function findJob(own: readonly PcJob[], name: string): PcJob | undefined {
  const n = name.trim().toLowerCase()
  const all = allJobs(own)
  return all.find(j => j.name.toLowerCase() === n) ?? all.find(j => j.name.toLowerCase().startsWith(n))
}
