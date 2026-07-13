import { Team, StandupEntry, UserProfile } from './types';

const today = new Date().toISOString().split('T')[0];
const yesterdayDate = new Date();
yesterdayDate.setDate(yesterdayDate.getDate() - 1);
const yesterday = yesterdayDate.toISOString().split('T')[0];
const twoDaysAgoDate = new Date();
twoDaysAgoDate.setDate(twoDaysAgoDate.getDate() - 2);
const twoDaysAgo = twoDaysAgoDate.toISOString().split('T')[0];

export const INITIAL_USER_PROFILE: UserProfile = {
  name: "Sarah Jenkins",
  avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
  timezone: "UTC-8 (Pacific Standard Time)",
  githubConnected: true,
  githubReposType: 'selected',
  selectedRepos: ['velocity-engine', 'async-core-api'],
  slackConnected: true,
  teamsConnected: false,
  emailDigest: true,
  reminderTime: "08:45",
  reminderFrequency: 'weekdays',
  role: 'lead',
  title: 'Tech Lead',
  email: 'sarah@asyncvelocity.internal',
};

export const INITIAL_TEAMS: Team[] = [
  {
    id: "t1",
    name: "Core Infrastructure",
    category: "Active",
    compliance: 94,
    memberCount: 8,
    scheduleHour: "09:00",
    timezone: "UTC-8",
    streak: 18,
    questions: [
      "What did you merge or ship yesterday?",
      "What is your high-priority objective today?",
      "Are there any infrastructure or deployment blocks?"
    ],
    members: [
      { name: "Alex Rivera", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100", role: "Senior SRE", lastSubmitted: "08:45 AM", hasSubmittedToday: true, streak: 12 },
      { name: "Marcus Chen", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", role: "Staff Engineer", lastSubmitted: "09:02 AM", hasSubmittedToday: true, streak: 24 },
      { name: "David Kim", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", role: "Backend Architect", lastSubmitted: "Pending", hasSubmittedToday: false, streak: 0 },
      { name: "Sarah Jenkins", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150", role: "Tech Lead", lastSubmitted: "09:15 AM", hasSubmittedToday: true, streak: 15 },
      { name: "Elena Rostova", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100", role: "Database Engineer", lastSubmitted: "08:12 AM", hasSubmittedToday: true, streak: 8 },
      { name: "Michael Chang", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100", role: "Infrastructure Security", lastSubmitted: "09:30 AM", hasSubmittedToday: true, streak: 14 }
    ]
  },
  {
    id: "t2",
    name: "Mobile Experience",
    category: "Active",
    compliance: 88,
    memberCount: 5,
    scheduleHour: "10:00",
    timezone: "UTC-5",
    streak: 9,
    questions: [
      "What did you build yesterday?",
      "What are you focused on today?",
      "Any dependencies on backend API or App Store?"
    ],
    members: [
      { name: "Tariq Mahmood", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100", role: "Android Developer", lastSubmitted: "10:15 AM", hasSubmittedToday: true, streak: 9 },
      { name: "Lisa Wong", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", role: "iOS Developer", lastSubmitted: "09:45 AM", hasSubmittedToday: true, streak: 18 },
      { name: "Arnaud Dubois", avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=100", role: "UI/UX Designer", lastSubmitted: "Pending", hasSubmittedToday: false, streak: 0 }
    ]
  },
  {
    id: "t3",
    name: "Security & Auth",
    category: "Underperforming",
    compliance: 62,
    memberCount: 4,
    scheduleHour: "09:30",
    timezone: "UTC+1",
    streak: 2,
    questions: [
      "What was yesterday's vulnerability checklist?",
      "What's the main security objective today?",
      "Any blockers or pending external audits?"
    ],
    members: [
      { name: "Zoe Kravitz", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100", role: "Security Analyst", lastSubmitted: "Pending", hasSubmittedToday: false, streak: 0 },
      { name: "James MacAvoy", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100", role: "Security Lead", lastSubmitted: "09:20 AM", hasSubmittedToday: true, streak: 4 },
      { name: "Sophia Martinez", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100", role: "Compliance Lead", lastSubmitted: "Pending", hasSubmittedToday: false, streak: 0 }
    ]
  },
  {
    id: "t4",
    name: "Legacy Integrations",
    category: "Archived",
    compliance: 0,
    memberCount: 3,
    scheduleHour: "17:00",
    timezone: "UTC-8",
    streak: 0,
    questions: [
      "Yesterday?",
      "Today?",
      "Blockers?"
    ],
    members: []
  }
];

export const INITIAL_FEED_ENTRIES: StandupEntry[] = [
  {
    id: "f1",
    userId: "u1",
    userName: "Alex Rivera",
    userAvatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100",
    userRole: "Senior SRE",
    timestamp: "8:45 AM Today",
    date: today,
    done: [
      "Finished migrating DB replica nodes to us-east-4 in production.",
      "Optimized elastic search write buffering pool - decreased CPU load by 14%."
    ],
    doing: [
      "Setting up terraform scripts for staging cluster auto-scaling thresholds.",
      "Monitoring the load balancer latency metrics after midday traffic spikes."
    ],
    blockers: [],
    comments: [
      {
        id: "c1",
        userName: "Elena Rostova",
        userAvatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100",
        text: "The DB replica migration feels incredibly snappy now. Major kudos, Alex!",
        timestamp: "9:05 AM"
      }
    ],
    reactions: { "👍": 6, "🔥": 4, "🙌": 3 }
  },
  {
    id: "f2",
    userId: "u2",
    userName: "Marcus Chen",
    userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
    userRole: "Staff Engineer",
    timestamp: "9:02 AM Today",
    date: today,
    done: [
      "Merged the critical auth cookie mitigation hotfix (PR #1420).",
      "Drafted the RFC for unified GraphQL subscriptions schema architecture."
    ],
    doing: [
      "Refactoring main entry routing controller to eliminate triple redirection overhead.",
      "Code review session with mobile developers on authentication interceptor rules."
    ],
    blockers: [
      "Awaiting security sign-off from Zoe on the new authorization token scope layout."
    ],
    comments: [],
    reactions: { "👍": 4, "💡": 2 }
  },
  {
    id: "f3",
    userId: "u3",
    userName: "David Kim",
    userAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100",
    userRole: "Backend Architect",
    timestamp: "9:12 AM Yesterday",
    date: yesterday,
    done: [
      "Refactored batch-update controller to use optimized chunk-by-chunk queueing.",
      "Fixed local dev Docker orchestration container health check loop."
    ],
    doing: [
      "Writing backend integration tests for payment ledger webhooks.",
      "Drafting architecture plan for Async Event Bus implementation next sprint."
    ],
    blockers: [
      "Stuck on intermittent Stripe webhook signature verification failures in sandbox environment."
    ],
    comments: [
      {
        id: "c2",
        userName: "Marcus Chen",
        userAvatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100",
        text: "I can take a look at the sandbox webhook failure with you after our 11:30 sync. I recall a similar API version mismatch issue.",
        timestamp: "10:10 AM Yesterday"
      }
    ],
    reactions: { "👀": 2, "🧠": 3 }
  }
];

export const PERSONAL_HISTORY_ENTRIES: StandupEntry[] = [
  {
    id: "h1",
    userId: "self",
    userName: "Sarah Jenkins",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    userRole: "Tech Lead",
    timestamp: "09:15 AM Today",
    date: today,
    done: [
      "Conducted weekly system architecture walkthrough for new core engineering team hires.",
      "Shipped final revision of telemetry logging schema validator to staging."
    ],
    doing: [
      "Reviewing mobile team architecture proposal for offline data synchronization.",
      "Pairing with SRE team to configure canary deployment weights on production router."
    ],
    blockers: [],
    comments: [],
    reactions: { "👍": 3, "🙌": 2 }
  },
  {
    id: "h2",
    userId: "self",
    userName: "Sarah Jenkins",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    userRole: "Tech Lead",
    timestamp: "09:02 AM Yesterday",
    date: yesterday,
    done: [
      "Approved PR #1399 for the unified telemetry logging schema controller.",
      "Resolved infinite event trigger recursive loop in client side analytic listeners."
    ],
    doing: [
      "Configuring Datadog alerts with custom anomaly detection bounds for key endpoints.",
      "Scheduling upcoming system failover simulation drill next Thursday."
    ],
    blockers: [],
    comments: [],
    reactions: { "👍": 2 }
  },
  {
    id: "h3",
    userId: "self",
    userName: "Sarah Jenkins",
    userAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    userRole: "Tech Lead",
    timestamp: "08:55 AM - 2 Days Ago",
    date: twoDaysAgo,
    done: [
      "Completed database schema migration proposal for multi-tenant isolation filters.",
      "Delivered production deployment of core billing rate recalculation scheduler."
    ],
    doing: [
      "Refining index indexing configurations to alleviate read bottleneck on historical charts.",
      "Drafting upcoming release notes for Async Velocity integration release v2.4.0."
    ],
    blockers: [],
    comments: [],
    reactions: { "👍": 4, "🔥": 2 }
  }
];
