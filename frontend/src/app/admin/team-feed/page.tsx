import type { Metadata } from "next";
import Feed from "@/components/Feed";
export const metadata: Metadata = { title: "Team feed" };
export default function Page() {
  return <Feed />;
}
