const { test, describe, it, mock } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index.js');

describe('Synapse Agent Tests', () => {
  const getMockDeps = () => {
      let getCalls = [];
      const mockDrive = {
        files: {
          get: async (args) => {
              getCalls.push(args);
              return { data: { history: [] } };
          },
          update: async () => {}
        }
      };

      const mockChat = {
        sendMessage: async () => ({ response: {} }),
        getHistory: async () => []
      };

      const mockVertexAI = {
        getGenerativeModel: () => ({ startChat: () => mockChat })
      };

      return { mockDrive, mockVertexAI, getCalls };
  };

  it('should handle malformed Vertex AI response', async () => {
    const { mockDrive, mockVertexAI } = getMockDeps();
    const mockConfig = { DEFAULT_CONTEXT_FILE_ID: 'default-id' };
    const app = createApp({ drive: mockDrive, vertex_ai: mockVertexAI, config: mockConfig });

    const handler = app.handlers['/'];
    const req = { body: { prompt: 'Hello' } };
    const res = {
        statusCode: 200, data: null,
        status: function(code) { this.statusCode = code; return this; },
        send: function(data) { this.data = data; return this; }
    };

    await handler(req, res);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.data.response, undefined);
  });

  it('should use default context file ID from config when not provided in request', async () => {
      const { mockDrive, mockVertexAI, getCalls } = getMockDeps();
      const mockConfig = { DEFAULT_CONTEXT_FILE_ID: 'env-provided-id' };
      const app = createApp({ drive: mockDrive, vertex_ai: mockVertexAI, config: mockConfig });

      const handler = app.handlers['/'];
      const req = { body: { prompt: 'Hello' } };
      const res = { statusCode: 200, status: function(c) { this.statusCode = c; return this; }, send: function(d) { return this; } };

      await handler(req, res);

      assert.strictEqual(getCalls.length, 1);
      assert.strictEqual(getCalls[0].fileId, 'env-provided-id');
  });

  it('should prioritize context file ID provided in request body over config', async () => {
      const { mockDrive, mockVertexAI, getCalls } = getMockDeps();
      const mockConfig = { DEFAULT_CONTEXT_FILE_ID: 'env-provided-id' };
      const app = createApp({ drive: mockDrive, vertex_ai: mockVertexAI, config: mockConfig });

      const handler = app.handlers['/'];
      const req = { body: { prompt: 'Hello', contextFileId: 'user-provided-id' } };
      const res = { statusCode: 200, status: function(c) { this.statusCode = c; return this; }, send: function(d) { return this; } };

      await handler(req, res);

      assert.strictEqual(getCalls.length, 1);
      assert.strictEqual(getCalls[0].fileId, 'user-provided-id');
  });

  it('should return 500 if no context file ID is available', async () => {
      const { mockDrive, mockVertexAI } = getMockDeps();
      // No default config provided
      const mockConfig = { DEFAULT_CONTEXT_FILE_ID: '' };
      const app = createApp({ drive: mockDrive, vertex_ai: mockVertexAI, config: mockConfig });

      const handler = app.handlers['/'];
      const req = { body: { prompt: 'Hello' } };
      const res = {
          statusCode: 200, data: null,
          status: function(c) { this.statusCode = c; return this; },
          send: function(d) { this.data = d; return this; }
      };

      await handler(req, res);

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.data.error, 'No context file ID configured or provided.');
  });
});
