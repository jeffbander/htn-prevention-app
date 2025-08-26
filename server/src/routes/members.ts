import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db, members, type NewMember } from '../db/index.js';
import { z } from 'zod';

const router = Router();

// Validation schemas
const memberSchema = z.object({
  employeeId: z.string().min(4).max(20),
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  dateOfBirth: z.string().datetime(),
  gender: z.string().min(1).max(10),
  union: z.enum(['Firefighters', 'Police', 'EMS'])
});

const updateMemberSchema = z.object({
  employeeId: z.string().min(4).max(20).optional(),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  dateOfBirth: z.string().datetime().optional(),
  gender: z.string().min(1).max(10).optional(),
  union: z.enum(['Firefighters', 'Police', 'EMS']).optional()
});

// GET /api/members - List all members
router.get('/', async (req, res) => {
  try {
    const allMembers = await db.select().from(members);
    
    // Calculate age for each member
    const membersWithAge = allMembers.map(member => ({
      ...member,
      age: new Date().getFullYear() - new Date(member.dateOfBirth).getFullYear()
    }));
    
    res.json(membersWithAge);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// GET /api/members/:id - Get specific member
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const member = await db.select().from(members).where(eq(members.id, id));
    
    if (member.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    const memberWithAge = {
      ...member[0],
      age: new Date().getFullYear() - new Date(member[0].dateOfBirth).getFullYear()
    };
    
    res.json(memberWithAge);
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

// POST /api/members - Create new member
router.post('/', async (req, res) => {
  try {
    const validatedData = memberSchema.parse(req.body);
    
    // Check if employee ID already exists
    const existingMember = await db.select().from(members).where(eq(members.employeeId, validatedData.employeeId));
    
    if (existingMember.length > 0) {
      return res.status(409).json({ error: 'Employee ID already exists' });
    }
    
    const newMember: NewMember = {
      ...validatedData,
      dateOfBirth: new Date(validatedData.dateOfBirth),
      updatedAt: new Date()
    };
    
    const [createdMember] = await db.insert(members).values(newMember).returning();
    
    const memberWithAge = {
      ...createdMember,
      age: new Date().getFullYear() - new Date(createdMember.dateOfBirth).getFullYear()
    };
    
    res.status(201).json(memberWithAge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error creating member:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

// PUT /api/members/:id - Update member
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = updateMemberSchema.parse(req.body);
    
    // Check if member exists
    const existingMember = await db.select().from(members).where(eq(members.id, id));
    
    if (existingMember.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // Check if employee ID already exists (if being updated)
    if (validatedData.employeeId) {
      const duplicateMember = await db.select().from(members)
        .where(eq(members.employeeId, validatedData.employeeId));
      
      if (duplicateMember.length > 0 && duplicateMember[0].id !== id) {
        return res.status(409).json({ error: 'Employee ID already exists' });
      }
    }
    
    const updateData: any = {
      ...validatedData,
      updatedAt: new Date()
    };
    
    if (validatedData.dateOfBirth) {
      updateData.dateOfBirth = new Date(validatedData.dateOfBirth);
    }
    
    const [updatedMember] = await db.update(members)
      .set(updateData)
      .where(eq(members.id, id))
      .returning();
    
    const memberWithAge = {
      ...updatedMember,
      age: new Date().getFullYear() - new Date(updatedMember.dateOfBirth).getFullYear()
    };
    
    res.json(memberWithAge);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

// DELETE /api/members/:id - Delete member
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if member exists
    const existingMember = await db.select().from(members).where(eq(members.id, id));
    
    if (existingMember.length === 0) {
      return res.status(404).json({ error: 'Member not found' });
    }
    
    // TODO: Check if member has associated readings or encounters
    // For now, we'll allow deletion but this should be implemented based on business rules
    
    await db.delete(members).where(eq(members.id, id));
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

export { router as membersRouter };

