import { Router } from 'express';
import { eq, desc } from 'drizzle-orm';
import { db, bloodPressureReadings, members, type NewBloodPressureReading } from '../db/index.js';
import { z } from 'zod';

const router = Router();

// HTN Status calculation function based on AHA guidelines
function calculateHTNStatus(systolic: number, diastolic: number): string {
  if (systolic >= 180 || diastolic >= 120) {
    return 'Crisis';
  } else if (systolic >= 140 || diastolic >= 90) {
    return 'Stage 2';
  } else if (systolic >= 130 || diastolic >= 80) {
    return 'Stage 1';
  } else if (systolic >= 120 && diastolic < 80) {
    return 'Elevated';
  } else {
    return 'Normal';
  }
}

// Validation schemas
const bloodPressureSchema = z.object({
  memberId: z.string().uuid(),
  systolic: z.number().min(70).max(300),
  diastolic: z.number().min(40).max(200),
  heartRate: z.number().min(30).max(250).optional(),
  readingDate: z.string().datetime()
}).refine(data => data.systolic > data.diastolic, {
  message: "Systolic pressure must be greater than diastolic pressure"
}).refine(data => {
  const readingDate = new Date(data.readingDate);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  return readingDate >= thirtyDaysAgo;
}, {
  message: "Reading cannot be backdated more than 30 days"
});

const updateBloodPressureSchema = z.object({
  systolic: z.number().min(70).max(300).optional(),
  diastolic: z.number().min(40).max(200).optional(),
  heartRate: z.number().min(30).max(250).optional(),
  readingDate: z.string().datetime().optional()
}).refine(data => {
  if (data.systolic && data.diastolic) {
    return data.systolic > data.diastolic;
  }
  return true;
}, {
  message: "Systolic pressure must be greater than diastolic pressure"
});

// GET /api/blood-pressure-readings - List all readings
router.get('/', async (req, res) => {
  try {
    const readings = await db.select({
      id: bloodPressureReadings.id,
      memberId: bloodPressureReadings.memberId,
      systolic: bloodPressureReadings.systolic,
      diastolic: bloodPressureReadings.diastolic,
      heartRate: bloodPressureReadings.heartRate,
      readingDate: bloodPressureReadings.readingDate,
      htnStatus: bloodPressureReadings.htnStatus,
      createdAt: bloodPressureReadings.createdAt,
      memberName: members.firstName,
      memberLastName: members.lastName,
      employeeId: members.employeeId
    })
    .from(bloodPressureReadings)
    .leftJoin(members, eq(bloodPressureReadings.memberId, members.id))
    .orderBy(desc(bloodPressureReadings.readingDate));
    
    res.json(readings);
  } catch (error) {
    console.error('Error fetching blood pressure readings:', error);
    res.status(500).json({ error: 'Failed to fetch blood pressure readings' });
  }
});

// GET /api/members/:memberId/blood-pressure-readings - Get member's readings
router.get('/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    const readings = await db.select()
      .from(bloodPressureReadings)
      .where(eq(bloodPressureReadings.memberId, memberId))
      .orderBy(desc(bloodPressureReadings.readingDate));
    
    res.json(readings);
  } catch (error) {
    console.error('Error fetching member blood pressure readings:', error);
    res.status(500).json({ error: 'Failed to fetch member blood pressure readings' });
  }
});

// POST /api/blood-pressure-readings - Create new reading
router.post('/', async (req, res) => {
  try {
    const validatedData = bloodPressureSchema.parse(req.body);
    
    // Check if member exists
    const member = await db.select().from(members).where(eq(members.id, validatedData.memberId));
    
    if (member.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Calculate HTN status automatically
    const htnStatus = calculateHTNStatus(validatedData.systolic, validatedData.diastolic);
    
    const newReading: NewBloodPressureReading = {
      ...validatedData,
      readingDate: new Date(validatedData.readingDate),
      htnStatus: htnStatus as any
    };
    
    const [createdReading] = await db.insert(bloodPressureReadings).values(newReading).returning();
    
    res.status(201).json(createdReading);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating blood pressure reading:', error);
    res.status(500).json({ error: 'Failed to create blood pressure reading' });
  }
});

// PUT /api/blood-pressure-readings/:id - Update reading
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateBloodPressureSchema.parse(req.body);
    
    // Check if reading exists
    const existingReading = await db.select().from(bloodPressureReadings).where(eq(bloodPressureReadings.id, id));
    
    if (existingReading.length === 0) {
      return res.status(404).json({ error: 'Blood pressure reading not found' });
    }
    
    const updateData: any = { ...validatedData };
    
    // Recalculate HTN status if systolic or diastolic changed
    if (validatedData.systolic !== undefined || validatedData.diastolic !== undefined) {
      const systolic = validatedData.systolic ?? existingReading[0].systolic;
      const diastolic = validatedData.diastolic ?? existingReading[0].diastolic;
      updateData.htnStatus = calculateHTNStatus(systolic, diastolic);
    }
    
    if (validatedData.readingDate) {
      updateData.readingDate = new Date(validatedData.readingDate);
    }
    
    const [updatedReading] = await db.update(bloodPressureReadings)
      .set(updateData)
      .where(eq(bloodPressureReadings.id, id))
      .returning();
    
    res.json(updatedReading);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating blood pressure reading:', error);
    res.status(500).json({ error: 'Failed to update blood pressure reading' });
  }
});

// DELETE /api/blood-pressure-readings/:id - Delete reading
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if reading exists
    const existingReading = await db.select().from(bloodPressureReadings).where(eq(bloodPressureReadings.id, id));
    
    if (existingReading.length === 0) {
      return res.status(404).json({ error: 'Blood pressure reading not found' });
    }
    
    await db.delete(bloodPressureReadings).where(eq(bloodPressureReadings.id, id));
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting blood pressure reading:', error);
    res.status(500).json({ error: 'Failed to delete blood pressure reading' });
  }
});

export { router as bloodPressureRouter };

