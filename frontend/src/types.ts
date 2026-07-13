export interface UserProfile {
  name: string;
  avatar: string;
  role: 'member' | 'lead' | 'admin';
  title: string;
  email: string;
  timezone: string;
  githubConnected: boolean;
  githubReposType: 'all' | 'selected';
  selectedRepos: string[];
  slackConnected: boolean;
  teamsConnected: boolean;
  emailDigest: boolean;
  reminderTime: string;
  reminderFrequency: 'daily' | 'weekdays' | 'custom';
  teamId?: string;
  teamName?: string;
  uuid?: string;
}

export interface StandupEntry {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string;
  timestamp: string;
  date: string; // YYYY-MM-DD
  done: string[];
  doing: string[];
  blockers: string[];
  comments: Comment[];
  reactions: Record<string, number>;
  userReactions?: string[];
  isMockTyping?: boolean;
}

export interface Comment {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: string;
}

export interface Team {
  id: string;
  name: string;
  category: 'Active' | 'Underperforming' | 'Archived';
  compliance: number; // 0 to 100
  memberCount: number;
  scheduleHour: string; // e.g. "09:00"
  timezone: string;
  questions: any[];
  streak: number;
  members: {
    id?: string;
    name: string;
    avatar: string;
    role: string;
    lastSubmitted: string;
    hasSubmittedToday: boolean;
    streak: number;
  }[];
}

export interface SystemStats {
  averageSubmissionTime: string;
  activeStreaks: number;
  overallCompliance: number;
}
