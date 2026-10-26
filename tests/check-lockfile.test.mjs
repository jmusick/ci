import assert from 'node:assert/strict';
import test from 'node:test';
import { findProblems, REGISTRY, requiresAllowScripts } from '../scripts/check-lockfile.mjs';

const integrity = `sha512-${'A'.repeat(86)}==`;
const pkg = { name: 'site', version: '1.0.0', allowScripts: { 'native@2.0.0': true } };

function lockWith(packages) {
  return {
    name: 'site',
    version: '1.0.0',
    lockfileVersion: 3,
    packages: {
      '': { name: 'site', version: '1.0.0' },
      'node_modules/plain': {
        version: '1.2.3',
        resolved: `${REGISTRY}plain/-/plain-1.2.3.tgz`,
        integrity,
      },
      ...packages,
    },
  };
}

test('a registry-only, hashed, reviewed lockfile has no problems', () => {
  const lock = lockWith({
    'node_modules/@scope/pkg': { version: '0.1.0', resolved: `${REGISTRY}@scope/pkg/-/pkg-0.1.0.tgz`, integrity },
    'node_modules/native': { version: '2.0.0', resolved: `${REGISTRY}native/-/native-2.0.0.tgz`, integrity, hasInstallScript: true },
    'node_modules/mac-only': { version: '1.0.0', resolved: `${REGISTRY}mac-only/-/mac-only-1.0.0.tgz`, integrity, hasInstallScript: true, optional: true },
  });
  assert.deepEqual(findProblems(pkg, lock), { problems: [], warnings: [] });
});

test('git, file, http and foreign-registry sources are rejected', () => {
  for (const resolved of [
    'git+ssh://git@github.com/evil/plain.git#abc123',
    'file:../plain',
    'http://registry.npmjs.org/plain/-/plain-1.2.3.tgz',
    'https://registry.example.test/plain/-/plain-1.2.3.tgz',
  ]) {
    const lock = lockWith({ 'node_modules/plain': { version: '1.2.3', resolved, integrity } });
    assert.equal(findProblems(pkg, lock).problems.length, 1, resolved);
  }
  const linked = lockWith({ 'node_modules/plain': { resolved: '../plain', link: true } });
  assert.equal(findProblems(pkg, linked).problems.length, 1);
});

test('a tarball URL that does not name the package and version is rejected', () => {
  const swapped = lockWith({ 'node_modules/plain': { version: '1.2.3', resolved: `${REGISTRY}other/-/other-9.9.9.tgz`, integrity } });
  assert.match(findProblems(pkg, swapped).problems[0], /does not match/);
});

test('missing or weak integrity hashes are rejected', () => {
  for (const bad of [undefined, 'sha1-AAAAAAAAAAAAAAAAAAAAAAAAAAA=', 'sha512-short']) {
    const lock = lockWith({ 'node_modules/plain': { version: '1.2.3', resolved: `${REGISTRY}plain/-/plain-1.2.3.tgz`, integrity: bad } });
    assert.match(findProblems(pkg, lock).problems[0], /integrity/);
  }
});

test('an unreviewed install script is a problem when allowScripts is required', () => {
  const lock = lockWith({
    'node_modules/native': { version: '3.0.0', resolved: `${REGISTRY}native/-/native-3.0.0.tgz`, integrity, hasInstallScript: true },
  });
  const { problems, warnings } = findProblems(pkg, lock);
  assert.equal(problems.length, 1);
  assert.match(problems[0], /allowScripts/);
  assert.match(problems[0], /native@3\.0\.0/);
  assert.deepEqual(warnings, []);
});

test('an unreviewed install script is only a warning when allowScripts is not required', () => {
  const lock = lockWith({
    'node_modules/native': { version: '3.0.0', resolved: `${REGISTRY}native/-/native-3.0.0.tgz`, integrity, hasInstallScript: true },
  });
  const { problems, warnings } = findProblems({ name: 'site', version: '1.0.0' }, lock, { requireAllowScripts: false });
  assert.deepEqual(problems, []);
  assert.match(warnings[0], /native@3\.0\.0/);
});

test('allowScripts entries set to false still count as reviewed', () => {
  const lock = lockWith({
    'node_modules/native': { version: '3.0.0', resolved: `${REGISTRY}native/-/native-3.0.0.tgz`, integrity, hasInstallScript: true },
  });
  assert.deepEqual(findProblems({ ...pkg, allowScripts: { native: false } }, lock).problems, []);
});

test('format and identity mismatches are reported', () => {
  const lock = { ...lockWith({}), lockfileVersion: 2, version: '0.0.1' };
  assert.equal(findProblems(pkg, lock).problems.length, 2);
});

test('a package.json without a name or version skips those comparisons', () => {
  const lock = { ...lockWith({}), name: 'checkout-folder', version: undefined };
  assert.deepEqual(findProblems({}, lock).problems, []);
});

test('allowScripts is required by the field or by strict-allow-scripts in .npmrc', () => {
  assert.equal(requiresAllowScripts({ allowScripts: {} }), true);
  assert.equal(requiresAllowScripts({}, '# comment\nstrict-allow-scripts=true\n'), true);
  assert.equal(requiresAllowScripts({}, 'strict-allow-scripts = true'), true);
  assert.equal(requiresAllowScripts({}, 'strict-allow-scripts=false\n'), false);
  assert.equal(requiresAllowScripts({}, '# strict-allow-scripts=true\n'), false);
  assert.equal(requiresAllowScripts({}), false);
});
