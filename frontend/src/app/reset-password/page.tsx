import type { Metadata } from "next";
import AuthForm from "@/components/AuthForm";
export const metadata: Metadata = { title: "Choose a new password" };
export default function Page() {
  return <AuthForm mode="reset" />;
}
