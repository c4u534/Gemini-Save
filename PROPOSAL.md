# Proposal: Synapse Agent - Multi-User Session Management

## 1. What it does
Currently, the Synapse Agent relies on a single, hardcoded Google Drive file (`1w0rN4iKxqIIRRmhUP9tlgkkJUUR0sHzjlInTX01SuQo`) to persist conversation history. This means every user interacting with the agent shares the exact same context window, leading to crossed wires, confused responses, and a lack of privacy.

The proposed feature introduces **Multi-User Session Management**, giving each user (or session) their own isolated conversation history.

## 2. How it will work
*   **Session IDs:** The frontend (`index.html`) will generate a unique Session ID (e.g., a UUID) when a user opens the page, or use an authenticated User ID. This ID will be passed in the JSON body of the `POST /` request alongside the prompt.
*   **Dynamic Storage Mapping:**
    *   *Option A (Drive-based):* The backend will map the Session ID to a specific Google Drive file. If a file doesn't exist for a new session, it will create one dynamically.
    *   *Option B (Local DB/Redis):* Move away from Drive entirely for real-time memory and use SQLite or Redis to map `SessionID -> History Array`. Drive could be used for long-term cold storage backups.
*   **Cache Invalidation:** The current in-memory cache we just built will be updated to operate as a Map: `Map<SessionID, Context>`. LRU (Least Recently Used) cache eviction will prevent memory leaks.

## 3. Who it benefits & In what way
*   **End Users:** Benefit from a coherent, personalized AI experience. Their conversations remain private and aren't interrupted by prompts from other concurrent users.
*   **Developers/Operators:** The application becomes scalable. It transitions from a single-user prototype to a production-ready multi-user system.
*   **System Performance:** By shifting toward a Session Map (and potentially SQLite/Redis), we reduce the bottleneck of Google Drive API rate limits when multiple users send messages simultaneously.
