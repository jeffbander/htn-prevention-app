import { Router } from 'express';
import { eq, count, sql, desc, and, gte } from 'drizzle-orm';
import { db, members, bloodPressureReadings, encounters } from '../db/index.js';

const router = Router();

// GET /api/analytics - Get all analytics data
router.get('/', async (req, res) => {
  try {
    // Total members
    const totalMembers = await db.select({ count: count() }).from(members);
    
    // Total readings
    const totalReadings = await db.select({ count: count() }).from(bloodPressureReadings);
    
    // Total encounters
    const totalEncounters = await db.select({ count: count() }).from(encounters);
    
    // HTN status distribution
    const htnDistribution = await db.select({
      htnStatus: bloodPressureReadings.htnStatus,
      count: count()
    })
    .from(bloodPressureReadings)
    .groupBy(bloodPressureReadings.htnStatus);
    
    // Union distribution
    const unionDistribution = await db.select({
      union: members.union,
      count: count()
    })
    .from(members)
    .groupBy(members.union);
    
    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentReadings = await db.select({ count: count() })
      .from(bloodPressureReadings)
      .where(gte(bloodPressureReadings.readingDate, thirtyDaysAgo));
    
    const recentEncounters = await db.select({ count: count() })
      .from(encounters)
      .where(gte(encounters.encounterDate, thirtyDaysAgo));
    
    res.json({
      overview: {
        totalMembers: totalMembers[0].count,
        totalReadings: totalReadings[0].count,
        totalEncounters: totalEncounters[0].count,
        recentReadings: recentReadings[0].count,
        recentEncounters: recentEncounters[0].count
      },
      htnDistribution,
      unionDistribution,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /api/analytics/members - Get member-specific analytics
router.get('/members', async (req, res) => {
  try {
    // Members by age group
    const membersWithAge = await db.select({
      id: members.id,
      dateOfBirth: members.dateOfBirth,
      union: members.union
    }).from(members);
    
    const ageGroups = {
      '18-30': 0,
      '31-40': 0,
      '41-50': 0,
      '51-60': 0,
      '60+': 0
    };
    
    membersWithAge.forEach(member => {
      const age = new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear();
      if (age <= 30) ageGroups['18-30']++;
      else if (age <= 40) ageGroups['31-40']++;
      else if (age <= 50) ageGroups['41-50']++;
      else if (age <= 60) ageGroups['51-60']++;
      else ageGroups['60+']++;
    });
    
    // Members with recent readings
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const membersWithRecentReadings = await db.select({
      memberId: bloodPressureReadings.memberId
    })
    .from(bloodPressureReadings)
    .where(gte(bloodPressureReadings.readingDate, thirtyDaysAgo))
    .groupBy(bloodPressureReadings.memberId);
    
    const engagementRate = (membersWithRecentReadings.length / membersWithAge.length) * 100;
    
    res.json({
      ageGroups,
      engagementRate: Math.round(engagementRate * 100) / 100,
      totalMembers: membersWithAge.length,
      activeMembers: membersWithRecentReadings.length
    });
  } catch (error) {
    console.error('Error fetching member analytics:', error);
    res.status(500).json({ error: 'Failed to fetch member analytics' });
  }
});

// GET /api/analytics/clinical - Clinical outcomes data
router.get('/clinical', async (req, res) => {
  try {
    // Latest HTN status for each member
    const latestReadings = await db.select({
      memberId: bloodPressureReadings.memberId,
      htnStatus: bloodPressureReadings.htnStatus,
      systolic: bloodPressureReadings.systolic,
      diastolic: bloodPressureReadings.diastolic,
      readingDate: bloodPressureReadings.readingDate
    })
    .from(bloodPressureReadings)
    .orderBy(desc(bloodPressureReadings.readingDate));
    
    // Group by member to get latest reading per member
    const memberLatestReadings = new Map();
    latestReadings.forEach(reading => {
      if (!memberLatestReadings.has(reading.memberId)) {
        memberLatestReadings.set(reading.memberId, reading);
      }
    });
    
    const latestReadingsArray = Array.from(memberLatestReadings.values());
    
    // Calculate clinical metrics
    const htnStatusCounts = {
      Normal: 0,
      Elevated: 0,
      'Stage 1': 0,
      'Stage 2': 0,
      Crisis: 0
    };
    
    let totalSystolic = 0;
    let totalDiastolic = 0;
    
    latestReadingsArray.forEach(reading => {
      htnStatusCounts[reading.htnStatus as keyof typeof htnStatusCounts]++;
      totalSystolic += reading.systolic;
      totalDiastolic += reading.diastolic;
    });
    
    const avgSystolic = totalSystolic / latestReadingsArray.length;
    const avgDiastolic = totalDiastolic / latestReadingsArray.length;
    
    res.json({
      htnStatusDistribution: htnStatusCounts,
      averageBloodPressure: {
        systolic: Math.round(avgSystolic * 10) / 10,
        diastolic: Math.round(avgDiastolic * 10) / 10
      },
      totalMembersWithReadings: latestReadingsArray.length,
      riskCategories: {
        lowRisk: htnStatusCounts.Normal + htnStatusCounts.Elevated,
        moderateRisk: htnStatusCounts['Stage 1'],
        highRisk: htnStatusCounts['Stage 2'] + htnStatusCounts.Crisis
      }
    });
  } catch (error) {
    console.error('Error fetching clinical analytics:', error);
    res.status(500).json({ error: 'Failed to fetch clinical analytics' });
  }
});

// GET /api/analytics/engagement - Engagement metrics
router.get('/engagement', async (req, res) => {
  try {
    // Communication type distribution
    const communicationTypes = await db.select({
      type: encounters.communicationType,
      count: count()
    })
    .from(encounters)
    .groupBy(encounters.communicationType);
    
    // Completed vs incomplete encounters
    const encounterStatus = await db.select({
      isCompleted: encounters.isCompleted,
      count: count()
    })
    .from(encounters)
    .groupBy(encounters.isCompleted);
    
    // Monthly encounter trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyEncounters = await db.select({
      month: sql<string>`DATE_TRUNC('month', ${encounters.encounterDate})`,
      count: count()
    })
    .from(encounters)
    .where(gte(encounters.encounterDate, sixMonthsAgo))
    .groupBy(sql`DATE_TRUNC('month', ${encounters.encounterDate})`)
    .orderBy(sql`DATE_TRUNC('month', ${encounters.encounterDate})`);
    
    res.json({
      communicationTypes,
      encounterStatus,
      monthlyTrends: monthlyEncounters
    });
  } catch (error) {
    console.error('Error fetching engagement analytics:', error);
    res.status(500).json({ error: 'Failed to fetch engagement analytics' });
  }
});

// GET /api/analytics/equity - Equity metrics
router.get('/equity', async (req, res) => {
  try {
    // HTN status by union
    const htnByUnion = await db.select({
      union: members.union,
      htnStatus: bloodPressureReadings.htnStatus,
      count: count()
    })
    .from(bloodPressureReadings)
    .leftJoin(members, eq(bloodPressureReadings.memberId, members.id))
    .groupBy(members.union, bloodPressureReadings.htnStatus);
    
    // Engagement by union
    const engagementByUnion = await db.select({
      union: members.union,
      encounterCount: count()
    })
    .from(encounters)
    .leftJoin(members, eq(encounters.memberId, members.id))
    .groupBy(members.union);
    
    res.json({
      htnByUnion,
      engagementByUnion
    });
  } catch (error) {
    console.error('Error fetching equity analytics:', error);
    res.status(500).json({ error: 'Failed to fetch equity analytics' });
  }
});

// GET /api/analytics/impact - Program impact metrics
router.get('/impact', async (req, res) => {
  try {
    // Calculate improvement trends (members with multiple readings)
    const memberReadingCounts = await db.select({
      memberId: bloodPressureReadings.memberId,
      readingCount: count()
    })
    .from(bloodPressureReadings)
    .groupBy(bloodPressureReadings.memberId);
    
    const membersWithMultipleReadings = memberReadingCounts.filter(m => m.readingCount > 1);
    
    // Program participation rate
    const totalMembers = await db.select({ count: count() }).from(members);
    const membersWithReadings = await db.select({
      memberId: bloodPressureReadings.memberId
    })
    .from(bloodPressureReadings)
    .groupBy(bloodPressureReadings.memberId);
    
    const participationRate = (membersWithReadings.length / totalMembers[0].count) * 100;
    
    res.json({
      participationRate: Math.round(participationRate * 100) / 100,
      membersWithMultipleReadings: membersWithMultipleReadings.length,
      totalActiveMembers: membersWithReadings.length,
      totalMembers: totalMembers[0].count
    });
  } catch (error) {
    console.error('Error fetching impact analytics:', error);
    res.status(500).json({ error: 'Failed to fetch impact analytics' });
  }
});

export { router as analyticsRouter };

