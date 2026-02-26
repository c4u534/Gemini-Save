const { test, describe } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index.js');

describe('Synapse Agent', () => {
    test('should initialize chat with empty history if context history is missing', async () => {
        // Mocks
        const mockDrive = {
            files: {
                get: async () => ({
                    data: {} // No history
                }),
                update: async () => {} // Mock update
            }
        };

        let startChatHistoryArg = null;
        const mockVertexAI = {
            getGenerativeModel: () => ({
                startChat: ({ history }) => {
                    startChatHistoryArg = history;
                    return {
                        sendMessage: async () => ({
                            response: {
                                candidates: [{
                                    content: {
                                        parts: [{ text: 'mock response' }]
                                    }
                                }]
                            }
                        }),
                        getHistory: async () => []
                    };
                }
            })
        };

        // Mock express to capture handler
        let capturedHandler = null;
        const mockApp = {
            use: () => {},
            post: (path, handler) => {
                if (path === '/') {
                    capturedHandler = handler;
                }
            },
            listen: () => {}
        };
        const mockExpress = () => mockApp;
        mockExpress.json = () => () => {};

        const mockCors = () => () => {};

        // Create app
        await createApp({ drive: mockDrive, vertex_ai: mockVertexAI }, mockExpress, mockCors);

        // Verify handler captured
        assert.ok(capturedHandler, 'Route handler should be captured');

        // Invoke handler
        const mockReq = {
            body: { prompt: 'hello' }
        };

        let responseSent = false;
        const mockRes = {
            status: (code) => ({
                send: (body) => {
                    assert.strictEqual(code, 200);
                    assert.strictEqual(body.response, 'mock response');
                    responseSent = true;
                }
            })
        };

        await capturedHandler(mockReq, mockRes);

        assert.ok(responseSent, 'Response should have been sent');

        // Verify startChat history argument
        assert.deepStrictEqual(startChatHistoryArg, [], 'startChat should be called with empty history array');
    });
});
