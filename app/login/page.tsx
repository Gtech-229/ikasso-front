import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading, AuthLayout } from "@/components/auth-layout";
import { LoginForm, LoginPending } from "./login-form";

export const metadata: Metadata = {
  title: "Connexion · Ikasso Administration",
};

// Mockup 45.
export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthHeading title="Connexion" intro="Espace réservé à l’équipe Ikasso." />
      <Suspense fallback={<LoginPending />}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
