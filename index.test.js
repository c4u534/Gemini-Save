const assert = require('node:assert');
const test = require('node:test');

const express = () => {
    const app = {
        use: () => {},
        post: () => {},
        listen: (port, cb) => cb()
    };
    app.json = () => {};
    return app;
};

const cors = () => {};

require.cache[require.resolve('express')] = { exports: express };
require.cache[require.resolve('cors')] = { exports: cors };
require.cache[require.resolve('googleapis')] = { exports: { google: { auth: { GoogleAuth: class {} }, drive: () => ({ files: { get: () => ({ data: {} }), update: () => ({ catch: () => {} }) } }) } } };
require.cache[require.resolve('@google-cloud/vertexai')] = { exports: { VertexAI: class { getGenerativeModel() { return { startChat: () => ({ sendMessage: () => ({ response: { candidates: [{ content: { parts: [{ text: 'mock' }] } }] } }), getHistory: () => [] }) }; } } } };

const { createApp, startServer } = require('./index.js');

test('startServer throws error on missing env vars', async () => {
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.GOOGLE_CLOUD_LOCATION;
    delete process.env.CONTEXT_FILE_ID;
    try {
        await startServer();
        assert.fail('Expected startServer to throw');
    } catch (err) {
        assert.strictEqual(err.message, 'Missing required environment variable');
    }
});

test('createApp throws error on missing CONTEXT_FILE_ID', () => {
    delete process.env.CONTEXT_FILE_ID;
    try {
        createApp({ drive: {}, vertex_ai: {} });
        assert.fail('Expected createApp to throw');
    } catch (err) {
        assert.strictEqual(err.message, 'Missing required environment variable');
    }
});
