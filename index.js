// --- SynapseAgent.js v2.4 (Final Validated Version) ---

async function startServer(deps = {}) {
  const express = deps.express || require('express');

  let google;
  if (deps.google) {
      google = deps.google;
  } else {
      google = require('googleapis').google;
  }

  let VertexAI;
  if (deps.VertexAI) {
      VertexAI = deps.VertexAI;
  } else {
      VertexAI = require('@google-cloud/vertexai').VertexAI;
  }

  const cors = deps.cors || require('cors');

  try {
    console.log('Initializing Synapse Agent...');
    const app = express();
    
    app.use(cors()); 
    app.use(express.json());

    const project = process.env.GOOGLE_PROJECT_ID || 'gold-braid-312320';
    const location = process.env.GOOGLE_LOCATION || 'us-central1';

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    const drive = google.drive({ version: 'v3', auth });
    
    const vertex_ai = new VertexAI({ project: project, location: location });
    console.log('Authentication clients created successfully.');

    const CONTEXT_FILE_ID = process.env.CONTEXT_FILE_ID || '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo';

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

    if (!deps.testMode) {
        const port = process.env.PORT || 8080;
        app.listen(port, () => {
          console.log(`Synapse Agent is successfully listening on port ${port}`);
        });
    }

    return app;

  } catch (error) {
    console.error('FATAL STARTUP ERROR:', error.message);
    if (!deps.testMode) process.exit(1);
    throw error;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
