import type { Metadata } from "next";
import Account from "@/components/views/Account";
export const metadata: Metadata = { title: "Account & security" };
export default function Page() {
  return <Account />;
}
