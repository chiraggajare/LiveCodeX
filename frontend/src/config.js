// API base URL — uses relative path in production (served by same backend),
// falls back to localhost for local development with separate frontend dev server.
const isProd = import.meta.env.PROD;

const API_BASE = isProd ? "" : (import.meta.env.VITE_API_URL || "http://localhost:4500");

const WS_BASE = isProd 
  ? window.location.origin.replace(/^http/, "ws") 
  : (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^http/, "ws") : "ws://localhost:4500");

export { API_BASE, WS_BASE };
