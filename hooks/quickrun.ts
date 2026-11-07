import type { PcJob } from '../types'

// Leigh's fork: the Agents panel's quick-run list. Each job is a prompt handed
// to Claude as a turn of its own. A job that changes files says so (◆) and
// asks Claude to list every change and wait for an OK first.

export const ASK_FIRST =
  'Before changing anything, list every file you would move, rename or change and wait for my OK; change nothing until I say so. Never delete anything permanently: use the Recycle Bin.'

export const JOBS: readonly PcJob[] = [
  {
    name: 'Docker health',
    blurb: 'unhealthy, restarting, disk use',
    changes: false,
    prompt:
      'Check the health of my Docker setup: run `docker ps -a` and `docker system df`, list every container that is unhealthy, restarting or exited with an error, show the last 20 log lines of each, and say what you think is wrong. Read only: restart, remove or change nothing.',
  },
  {
    name: 'Disk space on C:',
    blurb: 'biggest folders, what is safe to clear',
    changes: false,
    prompt:
      'Find what is using the space on my C: drive: the free space, the 15 biggest folders in my user folder, and the caches that are usually safe to clear, with their sizes. Read only: delete nothing, just report.',
  },
  {
    name: 'Review my diff',
    blurb: 'bugs and risks in my changes',
    changes: false,
    prompt:
      'Review the uncommitted changes in this repo (`git diff` and `git diff --staged`) for bugs, risks and missing tests. Report the findings ranked by severity, with file:line. Change no files.',
  },
  {
    name: 'Run the tests',
    blurb: 'find them, explain failures',
    changes: false,
    prompt:
      "Find how this project runs its tests, run them, and explain each failure with its likely cause. Change no files.",
  },
  {
    name: 'Summarize this repo',
    blurb: 'what it is, how to run it',
    changes: false,
    prompt:
      'Summarize the project in the current folder: what it is, how it is laid out, how to run and test it, and anything that looks broken or unfinished. Read only.',
  },
  {
    name: 'Outdated dependencies',
    blurb: 'what is behind, safe or breaking',
    changes: false,
    prompt:
      "List this project's outdated dependencies (npm outdated, pip list --outdated, or whatever it uses) and say which updates look safe and which could break something. Install nothing.",
  },
  {
    name: 'Tidy the desktop',
    blurb: 'lists moves, then asks',
    changes: true,
    prompt: 'Tidy my Desktop folder (and the OneDrive Desktop, if there is one): propose folders that group the loose files by type or project.',
  },
  {
    name: 'Clean up Downloads',
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

/** What a job hands Claude: its prompt, and for one that changes files, the ask-first rule. */
export function jobPrompt(job: PcJob): string {
  if (!job.changes || /wait for my ok/i.test(job.prompt)) return job.prompt
  return `${job.prompt.trim()} ${ASK_FIRST}`
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
