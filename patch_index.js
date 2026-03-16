const fs = require('fs');
let code = fs.readFileSync('index.js', 'utf8');

// Fix CONTEXT_FILE_ID at top level
code = code.replace(
    /const CONTEXT_FILE_ID = process\.env\.CONTEXT_FILE_ID \|\| '1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo';/,
    "const CONTEXT_FILE_ID = process.env.CONTEXT_FILE_ID;"
);

// Fix startServer project, location and add check for CONTEXT_FILE_ID
code = code.replace(
    /const project = process\.env\.GOOGLE_CLOUD_PROJECT \|\| 'gold-braid-312320';\n\s*const location = process\.env\.GOOGLE_CLOUD_LOCATION \|\| 'us-central1';/,
    `if (!CONTEXT_FILE_ID) {
      throw new Error('Missing required environment variable: CONTEXT_FILE_ID');
    }
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    if (!project) {
      throw new Error('Missing required environment variable: GOOGLE_CLOUD_PROJECT');
    }
    const location = process.env.GOOGLE_CLOUD_LOCATION;
    if (!location) {
      throw new Error('Missing required environment variable: GOOGLE_CLOUD_LOCATION');
    }`
);

fs.writeFileSync('index.js', code);
console.log('Patched index.js');
