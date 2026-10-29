import type { Metadata } from "next";
import Link from "next/link";
import AuthLayout from "@/components/AuthLayout";
import MfaRecovery from "@/components/MfaRecovery";
export const metadata: Metadata = { title: "Recover your account" };
export default function Page() {
  return (
    <AuthLayout
      title="Recover authenticator access"
      lede="Lost the device with your authenticator app? Use your password and one of your saved recovery codes. This turns off two-step verification, signs you out everywhere, and cancels all your other recovery codes."
      footer={
        <p>
          <Link href="/login">Back to sign in</Link>
        </p>
      }
    >
      <MfaRecovery recover />
    </AuthLayout>
  );
}
