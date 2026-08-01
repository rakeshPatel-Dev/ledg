import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AppProviders from "./providers";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppProviders />
    </QueryClientProvider>
  );
}
