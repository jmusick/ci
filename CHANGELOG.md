# Changelog

## [0.2.2] - 2026-10-26

### Added

- AGENTS.md with the conventions for changing this repo, and a CLAUDE.md that points to it.

### Changed

- The accessibility job installs Chromium without `--with-deps`. The runner image already has the
  libraries it needs, and the extra fonts apt pulled in took up to 10 minutes on a slow Ubuntu mirror.
  System packages are still installed when a browser binary is missing a library.
- The accessibility job skips push events. The pull request already audited what the push merges, so
  the post-merge run on the default branch no longer repeats the slowest job. Pull requests, manual
  runs and schedules still run it.

## [0.2.1] - 2026-10-26

### Added

- `ignore-gitleaks-allow` input on the baseline, for repos where secret-scan exceptions may only live in
  `.gitleaks.toml`. Found in the Firelands Current pilot.

### Fixed

- The accessibility job now installs Playwright's headless shell along with Chromium. Scripts that launch
  the default headless browser, like Firelands Current's, failed because `--no-shell` skipped it.

## [0.2.0] - 2026-10-26

### Added

- Lockfile integrity check in the baseline, adapted from orboro-net: lockfile format 3, registry-only
  HTTPS sources, sha512 hashes, and reviewed install scripts through package.json `allowScripts`.
- npm version floor in the baseline and both web-app jobs. Defaults to 11.19.0 when `.npmrc` sets
  `min-release-age` or `strict-allow-scripts`; the `npm-min-version` input sets one explicitly.
- `after-build-command` input on web-app, for checks on the built output.
- `release.yml`: publishes a GitHub Release for a pushed version tag with generated notes, attaching files
  from an artifact. This repo now publishes its own releases with it.
- A CI gate job in the web-app template and a new release template.
- Script tests and a sample project in the Self-check workflow.

## [0.1.0] - 2026-10-26

### Added

- `baseline.yml`: Gitleaks scan of full history, npm lockfile install, `npm audit` and registry signature
  check, and dependency review on public-repo pull requests.
- `web-app.yml`: setup, lint, type check, test and build steps that run only when their command is set,
  plus an optional accessibility audit against a local server.
- Templates for a repo's `ci.yml` and `dependabot.yml`.
- Self-check workflow: actionlint over the workflows and templates, and the baseline run on this repo.
