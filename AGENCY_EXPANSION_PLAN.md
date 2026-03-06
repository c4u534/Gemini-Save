# Synapse Agent - Expansion & Agency Plan

## 1. Current Codebase Analysis
The current "Synapse Agent" project consists of a simple, decoupled architecture:
*   **Frontend (`index.html`):** A static HTML/JS file that provides a chat interface and handles Google OAuth (Identity Services & Drive API). It creates a folder in Google Drive ("Gemini_Synapse_Offload") for user artifacts.
*   **Backend (`index.js`):** A lightweight Node.js Express server. It receives a prompt, fetches context from a **hardcoded** Google Drive file, queries the `gemini-1.5-pro-preview-0409` model on Vertex AI, updates the hardcoded context file, and returns the response.
*   **Notebooks:** Several Jupyter notebooks exploring related concepts (AI Truth Testing, Sovereign Gateway).

### Key Limitations & Vulnerabilities
*   **Hardcoded Configuration:** `CONTEXT_FILE_ID`, GCP `project`, and `location` are hardcoded in the backend.
*   **Security Disconnect:** The frontend authenticates the user, but the backend accepts any request without verifying the user's identity. The backend also uses a single shared context file for all users, leading to data cross-contamination and privacy issues.
*   **Lack of State Management:** The chat history relies entirely on Google Drive, which is slow for real-time reads/writes and brittle.
*   **No Tool Use:** The Gemini model is strictly a chatbot; it cannot take actions (like offloading the artifacts the frontend mentions).

---

## 2. Expansion Possibilities Roadmap

### Phase 1: Security, Stability, and User Isolation (The Foundation)
Before expanding capabilities, the core architecture must be secured and made multi-user capable.
*   **Implement Backend Authentication:** Use Firebase Auth or verify the Google OAuth tokens sent from the frontend to ensure requests are legitimate.
*   **Dynamic Context per User:** Stop using a single hardcoded `CONTEXT_FILE_ID`. Each authenticated user should have their own context file (or database entry).
*   **Environment Variables:** Move GCP project IDs, locations, and API keys out of source code and into `.env` files.
*   **Database Migration:** Replace Google Drive for real-time chat history with a fast, scalable database like Firestore or PostgreSQL. Use Drive only for "offloading" large artifacts.

### Phase 2: Enhanced Capabilities & Multi-modality
*   **File Uploads & Vision:** Allow users to upload images, PDFs, and text files through the frontend. Update the backend to use Vertex AI's multi-modal capabilities to analyze these files.
*   **Tool Calling (Function Calling):** Give the Gemini model "tools".
    *   *Search:* Allow it to query Google Search.
    *   *Drive Interaction:* Allow it to dynamically read/write to the user's Drive folder ("Gemini_Synapse_Offload").
    *   *Code Execution:* Provide a sandbox (like a Colab runtime) for the model to execute code and return results.

### Phase 3: The "Agency" Plan (Deploying Autonomous Agents)
To truly build an "agentic" system, the architecture must move from a single request-response loop to a multi-agent framework.
*   **Adopt an Agent Framework:** Integrate libraries like LangChain or AutoGen into the backend.
*   **Specialized Agents:** Create distinct agents with specific roles:
    *   *Coordinator Agent:* Receives the user prompt and delegates tasks.
    *   *Researcher Agent:* Searches the web or local documents.
    *   *Coder Agent:* Writes and executes code.
    *   *Reviewer Agent:* Checks the output for errors or security issues (tying back to the `AI_Truth_Tester` notebook).
*   **Long-Term Memory:** Implement vector databases (e.g., Pinecone, Chroma) so agents can retrieve relevant information from past conversations over weeks or months.

---

## 3. Deployment and Management of Agents

*Note: As an AI assistant, I cannot persistently spawn and manage background processes or autonomous agents on your infrastructure. However, here is the architectural plan to deploy them:*

1.  **Containerization:** Dockerize the Node.js backend. This is essential for deploying complex, multi-agent setups.
2.  **Orchestration (Kubernetes/Cloud Run):** Deploy the Docker containers to a managed service like Google Cloud Run (for stateless, event-driven agents) or Kubernetes (for complex, persistent agent swarms).
3.  **Task Queues:** Introduce a message broker (like RabbitMQ, Redis Pub/Sub, or Google Cloud Pub/Sub). When a user sends a complex request, the backend drops it into a queue. Background worker agents pick up the tasks, process them, and return the results asynchronously.
4.  **Monitoring & Observability:** Agentic systems are unpredictable. Implement rigorous logging (Winston, Pino) and tracing (OpenTelemetry) to track what the agents are deciding and doing.

### Next Steps
To begin this expansion, I recommend starting with **Phase 1**. Shall I implement user authentication and dynamic context handling in `index.js`?
