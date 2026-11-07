# pixel-crew

A pixel-art progress bar with the Claude mascot, and a side panel that turns your subagents into a little crew of characters, for [Claude Code](https://claude.com/claude-code).

![The crew](docs/crew.png)

## Leigh's fork

This fork (clearspec11/pixelcrew) tailors pixel-crew to an improvement-council setup. Upstream is Trackszx/pixelcrew.

- **Council stages are characters.** Workflow agents labelled `stage:target` get a character for their stage: preflight and salvage the worker, propose the researcher, merge the scribe, vote the voter, build the developer, verify and regress the tester, review the skeptic.
- **Personas keep their colour.** A label naming a persona (`propose:dot`) draws that persona in its own colour and names it in the panel ("Dot · proposing"). A seat (`build:P13`) shows as "Seat P13 · building". The personas and their colours live in `hooks/council.ts`.
- **One band at a time.** While the council mod shows a running round above the prompt, pixel-crew steps aside. Once the round has finished, the council band gives way to new work.
- **More words.** Walkthrough, usability, probe, smoke, live-check, sanity and GM pick the tester. Compat, survey, brief, catalog and compare pick the researcher. Mockup, sprite, palette, layout and theme pick the artist. Port, wire, migrate, patch and integrate pick the developer.
- **Current prices and windows.** The cost estimate uses October 2026 list prices per model version, and the context gauge measures against each model's own window instead of a fixed 200K.
- **The phone gets a status line.** The mobile app draws no band, so while it is attached pixel-crew keeps one status line in step with the band, for example `⚒ Doing the second · 50% · 1/2`. It stays clear in the terminal and desktop app, where the band already says it, and during a council round, whose own status line follows the round. `/crew-bar off` turns it off with the band.
- **A "Done celebration" option.** `full` (confetti), `quiet` (a short hop) or `off`, in `/config` or `pluginConfigs`.
- **Quick run.** The Agents panel lists ready-made jobs you press Run on: Docker health, disk space on C:, review my diff, run the tests, summarize this repo, outdated dependencies, tidy the desktop and clean up Downloads. Each one is a prompt handed to Claude as a turn of its own. `◇` jobs only read; `◆` jobs change files, so their prompt tells Claude to list every change and wait for your OK, and to use the Recycle Bin instead of deleting. Press a job's name to see its exact prompt. The list fills the panel while nobody works and folds to one line while agents run. `/crew-add Name | prompt` saves your own (`/crew-add Name` alone saves the last prompt you typed), `/crew-remove Name` drops one, and `/crew-run [Name]` lists or runs them where no panel draws (the phone).
- **Jobs keep their result and wear a hat.** Each job's prompt ends by asking Claude for a one-line `Result:`. When the turn ends, the panel keeps that line under the job, with when it ran and whether it went well (`✓ 4m ago`), and the Run button becomes Run again. Results are kept across sessions, and `/crew-run` lists them too. While a job runs, its row says `● running` and, in the desktop app, the band's mascot wears the job's hat (the terminal's one-line band has no room for it): the hard hat for Docker, the lantern for disk space and dependencies, the magnifier for a review, the goggles for tests, the quill for a summary, and a bandana and broom for tidying. A job you saved gets a hat from the words in its prompt. While Claude is busy with a turn, the job rows show no Run button ("Run comes back when this turn ends") and `/crew-run Name` says to try again, instead of quietly queueing the job behind it. A job's prompt you type while a turn runs says `○ queued` and gets its hat when its own turn starts; anything else you type mid-turn leaves the band, the hat and the result with the turn that's running.
- **A D&D party skin.** `/crew-skin party` dresses the crew as an adventuring party: the developer is a wizard, the tester a cleric, the researcher a ranger, the worker a fighter, the artist a bard, Codex a warforged, the council's voter a herald, its scribe a sage and its skeptic a rogue, and Claude the dungeon master while it delegates. The sprites in the Agents panel, and the labels and symbols in the band, the panel and `/crew` follow (`✶ wizard`); a persona still keeps its name. `/crew-skin crew` goes back, `/crew-skin` alone switches, and the choice is kept across sessions.
- **Rows open.** Press an agent's title to see the task it was given, its steps one per line, its last three tools, and why it stopped if it failed.
- **The council stage strip.** While a council round's agents run, the panel's top shows the round (`Council r2 · build`) and each stage: `✓ Propose 5 · ✓ Merge 1 · ✓ Vote 5 · ● Build 1/3 · ○ Review`. Build counts the builds that finished well. A stage where an agent failed shows `✗` in red with how many finished well (`✗ Build 2/3`), and once nothing runs the header says `done (1 failed)` instead of `done`.
- **Fuller totals.** An Agents total (`1● 11✓ 1✗`), cost and tokens per model when more than one ran, the longest finished agent, and context as `18% of 1M`. The panel keeps 40 rows (more only while more than 40 run at once), dropping the oldest finished agents first and never a running one; the dropped ones stay in every total, with a dim `+5 earlier agents folded into the totals` line saying so (`/crew-clear` empties both).
- **Tool arguments read where this build sends them.** On Claude Code 2.1.317 a `tool.call` carries the tool's arguments beside `tool` (`e.file_path`), not under `e.input`; pixel-crew reads either, so the band names the file being edited and the task list is followed again.

It reads the `council` plugin's band state when that plugin is installed (homelab-mods marketplace), and loads without it.

## What it does

