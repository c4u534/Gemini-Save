// --- SynapseAgent.js v2.4 (Final Validated Version) ---

const express = require('express');
const { google } = require('googleapis');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors');
const path = require('path');

const CONTEXT_FILE_ID = process.env.CONTEXT_FILE_ID || '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo';
const GEMINI_MODEL_NAME = 'gemini-1.5-pro-preview-0409';

function createApp({ expressLib = express, corsLib = cors, drive, vertex_ai }) {
    if (!drive || !vertex_ai) {
        throw new Error('Missing required dependencies: drive or vertex_ai');
    }

    const app = expressLib();

    app.use(corsLib());
    app.use(expressLib.json());

    // Serve the main index.html file securely
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Serve the configuration file if requested (e.g., for env vars like CLIENT_ID)
    app.get('/env-config.js', (req, res) => {
        const config = {
             CLIENT_ID: process.env.CLIENT_ID || '700648198913-6itdi4jv7mhdhpq3ncqavndst36imo76.apps.googleusercontent.com',
             API_KEY: process.env.API_KEY || 'YOUR_API_KEY_HERE'
        };
        res.type('application/javascript');
        res.send(`window.env = ${JSON.stringify(config)};`);
    });

    app.post('/', async (req, res) => {
        try {
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

            const geminiModel = vertex_ai.getGenerativeModel({ model: GEMINI_MODEL_NAME });
            
            const chat = geminiModel.startChat({ history: persistentContext.history || [] });

            const result = await chat.sendMessage(userPrompt);
            const geminiResponse = result.response.candidates[0].content.parts[0].text;
            
            const newHistory = await chat.getHistory();
            const updatedContextCore = { history: newHistory };

            // Fire and forget update to reduce latency
            drive.files.update({
                fileId: CONTEXT_FILE_ID,
                media: {
                    mimeType: 'application/json',
                    body: JSON.stringify(updatedContextCore)
                }
            }).catch(err => console.error('Failed to update context:', err));

            console.log('Success. Sending response to user.');
            res.status(200).send({ response: geminiResponse });

        } catch (error) {
            console.error('Error during request execution:', error.message);
            res.status(500).send({ error: 'An internal error occurred.' });
        }
    });

    return app;
}

async function startServer() {
  try {
    console.log('Initializing Synapse Agent...');

    const project = process.env.GOOGLE_CLOUD_PROJECT || 'gold-braid-312320';
    const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    const drive = google.drive({ version: 'v3', auth });

    const vertex_ai = new VertexAI({ project: project, location: location });
    console.log('Authentication clients created successfully.');

    const app = createApp({ expressLib: express, corsLib: cors, drive, vertex_ai });

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

module.exports = { createApp, startServer };
