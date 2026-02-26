const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index.js');

describe('Synapse Agent Security Fix', () => {
    let mockExpress;
    let mockCors;
    let mockDrive;
    let mockVertexAI;
    let mockApp;
    let routeHandler;

    beforeEach(() => {
        // Mock Express
        mockApp = {
            use: () => {},
            post: (path, handler) => {
                if (path === '/') routeHandler = handler;
            },
            listen: () => {}
        };
        mockExpress = () => mockApp;
        mockExpress.json = () => 'json-middleware';

        // Mock Cors
        mockCors = () => 'cors-middleware';

        // Mock Drive
        mockDrive = {
            files: {
                get: async ({ fileId }) => {
                    return { data: { history: [] } };
                },
                update: async ({ fileId, media }) => {
                    return {};
                }
            }
        };

        // Mock Vertex AI
        mockVertexAI = {
            getGenerativeModel: () => ({
                startChat: () => ({
                    sendMessage: async () => ({
                        response: {
                            candidates: [{ content: { parts: [{ text: 'Gemini Response' }] } }]
                        }
                    }),
                    getHistory: async () => []
                })
            })
        };
    });

    test('should use CONTEXT_FILE_ID from environment/arguments', async (t) => {
        const testFileId = 'TEST_SECURE_ID_123';

        // Track calls
        let capturedGetFileId;
        let capturedUpdateFileId;

        // Spy on drive methods
        mockDrive.files.get = async ({ fileId, alt }) => {
            capturedGetFileId = fileId;
            return { data: { history: [] } };
        };
        mockDrive.files.update = async ({ fileId, media }) => {
            capturedUpdateFileId = fileId;
            return {};
        };

        createApp({
            express: mockExpress,
            cors: mockCors,
            drive: mockDrive,
            vertex_ai: mockVertexAI,
            contextFileId: testFileId
        });

        assert.ok(routeHandler, 'Route handler for POST / should be registered');

        // Simulate Request
        const req = { body: { prompt: 'Hello' } };
        const res = {
            status: (code) => ({
                send: (body) => {}
            }),
            send: (body) => {}
        };

        await routeHandler(req, res);

        assert.strictEqual(capturedGetFileId, testFileId, 'Drive.files.get should be called with correct fileId');
        assert.strictEqual(capturedUpdateFileId, testFileId, 'Drive.files.update should be called with correct fileId');
    });

    test('should fail if prompt is missing', async (t) => {
        createApp({
            express: mockExpress,
            cors: mockCors,
            drive: mockDrive,
            vertex_ai: mockVertexAI,
            contextFileId: 'id'
        });

        const req = { body: {} };
        let sentStatus, sentBody;
        const res = {
            status: (code) => {
                sentStatus = code;
                return {
                    send: (body) => { sentBody = body; }
                };
            },
            send: (body) => { sentBody = body; }
        };

        await routeHandler(req, res);
        assert.strictEqual(sentStatus, 400);
        assert.match(sentBody.error, /Prompt is required/);
    });
});
