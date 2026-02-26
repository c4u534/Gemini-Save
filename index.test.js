const { test } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index.js');

test('Synapse Agent Security Tests', async (t) => {
  // Set API Key for testing
  process.env.API_KEY = 'test-secret-key';

  // --- Mocks ---
  const mockReq = (headers = {}, body = {}) => ({
    headers,
    body
  });

  const mockRes = () => {
    const res = {};
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.send = (body) => {
      res.body = body;
      return res;
    };
    res.json = (body) => {
      res.body = body;
      return res;
    };
    return res;
  };

  const mockApp = {
    _handlers: {},
    use: () => {},
    post: (path, handler) => {
      mockApp._handlers[path] = handler;
    },
    listen: () => {}
  };

  const mockExpress = () => mockApp;
  mockExpress.json = () => {};

  const mockCors = () => {};

  const mockGoogle = {
    auth: {
      GoogleAuth: class { constructor() {} }
    },
    drive: () => ({
      files: {
        get: async () => ({ data: { history: [] } }),
        update: async () => {}
      }
    })
  };

  const mockVertexAI = class {
    constructor() {}
    getGenerativeModel() {
      return {
        startChat: () => ({
          sendMessage: async () => ({
            response: { candidates: [{ content: { parts: [{ text: 'Mock Response' }] } }] }
          }),
          getHistory: async () => []
        })
      };
    }
  };

  // --- Initialize App ---
  const app = await createApp({
    express: mockExpress,
    google: mockGoogle,
    VertexAI: mockVertexAI,
    cors: mockCors
  });

  const handler = mockApp._handlers['/'];
  assert.ok(handler, 'POST / handler should be registered');

  // --- Test Case 1: Missing API Key ---
  await t.test('should return 401 if API key is missing', async () => {
    const req = mockReq({}, { prompt: 'Hello' });
    const res = mockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401, 'Expected 401 Unauthorized for missing key');
    assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
  });

  // --- Test Case 2: Incorrect API Key ---
  await t.test('should return 401 if API key is incorrect', async () => {
    const req = mockReq({ 'x-api-key': 'wrong-key' }, { prompt: 'Hello' });
    const res = mockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 401, 'Expected 401 Unauthorized for wrong key');
    assert.deepStrictEqual(res.body, { error: 'Unauthorized' });
  });

  // --- Test Case 3: Correct API Key ---
  await t.test('should return 200 (or proceed) if API key is correct', async () => {
    const req = mockReq({ 'x-api-key': 'test-secret-key' }, { prompt: 'Hello' });
    const res = mockRes();

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200, 'Expected 200 OK for correct key');
    assert.deepStrictEqual(res.body, { response: 'Mock Response' });
  });

  // --- Test Case 4: API Key not configured (Server Error) ---
  await t.test('should return 500 if server API_KEY is not set', async () => {
      const originalKey = process.env.API_KEY;
      delete process.env.API_KEY;

      const req = mockReq({ 'x-api-key': 'test-secret-key' }, { prompt: 'Hello' });
      const res = mockRes();

      await handler(req, res);

      assert.strictEqual(res.statusCode, 500, 'Expected 500 if env var is missing');
      assert.deepStrictEqual(res.body, { error: 'Internal Server Error' });

      process.env.API_KEY = originalKey;
  });

});
