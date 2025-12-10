import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
  const root = document.getElementById('root');
  if (root) {
    const errorMsg = event.reason?.message || String(event.reason);
    const errorStack = event.reason?.stack || '';
    root.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #ff6b6b; font-family: monospace; background: #0a0a0a; text-align: left; overflow: auto;">
        <h1 style="margin-bottom: 10px; color: #ff6b6b;">⚠️ Application Error</h1>
        <p style="color: #a0aec0; margin-bottom: 10px;">Unhandled Promise Rejection</p>
        <pre style="background: #1a1a1a; padding: 10px; border: 1px solid #ff6b6b; border-radius: 4px; max-width: 600px; overflow: auto; color: #fca5a5; white-space: pre-wrap; word-wrap: break-word;">${errorMsg}\n${errorStack}</pre>
        <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px; cursor: pointer; background: #ff6b6b; color: #000; border: none; border-radius: 4px; font-weight: bold;">
          Refresh Page
        </button>
      </div>
    `;
  }
});

// Global error handler for runtime errors
window.addEventListener('error', (event) => {
  console.error('❌ Runtime error:', event.error);
  const root = document.getElementById('root');
  if (root) {
    const errorMsg = event.error?.message || event.message || String(event.error);
    const errorStack = event.error?.stack || '';
    root.innerHTML = `
      <div style="width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; color: #ff6b6b; font-family: monospace; background: #0a0a0a; text-align: left; overflow: auto;">
        <h1 style="margin-bottom: 10px; color: #ff6b6b;">⚠️ Application Error</h1>
        <p style="color: #a0aec0; margin-bottom: 10px;">Runtime Error at ${event.filename || 'unknown'}:${event.lineno || '?'}</p>
        <pre style="background: #1a1a1a; padding: 10px; border: 1px solid #ff6b6b; border-radius: 4px; max-width: 600px; overflow: auto; color: #fca5a5; white-space: pre-wrap; word-wrap: break-word;">${errorMsg}\n${errorStack}</pre>
        <button onclick="location.reload()" style="padding: 10px 20px; margin-top: 20px; cursor: pointer; background: #ff6b6b; color: #000; border: none; border-radius: 4px; font-weight: bold;">
          Refresh Page
        </button>
      </div>
    `;
  }
});

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

try {
  // StrictMode removed entirely to prevent conflicts with legacy react-big-schedule / react-dnd
  createRoot(root).render(<App />);
} catch (error) {
  console.error("Failed to render app:", error);
  // Display error on page as fallback
  root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;color:#f87171;background:#1a1a1a">
    <div style="text-align:center;max-width:500px">
      <h1>Application Error</h1>
      <p>${(error as Error).message}</p>
      <p style="color:#999;font-size:12px">Check console for details</p>
    </div>
  </div>`;
}
