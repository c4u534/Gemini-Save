const { test, describe, it, mock } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./app');

describe('Synapse Agent App Logic', () => {
    it('should handle POST / request correctly', async () => {
        // --- Mocks ---

        // Mock Drive
        const mockDrive = {
            files: {
                get: mock.fn(async () => ({
                    data: { history: [] } // simulate existing context
                })),
                update: mock.fn(async () => ({}))
            }
        };

        // Mock Vertex AI
        const mockChat = {
            sendMessage: mock.fn(async () => ({
                response: {
                    candidates: [{
                        content: {
                            parts: [{ text: 'Mock Gemini Response' }]
                        }
                    }]
                }
            })),
            getHistory: mock.fn(async () => ([
                { role: 'user', parts: [{ text: 'Hello' }] },
                { role: 'model', parts: [{ text: 'Mock Gemini Response' }] }
            ]))
        };

        const mockVertexAI = {
            getGenerativeModel: mock.fn(() => ({
                startChat: mock.fn(() => mockChat)
            }))
        };

        // Mock Express
        let routeHandler;
        const mockApp = {
            use: mock.fn(),
            post: mock.fn((path, handler) => {
                if (path === '/') {
                    routeHandler = handler;
                }
            }),
            listen: mock.fn()
        };

        const mockExpress = mock.fn(() => mockApp);
        mockExpress.json = mock.fn(() => 'json-middleware');

        // Mock Cors
        const mockCors = mock.fn(() => 'cors-middleware');

        // --- Execution ---

        // Create App
        createApp({
            express: mockExpress,
            cors: mockCors,
            drive: mockDrive,
            vertex_ai: mockVertexAI
        });

        // Verify route registration
        assert.ok(routeHandler, 'Route handler for POST / should be registered');
        assert.strictEqual(mockApp.post.mock.callCount(), 1);

        // Simulate Request
        const req = {
            body: {
                prompt: 'Hello, AI!'
            }
        };

        let responseBody;
        let statusCode;
        const res = {
            status: (code) => {
                statusCode = code;
                return res;
            },
            send: (body) => {
                responseBody = body;
            }
        };

        // Call the handler
        await routeHandler(req, res);

        // --- Assertions ---

        // 1. Check Response
        assert.strictEqual(statusCode, 200);
        assert.deepStrictEqual(responseBody, { response: 'Mock Gemini Response' });

        // 2. Check Drive Interactions
        // get context
        assert.strictEqual(mockDrive.files.get.mock.callCount(), 1);
        const getCall = mockDrive.files.get.mock.calls[0];
        assert.strictEqual(getCall.arguments[0].fileId, '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo');

        // update context
        assert.strictEqual(mockDrive.files.update.mock.callCount(), 1);
        const updateCall = mockDrive.files.update.mock.calls[0];
        assert.strictEqual(updateCall.arguments[0].fileId, '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo');

        const updatedBody = JSON.parse(updateCall.arguments[0].media.body);
        assert.ok(updatedBody.history);
        assert.strictEqual(updatedBody.history.length, 2);

        // 3. Check Vertex AI Interactions
        assert.strictEqual(mockVertexAI.getGenerativeModel.mock.callCount(), 1);
        assert.strictEqual(mockChat.sendMessage.mock.callCount(), 1);
        assert.strictEqual(mockChat.sendMessage.mock.calls[0].arguments[0], 'Hello, AI!');

    });

    it('should return 400 if prompt is missing', async () => {
         // --- Mocks (Minimal) ---
         let routeHandler;
         const mockApp = {
            use: () => {},
            post: (path, handler) => { if(path==='/') routeHandler = handler; }
         };
         const mockExpress = () => mockApp;
         mockExpress.json = () => {};

         createApp({ express: mockExpress, cors: () => {}, drive: {}, vertex_ai: {} });

         const req = { body: {} };
         let statusCode, responseBody;
         const res = {
             status: (c) => { statusCode = c; return res; },
             send: (b) => { responseBody = b; }
         };

         await routeHandler(req, res);

         assert.strictEqual(statusCode, 400);
         assert.deepStrictEqual(responseBody, { error: 'Prompt is required in the request body.' });
    });
});
