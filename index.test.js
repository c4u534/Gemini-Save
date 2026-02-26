const { test, describe } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index.js');

describe('Synapse Agent Integration Tests', () => {
    // Mock data
    const mockContextFileId = '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo';
    const mockInitialHistory = [{ role: 'user', parts: [{ text: 'hello' }] }];
    const mockNewHistory = [
        ...mockInitialHistory,
        { role: 'model', parts: [{ text: 'response' }] }
    ];
    const mockResponseText = 'This is a mock response from Gemini';

    // Track calls
    let driveUpdateCalled = false;
    let driveUpdateParams = null;

    // Mocks for dependencies
    const mockDrive = {
        files: {
            get: async ({ fileId, alt }) => {
                if (fileId === mockContextFileId && alt === 'media') {
                    return { data: { history: mockInitialHistory } };
                }
                throw new Error('Unexpected drive.files.get call');
            },
            update: async (params) => {
                driveUpdateCalled = true;
                driveUpdateParams = params;
                return { data: { id: mockContextFileId } };
            }
        }
    };

    const mockChat = {
        sendMessage: async (prompt) => {
            return {
                response: {
                    candidates: [{
                        content: {
                            parts: [{ text: mockResponseText }]
                        }
                    }]
                }
            };
        },
        getHistory: async () => {
            return mockNewHistory;
        }
    };

    const mockVertexAI = {
        getGenerativeModel: ({ model }) => {
            return {
                startChat: ({ history }) => {
                    return mockChat;
                }
            };
        }
    };

    // Manual mock for express
    const mockExpress = () => {
        const handlers = {};
        const app = {
            use: () => {},
            post: (path, handler) => {
                handlers[path] = handler;
            },
            // Helper to get handler for testing
            _getHandler: (path) => handlers[path],
            listen: () => {}
        };
        return app;
    };
    mockExpress.json = () => {};

    const mockCors = () => {};

    test('POST / should process prompt and update context in Drive', async () => {
        // Reset tracking variables
        driveUpdateCalled = false;
        driveUpdateParams = null;

        const app = createApp({
            express: mockExpress,
            drive: mockDrive,
            vertex_ai: mockVertexAI,
            cors: mockCors,
            contextFileId: mockContextFileId
        });

        const handler = app._getHandler('/');
        assert.ok(handler, 'Handler for / should be registered');

        // Mock request and response objects
        const req = {
            body: { prompt: 'Test Prompt' }
        };

        let responseSent = false;
        let responseStatus = 200;
        let responseBody = null;

        const res = {
            status: (code) => {
                responseStatus = code;
                return res;
            },
            send: (body) => {
                responseSent = true;
                responseBody = body;
                return res;
            }
        };

        // Call the handler
        await handler(req, res);

        // 1. Assert response
        assert.strictEqual(responseSent, true, 'Response should be sent');
        assert.strictEqual(responseStatus, 200, 'Response status should be 200');
        assert.strictEqual(responseBody.response, mockResponseText, 'Response text should match mock');

        // 2. Assert Drive Update
        // Note: drive.files.update is fire-and-forget, but our mock is synchronous enough to set the flag immediately.
        // In a real async scenario, we might need to wait, but here the mock executes synchronously before returning the promise.
        assert.strictEqual(driveUpdateCalled, true, 'drive.files.update should be called');
        assert.strictEqual(driveUpdateParams.fileId, mockContextFileId, 'drive.files.update should be called with correct fileId');

        // Check the body of the update
        const updatedBody = JSON.parse(driveUpdateParams.media.body);
        assert.deepStrictEqual(updatedBody.history, mockNewHistory, 'Updated history should match mockNewHistory');
        assert.strictEqual(driveUpdateParams.media.mimeType, 'application/json', 'MimeType should be application/json');
    });

    test('POST / should return 400 if prompt is missing', async () => {
        const app = createApp({
            express: mockExpress,
            drive: mockDrive,
            vertex_ai: mockVertexAI,
            cors: mockCors,
            contextFileId: mockContextFileId
        });

        const handler = app._getHandler('/');
        const req = { body: {} };
        let responseStatus = 200;
        let responseBody = null;

        const res = {
            status: (code) => {
                responseStatus = code;
                return res;
            },
            send: (body) => {
                responseBody = body;
                return res;
            }
        };

        await handler(req, res);

        assert.strictEqual(responseStatus, 400);
        assert.strictEqual(responseBody.error, 'Prompt is required in the request body.');
    });
});
