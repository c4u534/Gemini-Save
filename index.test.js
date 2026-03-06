const { test } = require('node:test');
const assert = require('node:assert');
const { createApp } = require('./index.js');

test('createApp throws error when drive is missing', () => {
    assert.throws(() => {
        createApp({ vertex_ai: {} });
    }, {
        name: 'Error',
        message: 'Missing required dependencies: drive or vertex_ai'
    });
});

test('createApp throws error when vertex_ai is missing', () => {
    assert.throws(() => {
        createApp({ drive: {} });
    }, {
        name: 'Error',
        message: 'Missing required dependencies: drive or vertex_ai'
    });
});

test('createApp throws error when both are missing', () => {
    assert.throws(() => {
        createApp({});
    }, {
        name: 'Error',
        message: 'Missing required dependencies: drive or vertex_ai'
    });
});
