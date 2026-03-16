const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { createApp } = require('./index.js');

describe('SynapseAgent Backend App Tests', () => {
    let app;

    before(() => {
        // Mock drive and vertex_ai implementations
        const driveMock = {
            files: {
                get: async ({ fileId, alt }) => ({ data: { history: [] } }),
                update: async () => Promise.resolve()
            }
        };

        const vertexAiMock = {
            getGenerativeModel: () => ({
                startChat: () => ({
                    sendMessage: async (prompt) => ({
                        response: { candidates: [{ content: { parts: [{ text: `Mock response to: ${prompt}` }] } }] }
                    }),
                    getHistory: async () => [{ role: 'user', parts: [{ text: 'Mock user prompt' }] }]
                })
            })
        };

        app = createApp({ drive: driveMock, vertex_ai: vertexAiMock });
    });

    test('POST / - Returns 200 and mocked response for valid prompt', async () => {
        const response = await request(app)
            .post('/')
            .send({ prompt: 'Test message' })
            .expect('Content-Type', /json/)
            .expect(200);

        assert.strictEqual(response.body.response, 'Mock response to: Test message');
    });

    test('POST / - Returns 400 when prompt is missing', async () => {
        const response = await request(app)
            .post('/')
            .send({}) // Missing prompt
            .expect('Content-Type', /json/)
            .expect(400);

        assert.strictEqual(response.body.error, 'Prompt is required in the request body.');
    });

    test('POST / - General Error Fallback - Returns 500 when external service throws an error', async () => {
        // Override drive mock to force an error
        const throwingDriveMock = {
            files: {
                get: async () => { throw new Error('Simulated Drive API error for testing fallback'); }
            }
        };

        // Needs the vertexAiMock just to satisfy the dependencies check in createApp
        const appWithFailingService = createApp({ drive: throwingDriveMock, vertex_ai: {} });

        const response = await request(appWithFailingService)
            .post('/')
            .send({ prompt: 'Message triggering error' })
            .expect('Content-Type', /json/)
            .expect(500);

        assert.strictEqual(response.body.error, 'An internal error occurred.');
    });
});
