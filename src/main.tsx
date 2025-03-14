import "./index.css"

import { QueryClientProvider } from "@tanstack/react-query"
import { createRoot } from "react-dom/client"

import queryClient from "~/utils/query-client.util.ts"

import App from "./App.tsx"

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
)
