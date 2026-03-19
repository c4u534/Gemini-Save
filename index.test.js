const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('./index.js');

test('synapse-agent-final / POST endpoint', async (t) => {
    // Mock the drive and vertex_ai dependencies
    const mockDriveSuccess = {
        files: {
            get: async () => ({ data: { history: [] } }),
            update: async () => {} // Fire and forget success
        }
    };

    const mockVertexAISuccess = {
        getGenerativeModel: () => ({
            startChat: () => ({
                sendMessage: async (prompt) => ({
                    response: {
                        candidates: [{ content: { parts: [{ text: "Mock response" }] } }]
                    }
                }),
                getHistory: async () => ([])
            })
        })
    };

    const mockDriveAuthError = {
        files: {
            get: async () => { throw new Error('Could not load the default credentials'); }
        }
    };

    const mockDriveGenericError = {
        files: {
            get: async () => { throw new Error('Some unexpected error'); }
        }
    };

    await t.test('Returns 400 if prompt is missing', async () => {
        const app = createApp({ drive: mockDriveSuccess, vertex_ai: mockVertexAISuccess });
        const res = await request(app).post('/').send({});
        assert.strictEqual(res.statusCode, 400);
        assert.deepStrictEqual(res.body, { error: 'Prompt is required in the request body.' });
    });

    await t.test('Returns 503 for Google Cloud authentication errors', async () => {
        const app = createApp({ drive: mockDriveAuthError, vertex_ai: mockVertexAISuccess });
        const res = await request(app).post('/').send({ prompt: 'hello' });
        assert.strictEqual(res.statusCode, 503);
        assert.deepStrictEqual(res.body, { error: 'Google Cloud authentication or missing credential errors.' });
    });

    await t.test('Returns 500 for general errors', async () => {
        const app = createApp({ drive: mockDriveGenericError, vertex_ai: mockVertexAISuccess });
        const res = await request(app).post('/').send({ prompt: 'hello' });
        assert.strictEqual(res.statusCode, 500);
        assert.deepStrictEqual(res.body, { error: 'An internal error occurred.' });
    });

    await t.test('Returns 200 on successful request', async () => {
        const app = createApp({ drive: mockDriveSuccess, vertex_ai: mockVertexAISuccess });
        const res = await request(app).post('/').send({ prompt: 'hello' });
        assert.strictEqual(res.statusCode, 200);
        assert.deepStrictEqual(res.body, { response: 'Mock response' });
    });
});
