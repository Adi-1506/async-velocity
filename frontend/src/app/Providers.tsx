"use client";

import { ReactNode } from "react";
import { TeamProvider } from "@/context/TeamContext";

export function Providers({ children }: { children: ReactNode }) {
  return <TeamProvider>{children}</TeamProvider>;
}
