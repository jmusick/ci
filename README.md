# ci

Shared GitHub Actions workflows for jmusick's repos. A repo keeps a short `ci.yml` that calls these, so a
check changed here reaches every repo on its next pin bump.

## Workflows

### `baseline.yml`: every repo

| Job | What it does |
|---|---|
| Secret scan | Gitleaks over the full git history. Honors the repo's `.gitleaks.toml` and `.gitleaksignore`. |
| Dependency checks | If `package-lock.json` exists: the npm version floor, the lockfile integrity check, `npm ci --ignore-scripts` (fails on a stale lockfile), `npm audit`, `npm audit signatures`. Skipped otherwise. |
| Dependency review | Pull requests on public repos only. Fails on moderate or worse advisories in runtime dependencies the PR adds. |

| Input | Default | |
|---|---|---|
| `node-version` | `24` | Ignored when `node-version-file` is set. |
| `node-version-file` | | For example `.nvmrc` or `.node-version`. |
| `audit-level` | `high` | Lowest `npm audit` severity that fails the job. |
| `npm-min-version` | | Oldest npm allowed. See the npm version floor below. |

**npm version floor** ([`scripts/check-npm-version.mjs`](scripts/check-npm-version.mjs)). Older npm
ignores `.npmrc` settings it doesn't know, without a warning. So when `.npmrc` sets `min-release-age` or
`strict-allow-scripts`, npm must be 11.19.0 or newer. `npm-min-version` sets a floor explicitly instead.
Without either, any npm passes.

**Lockfile integrity** ([`scripts/check-lockfile.mjs`](scripts/check-lockfile.mjs), from orboro-net).
The lockfile must be format 3, and every package must come from registry.npmjs.org over HTTPS with a
sha512 hash and a tarball URL that names that package and version. A dependency with install scripts
must be listed in package.json `allowScripts` (an entry set to `false` counts as reviewed). That rule
fails the job when the repo has an `allowScripts` field or `strict-allow-scripts=true` in `.npmrc`, and
is only a warning otherwise.

### `web-app.yml`: Cloudflare web apps (Astro or Vite)

The checks job installs from the lockfile and runs whichever of these commands are set, in order:

| Input | Default |
|---|---|
| `setup-command` | |
| `lint-command` | |
| `typecheck-command` | |
| `test-command` | |
| `build-command` | `npm run build` |
| `after-build-command` | |

Both jobs apply the same npm version floor as the baseline before installing, with the same
`npm-min-version` input.

Setting `a11y-command` adds an accessibility job. It installs Chromium through the repo's `playwright` or
`playwright-core`, builds, runs `a11y-setup-command`, starts `a11y-server-command` in the background, waits
for `a11y-ready-url` (or `a11y-url`) to answer, then runs `a11y-command` with `A11Y_BASE_URL` set to
`a11y-url`. Leave `a11y-server-command` empty if the audit starts its own server.

`node-version` and `node-version-file` work as in the baseline.

### `release.yml`: GitHub Releases for version tags

Publishes a release for the pushed `vX.Y.Z` tag with notes generated from merged pull requests, using
the `gh` CLI already on the runner. A tag with a hyphen (`v1.2.0-beta.1`) becomes a prerelease. If the
release already exists, its files are replaced instead.

| Input | Default | |
|---|---|---|
| `artifact-name` | | An artifact uploaded earlier in the calling workflow. Its files go on the release. |
| `files` | `*` | Space-separated globs, relative to the artifact, choosing which files to attach. |
| `title` | the tag | Release title. |

The calling job needs `permissions: contents: write`. This repo publishes its own releases this way,
in [`publish.yml`](.github/workflows/publish.yml).

## Using them in a repo

1. Copy [`templates/web-app-ci.yml`](templates/web-app-ci.yml) to `.github/workflows/ci.yml` and keep only
   the commands the repo has scripts for. Require its **CI gate** check in branch protection: it passes
   only when every other job passed.
2. For a repo that publishes releases, copy [`templates/release-ci.yml`](templates/release-ci.yml) to
   `.github/workflows/release.yml` and swap in the repo's own build.
3. Pin every `uses: jmusick/ci/...` line to a release commit, with the tag as a comment:

   ```yaml
   uses: jmusick/ci/.github/workflows/web-app.yml@<commit sha> # v0.2.0
   ```

   `gh api repos/jmusick/ci/commits/v0.2.0 --jq .sha` prints the commit.
4. Copy [`templates/dependabot.yml`](templates/dependabot.yml) to `.github/dependabot.yml`. Its
   `github-actions` entry is what proposes newer releases of these workflows.

## Changing the workflows

- Pin every action to a full commit SHA with its tag as a comment. Dependabot keeps them current here.
- Gitleaks and actionlint are pinned by version and SHA-256 in the workflow files. Upgrade them by hand to a
  release at least two weeks old.
- The shared workflows fetch `scripts/` from their own repo and commit (`job.workflow_repository` and
  `job.workflow_sha`), so a caller's pin covers the scripts too.
- The Self-check workflow runs actionlint over the workflows and templates, the script tests in `tests/`
  (`node --test "tests/*.test.mjs"` locally), and the baseline on this repo.
- Release by adding a CHANGELOG entry and pushing a `vX.Y.Z` tag. The Publish workflow creates the GitHub
  Release. Callers move when they merge the Dependabot PR.
