import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db, medicalHistory, members, type NewMedicalHistory } from '../db/index.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const medicalHistorySchema = z.object({
  memberId: z.string().uuid(),
  condition: z.string().min(1).max(200),
  notes: z.string().optional(),
  reportedDate: z.string().datetime()
});

// GET /api/members/:memberId/medical-history - Get member's medical history
router.get('/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    // Check if member exists
    const member = await db.select().from(members).where(eq(members.id, memberId));
    
    if (member.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const history = await db.select()
      .from(medicalHistory)
      .where(eq(medicalHistory.memberId, memberId))
      .orderBy(desc(medicalHistory.reportedDate));
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching medical history:', error);
    res.status(500).json({ error: 'Failed to fetch medical history' });
  }
});

// POST /api/medical-history - Create medical history entry
router.post('/', async (req, res) => {
  try {
    const validatedData = medicalHistorySchema.parse(req.body);
    
    // Check if member exists
    const member = await db.select().from(members).where(eq(members.id, validatedData.memberId));
    
    if (member.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const newHistory: NewMedicalHistory = {
      ...validatedData,
      reportedDate: new Date(validatedData.reportedDate)
    };
    
    const [createdHistory] = await db.insert(medicalHistory).values(newHistory).returning();
    
    res.status(201).json(createdHistory);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating medical history:', error);
    res.status(500).json({ error: 'Failed to create medical history' });
  }
});

export { router as medicalHistoryRouter };

