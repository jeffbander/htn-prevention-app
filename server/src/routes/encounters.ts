import { Router } from 'express';
import { eq, desc, max } from 'drizzle-orm';
import { db, encounters, members, type NewEncounter } from '../db/index.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const encounterSchema = z.object({
  memberId: z.string().uuid(),
  communicationType: z.enum(['Phone', 'Text', 'Email', 'In-Person']),
  topic: z.string().min(3).max(200),
  content: z.string().min(10).max(5000),
  callStatus: z.string().min(1).max(50),
  callerName: z.string().min(2).max(100),
  encounterDate: z.string().datetime(),
  isCompleted: z.boolean().optional()
});

const updateEncounterSchema = z.object({
  communicationType: z.enum(['Phone', 'Text', 'Email', 'In-Person']).optional(),
  topic: z.string().min(3).max(200).optional(),
  content: z.string().min(10).max(5000).optional(),
  callStatus: z.string().min(1).max(50).optional(),
  callerName: z.string().min(2).max(100).optional(),
  encounterDate: z.string().datetime().optional(),
  isCompleted: z.boolean().optional()
});

// GET /api/encounters - List all encounters
router.get('/', async (req, res) => {
  try {
    const allEncounters = await db.select({
      id: encounters.id,
      memberId: encounters.memberId,
      sessionNumber: encounters.sessionNumber,
      communicationType: encounters.communicationType,
      topic: encounters.topic,
      content: encounters.content,
      callStatus: encounters.callStatus,
      callerName: encounters.callerName,
      encounterDate: encounters.encounterDate,
      isCompleted: encounters.isCompleted,
      createdAt: encounters.createdAt,
      memberName: members.firstName,
      memberLastName: members.lastName,
      employeeId: members.employeeId
    })
    .from(encounters)
    .leftJoin(members, eq(encounters.memberId, members.id))
    .orderBy(desc(encounters.encounterDate));
    
    res.json(allEncounters);
  } catch (error) {
    console.error('Error fetching encounters:', error);
    res.status(500).json({ error: 'Failed to fetch encounters' });
  }
});

// GET /api/members/:memberId/encounters - Get member's encounters
router.get('/member/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params;
    
    const memberEncounters = await db.select()
      .from(encounters)
      .where(eq(encounters.memberId, memberId))
      .orderBy(desc(encounters.encounterDate));
    
    res.json(memberEncounters);
  } catch (error) {
    console.error('Error fetching member encounters:', error);
    res.status(500).json({ error: 'Failed to fetch member encounters' });
  }
});

// POST /api/encounters - Create new encounter
router.post('/', async (req, res) => {
  try {
    const validatedData = encounterSchema.parse(req.body);
    
    // Check if member exists
    const member = await db.select().from(members).where(eq(members.id, validatedData.memberId));
    
    if (member.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Get the next session number for this member
    const lastSession = await db.select({ maxSession: max(encounters.sessionNumber) })
      .from(encounters)
      .where(eq(encounters.memberId, validatedData.memberId));
    
    const nextSessionNumber = (lastSession[0]?.maxSession || 0) + 1;
    
    const newEncounter: NewEncounter = {
      ...validatedData,
      sessionNumber: nextSessionNumber,
      encounterDate: new Date(validatedData.encounterDate),
      isCompleted: validatedData.isCompleted || false
    };
    
    const [createdEncounter] = await db.insert(encounters).values(newEncounter).returning();
    
    res.status(201).json(createdEncounter);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating encounter:', error);
    res.status(500).json({ error: 'Failed to create encounter' });
  }
});

// PUT /api/encounters/:id - Update encounter
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateEncounterSchema.parse(req.body);
    
    // Check if encounter exists
    const existingEncounter = await db.select().from(encounters).where(eq(encounters.id, id));
    
    if (existingEncounter.length === 0) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    
    // Check if encounter is already completed (business rule)
    if (existingEncounter[0].isCompleted && validatedData.isCompleted !== false) {
      return res.status(400).json({ error: 'Completed encounters cannot be edited' });
    }
    
    const updateData: any = { ...validatedData };
    
    if (validatedData.encounterDate) {
      updateData.encounterDate = new Date(validatedData.encounterDate);
    }
    
    const [updatedEncounter] = await db.update(encounters)
      .set(updateData)
      .where(eq(encounters.id, id))
      .returning();
    
    res.json(updatedEncounter);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating encounter:', error);
    res.status(500).json({ error: 'Failed to update encounter' });
  }
});

// DELETE /api/encounters/:id - Delete encounter
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if encounter exists
    const existingEncounter = await db.select().from(encounters).where(eq(encounters.id, id));
    
    if (existingEncounter.length === 0) {
      return res.status(404).json({ error: 'Encounter not found' });
    }
    
    await db.delete(encounters).where(eq(encounters.id, id));
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting encounter:', error);
    res.status(500).json({ error: 'Failed to delete encounter' });
  }
});

export { router as encountersRouter };

