import { createRoot } from "react-dom/client";

import { APP_NAME, type ApiResponse, type Transaction } from "@ledg/shared";

import App from "./app/App";
import { BrowserRouter } from "react-router-dom";
import { ClerkProvider } from "@clerk/react";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

const transaction: Transaction = {
  id: "1",
  spaceId: "s1",
  category: "Food",
  type: "expense",
  amount: 350,
  note: "Coffee",
  date: new Date().toISOString(),
  tags: [],
  paymentMethod: "cash",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

const response: ApiResponse<Transaction> = { success: true, data: transaction };

createRoot(root).render(
  <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
  <BrowserRouter>
    <App />
  </BrowserRouter>
  </ClerkProvider>
);

console.log(`Booting ${APP_NAME}`, response);
