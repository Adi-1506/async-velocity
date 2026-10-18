import Link from "next/link";
import MfaRecovery from "@/components/MfaRecovery";
export default function Page() {
  return (
    <main className="auth-page">
      <div className="auth-card">
        <MfaRecovery recover />
        <Link href="/login">Return to sign in</Link>
      </div>
    </main>
  );
}
