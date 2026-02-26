import { test, mock } from 'node:test';
import assert from 'node:assert';

mock.module('non-existent-module', {
  defaultExport: { foo: 'bar' },
  namedExports: { foo: 'bar' }
});

test('mocks non-existent module', async (t) => {
  const m = await import('non-existent-module');
  assert.strictEqual(m.default.foo, 'bar');
});
