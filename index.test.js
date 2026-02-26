const { test, describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const Module = require('module');

// --- Manual Mocking Setup ---
const originalRequire = Module.prototype.require;

Module.prototype.require = function(path) {
  if (path === 'express') {
      const mockApp = {
          use: () => {},
          post: () => {},
          listen: () => {},
      };
      const mockExpress = () => mockApp;
      mockExpress.json = () => {};
      return mockExpress;
  }
  if (path === 'cors') {
      return () => {};
  }
  if (path === 'googleapis') {
      return {
          google: {
              auth: { GoogleAuth: class {} },
              drive: () => ({
                  files: {
                      get: async () => ({ data: { history: [] } }),
                      update: async () => {}
                  }
              })
          }
      };
  }
  if (path === '@google-cloud/vertexai') {
      return {
          VertexAI: class {
              getGenerativeModel() {
                  return {
                      startChat: () => ({
                          sendMessage: async () => ({
                              response: { candidates: [{ content: { parts: [{ text: 'mock response' }] } }] }
                          }),
                          getHistory: async () => []
                      })
                  };
              }
          }
      };
  }
  return originalRequire.apply(this, arguments);
};

// Import the code under test
// Note: We need to import index.js AFTER setting up mocks because top-level requires happen immediately.
const { chatHandler } = require('./index.js');

describe('Synapse Agent Tests', () => {

    test('chatHandler returns 400 when prompt is missing', async () => {
        // Arrange
        const req = { body: {} }; // Missing prompt
        let statusCalledWith;
        let sendCalledWith;

        const res = {
            status: (code) => {
                statusCalledWith = code;
                return res; // Chainable
            },
            send: (body) => {
                sendCalledWith = body;
            }
        };

        const deps = {
            drive: {},
            vertex_ai: {},
            CONTEXT_FILE_ID: 'test-id'
        };

        // Act
        const handler = chatHandler(deps);
        await handler(req, res);

        // Assert
        assert.strictEqual(statusCalledWith, 400, 'Should respond with status 400');
        assert.deepStrictEqual(sendCalledWith, { error: 'Prompt is required in the request body.' }, 'Should respond with correct error message');
    });

});
