# AGENTS.md

Conventions and gotchas for anyone (human or agent) changing this repo. [README.md](README.md) documents
what each shared workflow does and its inputs for the repos that call them; this file covers the rules
for changing them.

## What this repo is

Reusable GitHub Actions workflows that jmusick's repos call from a short `ci.yml`:

| File | Called by | Purpose |
|---|---|---|
| `.github/workflows/baseline.yml` | every repo | Gitleaks history scan, npm version floor, lockfile integrity, `npm ci`, `npm audit`, signature check, dependency review |
| `.github/workflows/web-app.yml` | Astro/Vite Cloudflare apps | Setup, lint, type check, test, build, after-build checks, optional accessibility audit |
| `.github/workflows/release.yml` | repos that publish releases | GitHub Release for a pushed `vX.Y.Z` tag through the `gh` CLI |
| `.github/workflows/self-check.yml` | this repo | actionlint, the script tests, and the baseline run on this repo |
| `.github/workflows/publish.yml` | this repo | Publishes this repo's own releases through `release.yml` |
| `scripts/*.mjs` | baseline, web-app | The npm version floor and lockfile integrity checks, dependency-free Node |
| `templates/` | copied by hand | Starting points for a repo's `ci.yml`, `release.yml` and `dependabot.yml` |

Current callers: orboro-net and firelands-current use `baseline.yml` and `web-app.yml`. tagstash still
has its own inline CI.

## Changes reach callers only through a pin bump

Callers pin a commit SHA with a `# vX.Y.Z` comment, and Dependabot proposes newer releases from that
comment. So:

- Nothing merged here affects a caller until it is released and the caller bumps its pin.
- Treat inputs as a public API. Renaming or removing an input, changing a default, or making a check
  stricter can break a caller on its next bump: call it out in the CHANGELOG and release it as a minor.
- A job skipped by its `if:` still lets the caller's CI gate pass, so a new optional job must default
  to skipped.

## Workflow conventions

- `runs-on: ubuntu-24.04`, never `ubuntu-latest`, and a `timeout-minutes` on every job.
- Top-level `permissions: contents: read`. A job that needs more asks for it on the job.
- Every `actions/checkout` sets `persist-credentials: false`.
- Third-party actions are pinned by full commit SHA with a `# vX.Y.Z` comment. Dependabot updates them
  with a 14-day cooldown.
- Downloaded tools (Gitleaks, actionlint) are pinned by version and SHA-256 in the workflow's `env`, and
  updated by hand to a release at least two weeks old. The comment above each pin says how.
- Event data and inputs reach shell scripts through `env:`, never `${{ }}` inside `run:`. The one
  exception is the command inputs in `web-app.yml` (`lint-command` and the rest), which come from the
  caller's own workflow file and are meant to run as written.
- Shared scripts are checked out from `job.workflow_repository` at `job.workflow_sha` so they match the
  caller's pin, then moved out of the workspace. Keep the guard that fails when either is empty; an
  empty value checks out the caller's repo instead. The same steps run in `self-check.yml` so a context
  that stops resolving fails here first. `.github/actionlint.yaml` silences actionlint's "not defined"
  error for these two properties until actionlint knows them.
- Each step that only applies sometimes has its own `if:`, so a caller turns on exactly what it sets.
- CI time matters. Before adding a step, check what it costs in a real caller's run
  (`gh api repos/jmusick/<repo>/actions/runs/<id>/jobs`). Prefer what the runner image already has to
  installing system packages: `playwright install --with-deps` once took 10 minutes on a slow apt mirror.

## Scripts and tests

- `scripts/*.mjs` use only Node built-ins (Node 24), so callers need no install to run them. Each opens
  with a comment saying what it checks and how to run it.
- Run the tests with the glob, as CI does: `node --test "tests/*.test.mjs"`. A bare `node --test tests/`
  fails.
- `tests/fixtures/sample-project` is a minimal npm project both scripts must pass.

## Docs and comments

- A new or changed input updates its `description:`, the input table in README.md, and the CHANGELOG.
- Each workflow opens with a comment saying what it does and how to call it. Comments explain why,
  not what the next line does.
- Prose and comments wrap at about 105 characters.
- CHANGELOG.md follows Keep a Changelog. Add user-facing changes under `## [Unreleased]`.

## Releases

Releases are cut with `/patch` or `/minor`: one commit with the subject `vX.Y.Z - Summary`, a `vX.Y.Z`
tag, and a push. `publish.yml` then publishes the GitHub Release. Self-check must pass first.
