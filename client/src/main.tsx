import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./global.css";

import App from "./app/App";
import { AuthProvider } from "./lib/auth-provider";
import { initErrorTracking } from "./lib/error-tracking";

// No-op unless VITE_SENTRY_DSN was set at build time.
initErrorTracking();

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

createRoot(root).render(
  <AuthProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </AuthProvider>
);
