// --- SynapseAgent.js v2.4 (Final Validated Version) ---

const express = require('express');
const { google } = require('googleapis');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors');

const GEMINI_MODEL_NAME = 'gemini-1.5-pro-preview-0409';

function createApp({ expressLib = express, corsLib = cors, drive, vertex_ai, contextFileId }) {
    if (!expressLib || !corsLib || !drive || !vertex_ai || !contextFileId) {
        throw new Error('Missing required dependencies');
    }

    const app = expressLib();

    const geminiModel = vertex_ai.getGenerativeModel({
        model: GEMINI_MODEL_NAME,
        systemInstruction: "If the command is 'repeat' and standalone, repeat the entire process. If context is provided, treat 'repeat' as a subroutine."
    });

    app.use(corsLib());
    const path = require('path');

    app.use(expressLib.json());

    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.get('/env-config.js', (req, res) => {
        const config = {
            CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '700648198913-6itdi4jv7mhdhpq3ncqavndst36imo76.apps.googleusercontent.com',
            API_KEY: process.env.GOOGLE_API_KEY || 'YOUR_API_KEY_HERE'
        };
        res.type('application/javascript');
        res.send(`window.ENV_CONFIG = ${JSON.stringify(config)};`);
    });

    app.post('/', async (req, res) => {
        try {
            const userPrompt = req.body.prompt;
            if (!userPrompt) {
                return res.status(400).send({ error: 'Prompt is required in the request body.' });
            }

            console.log(`Received prompt: "${userPrompt}"`);
            
            const contextCoreResponse = await drive.files.get({
                fileId: contextFileId,
                alt: 'media'
            });
            const persistentContext = contextCoreResponse.data; 
            
            const chat = geminiModel.startChat({ history: persistentContext.history || [] });

            const result = await chat.sendMessage(userPrompt);
            const geminiResponse = result.response.candidates[0].content.parts[0].text;
            
            const newHistory = await chat.getHistory();
            const updatedContextCore = { history: newHistory };

            // Fire and forget update to reduce latency
            drive.files.update({
                fileId: contextFileId,
                media: {
                    mimeType: 'application/json',
                    body: JSON.stringify(updatedContextCore)
                }
            }).catch(err => console.error('Failed to update context:', err));

            console.log('Success. Sending response to user.');
            res.status(200).send({ response: geminiResponse });

        } catch (error) {
            console.error('Error during request execution:', error.message);
            if (error.message.includes('auth') || error.message.includes('credential')) {
                res.status(503).send({ error: 'Service Unavailable: Authentication Error.' });
            } else {
                res.status(500).send({ error: 'An internal error occurred.' });
            }
        }
    });

    return app;
}

async function startServer() {
  try {
    console.log('Initializing Synapse Agent...');

    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION;
    const contextFileId = process.env.CONTEXT_FILE_ID;

    if (!project || !location || !contextFileId) {
      throw new Error('Missing required environment variable');
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    const drive = google.drive({ version: 'v3', auth });

    const vertex_ai = new VertexAI({ project: project, location: location });
    console.log('Authentication clients created successfully.');

    const app = createApp({ expressLib: express, corsLib: cors, drive, vertex_ai, contextFileId });

    const port = process.env.PORT || 8080;
    app.listen(port, () => {
      console.log(`Synapse Agent is successfully listening on port ${port}`);
    });

  } catch (error) {
    console.error('FATAL STARTUP ERROR:', error.message);
    throw error;
  }
}

if (require.main === module) {
    startServer();
}

module.exports = { createApp, startServer };
