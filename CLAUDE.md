# CLAUDE.md

## Rules

### Persist lessons from mistakes

If the user calls out a mistake, immediately add a rule to CLAUDE.md that prevents repeating it. Don't just acknowledge it — write it down.

### Keep the user informed during background tasks

When waiting on a background agent or long-running command, don't sleep for more than 30-60 seconds before reporting status to the user. Short check-ins ("still running, N lines so far") are better than long silences.

### Never merge or push to master

Never merge branches, push to master, or ask to do so. The user handles all merges and deployments.

### Never delete saved data to fix a downstream problem

If a notebook or script fails due to a missing field or schema change, think about what actually needs to change before touching the data. The data is usually fine — fix the consumer, recompute the missing field from what's already there, or patch the file. Deleting and rerunning expensive calls is always the last resort that has to be verified with the user.

### Use tables for structured data

When presenting comparisons, agent overviews, config summaries, or any structured information, use markdown tables. Tables are easier to scan than prose.

### Don't fumble

When debugging an issue you don't understand, stop and ask for information (console output, error messages, what exactly happens) instead of making multiple blind guesses in a row. Diagnose first, then act.

### Output for mobile

The user often reads responses on a phone screen. Pick formatting and data visualisations that work in a narrow column: prefer compact tables, short bullets, brief paragraphs. Cut throat-clearing and prose padding. If a wide table won't fit, transpose it or split it. When in doubt, terser.

### Roamer

The `bin/roamer` CLI lets you read from and type into other tmux sessions on
this machine. Use it when the user asks you to do something in another
session ("check the build in pstan", "run the tests in roamdx"), or to
coordinate work across panes. See `docs/roamer.md` for the full surface.

Quick reference: `roamer list`, `roamer pane <name>`, `roamer keys <name> "<text>"`,
`roamer special <name> Enter`, `roamer wait <name> "<regex>"`.

`ROAMDX_TOKEN` and `ROAMDX_HOST` must be set in the shell. If the CLI errors
with "ROAMDX_TOKEN is not set", ask the user to source their roamdx env.
