// --- SynapseAgent.js v2.5 (Multi-Session Version with LRU) ---

const express = require('express');
const { google } = require('googleapis');
const { VertexAI } = require('@google-cloud/vertexai');
const cors = require('cors');

const CONTEXT_FILE_ID = '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo';

// Simple LRU Cache Implementation
class LRUCache {
    constructor(maxSize) {
        this.maxSize = maxSize;
        this.cache = new Map();
    }

    get(key) {
        if (!this.cache.has(key)) return undefined;
        // Refresh by re-inserting
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.maxSize) {
            // Evict least recently used (first item in Map)
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }

    has(key) {
        return this.cache.has(key);
    }
}

function createApp(drive, vertex_ai) {
    const app = express();
    
    app.use(cors()); 
    app.use(express.json());

    // In-memory Session Cache with LRU to prevent memory leaks
    // Max 100 concurrent active sessions
    const sessionCache = new LRUCache(100);

    app.post('/', async (req, res) => {
        try {
            const userPrompt = req.body.prompt;
            // Use 'global' as the default session ID if none is provided
            const sessionId = req.body.sessionId || 'global';

            if (!userPrompt) {
                return res.status(400).send({ error: 'Prompt is required in the request body.' });
            }

            console.log(`Received prompt: "${userPrompt}" for session: "${sessionId}"`);
            
            let persistentContext;

            if (sessionCache.has(sessionId)) {
                console.log(`Using cached context for session ${sessionId}.`);
                persistentContext = sessionCache.get(sessionId);
            } else if (sessionId === 'global') {
                 // Backward compatibility: only fetch from Google Drive for the global session
                 console.log('Global Cache miss. Fetching context from Drive.');
                 const contextCoreResponse = await drive.files.get({
                     fileId: CONTEXT_FILE_ID,
                     alt: 'media'
                 });
                 persistentContext = contextCoreResponse.data;
                 sessionCache.set(sessionId, persistentContext);
            } else {
                 // New individual session: start fresh
                 console.log(`Initializing new context for session ${sessionId}.`);
                 persistentContext = { history: [] };
                 sessionCache.set(sessionId, persistentContext);
            }

            const geminiModel = vertex_ai.getGenerativeModel({ model: 'gemini-1.5-pro-preview-0409' });
            
            const chat = geminiModel.startChat({ history: persistentContext.history || [] });

            const result = await chat.sendMessage(userPrompt);
            const geminiResponse = result.response.candidates[0].content.parts[0].text;
            
            const newHistory = await chat.getHistory();
            const updatedContextCore = { history: newHistory };

            // Update cache immediately for this session
            sessionCache.set(sessionId, updatedContextCore);

            // Only update Drive for the 'global' legacy session
            if (sessionId === 'global') {
                drive.files.update({
                    fileId: CONTEXT_FILE_ID,
                    media: {
                        mimeType: 'application/json',
                        body: JSON.stringify(updatedContextCore)
                    }
                }).catch(err => {
                    console.error('Background Drive update failed:', err);
                });
            }

            console.log(`Success. Sending response to user for session ${sessionId}.`);
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
    console.log('Initializing Synapse Agent (Multi-Session)...');

    const project = 'gold-braid-312320';
    const location = 'us-central1';

    const auth = new google.auth.GoogleAuth({
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });
    const drive = google.drive({ version: 'v3', auth });

    const vertex_ai = new VertexAI({ project: project, location: location });
    console.log('Authentication clients created successfully.');

    const app = createApp(drive, vertex_ai);

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

module.exports = { createApp, startServer, LRUCache };
