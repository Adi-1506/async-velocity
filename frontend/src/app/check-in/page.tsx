import type { Metadata } from "next";
import CheckInForm from "@/components/CheckInForm";
export const metadata: Metadata = { title: "Check in" };
export default function Page() {
  return <CheckInForm />;
}
