import assert from 'node:assert/strict';
import test from 'node:test';
import { isOlder, NPMRC_FLOOR, parseVersion, requiredFloor } from '../scripts/check-npm-version.mjs';

test('versions parse with or without a leading v and prerelease suffix', () => {
  assert.deepEqual(parseVersion('11.19.0'), [11, 19, 0]);
  assert.deepEqual(parseVersion('v10.9.2\n'), [10, 9, 2]);
  assert.deepEqual(parseVersion('11.20.0-pre.1'), [11, 20, 0]);
  assert.throws(() => parseVersion('eleven'));
});

test('isOlder compares major, minor and patch numerically', () => {
  assert.equal(isOlder('10.9.2', '11.19.0'), true);
  assert.equal(isOlder('11.9.0', '11.19.0'), true);
  assert.equal(isOlder('11.19.0', '11.19.0'), false);
  assert.equal(isOlder('11.19.1', '11.19.0'), false);
  assert.equal(isOlder('12.0.0', '11.19.0'), false);
});

test('an explicit minimum wins over .npmrc', () => {
  assert.equal(requiredFloor('11.25.0', 'min-release-age=7').floor, '11.25.0');
});

test('.npmrc safeguards that older npm ignores set the floor', () => {
  assert.equal(requiredFloor('', 'min-release-age=7\n').floor, NPMRC_FLOOR);
  assert.equal(requiredFloor('', '# note\nstrict-allow-scripts=true\n').floor, NPMRC_FLOOR);
  assert.match(requiredFloor('', 'min-release-age=7\nstrict-allow-scripts=true').reason, /min-release-age and strict-allow-scripts/);
});

test('no floor without an explicit minimum or a relevant .npmrc setting', () => {
  assert.equal(requiredFloor('', 'engine-strict=true\n').floor, null);
  assert.equal(requiredFloor('', '# min-release-age=7\n').floor, null);
  assert.equal(requiredFloor('').floor, null);
});
