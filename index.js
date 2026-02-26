// --- SynapseAgent.js v2.4 (Final Validated Version) ---

async function createApp(deps = {}) {
  const appExpress = deps.express || express;
  const appGoogle = deps.google || google;
  const appVertexAI = deps.VertexAI || VertexAI;
  const appCors = deps.cors || cors;

const CONTEXT_FILE_ID = '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo';

async function createApp({ drive, vertex_ai }, expressLib = express, corsLib = cors) {
    const app = expressLib();
    
    app.use(corsLib());
    app.use(expressLib.json());
const CONTEXT_FILE_ID = '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo';

function createApp({ express, drive, vertex_ai, cors }) {
    const app = express();
    
    app.use(cors()); 
    app.use(express.json());

    app.post('/', async (req, res) => {
        try {
            const userPrompt = req.body.prompt;
            if (!userPrompt) {
                return res.status(400).send({ error: 'Prompt is required in the request body.' });
            }

  const CONTEXT_FILE_ID = '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo';

  app.post('/', async (req, res) => {
      try {
          const validApiKey = process.env.API_KEY;
            if (!validApiKey) {
                 console.error('API_KEY not configured');
                 return res.status(500).send({ error: 'Internal Server Error' });
            }
            
            const apiKey = req.headers['x-api-key'];
            if (!apiKey || apiKey !== validApiKey) {
                return res.status(401).send({ error: 'Unauthorized' });
            }

            const userPrompt = req.body.prompt;
          if (!userPrompt) {
              return res.status(400).send({ error: 'Prompt is required in the request body.' });
          }

          console.log(`Received prompt: "${userPrompt}"`);

          const contextCoreResponse = await drive.files.get({
              fileId: CONTEXT_FILE_ID,
              alt: 'media'
          });
          const persistentContext = contextCoreResponse.data;

    return app;
}

async function startServer() {
  try {
    const express = require('express');
    const { google } = require('googleapis');
    const { VertexAI } = require('@google-cloud/vertexai');
    const cors = require('cors');

    console.log('Initializing Synapse Agent...');

    const project = 'gold-braid-312320';
    const location = 'us-central1';

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    const drive = google.drive({ version: 'v3', auth });

    const vertex_ai = new VertexAI({ project: project, location: location });
    console.log('Authentication clients created successfully.');

    const app = createApp({ express, drive, vertex_ai, cors });

    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log(`Synapse Agent is successfully listening on port ${port}`);
    });

  } catch (error) {
    console.error('FATAL STARTUP ERROR:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
    startServer();
}

module.exports = { createApp };
