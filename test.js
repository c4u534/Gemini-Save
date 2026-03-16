const assert = require('assert');
const test = require('node:test');

test('startServer fails when CONTEXT_FILE_ID is missing', async (t) => {
    // Save current env vars
    const oldContext = process.env.CONTEXT_FILE_ID;
    const oldProject = process.env.GOOGLE_CLOUD_PROJECT;
    const oldLocation = process.env.GOOGLE_CLOUD_LOCATION;

    // Set environment for this test BEFORE requiring
    delete process.env.CONTEXT_FILE_ID;
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    process.env.GOOGLE_CLOUD_LOCATION = 'test-location';

    // Need to bypass cache to re-evaluate the module level `const CONTEXT_FILE_ID = process.env.CONTEXT_FILE_ID;`
    delete require.cache[require.resolve('./index')];
    const { startServer } = require('./index');

    const originalExit = process.exit;
    const originalError = console.error;

    let exitCode = null;
    let errorMessage = null;

    process.exit = (code) => { exitCode = code; };
    console.error = (msg, err) => { errorMessage = err; };

    await startServer();
    assert.strictEqual(exitCode, 1);
    assert.strictEqual(errorMessage, 'Missing required environment variable: CONTEXT_FILE_ID');

    process.exit = originalExit;
    console.error = originalError;

    // Restore env
    process.env.CONTEXT_FILE_ID = oldContext;
    process.env.GOOGLE_CLOUD_PROJECT = oldProject;
    process.env.GOOGLE_CLOUD_LOCATION = oldLocation;
});

test('startServer fails when GOOGLE_CLOUD_PROJECT is missing', async (t) => {
    // Save current env vars
    const oldContext = process.env.CONTEXT_FILE_ID;
    const oldProject = process.env.GOOGLE_CLOUD_PROJECT;
    const oldLocation = process.env.GOOGLE_CLOUD_LOCATION;

    // Set environment for this test BEFORE requiring
    process.env.CONTEXT_FILE_ID = 'test-context';
    delete process.env.GOOGLE_CLOUD_PROJECT;
    process.env.GOOGLE_CLOUD_LOCATION = 'test-location';

    // Need to bypass cache to re-evaluate the module level `const CONTEXT_FILE_ID = process.env.CONTEXT_FILE_ID;`
    delete require.cache[require.resolve('./index')];
    const { startServer } = require('./index');

    const originalExit = process.exit;
    const originalError = console.error;

    let exitCode = null;
    let errorMessage = null;

    process.exit = (code) => { exitCode = code; };
    console.error = (msg, err) => { errorMessage = err; };

    await startServer();
    assert.strictEqual(exitCode, 1);
    assert.strictEqual(errorMessage, 'Missing required environment variable: GOOGLE_CLOUD_PROJECT');

    process.exit = originalExit;
    console.error = originalError;

    // Restore env
    process.env.CONTEXT_FILE_ID = oldContext;
    process.env.GOOGLE_CLOUD_PROJECT = oldProject;
    process.env.GOOGLE_CLOUD_LOCATION = oldLocation;
});

test('startServer fails when GOOGLE_CLOUD_LOCATION is missing', async (t) => {
    // Save current env vars
    const oldContext = process.env.CONTEXT_FILE_ID;
    const oldProject = process.env.GOOGLE_CLOUD_PROJECT;
    const oldLocation = process.env.GOOGLE_CLOUD_LOCATION;

    // Set environment for this test BEFORE requiring
    process.env.CONTEXT_FILE_ID = 'test-context';
    process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
    delete process.env.GOOGLE_CLOUD_LOCATION;

    // Need to bypass cache to re-evaluate the module level `const CONTEXT_FILE_ID = process.env.CONTEXT_FILE_ID;`
    delete require.cache[require.resolve('./index')];
    const { startServer } = require('./index');

    const originalExit = process.exit;
    const originalError = console.error;

    let exitCode = null;
    let errorMessage = null;

    process.exit = (code) => { exitCode = code; };
    console.error = (msg, err) => { errorMessage = err; };

    await startServer();
    assert.strictEqual(exitCode, 1);
    assert.strictEqual(errorMessage, 'Missing required environment variable: GOOGLE_CLOUD_LOCATION');

    process.exit = originalExit;
    console.error = originalError;

    // Restore env
    process.env.CONTEXT_FILE_ID = oldContext;
    process.env.GOOGLE_CLOUD_PROJECT = oldProject;
    process.env.GOOGLE_CLOUD_LOCATION = oldLocation;
});
