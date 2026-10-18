export type Role = "member" | "admin" | "superadmin";

export interface User {
  _id: string;
  publicId: string;
  name: string;
  email: string;
  role: Role;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  team?: Team | string;
  createdBy?: User | string;
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  _id: string;
  publicId: string;
  name: string;
  superAdmin: User | string;
  admins: User[] | string[];
  members: User[] | string[];
  standupTime: string;
  timezone: string;
  digestFrequency: "daily" | "weekly";
  workdays: number[];
  createdAt: string;
  updatedAt: string;
}

export interface Standup {
  _id: string;
  publicId: string;
  user: User;
  team: Team;
  yesterday: string;
  today: string;
  blockers: string;
  mood: "great" | "good" | "meh" | "blocked";
  isLate: boolean;
  blockerStatus?: "open" | "resolved";
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  _id: string;
  user: User | string;
  team?: Team | string;
  type: "reminder" | "digest_ready" | "missed_standup" | "promoted_to_admin";
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Digest {
  _id: string;
  publicId: string;
  team: Team | string;
  period: { from: string; to: string };
  standups: Standup[] | string[];
  participationRate: number;
  blockerCount: number;
  summary: string;
  createdAt: string;
  updatedAt: string;
}
