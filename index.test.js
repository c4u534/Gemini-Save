const { test, describe } = require('node:test');
const assert = require('node:assert');
const Module = require('module');

// Mock missing modules
const originalRequire = Module.prototype.require;
Module.prototype.require = function(path) {
    if (['express', 'googleapis', '@google-cloud/vertexai', 'cors'].includes(path)) {
        return {};
    }
    return originalRequire.apply(this, arguments);
};

const { createApp } = require('./index.js');

describe('Synapse Agent Tests', () => {
    const mockContextFileId = 'mock-file-id';
    const mockEnvConfig = { CLIENT_ID: 'test-client-id', API_KEY: 'test-api-key' };
    const mockResponseText = 'Mock Gemini Response';
    const mockInitialHistory = [{ role: 'user', parts: [{ text: 'hello' }] }];
    const mockNewHistory = [...mockInitialHistory, { role: 'model', parts: [{ text: 'response' }] }];

    const mockDrive = {
        files: {
            get: async ({ fileId, alt }) => {
                if (fileId === mockContextFileId && alt === 'media') {
                    return { data: { history: mockInitialHistory } };
                }
                throw new Error('Drive Get Error');
            },
            update: async () => ({})
        }
    };

    const mockVertexAI = {
        getGenerativeModel: () => ({
            startChat: () => ({
                sendMessage: async () => ({
                    response: { candidates: [{ content: { parts: [{ text: mockResponseText }] } }] }
                }),
                getHistory: async () => mockNewHistory
            })
        })
    };

    const mockExpress = () => {
        const handlers = {};
        const app = {
            use: () => {},
            get: (path, handler) => { handlers[path] = { method: 'GET', handler }; },
            post: (path, handler) => { handlers[path] = { method: 'POST', handler }; },
            _getHandler: (path) => handlers[path]?.handler,
            listen: () => {}
        };
        return app;
    };
    mockExpress.json = () => {};
    mockExpress.static = () => {};

    const mockCors = () => {};

    test('GET /env-config.js should return environment configuration', async () => {
        const app = createApp({
            express: mockExpress,
            drive: mockDrive,
            vertex_ai: mockVertexAI,
            cors: mockCors,
            contextFileId: mockContextFileId,
            envConfig: mockEnvConfig
        });

        const handler = app._getHandler('/env-config.js');
        assert.ok(handler, 'GET /env-config.js handler should be registered');

        let responseType = '';
        let responseSent = '';
        const res = {
            type: (type) => { responseType = type; return res; },
            send: (content) => { responseSent = content; return res; }
        };

        handler({}, res);

        assert.strictEqual(responseType, 'application/javascript');
        assert.ok(responseSent.includes(JSON.stringify(mockEnvConfig)));
        assert.ok(responseSent.startsWith('window.config = '));
    });

    test('POST / should process prompt and return response', async () => {
        const app = createApp({
            express: mockExpress,
            drive: mockDrive,
            vertex_ai: mockVertexAI,
            cors: mockCors,
            contextFileId: mockContextFileId,
            envConfig: mockEnvConfig
        });

        const handler = app._getHandler('/');
        const req = { body: { prompt: 'Hello' } };
        let responseStatus = 0;
        let responseBody = null;
        const res = {
            status: (code) => { responseStatus = code; return res; },
            send: (body) => { responseBody = body; return res; }
        };

        await handler(req, res);

        assert.strictEqual(responseStatus, 200);
        assert.strictEqual(responseBody.response, mockResponseText);
    });

    test('POST / should return 400 if prompt is missing', async () => {
        const app = createApp({
            express: mockExpress,
            drive: mockDrive,
            vertex_ai: mockVertexAI,
            cors: mockCors,
            contextFileId: mockContextFileId,
            envConfig: mockEnvConfig
        });

        const handler = app._getHandler('/');
        const req = { body: {} };
        let responseStatus = 0;
        let responseBody = null;
        const res = {
            status: (code) => { responseStatus = code; return res; },
            send: (body) => { responseBody = body; return res; }
        };

        await handler(req, res);

        assert.strictEqual(responseStatus, 400);
        assert.strictEqual(responseBody.error, 'Prompt is required in the request body.');
    });
});
