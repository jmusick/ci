# Changelog

## [0.1.0] - 2026-10-26

### Added

- `baseline.yml`: Gitleaks scan of full history, npm lockfile install, `npm audit` and registry signature
  check, and dependency review on public-repo pull requests.
- `web-app.yml`: setup, lint, type check, test and build steps that run only when their command is set,
  plus an optional accessibility audit against a local server.
- Templates for a repo's `ci.yml` and `dependabot.yml`.
- Self-check workflow: actionlint over the workflows and templates, and the baseline run on this repo.
