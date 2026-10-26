# ci

Shared GitHub Actions workflows for jmusick's repos. A repo keeps a short `ci.yml` that calls these, so a
check changed here reaches every repo on its next pin bump.

## Workflows

### `baseline.yml`: every repo

| Job | What it does |
|---|---|
| Secret scan | Gitleaks over the full git history. Honors the repo's `.gitleaks.toml` and `.gitleaksignore`. |
| Dependency checks | If `package-lock.json` exists: `npm ci --ignore-scripts` (fails on a stale lockfile), `npm audit`, `npm audit signatures`. Skipped otherwise. |
| Dependency review | Pull requests on public repos only. Fails on moderate or worse advisories in runtime dependencies the PR adds. |

| Input | Default | |
|---|---|---|
| `node-version` | `24` | Ignored when `node-version-file` is set. |
| `node-version-file` | | For example `.nvmrc` or `.node-version`. |
| `audit-level` | `high` | Lowest `npm audit` severity that fails the job. |

### `web-app.yml`: Cloudflare web apps (Astro or Vite)

The checks job installs from the lockfile and runs whichever of these commands are set, in order:

| Input | Default |
|---|---|
| `setup-command` | |
| `lint-command` | |
| `typecheck-command` | |
| `test-command` | |
| `build-command` | `npm run build` |

Setting `a11y-command` adds an accessibility job. It installs Chromium through the repo's `playwright` or
`playwright-core`, builds, runs `a11y-setup-command`, starts `a11y-server-command` in the background, waits
for `a11y-ready-url` (or `a11y-url`) to answer, then runs `a11y-command` with `A11Y_BASE_URL` set to
`a11y-url`. Leave `a11y-server-command` empty if the audit starts its own server.

`node-version` and `node-version-file` work as in the baseline.

## Using them in a repo

1. Copy [`templates/web-app-ci.yml`](templates/web-app-ci.yml) to `.github/workflows/ci.yml` and keep only
   the commands the repo has scripts for.
2. Pin both `uses:` lines to a release commit, with the tag as a comment:

   ```yaml
   uses: jmusick/ci/.github/workflows/web-app.yml@<commit sha> # v0.1.0
   ```

   `gh api repos/jmusick/ci/commits/v0.1.0 --jq .sha` prints the commit.
3. Copy [`templates/dependabot.yml`](templates/dependabot.yml) to `.github/dependabot.yml`. Its
   `github-actions` entry is what proposes newer releases of these workflows.

## Changing the workflows

- Pin every action to a full commit SHA with its tag as a comment. Dependabot keeps them current here.
- Gitleaks and actionlint are pinned by version and SHA-256 in the workflow files. Upgrade them by hand to a
  release at least two weeks old.
- The Self-check workflow runs actionlint over the workflows and templates, and runs the baseline on this
  repo.
- Release by tagging `vX.Y.Z` and adding a CHANGELOG entry. Callers move when they merge the Dependabot PR.
