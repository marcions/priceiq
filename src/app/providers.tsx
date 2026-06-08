"use client";

import { ThemeProvider } from "next-themes";
import { SidebarProvider } from "@/components/Layouts/sidebar/sidebar-context";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <SidebarProvider>
        {children}
        <Toaster richColors position="top-right" />
      </SidebarProvider>
    </ThemeProvider>
  );
}
