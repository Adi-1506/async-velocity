"use client";

import { useTeam } from "@/context/TeamContext";

export default function TeamSelector() {
  const { activeTeam, teams, setActiveTeam, loading } = useTeam();

  if (loading)
    return (
      <div className="text-on-surface-variant font-label-md">
        Loading teams...
      </div>
    );
  if (teams.length === 0)
    return <div className="text-error font-label-md">No teams available</div>;

  return (
    <div className="flex items-center gap-2 bg-surface-container-high px-3 py-1.5 rounded-full relative group">
      <span className="material-symbols-outlined text-primary text-[18px]">
        groups
      </span>
      <select
        className="bg-transparent border-none outline-none font-label-md text-label-md text-on-surface appearance-none cursor-pointer pr-4"
        value={activeTeam?._id || ""}
        onChange={(e) => {
          const t = teams.find((t) => t._id === e.target.value);
          if (t) setActiveTeam(t);
        }}
      >
        {teams.map((team) => (
          <option key={team._id} value={team._id}>
            {team.name}
          </option>
        ))}
      </select>
      <span className="material-symbols-outlined text-on-surface-variant text-[16px] absolute right-3 pointer-events-none">
        keyboard_arrow_down
      </span>
    </div>
  );
}
