"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Team, User } from "@/types";
import { api, message } from "@/lib/api";
type Context = {
  teams: Team[];
  activeTeam: Team | null;
  setActiveTeam: (t: Team | null) => void;
  loading: boolean;
  user: User | null;
  error: string;
  refresh: () => Promise<void>;
};
const TeamContext = createContext<Context | undefined>(undefined);
export function TeamProvider({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [teams, setTeams] = useState<Team[]>([]),
    [activeTeam, setTeam] = useState<Team | null>(null),
    [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const u = await api<User>("/api/auth/me");
      setUser(u);
      const data = await api<Team[]>("/api/teams?limit=100");
      setTeams(data);
      const saved = localStorage.getItem("activeTeamId");
      setTeam(data.find((t) => t._id === saved) || data[0] || null);
    } catch (e) {
      setUser(null);
      setTeams([]);
      setTeam(null);
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (
      [
        "/login",
        "/register",
        "/admin/login",
        "/forgot-password",
        "/reset-password",
        "/verify-email",
      ].includes(path)
    ) {
      setLoading(false);
      return;
    }
    void refresh();
  }, [path, refresh]);
  function select(t: Team | null) {
    setTeam(t);
    if (t) localStorage.setItem("activeTeamId", t._id);
    else localStorage.removeItem("activeTeamId");
  }
  return (
    <TeamContext.Provider
      value={{
        teams,
        activeTeam,
        setActiveTeam: select,
        loading,
        user,
        error,
        refresh,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
}
export function useTeam() {
  const v = useContext(TeamContext);
  if (!v) throw new Error("TeamProvider is required");
  return v;
}
