import { Router } from 'express';
import { db } from '../db/index.js';
import { members, bloodPressureReadings, encounters } from '../db/schema.js';
import { authenticateToken, requireRole } from './auth.js';
import { sql, eq, gte, lte, and, count, desc } from 'drizzle-orm';

const router = Router();

// Apply authentication and super admin role requirement to all routes
router.use(authenticateToken);
router.use(requireRole(['super_admin']));

// Get daily readings by union for today
router.get('/daily-readings', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyReadings = await db
      .select({
        union: members.union,
        count: count(bloodPressureReadings.id),
        normalCount: sql<number>`COUNT(CASE WHEN ${bloodPressureReadings.htnStatus} = 'Normal' THEN 1 END)`,
        elevatedCount: sql<number>`COUNT(CASE WHEN ${bloodPressureReadings.htnStatus} = 'Elevated' THEN 1 END)`,
        stage1Count: sql<number>`COUNT(CASE WHEN ${bloodPressureReadings.htnStatus} = 'Stage 1' THEN 1 END)`,
        stage2Count: sql<number>`COUNT(CASE WHEN ${bloodPressureReadings.htnStatus} = 'Stage 2' THEN 1 END)`,
        crisisCount: sql<number>`COUNT(CASE WHEN ${bloodPressureReadings.htnStatus} = 'Crisis' THEN 1 END)`
      })
      .from(bloodPressureReadings)
      .innerJoin(members, eq(bloodPressureReadings.memberId, members.id))
      .where(
        and(
          gte(bloodPressureReadings.readingDate, today),
          lte(bloodPressureReadings.readingDate, tomorrow)
        )
      )
      .groupBy(members.union);

    res.json({
      date: today.toISOString().split('T')[0],
      readings: dailyReadings
    });
  } catch (error) {
    console.error('Daily readings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get enrollment metrics by union for a specified time period
router.get('/enrollment-metrics', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const enrollmentMetrics = await db
      .select({
        union: members.union,
        count: count(members.id)
      })
      .from(members)
      .where(
        and(
          gte(members.createdAt, start),
          lte(members.createdAt, end)
        )
      )
      .groupBy(members.union);

    // Get total enrollments for each union (all time)
    const totalEnrollments = await db
      .select({
        union: members.union,
        total: count(members.id)
      })
      .from(members)
      .groupBy(members.union);

    res.json({
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      },
      newEnrollments: enrollmentMetrics,
      totalEnrollments: totalEnrollments
    });
  } catch (error) {
    console.error('Enrollment metrics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get activity statistics (calls, encounters, etc.)
router.get('/activity-stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get encounter statistics by union
    const encounterStats = await db
      .select({
        union: members.union,
        totalEncounters: count(encounters.id),
        completedEncounters: sql<number>`COUNT(CASE WHEN ${encounters.isCompleted} = true THEN 1 END)`,
        phoneEncounters: sql<number>`COUNT(CASE WHEN ${encounters.communicationType} = 'Phone' THEN 1 END)`,
        textEncounters: sql<number>`COUNT(CASE WHEN ${encounters.communicationType} = 'Text' THEN 1 END)`,
        emailEncounters: sql<number>`COUNT(CASE WHEN ${encounters.communicationType} = 'Email' THEN 1 END)`,
        inPersonEncounters: sql<number>`COUNT(CASE WHEN ${encounters.communicationType} = 'In-Person' THEN 1 END)`
      })
      .from(encounters)
      .innerJoin(members, eq(encounters.memberId, members.id))
      .where(
        and(
          gte(encounters.encounterDate, start),
          lte(encounters.encounterDate, end)
        )
      )
      .groupBy(members.union);

    // Get blood pressure reading statistics
    const readingStats = await db
      .select({
        union: members.union,
        totalReadings: count(bloodPressureReadings.id),
        avgSystolic: sql<number>`ROUND(AVG(${bloodPressureReadings.systolic}), 1)`,
        avgDiastolic: sql<number>`ROUND(AVG(${bloodPressureReadings.diastolic}), 1)`
      })
      .from(bloodPressureReadings)
      .innerJoin(members, eq(bloodPressureReadings.memberId, members.id))
      .where(
        and(
          gte(bloodPressureReadings.readingDate, start),
          lte(bloodPressureReadings.readingDate, end)
        )
      )
      .groupBy(members.union);

    res.json({
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      },
      encounterStats: encounterStats,
      readingStats: readingStats
    });
  } catch (error) {
    console.error('Activity stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get comprehensive dashboard overview
router.get('/dashboard-overview', async (req, res) => {
  try {
    // Get total members by union
    const membersByUnion = await db
      .select({
        union: members.union,
        count: count(members.id)
      })
      .from(members)
      .groupBy(members.union);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentReadings = await db
      .select({
        union: members.union,
        count: count(bloodPressureReadings.id)
      })
      .from(bloodPressureReadings)
      .innerJoin(members, eq(bloodPressureReadings.memberId, members.id))
      .where(gte(bloodPressureReadings.readingDate, sevenDaysAgo))
      .groupBy(members.union);

    const recentEncounters = await db
      .select({
        union: members.union,
        count: count(encounters.id)
      })
      .from(encounters)
      .innerJoin(members, eq(encounters.memberId, members.id))
      .where(gte(encounters.encounterDate, sevenDaysAgo))
      .groupBy(members.union);

    // Get high-risk members (Stage 2 and Crisis) - SQLite compatible version
    const highRiskMembers = await db
      .select({
        union: members.union,
        count: sql<number>`COUNT(DISTINCT ${members.id})`
      })
      .from(members)
      .innerJoin(bloodPressureReadings, eq(members.id, bloodPressureReadings.memberId))
      .where(
        sql`${bloodPressureReadings.htnStatus} IN ('Stage 2', 'Crisis')`
      )
      .groupBy(members.union);

    res.json({
      membersByUnion: membersByUnion,
      recentActivity: {
        readings: recentReadings,
        encounters: recentEncounters
      },
      highRiskMembers: highRiskMembers,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get recent readings with member details (for the daily readings list)
router.get('/recent-readings-detailed', async (req, res) => {
  try {
    const { date, union } = req.query;
    
    // Default to today if no date provided
    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    let whereConditions = and(
      gte(bloodPressureReadings.readingDate, targetDate),
      lte(bloodPressureReadings.readingDate, nextDay)
    );

    // Add union filter if specified
    if (union && union !== 'all') {
      whereConditions = and(
        whereConditions,
        eq(members.union, union as string)
      );
    }

    const recentReadings = await db
      .select({
        id: bloodPressureReadings.id,
        systolic: bloodPressureReadings.systolic,
        diastolic: bloodPressureReadings.diastolic,
        heartRate: bloodPressureReadings.heartRate,
        htnStatus: bloodPressureReadings.htnStatus,
        readingDate: bloodPressureReadings.readingDate,
        member: {
          id: members.id,
          firstName: members.firstName,
          lastName: members.lastName,
          employeeId: members.employeeId,
          union: members.union
        }
      })
      .from(bloodPressureReadings)
      .innerJoin(members, eq(bloodPressureReadings.memberId, members.id))
      .where(whereConditions)
      .orderBy(desc(bloodPressureReadings.readingDate))
      .limit(100);

    res.json({
      date: targetDate.toISOString().split('T')[0],
      union: union || 'all',
      readings: recentReadings
    });
  } catch (error) {
    console.error('Recent readings detailed error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as adminAnalyticsRouter };

