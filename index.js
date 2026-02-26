// --- SynapseAgent.js v2.4 (Final Validated Version) ---

const express = require('express');
const { google } = require('googleapis');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors');
const path = require('path');

function createApp() {
    const app = express();
    
    app.use(cors()); 
    app.use(express.json());

    const project = 'gold-braid-312320'; 
    const location = 'us-central1';

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    const drive = google.drive({ version: 'v3', auth });
    
    const vertex_ai = new VertexAI({ project: project, location: location });
    console.log('Authentication clients created successfully.');

    const CONTEXT_FILE_ID = '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo';

    // Serve index.html
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, 'index.html'));
    });

    // Serve config
    app.get('/api/config', (req, res) => {
        res.json({
            apiKey: process.env.GOOGLE_API_KEY || '',
            clientId: process.env.GOOGLE_CLIENT_ID || ''
        });
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

            const geminiModel = vertex_ai.getGenerativeModel({ model: 'gemini-1.5-pro-preview-0409' });
            
            const chat = geminiModel.startChat({ history: persistentContext.history || [] });

            const result = await chat.sendMessage(userPrompt);
            const geminiResponse = result.response.candidates[0].content.parts[0].text;
            
            const newHistory = await chat.getHistory();
            const updatedContextCore = { history: newHistory };

            await drive.files.update({
                fileId: CONTEXT_FILE_ID,
                media: {
                    mimeType: 'application/json',
                    body: JSON.stringify(updatedContextCore)
                }
            });

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
    const app = createApp();
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
