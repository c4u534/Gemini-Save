const { test, describe } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index.js');

// Mock dependencies
const mockChat = {
    sendMessage: async (prompt) => ({
        response: {
            candidates: [{
                content: {
                    parts: [{ text: 'Mock response' }]
                }
            }]
        }
    }),
    getHistory: async () => ([])
};

const mockDrive = {
    files: {
        get: async () => ({ data: { history: [] } }),
        update: async () => ({})
    }
};

const mockVertexAI = {
    getGenerativeModel: () => ({
        startChat: () => mockChat
    })
};

describe('Synapse Agent Tests', () => {
    test('createApp should return an express app', () => {
        const app = createApp({ drive: mockDrive, vertex_ai: mockVertexAI });
        assert.ok(app);
        assert.strictEqual(typeof app, 'function');
    });

    test('createApp should use default dependencies if not provided', () => {
        // This test will fail if it tries to actually instantiate real Google/Vertex clients without creds
        // But since we mocked the modules in node_modules, it should work fine!
        const app = createApp();
        assert.ok(app);
    });
});
