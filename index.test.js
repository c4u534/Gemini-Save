const { test, describe } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index');

// Minimal mock for express
const mockExpress = () => {
  const app = {
    _routes: {},
    use: () => {},
    post: (path, handler) => { app._routes[path] = handler; },
    listen: (port, cb) => {
      if (cb) setTimeout(cb, 0);
      return {
        address: () => ({ port: 8080 }),
        close: (cb) => { if (cb) setTimeout(cb, 0); },
        on: () => {}
      };
    }
  };
  return app;
};
mockExpress.json = () => {};

// Minimal mock for cors
const mockCors = () => {};

describe('Synapse Agent API', () => {
  const mockDrive = {
    files: {
      get: async () => ({ data: { history: [] } }),
      update: async () => ({})
    }
  };

  const mockVertexAi = {
    getGenerativeModel: () => ({
      startChat: () => ({
        sendMessage: async () => ({
          response: {
            candidates: [{ content: { parts: [{ text: 'Mock Response' }] } }]
          }
        }),
        getHistory: async () => []
      })
    })
  };

  test('POST / - Success', async () => {
    const app = createApp({
      express: mockExpress,
      cors: mockCors,
      drive: mockDrive,
      vertex_ai: mockVertexAi
    });

    const handler = app._routes['/'];
    const req = { body: { prompt: 'Hello' } };
    const res = {
      status: (code) => { res.statusCode = code; return res; },
      send: (data) => { res.body = data; return res; },
      statusCode: 200
    };

    await handler(req, res);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.response, 'Mock Response');
  });

  test('POST / - Missing Prompt', async () => {
    const app = createApp({
      express: mockExpress,
      cors: mockCors,
      drive: mockDrive,
      vertex_ai: mockVertexAi
    });

    const handler = app._routes['/'];
    const req = { body: {} };
    const res = {
      status: (code) => { res.statusCode = code; return res; },
      send: (data) => { res.body = data; return res; },
      statusCode: 200
    };

    await handler(req, res);

    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.body.error, 'Prompt is required in the request body.');
  });

  test('POST / - Internal Error', async () => {
    const errorDrive = {
      files: {
        get: async () => { throw new Error('Drive Error'); }
      }
    };

    const app = createApp({
      express: mockExpress,
      cors: mockCors,
      drive: errorDrive,
      vertex_ai: mockVertexAi
    });

    const handler = app._routes['/'];
    const req = { body: { prompt: 'Hello' } };
    const res = {
      status: (code) => { res.statusCode = code; return res; },
      send: (data) => { res.body = data; return res; },
      statusCode: 200
    };

    await handler(req, res);

    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(res.body.error, 'An internal error occurred.');
  });
});
