import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { Team } from '../models/Team';
import { StandupEntry } from '../models/StandupEntry';
import { calculateTeamStats } from '../services/streaks.service';

export const getOrgStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const teams = await Team.find({ category: { $ne: 'Archived' } });
    
    let totalCompliance = 0;
    let validTeamsCount = 0;

    for (const team of teams) {
      const stats = await calculateTeamStats(team._id as any);
      if (stats.memberCount > 0) {
        totalCompliance += stats.compliance;
        validTeamsCount++;
      }
    }

    const overallCompliance = validTeamsCount > 0 ? Math.round(totalCompliance / validTeamsCount) : 0;
    
    // activeStreaks - this could mean user streaks or team streaks. 
    // Spec says "Org-wide { averageSubmissionTime, activeStreaks, overallCompliance }"
    // Let's sum up team streaks > 0
    let activeStreaks = 0;
    for (const team of teams) {
      const stats = await calculateTeamStats(team._id as any);
      if (stats.streak > 0) {
        activeStreaks++;
      }
    }

    // averageSubmissionTime
    // We could calculate the average time of day for all entries today, but simple mock approach is to return a string
    // Let's actually calculate it for today's entries
    const todayStr = new Date().toISOString().split('T')[0];
    const todayEntries = await StandupEntry.find({ date: todayStr });
    
    let averageSubmissionTime = "09:00 AM";
    if (todayEntries.length > 0) {
      let totalMinutes = 0;
      for (const entry of todayEntries) {
        const d = entry.createdAt;
        totalMinutes += d.getUTCHours() * 60 + d.getUTCMinutes();
      }
      const avgMinutes = Math.floor(totalMinutes / todayEntries.length);
      const hours = Math.floor(avgMinutes / 60);
      const mins = avgMinutes % 60;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      const formattedMins = mins.toString().padStart(2, '0');
      averageSubmissionTime = `${formattedHours}:${formattedMins} ${ampm}`;
    }

    res.json({
      averageSubmissionTime,
      activeStreaks,
      overallCompliance,
    });
  } catch (error) {
    next(error);
  }
};
