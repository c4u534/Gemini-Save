const { test } = require('node:test');
const assert = require('node:assert');
const { startServer } = require('./index.js');

test('startServer uses CONTEXT_FILE_ID from env', async (t) => {
    let capturedHandler;
    let driveGetCalledWith;

    const mockExpressApp = {
        use: () => {},
        post: (path, handler) => {
            if (path === '/') capturedHandler = handler;
        },
        listen: (port, cb) => cb && cb()
    };
    const mockExpress = () => mockExpressApp;
    mockExpress.json = () => () => {};

    const mockGoogle = {
        auth: {
            GoogleAuth: class {
                constructor() {}
            }
        },
        drive: ({ auth }) => ({
            files: {
                get: async (opts) => {
                    driveGetCalledWith = opts;
                    return { data: { history: [] } };
                },
                update: async () => {}
            }
        })
    };

    const mockVertexAI = class {
        constructor() {}
        getGenerativeModel() {
            return {
                startChat: () => ({
                    sendMessage: async () => ({
                        response: { candidates: [{ content: { parts: [{ text: 'response' }] } }] }
                    }),
                    getHistory: async () => []
                })
            };
        }
    };

    const mockCors = () => () => {};

    // Set ENV VAR
    process.env.CONTEXT_FILE_ID = 'TEST_ID_123';

    await startServer({
        express: mockExpress,
        google: mockGoogle,
        VertexAI: mockVertexAI,
        cors: mockCors,
        testMode: true
    });

    if (!capturedHandler) {
        throw new Error('Handler for / not registered');
    }

    // Invoke handler
    const req = { body: { prompt: 'hello' } };
    const res = {
        status: (code) => res,
        send: (body) => {}
    };

    await capturedHandler(req, res);

    // Verify
    assert.strictEqual(driveGetCalledWith.fileId, 'TEST_ID_123', 'Should use CONTEXT_FILE_ID from env');
});

test('startServer uses default CONTEXT_FILE_ID if env var missing', async (t) => {
    let capturedHandler;
    let driveGetCalledWith;

    const mockExpressApp = {
        use: () => {},
        post: (path, handler) => {
            if (path === '/') capturedHandler = handler;
        },
        listen: (port, cb) => cb && cb()
    };
    const mockExpress = () => mockExpressApp;
    mockExpress.json = () => () => {};

    const mockGoogle = {
        auth: {
            GoogleAuth: class { constructor() {} }
        },
        drive: ({ auth }) => ({
            files: {
                get: async (opts) => {
                    driveGetCalledWith = opts;
                    return { data: { history: [] } };
                },
                update: async () => {}
            }
        })
    };

    const mockVertexAI = class {
        constructor() {}
        getGenerativeModel() {
            return {
                startChat: () => ({
                    sendMessage: async () => ({
                        response: { candidates: [{ content: { parts: [{ text: 'response' }] } }] }
                    }),
                    getHistory: async () => []
                })
            };
        }
    };

    const mockCors = () => () => {};

    // UNSET ENV VAR
    delete process.env.CONTEXT_FILE_ID;

    await startServer({
        express: mockExpress,
        google: mockGoogle,
        VertexAI: mockVertexAI,
        cors: mockCors,
        testMode: true
    });

    if (!capturedHandler) {
        throw new Error('Handler for / not registered');
    }

    const req = { body: { prompt: 'hello' } };
    const res = {
        status: (code) => res,
        send: (body) => {}
    };

    await capturedHandler(req, res);

    assert.strictEqual(driveGetCalledWith.fileId, '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo', 'Should use default CONTEXT_FILE_ID');
});

test('startServer uses GOOGLE_PROJECT_ID and GOOGLE_LOCATION from env', async (t) => {
    let vertexConstructorArgs;
    const mockVertexAI = class {
        constructor(args) { vertexConstructorArgs = args; }
        getGenerativeModel() {
            return {
                startChat: () => ({
                    sendMessage: async () => ({ response: { candidates: [{ content: { parts: [{ text: 'response' }] } }] } }),
                    getHistory: async () => []
                })
            };
        }
    };

    const mockExpressApp = {
        use: () => {},
        post: () => {},
        listen: () => {}
    };
    const mockExpress = () => mockExpressApp;
    mockExpress.json = () => () => {};

    const mockGoogle = {
        auth: { GoogleAuth: class {} },
        drive: () => ({ files: { get: async () => ({ data: {} }), update: async () => {} } })
    };

    const mockCors = () => () => {};

    process.env.GOOGLE_PROJECT_ID = 'TEST_PROJECT';
    process.env.GOOGLE_LOCATION = 'TEST_LOCATION';

    await startServer({
        express: mockExpress,
        google: mockGoogle,
        VertexAI: mockVertexAI,
        cors: mockCors,
        testMode: true
    });

    assert.strictEqual(vertexConstructorArgs.project, 'TEST_PROJECT');
    assert.strictEqual(vertexConstructorArgs.location, 'TEST_LOCATION');
});
