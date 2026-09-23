import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthForm } from "@/components/dashboard/auth-form";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: true },
};

export default function Page() {
  return (
    <main id="main">
      <Suspense fallback={<Spinner />}>
        <AuthForm mode="login" />
      </Suspense>
    </main>
  );
}
