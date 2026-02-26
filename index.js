// --- SynapseAgent.js v2.4 (Final Validated Version) ---

let express, google, VertexAI, cors;

try {
  express = require('express');
  google = require('googleapis').google;
  VertexAI = require('@google-cloud/vertexai').VertexAI;
  cors = require('cors');
} catch (error) {
  console.warn('Warning: Dependencies not found. Running in test/mock mode.');
}

async function createApp(deps = {}) {
  const appExpress = deps.express || express;
  const appGoogle = deps.google || google;
  const appVertexAI = deps.VertexAI || VertexAI;
  const appCors = deps.cors || cors;

  console.log('Initializing Synapse Agent...');
  const app = appExpress();

  app.use(appCors());
  app.use(appExpress.json());

  const project = 'gold-braid-312320';
  const location = 'us-central1';

  const auth = new appGoogle.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/drive.file']
  });
  const drive = appGoogle.drive({ version: 'v3', auth });

  const vertex_ai = new appVertexAI({ project: project, location: location });
  console.log('Authentication clients created successfully.');

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
    const app = await createApp();
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
