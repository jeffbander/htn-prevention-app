import request from 'supertest';
import express from 'express';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/db/schema';
import membersRouter from '../src/routes/members';
import path from 'path';

const app = express();
app.use(express.json());
app.use('/api/members', membersRouter);

describe('Members API', () => {
  let db: any;
  let sqlite: Database.Database;

  beforeAll(() => {
    const testDbPath = path.join(__dirname, '../test.db');
    sqlite = new Database(testDbPath);
    db = drizzle(sqlite, { schema });
  });

  afterAll(() => {
    sqlite.close();
  });

  beforeEach(async () => {
    // Clear members table before each test
    sqlite.exec('DELETE FROM members');
  });

  describe('POST /api/members', () => {
    it('should create a new member successfully', async () => {
      const memberData = {
        employeeId: 'FF001',
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: '1985-06-15T00:00:00.000Z',
        gender: 'Male',
        union: 'Firefighters'
      };

      const response = await request(app)
        .post('/api/members')
        .send(memberData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.employeeId).toBe(memberData.employeeId);
      expect(response.body.firstName).toBe(memberData.firstName);
      expect(response.body.lastName).toBe(memberData.lastName);
      expect(response.body.union).toBe(memberData.union);
    });

    it('should return 400 for invalid member data', async () => {
      const invalidData = {
        employeeId: 'FF', // Too short
        firstName: '',    // Empty
        lastName: 'Smith',
        dateOfBirth: 'invalid-date',
        gender: 'Male',
        union: 'InvalidUnion'
      };

      await request(app)
        .post('/api/members')
        .send(invalidData)
        .expect(400);
    });

    it('should return 409 for duplicate employee ID', async () => {
      const memberData = {
        employeeId: 'FF001',
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: '1985-06-15T00:00:00.000Z',
        gender: 'Male',
        union: 'Firefighters'
      };

      // Create first member
      await request(app)
        .post('/api/members')
        .send(memberData)
        .expect(201);

      // Try to create duplicate
      await request(app)
        .post('/api/members')
        .send(memberData)
        .expect(409);
    });
  });

  describe('GET /api/members', () => {
    it('should return empty array when no members exist', async () => {
      const response = await request(app)
        .get('/api/members')
        .expect(200);

      expect(response.body).toEqual([]);
    });

    it('should return all members', async () => {
      // Create test members
      const members = [
        {
          employeeId: 'FF001',
          firstName: 'John',
          lastName: 'Smith',
          dateOfBirth: '1985-06-15T00:00:00.000Z',
          gender: 'Male',
          union: 'Firefighters'
        },
        {
          employeeId: 'PD001',
          firstName: 'Jane',
          lastName: 'Doe',
          dateOfBirth: '1990-03-20T00:00:00.000Z',
          gender: 'Female',
          union: 'Police'
        }
      ];

      for (const member of members) {
        await request(app)
          .post('/api/members')
          .send(member);
      }

      const response = await request(app)
        .get('/api/members')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].employeeId).toBe('FF001');
      expect(response.body[1].employeeId).toBe('PD001');
    });
  });

  describe('GET /api/members/:id', () => {
    it('should return a specific member', async () => {
      const memberData = {
        employeeId: 'FF001',
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: '1985-06-15T00:00:00.000Z',
        gender: 'Male',
        union: 'Firefighters'
      };

      const createResponse = await request(app)
        .post('/api/members')
        .send(memberData);

      const memberId = createResponse.body.id;

      const response = await request(app)
        .get(`/api/members/${memberId}`)
        .expect(200);

      expect(response.body.id).toBe(memberId);
      expect(response.body.employeeId).toBe(memberData.employeeId);
    });

    it('should return 404 for non-existent member', async () => {
      await request(app)
        .get('/api/members/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /api/members/:id', () => {
    it('should update a member successfully', async () => {
      const memberData = {
        employeeId: 'FF001',
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: '1985-06-15T00:00:00.000Z',
        gender: 'Male',
        union: 'Firefighters'
      };

      const createResponse = await request(app)
        .post('/api/members')
        .send(memberData);

      const memberId = createResponse.body.id;
      const updateData = {
        firstName: 'Johnny',
        lastName: 'Johnson'
      };

      const response = await request(app)
        .put(`/api/members/${memberId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.firstName).toBe('Johnny');
      expect(response.body.lastName).toBe('Johnson');
      expect(response.body.employeeId).toBe(memberData.employeeId); // Should remain unchanged
    });

    it('should return 404 for non-existent member', async () => {
      await request(app)
        .put('/api/members/non-existent-id')
        .send({ firstName: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /api/members/:id', () => {
    it('should delete a member successfully', async () => {
      const memberData = {
        employeeId: 'FF001',
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: '1985-06-15T00:00:00.000Z',
        gender: 'Male',
        union: 'Firefighters'
      };

      const createResponse = await request(app)
        .post('/api/members')
        .send(memberData);

      const memberId = createResponse.body.id;

      await request(app)
        .delete(`/api/members/${memberId}`)
        .expect(200);

      // Verify member is deleted
      await request(app)
        .get(`/api/members/${memberId}`)
        .expect(404);
    });

    it('should return 404 for non-existent member', async () => {
      await request(app)
        .delete('/api/members/non-existent-id')
        .expect(404);
    });
  });
});

