import type { Metadata } from "next";
import History from "@/components/History";
export const metadata: Metadata = { title: "My check-ins" };
export default function Page() {
  return <History />;
}
