import type { Metadata } from "next";
import Members from "@/components/views/Members";
export const metadata: Metadata = { title: "Members" };
export default function Page() {
  return <Members />;
}
