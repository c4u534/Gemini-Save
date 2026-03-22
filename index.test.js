const test = require('node:test');
const assert = require('node:assert');

const path = require('path');

// Mock dependencies to handle corrupted node_modules
function mockDependency(moduleName, mockExports) {
  let resolvedPath;
  try {
    resolvedPath = require.resolve(moduleName);
  } catch (e) {
    resolvedPath = path.resolve('node_modules', moduleName, 'index.js');
  }

  require.cache[resolvedPath] = {
    id: moduleName,
    filename: resolvedPath,
    loaded: true,
    exports: mockExports
  };
  return resolvedPath;
}

const expressPath = mockDependency('express', function() {
  return {
      use: () => {},
      post: () => {},
      get: () => {},
      listen: () => {}
    };
});
require.cache[expressPath].exports.json = () => {};

const corsPath = mockDependency('cors', () => {});

mockDependency('googleapis', {
  google: {
    auth: {
      GoogleAuth: class {}
    },
    drive: () => {}
  }
});

const vertexAIPath = mockDependency('@google-cloud/vertexai', {
  VertexAI: class {
      getGenerativeModel() {
        return {
          startChat: () => {}
        };
      }
    }
});

const { createApp, startServer } = require('./index.js');

test('createApp throws error if dependencies are missing', (t) => {
  assert.throws(
    () => createApp({}),
    Error,
    'Missing required dependencies'
  );
});

test('createApp initializes correctly with mock dependencies', (t) => {
  const expressLib = require.cache[expressPath].exports;
  const corsLib = require.cache[corsPath].exports;
  const drive = {};
  const vertex_ai = new (require.cache[vertexAIPath].exports.VertexAI)();
  const contextFileId = 'test-file-id';

  const app = createApp({ expressLib, corsLib, drive, vertex_ai, contextFileId });
  assert.ok(app);
});

test('startServer throws error if environment variables are missing', async (t) => {
  // Clear env vars to force an error
  const origProject = process.env.GOOGLE_CLOUD_PROJECT;
  const origLocation = process.env.GOOGLE_CLOUD_LOCATION;
  const origContextFileId = process.env.CONTEXT_FILE_ID;

  delete process.env.GOOGLE_CLOUD_PROJECT;
  delete process.env.GOOGLE_CLOUD_LOCATION;
  delete process.env.CONTEXT_FILE_ID;

  try {
    await startServer();
    assert.fail('Should have thrown an error');
  } catch (error) {
    assert.strictEqual(error.message, 'Missing required environment variable');
  } finally {
    // Restore env vars
    process.env.GOOGLE_CLOUD_PROJECT = origProject;
    process.env.GOOGLE_CLOUD_LOCATION = origLocation;
    process.env.CONTEXT_FILE_ID = origContextFileId;
  }
});
