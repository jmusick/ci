#!/usr/bin/env node
// Fails when the npm on PATH is older than the project needs. Older npm ignores .npmrc settings it does
// not know without a warning, so a project that relies on min-release-age or strict-allow-scripts would
// install without those safeguards and still pass.
//
// The floor is the explicit --min value when one is given. Otherwise it is NPMRC_FLOOR when .npmrc sets
// one of NPMRC_SETTINGS, and there is no floor at all when it sets neither.
//
// Usage: node check-npm-version.mjs [--min X.Y.Z] [project dir]

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const NPMRC_FLOOR = '11.19.0';
export const NPMRC_SETTINGS = ['min-release-age', 'strict-allow-scripts'];

export function parseVersion(text) {
  const match = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(text).trim());
  if (!match) throw new Error(`"${text}" is not a version number`);
  return match.slice(1, 4).map(Number);
}

export function isOlder(version, floor) {
  const [a, b] = [parseVersion(version), parseVersion(floor)];
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}

export function requiredFloor(explicit, npmrc = '') {
  if (explicit) return { floor: explicit, reason: 'the npm-min-version input asks for it' };
  const settings = NPMRC_SETTINGS.filter((name) => new RegExp(`^\\s*${name}\\s*=`, 'm').test(npmrc));
  if (settings.length === 0) return { floor: null, reason: '.npmrc sets nothing that needs a newer npm' };
  return { floor: NPMRC_FLOOR, reason: `.npmrc sets ${settings.join(' and ')}, which older npm ignores` };
}

function main() {
  const args = process.argv.slice(2);
  const minAt = args.indexOf('--min');
  const explicit = minAt === -1 ? '' : (args.splice(minAt, 2)[1] ?? '');
  const root = resolve(args[0] ?? '.');
  const npmrcPath = join(root, '.npmrc');
  const npmrc = existsSync(npmrcPath) ? readFileSync(npmrcPath, 'utf8') : '';

  const { floor, reason } = requiredFloor(explicit, npmrc);
  // Through a shell, so Windows finds npm.cmd as well.
  const npm = execSync('npm --version', { cwd: root, encoding: 'utf8' }).trim();
  if (!floor) {
    console.log(`npm ${npm}; no minimum required (${reason}).`);
    return;
  }
  if (isOlder(npm, floor)) {
    console.error(`::error title=npm too old::npm ${npm} is older than ${floor}, required because ${reason}. Use a newer Node version, which ships a newer npm.`);
    process.exit(1);
  }
  console.log(`npm ${npm} meets the ${floor} minimum (${reason}).`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