**A progress band above the prompt.** While Claude works, the band shows what it is doing right now ("Editing register.tsx", "Running the tests"), a pixel progress bar with a light sweeping across it, and the percentage. The mascot walks along the bar, right at the edge of what is done, and the bar glides to each new value instead of jumping. When Claude delegates to subagents it becomes the **boss**: it puts on a crown and cape (at the same size, so the band never changes height), the bar turns purple, and a counter shows how many subagents are done (`1/3`).

![The progress band](docs/band.png)

**Moods.** The mascot reacts to what happens in the session:

- **Done:** when a turn finishes well, it jumps among confetti at 100% for a couple of seconds.
- **Waiting for you:** when Claude asks a question or needs your permission, it raises a hand with a `!`, the bar and the title turn amber, and the percentage steps aside.
- **Something failed:** when one of Claude's tools fails, it shakes and the bar turns red for a moment.
- **Asleep:** when nothing is running but the task list still has work, it dozes off.

![The mascot's moods](docs/moods.png)

**An Agents panel.** Every subagent gets a row: its character, its role, the model and effort, what it is doing, context used, tokens, estimated cost, time, and its own progress bar. Totals for cost, tokens and time sit on top. The panel opens by itself when the first subagent starts.

<img src="docs/panel.png" alt="The Agents panel" width="420">

**The crew.** Each subagent gets a role from the first keyword in its description (English, Portuguese and Spanish keywords are understood):

| Character | Role | Symbol | Picked for |
| --- | --- | --- | --- |
| Headphones and laptop | `developer` | `⌨` | build, implement, fix, refactor, create, write |
| Beret, brush and palette | `artist` | `✎` | design, draw, icons, logo, UI, CSS, visuals |
| Explorer hat and lantern | `researcher` | `⌕` | research, explore, search, read, analyze, plan |
| Hard hat and wrench | `worker` | `⚒` | anything else |
| Safety goggles and clipboard | `tester` | `✓` | test, verify, debug, review, audit |
| Screen robot | `codex` | `⚡` | anything delegated to Codex |
| Crown, cape and scepter | `boss` | `♛` | Claude itself, while it delegates (never a subagent) |

**Progress.** If Claude or a subagent keeps a task list, the bar follows it exactly. Without one, the bar is an estimate that advances with each step and stays under 90% until the work is really done.

## Install

The plugin needs a Claude Code build with function-hook plugins (the plugin API is early access). It was built and tested on Claude Code **2.1.293**, in the desktop app's Code tab and in the terminal.

In the terminal everything stays one line tall: the band is a single row in which the mascot, drawn in quadrant pixels (`▘▝▖▗▀▄▌▐▚▞▛▜▙▟█`, 2×2 per cell), walks inside its own progress bar, after a symbol in the role's colour for the kind of work Claude just did (`⌕` reading or searching, `⌨` editing code, `✎` styles and images, `✓` tests, `⚒` other commands, `♛` while it delegates) and a mood mark (`✦` done, `zz` asleep, `!` waiting, `✗` failed). Each row of the Agents panel starts with a one-line character in its role's colour (codex is a white robot) and its role's symbol; a finished agent's row turns grey and stops moving. It needs Claude Code's `Raster` element (tested on **2.1.299**).

In a terminal session of Claude Code:

```
/plugin install pixel-crew --marketplace Trackszx/pixelcrew
```

Answer `y` to add the marketplace and pick the user scope. Or, from your shell:

```bash
claude plugin marketplace add Trackszx/pixelcrew
claude plugin install pixel-crew@pixelcrew
```

Once installed at the user scope it also loads in the desktop app's Code tab. If the installer says an option is not set yet, that is the Language option: it already defaults to `auto`, so you can skip it.

## Commands

| Command | What it does |
| --- | --- |
| `/crew` | Opens the Agents panel |
| `/crew-clear` | Clears the task list and the agents |
| `/crew-bar` | Turns the progress band off or back on (`/crew-bar off`, `/crew-bar on`, or nothing to toggle). The choice is kept across sessions; the Agents panel keeps working |

## Language

The band and the panel speak **English**, **Portuguese** and **Spanish**. The `Language` option (in `/config`, or `pluginConfigs` in your settings) is `auto` by default, which follows Claude Code's `language` setting, then `LC_ALL` / `LC_MESSAGES` / `LANG`, then your system's language. Anything else falls back to English. Set it to `en`, `pt` or `es` to pin one.

## Good to know

- **It costs no tokens.** Everything is drawn locally. The plugin only listens to events that already happen (a subagent starts, a model step, a tool call, a turn ends) and passes them on unchanged: it adds nothing to the prompt and makes no model calls.
- **Costs are estimates.** They come from a price table at the top of [`hooks/register.tsx`](hooks/register.tsx); adjust it if your prices differ. The context percentage assumes a 200k window.
- The animation is a frame counter that ticks 30 times a second, and only while something is working or a mood is showing (a sleeping mascot ticks slower).

## Development

```
hooks/art.ts        sprites, palette and the pixel bar (SVG)
hooks/i18n.ts       every text in English, Portuguese and Spanish
hooks/register.tsx  the hooks: state, roles, progress, band and panel
types/index.d.ts    the plugin's state contract
tests/              tests run with `claude plugin test .`
```

```bash
claude plugin validate .
claude plugin test .
```

To try your changes, load the folder with `claude --plugin-dir <path to this folder>`.

## License

[MIT](LICENSE). Not affiliated with Anthropic or OpenAI; Claude and Codex are trademarks of their owners.
