import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
export const metadata: Metadata = { title: "Confirm your email" };
export default function Page() {
  return <AuthForm mode="verify" />;
}
