const { test, mock } = require('node:test');
const assert = require('node:assert');

mock.module('non-existent-module', {
  defaultExport: { foo: 'bar' },
  namedExports: { foo: 'bar' }
});

test('mocks non-existent module', () => {
  const m = require('non-existent-module');
  assert.strictEqual(m.foo, 'bar');
});
