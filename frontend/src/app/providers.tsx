"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { EditorProvider } from "@/context/EditorContext";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EditorProvider>{children}</EditorProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
