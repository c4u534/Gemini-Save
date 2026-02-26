const express = require('express');
const { google } = require('googleapis');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors');
const path = require('path');

function createPromptHandler({ drive, vertex_ai, contextFileId }) {
    return async (req, res) => {
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

            const geminiModel = vertex_ai.getGenerativeModel({ model: 'gemini-1.5-pro-preview-0409' });
            
            const chat = geminiModel.startChat({ history: persistentContext.history || [] });

            const result = await chat.sendMessage(userPrompt);
            const geminiResponse = result.response.candidates[0].content.parts[0].text;
            
            const newHistory = await chat.getHistory();
            const updatedContextCore = { history: newHistory };

            // Fire-and-forget update to improve latency
            drive.files.update({
                fileId: contextFileId,
                media: {
                    mimeType: 'application/json',
                    body: JSON.stringify(updatedContextCore)
                }
            }).catch(err => console.error('Error updating context in background:', err.message));

            console.log('Success. Sending response to user.');
            res.status(200).send({ response: geminiResponse });

        } catch (error) {
            console.error('Error during request execution:', error.message);
            res.status(500).send({ error: 'An internal error occurred.' });
        }
    };
}

function createApp({ express, drive, vertex_ai, cors, contextFileId, envConfig }) {
    const app = express();

    app.use(cors());
    app.use(express.json());

    // Endpoint to serve environment configuration to the frontend
    app.get('/env-config.js', (req, res) => {
        res.type('application/javascript');
        res.send(`window.config = ${JSON.stringify(envConfig)};`);
    });

    // Explicitly serve only index.html instead of the whole directory
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    app.post('/', createPromptHandler({ drive, vertex_ai, contextFileId }));

    return app;
}

async function startServer() {
    try {
        console.log('Initializing Synapse Agent...');

        const project = process.env.GOOGLE_CLOUD_PROJECT;
        const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
        const contextFileId = process.env.CONTEXT_FILE_ID;
        const envConfig = {
            CLIENT_ID: process.env.CLIENT_ID || '',
            API_KEY: process.env.API_KEY || ''
        };

        if (!project || !contextFileId) {
            console.error('CRITICAL ERROR: GOOGLE_CLOUD_PROJECT and CONTEXT_FILE_ID must be set.');
            process.exit(1);
        }

        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        const drive = google.drive({ version: 'v3', auth });

        const vertex_ai = new VertexAI({ project: project, location: location });
        console.log('Authentication clients created successfully.');

        const app = createApp({ express, drive, vertex_ai, cors, contextFileId, envConfig });

        const PORT = process.env.PORT || 8080;
        app.listen(PORT, () => {
            console.log(`Server listening on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = { createApp, createPromptHandler };
