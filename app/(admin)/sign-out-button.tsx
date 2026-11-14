"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/api/admin-auth";

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
    <Button variant="action" disabled={busy} onClick={() => mutation.mutate()}>
      {busy ? "Déconnexion…" : "Se déconnecter"}
    </Button>
  );
}
