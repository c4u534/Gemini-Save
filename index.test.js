const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');

// Mock out dependencies manually to deal with potentially missing node_modules
const createMockModule = (name, exportObj) => {
    const mockPath = path.resolve('node_modules', name, 'index.js');
    require.cache[mockPath] = {
        id: mockPath,
        filename: mockPath,
        loaded: true,
        exports: exportObj
    };
    return mockPath;
};

// Mock express
const mockApp = {
    use: () => {},
    get: () => {},
    post: () => {},
    listen: () => {}
};
const mockExpress = () => mockApp;
mockExpress.json = () => ({});
createMockModule('express', mockExpress);

// Mock cors
const mockCors = () => ({});
createMockModule('cors', mockCors);

// Mock googleapis
const mockGoogle = {
    auth: { GoogleAuth: class {} },
    drive: () => ({ files: { get: async () => ({ data: {} }), update: async () => ({}) } })
};
createMockModule('googleapis', { google: mockGoogle });

// Mock vertexai
class MockVertexAI {
    getGenerativeModel() {
        return {
            startChat: () => ({
                sendMessage: async () => ({ response: { candidates: [{ content: { parts: [{ text: "mock response" }] } }] } }),
                getHistory: async () => ([])
            })
        };
    }
}
createMockModule('@google-cloud/vertexai', { VertexAI: MockVertexAI });

// Override require resolution
const Module = require('node:module');
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent, isMain, options) {
    if (['express', 'cors', 'googleapis', '@google-cloud/vertexai'].includes(request)) {
        return path.resolve('node_modules', request, 'index.js');
    }
    return originalResolve.apply(this, arguments);
};

// Now we can require index.js
const { createApp } = require('./index.js');

test('createApp throws if dependencies are missing', (t) => {
    assert.throws(() => {
        createApp({ expressLib: mockExpress, corsLib: mockCors, drive: mockGoogle.drive(), vertex_ai: null, contextFileId: '123' });
    }, /Missing required dependencies: drive, vertex_ai, or contextFileId/);

    assert.throws(() => {
        createApp({ expressLib: mockExpress, corsLib: mockCors, drive: null, vertex_ai: new MockVertexAI(), contextFileId: '123' });
    }, /Missing required dependencies: drive, vertex_ai, or contextFileId/);

    assert.throws(() => {
        createApp({ expressLib: mockExpress, corsLib: mockCors, drive: mockGoogle.drive(), vertex_ai: new MockVertexAI(), contextFileId: null });
    }, /Missing required dependencies: drive, vertex_ai, or contextFileId/);
});

test('createApp successfully creates app when given dependencies', (t) => {
    const app = createApp({
        expressLib: mockExpress,
        corsLib: mockCors,
        drive: mockGoogle.drive(),
        vertex_ai: new MockVertexAI(),
        contextFileId: 'some-file-id'
    });

    assert.strictEqual(app, mockApp);
});