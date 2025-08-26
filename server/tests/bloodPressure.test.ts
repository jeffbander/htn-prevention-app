import request from 'supertest';
import express from 'express';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/db/schema';
import bloodPressureRouter from '../src/routes/bloodPressure';
import membersRouter from '../src/routes/members';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/api/members', membersRouter);
app.use('/api/blood-pressure-readings', bloodPressureRouter);

describe('Blood Pressure API', () => {
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
    sqlite.exec('DELETE FROM blood_pressure_readings');
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

  describe('POST /api/blood-pressure-readings', () => {
    it('should create a new blood pressure reading successfully', async () => {
      const readingData = {
        memberId: testMemberId,
        systolic: 120,
        diastolic: 80,
        heartRate: 72,
        readingDate: new Date().toISOString()
      };

      const response = await request(app)
        .post('/api/blood-pressure-readings')
        .send(readingData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.systolic).toBe(120);
      expect(response.body.diastolic).toBe(80);
      expect(response.body.heartRate).toBe(72);
      expect(response.body.htnStatus).toBe('Normal');
      expect(response.body.memberId).toBe(testMemberId);
    });

    it('should calculate HTN status correctly for different BP ranges', async () => {
      const testCases = [
        { systolic: 110, diastolic: 70, expectedStatus: 'Normal' },
        { systolic: 125, diastolic: 75, expectedStatus: 'Elevated' },
        { systolic: 135, diastolic: 85, expectedStatus: 'Stage 1' },
        { systolic: 150, diastolic: 95, expectedStatus: 'Stage 2' },
        { systolic: 190, diastolic: 125, expectedStatus: 'Crisis' }
      ];

      for (const testCase of testCases) {
        const readingData = {
          memberId: testMemberId,
          systolic: testCase.systolic,
          diastolic: testCase.diastolic,
          readingDate: new Date().toISOString()
        };

        const response = await request(app)
          .post('/api/blood-pressure-readings')
          .send(readingData)
          .expect(201);

        expect(response.body.htnStatus).toBe(testCase.expectedStatus);
      }
    });

    it('should return 400 for invalid blood pressure data', async () => {
      const invalidData = {
        memberId: testMemberId,
        systolic: 50, // Too low
        diastolic: 300, // Too high
        readingDate: new Date().toISOString()
      };

      await request(app)
        .post('/api/blood-pressure-readings')
        .send(invalidData)
        .expect(400);
    });

    it('should return 400 when systolic <= diastolic', async () => {
      const invalidData = {
        memberId: testMemberId,
        systolic: 80,
        diastolic: 120, // Higher than systolic
        readingDate: new Date().toISOString()
      };

      await request(app)
        .post('/api/blood-pressure-readings')
        .send(invalidData)
        .expect(400);
    });

    it('should return 400 for readings backdated more than 30 days', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

      const readingData = {
        memberId: testMemberId,
        systolic: 120,
        diastolic: 80,
        readingDate: oldDate.toISOString()
      };

      await request(app)
        .post('/api/blood-pressure-readings')
        .send(readingData)
        .expect(400);
    });
  });

  describe('GET /api/blood-pressure-readings', () => {
    it('should return empty array when no readings exist', async () => {
      const response = await request(app)
        .get('/api/blood-pressure-readings')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all blood pressure readings with member info', async () => {
      // Create test readings
      const readings = [
        {
          memberId: testMemberId,
          systolic: 120,
          diastolic: 80,
          readingDate: new Date().toISOString()
        },
        {
          memberId: testMemberId,
          systolic: 140,
          diastolic: 90,
          readingDate: new Date().toISOString()
        }
      ];

      for (const reading of readings) {
        await request(app)
          .post('/api/blood-pressure-readings')
          .send(reading);
      }

      const response = await request(app)
        .get('/api/blood-pressure-readings')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('memberName');
      expect(response.body[0]).toHaveProperty('memberLastName');
      expect(response.body[0]).toHaveProperty('employeeId');
      expect(response.body[0].memberName).toBe('John');
      expect(response.body[0].memberLastName).toBe('Smith');
    });
  });

  describe('GET /api/blood-pressure-readings/member/:memberId', () => {
    it('should return readings for a specific member', async () => {
      const readingData = {
        memberId: testMemberId,
        systolic: 120,
        diastolic: 80,
        readingDate: new Date().toISOString()
      };

      await request(app)
        .post('/api/blood-pressure-readings')
        .send(readingData);

      const response = await request(app)
        .get(`/api/blood-pressure-readings/member/${testMemberId}`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].memberId).toBe(testMemberId);
    });

    it('should return empty array for member with no readings', async () => {
      const response = await request(app)
        .get(`/api/blood-pressure-readings/member/${testMemberId}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('PUT /api/blood-pressure-readings/:id', () => {
    it('should update a blood pressure reading successfully', async () => {
      const readingData = {
        memberId: testMemberId,
        systolic: 120,
        diastolic: 80,
        readingDate: new Date().toISOString()
      };

      const createResponse = await request(app)
        .post('/api/blood-pressure-readings')
        .send(readingData);

      const readingId = createResponse.body.id;
      const updateData = {
        systolic: 130,
        diastolic: 85
      };

      const response = await request(app)
        .put(`/api/blood-pressure-readings/${readingId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.systolic).toBe(130);
      expect(response.body.diastolic).toBe(85);
      expect(response.body.htnStatus).toBe('Stage 1'); // Should recalculate
    });

    it('should return 404 for non-existent reading', async () => {
      await request(app)
        .put('/api/blood-pressure-readings/non-existent-id')
        .send({ systolic: 120 })
        .expect(404);
    });
  });

  describe('DELETE /api/blood-pressure-readings/:id', () => {
    it('should delete a blood pressure reading successfully', async () => {
      const readingData = {
        memberId: testMemberId,
        systolic: 120,
        diastolic: 80,
        readingDate: new Date().toISOString()
      };

      const createResponse = await request(app)
        .post('/api/blood-pressure-readings')
        .send(readingData);

      const readingId = createResponse.body.id;

      await request(app)
        .delete(`/api/blood-pressure-readings/${readingId}`)
        .expect(200);

      // Verify reading is deleted
      const response = await request(app)
        .get('/api/blood-pressure-readings')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });

    it('should return 404 for non-existent reading', async () => {
      await request(app)
        .delete('/api/blood-pressure-readings/non-existent-id')
        .expect(404);
    });
  });
});

