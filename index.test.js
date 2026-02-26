const { test } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index.js');

test('POST / returns 500 when external service fails', async (t) => {
    // Mock drive to throw an error
    const mockDrive = {
        files: {
            get: async () => {
                throw new Error('Drive service unavailable');
            }
        }
    };

    // Mock Vertex AI
    const mockVertexAI = {};

    const app = createApp({ drive: mockDrive, vertex_ai: mockVertexAI });

    // In our manual express mock, handlers are stored in app.handlers
    // The key is 'METHOD path'
    const handler = app.handlers['POST /'];

    if (!handler) {
        throw new Error('POST / handler not found in mocked app');
    }

    // Mock Request and Response
    const req = {
        body: { prompt: 'test prompt' }
    };

    let responseStatus;
    let responseBody;

    const res = {
        status: (code) => {
            responseStatus = code;
            return res; // Chainable
        },
        send: (body) => {
            responseBody = body;
            return res;
        }
    };

    // Execute the handler
    await handler(req, res);

    assert.strictEqual(responseStatus, 500);
    assert.deepStrictEqual(responseBody, { error: 'An internal error occurred.' });
});
