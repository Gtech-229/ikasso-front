import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthLayout } from "@/components/auth-layout";
import { PasswordFlow } from "./password-flow";

export const metadata: Metadata = {
  title: "Mot de passe · Ikasso Administration",
  // The emailed token is in this page's URL: never send it to another site.
  referrer: "no-referrer",
};

// One page for both link modes, like the API: `mode` and `token` decide the state.
export default function PasswordPage() {
  return (
    <AuthLayout>
      <Suspense
        fallback={
          <p role="status" className="py-10 text-center text-[15px] text-muted-ink">
            Chargement…
          </p>
        }
      >
        <PasswordFlow />
      </Suspense>
    </AuthLayout>
  );
}
