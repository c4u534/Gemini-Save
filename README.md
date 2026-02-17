# Synapse Agent

This project contains the backend logic for the Synapse Agent.

## Configuration

The application requires the following environment variables to be set:

- `CONTEXT_FILE_ID`: (Required) The Google Drive File ID used for context storage.
- `GOOGLE_PROJECT_ID`: (Optional) The Google Cloud Project ID. Defaults to `gold-braid-312320`.
- `GOOGLE_LOCATION`: (Optional) The Google Cloud location (e.g., `us-central1`). Defaults to `us-central1`.
- `PORT`: (Optional) The port the server listens on. Defaults to `8080`.

## Running the Application

To run the application locally:

```bash
export CONTEXT_FILE_ID="your-file-id"
node index.js
```

## Deployment

Ensure these environment variables are configured in your deployment environment.
