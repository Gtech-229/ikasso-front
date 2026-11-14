"use client";

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Wordmark } from "@/components/wordmark";
import { AppSidebar } from "./app-sidebar";

const keepOpen = () => {};

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    // Always open on desktop (no collapse control); the phone sheet has its own state.
    <SidebarProvider open onOpenChange={keepOpen}>
      <AppSidebar />
      <SidebarInset className="bg-canvas">
        <header className="flex h-14 items-center gap-3 border-b bg-ink px-4 text-surface md:hidden">
          <SidebarTrigger
            aria-label="Ouvrir le menu"
            className="size-11 text-surface hover:bg-surface/10 hover:text-surface"
          />
          <Wordmark className="[&>span:first-child]:size-8" />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
