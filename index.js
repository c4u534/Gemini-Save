// --- SynapseAgent.js v2.4 (Final Validated Version) ---

const CONTEXT_FILE_ID = '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo';

function createPromptHandler({ drive, vertex_ai, contextFileId }) {
    return async (req, res) => {
        try {
            const userPrompt = req.body.prompt;
            if (!userPrompt) {
                return res.status(400).send({ error: 'Prompt is required in the request body.' });
            }

            console.log(`Received prompt: "${userPrompt}"`);

            // 1. Retrieve persistent context from Google Drive
            const contextCoreResponse = await drive.files.get({
                fileId: contextFileId,
                alt: 'media'
            });
            const persistentContext = contextCoreResponse.data;

            // 2. Initialize Vertex AI Model
            const geminiModel = vertex_ai.getGenerativeModel({ model: 'gemini-1.5-pro-preview-0409' });

            // 3. Start Chat Session with History
            const chat = geminiModel.startChat({ history: persistentContext.history || [] });

            // 4. Send Message to Model
            const result = await chat.sendMessage(userPrompt);
            const geminiResponse = result.response.candidates[0].content.parts[0].text;

            // 5. Update Persistent Context
            const newHistory = await chat.getHistory();
            const updatedContextCore = { history: newHistory };

            // Fire-and-forget update to Google Drive to reduce latency for the user
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

function createApp({ express, drive, vertex_ai, cors, contextFileId = CONTEXT_FILE_ID }) {
    const app = express();

    app.use(cors());
    app.use(express.json());

    app.post('/', createPromptHandler({ drive, vertex_ai, contextFileId }));

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

        // Initialize Google Drive Client
        const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        const drive = google.drive({ version: 'v3', auth });

        // Initialize Vertex AI Client
        const vertex_ai = new VertexAI({ project: project, location: location });
        console.log('Authentication clients created successfully.');

        const app = createApp({ express, drive, vertex_ai, cors, contextFileId: CONTEXT_FILE_ID });
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

module.exports = { createApp, createPromptHandler };
