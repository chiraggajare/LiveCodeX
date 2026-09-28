// API base URL — uses relative path in production (served by same backend),
// falls back to localhost for local development with separate frontend dev server.
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4500";

// WebSocket base URL — derived from API_BASE
const WS_BASE = API_BASE.replace(/^http/, "ws");

export { API_BASE, WS_BASE };
