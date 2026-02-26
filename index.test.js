const assert = require('node:assert');
const test = require('node:test');
const Module = require('module');

// Mock dependencies
const originalRequire = Module.prototype.require;
Module.prototype.require = function(path) {
  if (path === 'express') {
    const app = {
      use: () => {},
      post: () => {},
      get: function(path, handler) {
        if (path === '/') {
          this.rootHandler = handler;
        }
      },
      listen: () => {},
    };
    const expressMock = () => app;
    expressMock.json = () => {};
    return expressMock;
  }
  if (path === 'googleapis') {
    return {
        google: {
            auth: { GoogleAuth: class {} },
            drive: () => ({ files: { get: async () => ({ data: {} }), update: async () => {} } })
        }
    };
  }
  if (path === '@google-cloud/vertexai') {
    return { VertexAI: class { getGenerativeModel() { return { startChat: () => ({ sendMessage: async () => ({ response: { candidates: [{ content: { parts: [{ text: 'mock' }] } }] } }), getHistory: async () => [] }) } } } };
  }
  if (path === 'cors') {
    return () => {};
  }
  return originalRequire.apply(this, arguments);
};

// Set environment variables
process.env.CLIENT_ID = 'MOCK_CLIENT_ID';
process.env.API_KEY = 'MOCK_API_KEY';

test('App serves index.html with injected credentials', async (t) => {
    // Require index.js after mocking
    const { createApp } = require('./index.js');
    const app = await createApp();

    assert.ok(app.rootHandler, 'GET / handler should be registered');

    await new Promise((resolve, reject) => {
        const req = {};
        const res = {
            status: (code) => ({
                send: (msg) => reject(new Error(`Status ${code}: ${msg}`))
            }),
            send: (body) => {
                try {
                    assert.ok(body.includes("const CLIENT_ID = 'MOCK_CLIENT_ID'"), 'CLIENT_ID mismatch');
                    assert.ok(body.includes("const API_KEY = 'MOCK_API_KEY'"), 'API_KEY mismatch');
                    console.log('Test passed: HTML served with injected credentials.');
                    resolve();
                } catch (e) {
                    reject(e);
                }
            }
        };
        app.rootHandler(req, res);
    });
});
