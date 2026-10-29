import type { Metadata } from "next";
import TeamSettings from "@/components/views/TeamSettings";
export const metadata: Metadata = { title: "Team settings" };
export default function Page() {
  return <TeamSettings />;
}
