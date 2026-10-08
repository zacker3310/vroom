# Vroom: notes for Claude Code

Vroom is a one-file kids' driving game: `index.html` holds all CSS, markup and JS (a 30-section
table of contents sits at the top of the script). No build, no dependencies, no network. Read
`CONTRIBUTING.md` for the non-negotiable rules and the content-pack anchors, and
`docs/ARCHITECTURE.md` for how the pieces fit. `SPEC.md` is the design spec; `TASKS.md` the log.

## Rules that the suite and the user both enforce

- Zero on-screen words: numerals and symbols only, pictograms for everything. `aria-label`s are fine.
- No fail states. Stars only go up. Obstacles stop and ding, never end a run. Dry fuel crawls, it never strands.
- Every tap target is at least 64 px rendered at 1024x768 (so 76 stage px or more).
- Toybox look: the `--v-*` tokens in `:root`, flat `0 6px 0` shadows, big radii, `var(--v-font)`. Navy is game art, never chrome.
- Save data is forever: `CODE_*`, `BODY_ORDER`, `WHEEL_ORDER`, `COLORS`, `DECAL_ORDER`, `BUDDY_ORDER`, `BADGES` are append-only. New save fields go on the end of the v3 tail with a `pos + n <= bytes.length * 8` guard, and in `loadState()` with a default for older saves.
- Honour `prefers-reduced-motion` for anything decorative.
- Bump `APP_VERSION` on every user-visible change; the hosted update gate keys off it.
- No em dashes in anything you write (code comments, docs, commit messages, replies).

## Working here

```bash
python3 -m http.server 4173              # serve; the page must be served, not opened from disk
npm ci && npx playwright-core install chromium
npm test                                 # 22 suites; serves on its own free port, appends ?garage
node tests/lint.cjs                      # ESLint over the inline script, must be 0 findings
npm run shots                            # regenerate docs/*.png (needs the server + a Chromium)
```

- The page boots into a title scene. Append `?garage` to land in the garage (the runner does this); the suites' default `VROOM_URL` already carries it.
- `CHROMIUM=/path/to/chrome` points the suites at a browser. In the cloud session the shared one lives at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` and `node_modules` for the tests at `<scratchpad>/t/node_modules` (set `NODE_PATH`).
- Port 4173 can be held by a stale server from a worktree. If a manual screenshot shows the wrong version, check `APP_VERSION` in the served page before debugging code.
- The fairness bots (`tests/fairness-check.cjs`) drive all 120 levels. If level content fails them, fix the content, never the thresholds.
- Every feature gets a check in the suite that owns the area (see `tests/README.md`); keep the counts in that README and in the top-level README current.
- Tests run under load on the shared box can flake on the two timing checks (level-80 frame time, ghost replay timing); rerun those suites alone before treating a failure as real.

## Git

- Commit as `Claude <noreply@anthropic.com>` (the repo config is set); the user's stop hook rejects other committer identities.
- End every commit message with the two attribution lines the session provides.
- Agent worktree branches are merged into `main` with `git merge --squash` so each feature lands as one verified, Claude-authored commit.
- Push `main`, then mirror it with `git push origin main:feat/chase-cam`. Never open a pull request unless asked.
- Run the full battery and lint before every push. A pipe such as `node tests/run-all.cjs | tail` hides the exit code; capture to a log and check `exit`.
