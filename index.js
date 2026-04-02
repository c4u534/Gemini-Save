// --- SynapseAgent.js v2.4 (Final Validated Version) ---

const express = require('express');
const { google } = require('googleapis');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors');

const GEMINI_MODEL_NAME = 'gemini-1.5-pro-preview-0409';

function createApp({ expressLib = express, corsLib = cors, drive, vertex_ai, contextFileId }) {
    if (!expressLib || !corsLib || !drive || !vertex_ai || !contextFileId) {
        throw new Error('Missing required dependencies: expressLib, corsLib, drive, vertex_ai, or contextFileId');
    }

    const geminiModel = vertex_ai.getGenerativeModel({
        model: GEMINI_MODEL_NAME,
        systemInstruction: "If the user says 'repeat', repeat the entire process if standalone, or treat it as a subroutine if context is provided."
    });

    const app = expressLib();

    let cachedContext = null;

    app.use(corsLib());
    app.use(expressLib.json());

    app.post('/', async (req, res) => {
        try {
            const userPrompt = req.body.prompt;
            if (!userPrompt) {
                return res.status(400).send({ error: 'Prompt is required in the request body.' });
            }

            console.log(`Received prompt: "${userPrompt}"`);
            
            if (!cachedContext) {
                const contextCoreResponse = await drive.files.get({
                    fileId: contextFileId,
                    alt: 'media'
                });
                cachedContext = contextCoreResponse.data;
            }
            
            const chat = geminiModel.startChat({ history: cachedContext.history || [] });

            const result = await chat.sendMessage(userPrompt);
            const geminiResponse = result.response.candidates[0].content.parts[0].text;
            
            const newHistory = await chat.getHistory();

            cachedContext = { history: newHistory };
            const updatedContextCore = cachedContext;

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
            res.status(500).send({ error: 'An internal error occurred.' });
        }
    });

    return app;
}

async function startServer() {
  try {
    console.log('Initializing Synapse Agent...');

    const CONTEXT_FILE_ID = process.env.CONTEXT_FILE_ID;
    if (!CONTEXT_FILE_ID) {
      throw new Error('Missing required environment variable: CONTEXT_FILE_ID');
    }

    const project = process.env.GOOGLE_CLOUD_PROJECT;
    if (!project) {
      throw new Error('Missing required environment variable: GOOGLE_CLOUD_PROJECT');
    }

    const location = process.env.GOOGLE_CLOUD_LOCATION;
    if (!location) {
      throw new Error('Missing required environment variable: GOOGLE_CLOUD_LOCATION');
    }

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    const drive = google.drive({ version: 'v3', auth });

    const vertex_ai = new VertexAI({ project: project, location: location });
    console.log('Authentication clients created successfully.');

    const app = createApp({ expressLib: express, corsLib: cors, drive, vertex_ai, contextFileId: CONTEXT_FILE_ID });

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
