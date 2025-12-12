import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";

// Helper function to show error overlay without conflicting with React
function showErrorOverlay(title: string, message: string, stack?: string) {
  // Check if error overlay already exists
  let overlay = document.getElementById('global-error-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'global-error-overlay';
    document.body.appendChild(overlay);
  }
  
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #ff6b6b;
    font-family: monospace;
    background: rgba(10, 10, 10, 0.98);
    text-align: left;
    overflow: auto;
  `;
  
  overlay.innerHTML = `
    <h1 style="margin-bottom: 10px; color: #ff6b6b;">⚠️ ${title}</h1>
    <pre style="background: #1a1a1a; padding: 15px; border: 1px solid #ff6b6b; border-radius: 8px; max-width: 700px; overflow: auto; color: #fca5a5; white-space: pre-wrap; word-wrap: break-word; font-size: 13px;">${message}${stack ? '\n\n' + stack : ''}</pre>
    <button onclick="document.getElementById('global-error-overlay').remove(); location.reload();" style="padding: 12px 24px; margin-top: 20px; cursor: pointer; background: #ff6b6b; color: #000; border: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
      Refresh Page
    </button>
  `;
}

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ Unhandled promise rejection:', event.reason);
  const errorMsg = event.reason?.message || String(event.reason);
  const errorStack = event.reason?.stack || '';
  showErrorOverlay('Unhandled Promise Rejection', errorMsg, errorStack);
});

// Global error handler for runtime errors
window.addEventListener('error', (event) => {
  console.error('❌ Runtime error:', event.error);
  const errorMsg = event.error?.message || event.message || String(event.error);
  const errorStack = event.error?.stack || '';
  showErrorOverlay(`Runtime Error`, errorMsg, errorStack);
});

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

try {
  // App render
  createRoot(root).render(<App />);
} catch (error) {
  console.error("Failed to render app:", error);
  showErrorOverlay('Application Failed to Start', (error as Error).message, (error as Error).stack);
}
