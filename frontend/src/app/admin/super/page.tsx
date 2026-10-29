import type { Metadata } from "next";
import AllTeams from "@/components/views/AllTeams";
export const metadata: Metadata = { title: "All teams" };
export default function Page() {
  return <AllTeams />;
}
