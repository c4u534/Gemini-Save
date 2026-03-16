const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('./index.js');
const { google } = require('googleapis');

test('FATAL STARTUP ERROR path calls process.exit(1)', async (t) => {
    // Mock process.exit to prevent the test runner from dying
    const exitMock = t.mock.method(process, 'exit', () => {});

    // Mock console.error to intercept the error log message
    const consoleErrorMock = t.mock.method(console, 'error', () => {});

    // Force an error in startServer by throwing from GoogleAuth constructor
    t.mock.method(google.auth, 'GoogleAuth', function() {
        throw new Error('Simulated Auth Error');
    });

    await startServer();

    // Verify console.error was called with the correct prefix and message
    assert.strictEqual(consoleErrorMock.mock.calls.length, 1);
    assert.strictEqual(consoleErrorMock.mock.calls[0].arguments[0], 'FATAL STARTUP ERROR:');
    assert.strictEqual(consoleErrorMock.mock.calls[0].arguments[1], 'Simulated Auth Error');

    // Verify process.exit was called exactly once with status code 1
    assert.strictEqual(exitMock.mock.calls.length, 1);
    assert.strictEqual(exitMock.mock.calls[0].arguments[0], 1);
});
