import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User } from './models/User';
import { Team } from './models/Team';
import { StandupEntry } from './models/StandupEntry';

dotenv.config();

// Replicating data.ts for seeding
const INITIAL_TEAMS = [
  {
    name: "Core Infrastructure",
    category: "Active",
    scheduleHour: "09:00",
    timezone: "UTC-8",
    questions: [
      { text: "What did you merge or ship yesterday?" },
      { text: "What is your high-priority objective today?" },
      { text: "Are there any infrastructure or deployment blocks?" }
    ],
    members: [
      { name: "Alex Rivera", avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100", role: "Senior SRE" },
      { name: "Marcus Chen", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100", role: "Staff Engineer" },
      { name: "David Kim", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100", role: "Backend Architect" },
      // Sarah is added separately as the main user
      { name: "Elena Rostova", avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100", role: "Database Engineer" },
      { name: "Michael Chang", avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100", role: "Infrastructure Security" }
    ]
  },
  {
    name: "Mobile Experience",
    category: "Active",
    scheduleHour: "10:00",
    timezone: "UTC-5",
    questions: [
      { text: "What did you build yesterday?" },
      { text: "What are you focused on today?" },
      { text: "Any dependencies on backend API or App Store?" }
    ],
    members: [
      { name: "Tariq Mahmood", avatar: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100", role: "Android Developer" },
      { name: "Lisa Wong", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100", role: "iOS Developer" },
      { name: "Arnaud Dubois", avatar: "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=100", role: "UI/UX Designer" }
    ]
  },
  {
    name: "Security & Auth",
    category: "Underperforming",
    scheduleHour: "09:30",
    timezone: "UTC+1",
    questions: [
      { text: "What was yesterday's vulnerability checklist?" },
      { text: "What's the main security objective today?" },
      { text: "Any blockers or pending external audits?" }
    ],
    members: [
      { name: "Zoe Kravitz", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100", role: "Security Analyst" },
      { name: "James MacAvoy", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100", role: "Security Lead" },
      { name: "Sophia Martinez", avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100", role: "Compliance Lead" }
    ]
  },
  {
    name: "Legacy Integrations",
    category: "Archived",
    scheduleHour: "17:00",
    timezone: "UTC-8",
    questions: [
      { text: "Yesterday?" },
      { text: "Today?" },
      { text: "Blockers?" }
    ],
    members: []
  }
];

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('MongoDB Connected for Seeding');

    // Reset DB
    await User.deleteMany();
    await Team.deleteMany();
    await StandupEntry.deleteMany();

    // Create Teams and Members
    const createdTeams: Record<string, any> = {};
    const createdUsers: Record<string, any> = {};

    const salt = await bcrypt.genSalt(10);
    const defaultPassword = await bcrypt.hash('Password123!', salt);

    for (const t of INITIAL_TEAMS) {
      const team = await Team.create({
        name: t.name,
        category: t.category,
        scheduleHour: t.scheduleHour,
        timezone: t.timezone,
        questions: t.questions,
      });
      createdTeams[t.name] = team;

      for (const m of t.members) {
        const email = `${m.name.split(' ')[0].toLowerCase()}@asyncvelocity.internal`;
        const user = await User.create({
          name: m.name,
          email,
          passwordHash: defaultPassword,
          title: m.role,
          avatar: m.avatar,
          teamId: team._id,
        });
        createdUsers[m.name] = user;
      }
    }

    // Add Demo User (Sarah)
    const sarah = await User.create({
      name: "Sarah Jenkins",
      email: "sarah@asyncvelocity.internal",
      passwordHash: defaultPassword,
      role: 'lead',
      title: 'Tech Lead',
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      timezone: "UTC-8 (Pacific Standard Time)",
      teamId: createdTeams["Core Infrastructure"]._id,
      githubConnected: true,
      githubReposType: 'selected',
      selectedRepos: ['velocity-engine', 'async-core-api'],
      slackConnected: true,
      teamsConnected: false,
      emailDigest: true,
      reminderTime: "08:45",
      reminderFrequency: 'weekdays',
    });
    createdUsers[sarah.name] = sarah;

    // Add Admin Demo User
    await User.create({
      name: "CTO Admin",
      email: "cto@asyncvelocity.internal",
      passwordHash: defaultPassword,
      role: 'admin',
      title: 'CTO',
      avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    });

    console.log('Users and Teams seeded!');

    // Seed some Standups
    const today = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
    const yesterday = yesterdayDate.toISOString().split('T')[0];
    const twoDaysAgoDate = new Date();
    twoDaysAgoDate.setUTCDate(twoDaysAgoDate.getUTCDate() - 2);
    const twoDaysAgo = twoDaysAgoDate.toISOString().split('T')[0];

    await StandupEntry.create([
      {
        userId: createdUsers["Alex Rivera"]._id,
        teamId: createdTeams["Core Infrastructure"]._id,
        date: today,
        done: ["Finished migrating DB replica nodes to us-east-4 in production.", "Optimized elastic search write buffering pool - decreased CPU load by 14%."],
        doing: ["Setting up terraform scripts for staging cluster auto-scaling thresholds.", "Monitoring the load balancer latency metrics after midday traffic spikes."],
        comments: [
          { userId: createdUsers["Elena Rostova"]._id, text: "The DB replica migration feels incredibly snappy now. Major kudos, Alex!" }
        ],
        reactions: [
          { emoji: "👍", userId: sarah._id },
          { emoji: "🔥", userId: sarah._id }
        ],
      },
      {
        userId: createdUsers["Marcus Chen"]._id,
        teamId: createdTeams["Core Infrastructure"]._id,
        date: today,
        done: ["Merged the critical auth cookie mitigation hotfix (PR #1420).", "Drafted the RFC for unified GraphQL subscriptions schema architecture."],
        doing: ["Refactoring main entry routing controller to eliminate triple redirection overhead."],
        blockers: ["Awaiting security sign-off from Zoe on the new authorization token scope layout."],
      },
      {
        userId: createdUsers["David Kim"]._id,
        teamId: createdTeams["Core Infrastructure"]._id,
        date: yesterday,
        done: ["Refactored batch-update controller to use optimized chunk-by-chunk queueing."],
        doing: ["Writing backend integration tests for payment ledger webhooks."],
        blockers: ["Stuck on intermittent Stripe webhook signature verification failures."],
      },
      // Sarah's history
      {
        userId: sarah._id,
        teamId: createdTeams["Core Infrastructure"]._id,
        date: today,
        done: ["Conducted weekly system architecture walkthrough for new core engineering team hires."],
        doing: ["Reviewing mobile team architecture proposal for offline data synchronization."],
      },
      {
        userId: sarah._id,
        teamId: createdTeams["Core Infrastructure"]._id,
        date: yesterday,
        done: ["Approved PR #1399 for the unified telemetry logging schema controller."],
        doing: ["Configuring Datadog alerts with custom anomaly detection bounds for key endpoints."],
      },
      {
        userId: sarah._id,
        teamId: createdTeams["Core Infrastructure"]._id,
        date: twoDaysAgo,
        done: ["Completed database schema migration proposal for multi-tenant isolation filters."],
        doing: ["Refining index indexing configurations to alleviate read bottleneck on historical charts."],
      },
    ]);

    console.log('Standups seeded!');
    process.exit(0);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedData();
