const { test, describe, it } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index.js');

describe('Synapse Agent Tests', () => {
  it('should handle malformed Vertex AI response (expecting success with empty response)', async () => {
    // Mock dependencies passed to createApp
    const mockDrive = {
      files: {
        get: async () => ({ data: { history: [] } }),
        update: async () => {}
      }
    };

    // Simulate malformed response (missing candidates)
    const mockChat = {
      sendMessage: async () => {
        return {
           response: {} // Missing candidates, should NOT crash anymore
        };
      },
      getHistory: async () => []
    };

    const mockVertexAI = {
      getGenerativeModel: () => ({
        startChat: () => mockChat
      })
    };

    const app = createApp({ drive: mockDrive, vertex_ai: mockVertexAI });

    const handler = app.handlers['/'];
    assert.ok(handler, 'Route handler for / should exist');

    const req = {
        body: { prompt: 'Hello' }
    };

    const res = {
        statusCode: 200,
        data: null,
        status: function(code) {
            this.statusCode = code;
            return this;
        },
        send: function(data) {
            this.data = data;
            return this;
        }
    };

    await handler(req, res);

    // Now expecting 200 OK
    assert.strictEqual(res.statusCode, 200, 'Should return 200 OK even if response is empty');
    // The response body should contain { response: undefined }, which JSON.stringify would make {}
    // But my spy captures the object passed to send.
    // { response: undefined }

    assert.ok(res.data, 'Response data should exist');
    assert.strictEqual(res.data.response, undefined, 'Response text should be undefined');
  });
});
