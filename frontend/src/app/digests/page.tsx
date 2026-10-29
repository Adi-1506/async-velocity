import type { Metadata } from "next";
import Summaries from "@/components/views/Summaries";
export const metadata: Metadata = { title: "Summaries" };
export default function Page() {
  return <Summaries />;
}
