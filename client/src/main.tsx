import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./global.css";

import App from "./app/App";
import { AuthProvider } from "./lib/auth-provider";

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