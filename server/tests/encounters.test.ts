import request from 'supertest';
import express from 'express';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/db/schema';
import encountersRouter from '../src/routes/encounters';
import membersRouter from '../src/routes/members';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/api/members', membersRouter);
app.use('/api/encounters', encountersRouter);

describe('Encounters API', () => {
  let db: any;
  let sqlite: Database.Database;
  let testMemberId: string;

  beforeAll(() => {
    const testDbPath = path.join(__dirname, '../test.db');
    sqlite = new Database(testDbPath);
    db = drizzle(sqlite, { schema });
  });

  afterAll(() => {
    sqlite.close();
  });

  beforeEach(async () => {
    // Clear tables before each test
    sqlite.exec('DELETE FROM encounters');
    sqlite.exec('DELETE FROM members');

    // Create a test member
    const memberData = {
      employeeId: 'FF001',
      firstName: 'John',
      lastName: 'Smith',
      dateOfBirth: '1985-06-15T00:00:00.000Z',
      gender: 'Male',
      union: 'Firefighters'
    };

    const memberResponse = await request(app)
      .post('/api/members')
      .send(memberData);

    testMemberId = memberResponse.body.id;
  });

  describe('POST /api/encounters', () => {
    it('should create a new encounter successfully', async () => {
      const encounterData = {
        memberId: testMemberId,
        communicationType: 'Phone',
        topic: 'Blood Pressure Follow-up',
        content: 'Discussed recent BP readings and lifestyle modifications.',
        callStatus: 'Completed',
        callerName: 'Nurse Johnson',
        encounterDate: new Date().toISOString(),
        isCompleted: true
      };

      const response = await request(app)
        .post('/api/encounters')
        .send(encounterData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.communicationType).toBe('Phone');
      expect(response.body.topic).toBe('Blood Pressure Follow-up');
      expect(response.body.callStatus).toBe('Completed');
      expect(response.body.callerName).toBe('Nurse Johnson');
      expect(response.body.isCompleted).toBe(true);
      expect(response.body.sessionNumber).toBe(1);
      expect(response.body.memberId).toBe(testMemberId);
    });

    it('should auto-increment session numbers for the same member', async () => {
      const encounterData = {
        memberId: testMemberId,
        communicationType: 'Phone',
        topic: 'Initial Contact',
        content: 'First contact with member.',
        callStatus: 'Completed',
        callerName: 'Nurse Johnson',
        encounterDate: new Date().toISOString()
      };

      // Create first encounter
      const response1 = await request(app)
        .post('/api/encounters')
        .send(encounterData);

      expect(response1.body.sessionNumber).toBe(1);

      // Create second encounter
      encounterData.topic = 'Follow-up Call';
      const response2 = await request(app)
        .post('/api/encounters')
        .send(encounterData);

      expect(response2.body.sessionNumber).toBe(2);
    });

    it('should return 400 for invalid encounter data', async () => {
      const invalidData = {
        memberId: testMemberId,
        communicationType: 'InvalidType', // Invalid enum value
        topic: 'AB', // Too short
        content: 'Short', // Too short
        callStatus: '',
        callerName: 'A', // Too short
        encounterDate: 'invalid-date'
      };

      await request(app)
        .post('/api/encounters')
        .send(invalidData)
        .expect(400);
    });

    it('should return 404 for non-existent member', async () => {
      const encounterData = {
        memberId: 'non-existent-member',
        communicationType: 'Phone',
        topic: 'Test Call',
        content: 'This should fail because member does not exist.',
        callStatus: 'Completed',
        callerName: 'Test Caller',
        encounterDate: new Date().toISOString()
      };

      await request(app)
        .post('/api/encounters')
        .send(encounterData)
        .expect(404);
    });
  });

  describe('GET /api/encounters', () => {
    it('should return empty array when no encounters exist', async () => {
      const response = await request(app)
        .get('/api/encounters')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all encounters with member info', async () => {
      // Create test encounters
      const encounters = [
        {
          memberId: testMemberId,
          communicationType: 'Phone',
          topic: 'Initial Contact',
          content: 'First contact with member.',
          callStatus: 'Completed',
          callerName: 'Nurse Johnson',
          encounterDate: new Date().toISOString(),
          isCompleted: true
        },
        {
          memberId: testMemberId,
          communicationType: 'Email',
          topic: 'Follow-up Information',
          content: 'Sent educational materials via email.',
          callStatus: 'Sent',
          callerName: 'Dr. Smith',
          encounterDate: new Date().toISOString(),
          isCompleted: false
        }
      ];

      for (const encounter of encounters) {
        await request(app)
          .post('/api/encounters')
          .send(encounter);
      }

      const response = await request(app)
        .get('/api/encounters')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('memberName');
      expect(response.body[0]).toHaveProperty('memberLastName');
      expect(response.body[0]).toHaveProperty('employeeId');
      expect(response.body[0].memberName).toBe('John');
      expect(response.body[0].memberLastName).toBe('Smith');
      expect(response.body[0].sessionNumber).toBe(1);
      expect(response.body[1].sessionNumber).toBe(2);
    });
  });

  describe('GET /api/encounters/member/:memberId', () => {
    it('should return encounters for a specific member', async () => {
      const encounterData = {
        memberId: testMemberId,
        communicationType: 'Phone',
        topic: 'Test Call',
        content: 'Test encounter for specific member.',
        callStatus: 'Completed',
        callerName: 'Test Caller',
        encounterDate: new Date().toISOString()
      };

      await request(app)
        .post('/api/encounters')
        .send(encounterData);

      const response = await request(app)
        .get(`/api/encounters/member/${testMemberId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].memberId).toBe(testMemberId);
    });

    it('should return empty array for member with no encounters', async () => {
      const response = await request(app)
        .get(`/api/encounters/member/${testMemberId}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('PUT /api/encounters/:id', () => {
    it('should update an encounter successfully', async () => {
      const encounterData = {
        memberId: testMemberId,
        communicationType: 'Phone',
        topic: 'Initial Call',
        content: 'Initial contact with member.',
        callStatus: 'In Progress',
        callerName: 'Nurse Johnson',
        encounterDate: new Date().toISOString(),
        isCompleted: false
      };

      const createResponse = await request(app)
        .post('/api/encounters')
        .send(encounterData);

      const encounterId = createResponse.body.id;
      const updateData = {
        callStatus: 'Completed',
        isCompleted: true,
        content: 'Successfully completed call with member. Discussed BP management.'
      };

      const response = await request(app)
        .put(`/api/encounters/${encounterId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.callStatus).toBe('Completed');
      expect(response.body.isCompleted).toBe(true);
      expect(response.body.content).toBe('Successfully completed call with member. Discussed BP management.');
      expect(response.body.topic).toBe('Initial Call'); // Should remain unchanged
    });

    it('should return 404 for non-existent encounter', async () => {
      await request(app)
        .put('/api/encounters/non-existent-id')
        .send({ callStatus: 'Completed' })
        .expect(404);
    });
  });

  describe('DELETE /api/encounters/:id', () => {
    it('should delete an encounter successfully', async () => {
      const encounterData = {
        memberId: testMemberId,
        communicationType: 'Phone',
        topic: 'Test Call',
        content: 'Test encounter to be deleted.',
        callStatus: 'Completed',
        callerName: 'Test Caller',
        encounterDate: new Date().toISOString()
      };

      const createResponse = await request(app)
        .post('/api/encounters')
        .send(encounterData);

      const encounterId = createResponse.body.id;

      await request(app)
        .delete(`/api/encounters/${encounterId}`)
        .expect(200);

      // Verify encounter is deleted
      const response = await request(app)
        .get('/api/encounters')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should return 404 for non-existent encounter', async () => {
      await request(app)
        .delete('/api/encounters/non-existent-id')
        .expect(404);
    });
  });

  describe('Communication Type Validation', () => {
    it('should accept all valid communication types', async () => {
      const validTypes = ['Phone', 'Text', 'Email', 'In-Person'];

      for (const type of validTypes) {
        const encounterData = {
          memberId: testMemberId,
          communicationType: type,
          topic: `${type} Communication Test`,
          content: `Testing ${type} communication type.`,
          callStatus: 'Completed',
          callerName: 'Test Caller',
          encounterDate: new Date().toISOString()
        };

        const response = await request(app)
          .post('/api/encounters')
          .send(encounterData)
          .expect(201);

        expect(response.body.communicationType).toBe(type);
      }
    });
  });
});

