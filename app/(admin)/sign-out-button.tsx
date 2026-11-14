"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api/admin-auth";

/** Icon button for the sidebar admin card. */
export function SignOutButton() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      // A full page load: nothing of the ended session stays in memory.
      window.location.replace("/login");
    },
    // The session is still open: the admin stays where they are.
    onError: (error) => toast.error(error.message),
  });
  const busy = mutation.isPending || mutation.isSuccess;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 shrink-0 text-sidebar-foreground hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
      aria-label={busy ? "Déconnexion…" : "Se déconnecter"}
      title="Se déconnecter"
      disabled={busy}
      onClick={() => mutation.mutate()}
    >
      <LogOut />
    </Button>
  );
}
