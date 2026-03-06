const { test } = require('node:test');
const assert = require('node:assert');
const Module = require('module');
const originalRequire = Module.prototype.require;

// --- Mocks ---
const mockExpressApp = {
    use: () => {},
    post: (path, handler) => {
        if (path === '/') mockExpressApp.handler = handler;
    },
    listen: () => {}
};
const mockExpress = () => mockExpressApp;
mockExpress.json = () => {};

Module.prototype.require = function(path) {
  if (path === 'express') return mockExpress;
  if (path === 'googleapis') return { google: { auth: { GoogleAuth: class {} }, drive: () => ({}) } };
  if (path === '@google-cloud/vertexai') return { VertexAI: class {} };
  if (path === 'cors') return () => {};
  return originalRequire.apply(this, arguments);
};

const { createApp } = require('./index.js');

test('Synapse Agent Multi-Session Cache Behavior', async (t) => {
    let driveGetCalls = 0;
    let driveUpdateCalls = 0;

    const mockDrive = {
        files: {
            get: async () => {
                driveGetCalls++;
                return { data: { history: [] } };
            },
            update: async () => {
                await new Promise(r => setTimeout(r, 10));
                driveUpdateCalls++;
                return {};
            }
        }
    };

    const mockVertexAI = {
        getGenerativeModel: () => ({
            startChat: () => ({
                sendMessage: async () => {
                    return { response: { candidates: [{ content: { parts: [{ text: 'AI Response' }] } }] } };
                },
                getHistory: async () => ['history']
            })
        })
    };

    const app = createApp(mockDrive, mockVertexAI);
    const handler = mockExpressApp.handler;

    // --- Global Session ---
    await t.test('Global session uses Drive and Cache', async () => {
        const req = { body: { prompt: 'Global 1' } }; // No sessionId
        let sent = false;
        const res = { status: () => ({ send: () => sent = true }), send: () => sent = true };

        await handler(req, res);
        assert.strictEqual(sent, true);
        assert.strictEqual(driveGetCalls, 1, 'Should fetch global from drive');

        const req2 = { body: { prompt: 'Global 2' } };
        await handler(req2, res);
        assert.strictEqual(driveGetCalls, 1, 'Should NOT fetch global again (cached)');

        await new Promise(r => setTimeout(r, 50));
        assert.strictEqual(driveUpdateCalls, 2, 'Should update drive both times for global');
    });

    // --- Custom Session 1 ---
    await t.test('Session 1 initializes separately', async () => {
        const req = { body: { prompt: 'S1 Prompt', sessionId: 'user-1' } };
        let sent = false;
        const res = { status: () => ({ send: () => sent = true }), send: () => sent = true };

        await handler(req, res);
        assert.strictEqual(sent, true);
        assert.strictEqual(driveGetCalls, 1, 'Should NOT fetch custom session from drive');

        await new Promise(r => setTimeout(r, 50));
        assert.strictEqual(driveUpdateCalls, 2, 'Should NOT update drive for custom session');
    });

    // --- Custom Session 2 ---
    await t.test('Session 2 does not bleed into Session 1', async () => {
        const req = { body: { prompt: 'S2 Prompt', sessionId: 'user-2' } };
        let sent = false;
        const res = { status: () => ({ send: () => sent = true }), send: () => sent = true };

        await handler(req, res);
        assert.strictEqual(sent, true);
        assert.strictEqual(driveGetCalls, 1, 'Should NOT fetch custom session from drive');

        await new Promise(r => setTimeout(r, 50));
        assert.strictEqual(driveUpdateCalls, 2, 'Should NOT update drive for custom session');
    });
});

test('LRU Cache Behavior', async (t) => {
    const { LRUCache } = require('./index.js');
    const cache = new LRUCache(2);

    cache.set('a', 1);
    cache.set('b', 2);
    assert.strictEqual(cache.get('a'), 1); // Access 'a' so 'b' becomes least recently used

    cache.set('c', 3); // This should evict 'b'

    assert.strictEqual(cache.has('a'), true);
    assert.strictEqual(cache.has('b'), false, 'Key b should be evicted');
    assert.strictEqual(cache.has('c'), true);
});
