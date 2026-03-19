const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index');

test('Synapse Agent API Tests', async (t) => {

    const mockExpress = require('express');
    const mockCors = require('cors');

    await t.test('POST / returns 400 if prompt is missing', async () => {
        const mockDrive = {
            files: {
                get: async () => ({ data: { history: [] } }),
                update: async () => ({})
            }
        };

        const mockVertexAI = {
            getGenerativeModel: () => ({
                startChat: () => ({
                    sendMessage: async () => ({ response: { candidates: [{ content: { parts: [{ text: 'mock response' }] } }] } }),
                    getHistory: async () => []
                })
            })
        };

        const request = require('supertest');
        const testApp = createApp({
            expressLib: mockExpress,
            corsLib: mockCors,
            drive: mockDrive,
            vertex_ai: mockVertexAI
        });

        const response = await request(testApp).post('/').send({});
        assert.strictEqual(response.status, 400);
        assert.deepStrictEqual(response.body, { error: 'Prompt is required in the request body.' });
    });

    await t.test('POST / returns 503 for Google Cloud credential errors', async () => {
        const mockDrive = {
            files: {
                get: async () => ({ data: { history: [] } })
            }
        };

        const mockVertexAI = {
            getGenerativeModel: () => ({
                startChat: () => {
                    throw new Error('Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/getting-started for more information.');
                }
            })
        };

        const request = require('supertest');
        const testApp = createApp({
            expressLib: mockExpress,
            corsLib: mockCors,
            drive: mockDrive,
            vertex_ai: mockVertexAI
        });

        const response = await request(testApp).post('/').send({ prompt: 'Test' });
        assert.strictEqual(response.status, 503);
        assert.deepStrictEqual(response.body, { error: 'Authentication or credential error.' });
    });
});
