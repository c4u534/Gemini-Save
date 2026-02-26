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

test('Synapse Agent Cache Behavior', async (t) => {
    let driveGetCalls = 0;
    let driveUpdateCalls = 0;

    const mockDrive = {
        files: {
            get: async () => {
                driveGetCalls++;
                return { data: { history: [] } };
            },
            update: async () => {
                // Simulate delay
                await new Promise(r => setTimeout(r, 50));
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

    // --- Request 1 ---
    await t.test('First request fetches from Drive', async () => {
        const req = { body: { prompt: 'Prompt 1' } };
        let responseSent = false;
        const res = {
            status: (code) => {
                assert.strictEqual(code, 200);
                return {
                    send: (body) => {
                        assert.strictEqual(body.response, 'AI Response');
                        responseSent = true;
                    }
                };
            },
            send: (body) => {
                 assert.strictEqual(body.response, 'AI Response');
                 responseSent = true;
            }
        };

        await handler(req, res);
        assert.strictEqual(responseSent, true);
        assert.strictEqual(driveGetCalls, 1);

        // Wait for async update
        await new Promise(r => setTimeout(r, 100));
        assert.strictEqual(driveUpdateCalls, 1);
    });

    // --- Request 2 ---
    await t.test('Second request uses cache', async () => {
        const req = { body: { prompt: 'Prompt 2' } };
        let responseSent = false;
        const res = {
            status: (code) => {
                assert.strictEqual(code, 200);
                return {
                    send: (body) => {
                        assert.strictEqual(body.response, 'AI Response');
                        responseSent = true;
                    }
                };
            },
            send: (body) => {
                 assert.strictEqual(body.response, 'AI Response');
                 responseSent = true;
            }
        };

        await handler(req, res);
        assert.strictEqual(responseSent, true);
        assert.strictEqual(driveGetCalls, 1, 'Should NOT fetch from Drive again');

        // Wait for async update
        await new Promise(r => setTimeout(r, 100));
        assert.strictEqual(driveUpdateCalls, 2, 'Should update Drive in background');
    });
});
