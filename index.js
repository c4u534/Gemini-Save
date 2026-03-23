// --- SynapseAgent.js v2.4 (Final Validated Version) ---

const express = require('express');
const { google } = require('googleapis');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors');

const GEMINI_MODEL_NAME = 'gemini-1.5-pro-preview-0409';

function createApp({ expressLib = express, corsLib = cors, drive, vertex_ai, contextFileId }) {
    if (!drive || !vertex_ai || !contextFileId) {
        throw new Error('Missing required dependencies: drive, vertex_ai, or contextFileId');
    }

    const app = expressLib();

    app.use(corsLib());
    app.use(expressLib.json());

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

            const geminiModel = vertex_ai.getGenerativeModel({ model: GEMINI_MODEL_NAME });
            
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
            if (error.message.includes('Could not load the default credentials') || error.message.includes('authentication') || error.message.includes('credential')) {
                return res.status(503).send({ error: 'Google Cloud authentication or missing credential errors' });
            }
            res.status(500).send({ error: 'An internal error occurred.' });
        }
    });

    return app;
}

async function startServer() {
  try {
    console.log('Initializing Synapse Agent...');

    const contextFileId = process.env.CONTEXT_FILE_ID;
    if (!contextFileId) {
      throw new Error('Missing required environment variable: CONTEXT_FILE_ID');
    }

    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION;
    if (!project || !location) {
      throw new Error('Missing required environment variable: GOOGLE_CLOUD_PROJECT or GOOGLE_CLOUD_LOCATION');
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
