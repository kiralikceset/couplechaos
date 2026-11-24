# Couple Chaos: working rules

## Project
- Capacitor 8 + React/Vite client (`client/`), Node server (`server/`) on Render.
- Checks before every commit: `pnpm -s check`, `pnpm -s test`, `pnpm -s run build`.
- UI text lives in `client/src/lib/i18n.ts` and must exist in all 4 languages (tr, en, de, es).
- Never commit secrets: `.env`, `keystore.properties`, `*.jks`, `.project-config.json`.

## Orchestra (lead session = conductor)
The lead session plans, writes short briefs, delegates, and merges. It keeps its own replies short.
Delegate only when the work is big enough to pay for an extra agent; small fixes are done directly.

| Work | Agent | Model |
|---|---|---|
| Code changes from a brief | `developer` | sonnet |
| Independent check before merge | `reviewer` | sonnet |
| Web research with sources | `researcher` | sonnet |
| Bulk file moves, renames, conversions | `loader` | haiku |
| Visual design, rendered and checked | `designer` | opus |
| Social videos and covers | `video-producer` | sonnet |

## Brief format (every delegation)
1. Goal in one sentence.
2. Files the agent may touch (everything else is off limits).
3. Done means: the exact checks that must pass.
4. What to report back (max 10 lines).

## Review gate
- Any change to `server/`, auth, purchases or more than ~50 lines goes to `reviewer` before merge.
- Reviewer answers APPROVE or FIX with reasons. Max 2 FIX rounds, then the lead decides and tells the user.

## Branches
- Agents work on their own branch (`agent/<name>-<topic>`); only the lead merges into `main`.
- No force pushes, no `reset --hard`, no history rewrites.

## Cost
- Every agent costs tokens. Prefer doing small work in the lead session.
- Use `haiku` for mechanical work, `opus` only for design.
