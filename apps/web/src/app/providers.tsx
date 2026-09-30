"use client";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { store } from "@/redux/store";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { Provider } from "react-redux";
import { Toaster } from "sonner";

// Filter out React 19 false-positive warning caused by next-themes SSR theme script
if (process.env.NODE_ENV === "development") {
  const globalWithFlag = globalThis as typeof globalThis & {
    __scriptTagWarningSuppressed?: boolean;
  };

  if (!globalWithFlag.__scriptTagWarningSuppressed) {
    globalWithFlag.__scriptTagWarningSuppressed = true;
    const origError = console.error;
    console.error = (...args: unknown[]) => {
      const isScriptTagWarning = args.some(
        (arg) =>
          typeof arg === "string" &&
          arg.includes("Encountered a script tag while rendering React component")
      );
      if (isScriptTagWarning) {
        return;
      }
      origError(...args);
    };
  }
}

export default function Providers({
  children
}: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <AuthProvider>
          <Provider store={store}>{children}</Provider>
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
