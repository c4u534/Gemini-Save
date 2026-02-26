const assert = require('node:assert');
const { test, describe, before, after, mock } = require('node:test');
const Module = require('module');

// -----------------------------------------------------------------------------
// dependency mocking to allow loading index.js without node_modules
// -----------------------------------------------------------------------------
const originalRequire = Module.prototype.require;

const mockExpress = () => ({
    use: () => {},
    post: () => {},
    listen: () => {}
});
mockExpress.json = () => {};

const mockGoogleapis = {
    google: {
        auth: { GoogleAuth: class {} },
        drive: () => ({})
    }
};

const mockVertexAI = {
    VertexAI: class {}
};

const mockCors = () => {};

Module.prototype.require = function(path) {
    if (path === 'express') return mockExpress;
    if (path === 'googleapis') return mockGoogleapis;
    if (path === '@google-cloud/vertexai') return mockVertexAI;
    if (path === 'cors') return mockCors;
    return originalRequire.apply(this, arguments);
};

// Load the module under test
const { createPromptHandler } = require('./index');

// Restore require
Module.prototype.require = originalRequire;

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('POST / Route Handler', () => {
    const contextFileId = 'test-file-id';

    // Mock helpers
    const createMockReq = (body) => ({ body });
    const createMockRes = () => {
        const res = {
            statusCode: 200,
            headers: {},
            body: null,
            status(code) {
                this.statusCode = code;
                return this;
            },
            send(data) {
                this.body = data;
                return this;
            }
        };
        return res;
    };

    test('should return 400 if prompt is missing', async () => {
        const handler = createPromptHandler({}, {}, contextFileId);
        const req = createMockReq({});
        const res = createMockRes();

        await handler(req, res);

        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res.body, { error: 'Prompt is required in the request body.' });
    });

    test('should return 200 and AI response on success', async () => {
        // Mock Drive
        const mockDrive = {
            files: {
                get: mock.fn(async () => ({ data: { history: [] } })),
                update: mock.fn(async () => ({ data: {} }))
            }
        };

        // Mock Vertex AI
        const mockChat = {
            sendMessage: mock.fn(async () => ({
                response: {
                    candidates: [{
                        content: {
                            parts: [{ text: 'Hello world' }]
                        }
                    }]
                }
            })),
            getHistory: mock.fn(async () => [])
        };

        const mockVertexAI = {
            getGenerativeModel: mock.fn(() => ({
                startChat: mock.fn(() => mockChat)
            }))
        };

        const handler = createPromptHandler(mockDrive, mockVertexAI, contextFileId);
        const req = createMockReq({ prompt: 'Hi' });
        const res = createMockRes();

        await handler(req, res);

        // Verify response
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { response: 'Hello world' });

        // Verify interactions
        assert.strictEqual(mockDrive.files.get.mock.calls.length, 1);
        assert.strictEqual(mockVertexAI.getGenerativeModel.mock.calls.length, 1);
        assert.strictEqual(mockChat.sendMessage.mock.calls.length, 1);
        assert.strictEqual(mockDrive.files.update.mock.calls.length, 1);
    });

    test('should return 500 if Drive fails', async () => {
        const mockDrive = {
            files: {
                get: mock.fn(async () => { throw new Error('Drive error'); })
            }
        };
        const mockVertexAI = {};
        const handler = createPromptHandler(mockDrive, mockVertexAI, contextFileId);
        const req = createMockReq({ prompt: 'Hi' });
        const res = createMockRes();

        // Silence console.error
        const originalError = console.error;
        console.error = () => {};

        await handler(req, res);

        console.error = originalError;

        assert.strictEqual(res.statusCode, 500);
        assert.deepStrictEqual(res.body, { error: 'An internal error occurred.' });
    });

    test('should return 500 if Vertex AI fails', async () => {
        const mockDrive = {
            files: {
                get: mock.fn(async () => ({ data: { history: [] } }))
            }
        };
        const mockVertexAI = {
            getGenerativeModel: mock.fn(() => { throw new Error('AI error'); })
        };

        const handler = createPromptHandler(mockDrive, mockVertexAI, contextFileId);
        const req = createMockReq({ prompt: 'Hi' });
        const res = createMockRes();

        // Silence console.error
        const originalError = console.error;
        console.error = () => {};

        await handler(req, res);

        console.error = originalError;

        assert.strictEqual(res.statusCode, 500);
        assert.deepStrictEqual(res.body, { error: 'An internal error occurred.' });
    });
});
