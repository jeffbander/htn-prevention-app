import { pgTable, uuid, varchar, timestamp, integer, text, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const unionEnum = pgEnum('union', ['Firefighters', 'Police', 'EMS']);
export const htnStatusEnum = pgEnum('htn_status', ['Normal', 'Elevated', 'Stage 1', 'Stage 2', 'Crisis']);
export const communicationTypeEnum = pgEnum('communication_type', ['Phone', 'Text', 'Email', 'In-Person']);

// Members Table
export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  employeeId: varchar('employee_id', { length: 20 }).notNull().unique(),
  firstName: varchar('first_name', { length: 50 }).notNull(),
  lastName: varchar('last_name', { length: 50 }).notNull(),
  dateOfBirth: timestamp('date_of_birth').notNull(),
  gender: varchar('gender', { length: 10 }).notNull(),
  union: unionEnum('union').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

// Blood Pressure Readings Table
export const bloodPressureReadings = pgTable('blood_pressure_readings', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  systolic: integer('systolic').notNull(),
  diastolic: integer('diastolic').notNull(),
  heartRate: integer('heart_rate'),
  readingDate: timestamp('reading_date').notNull(),
  htnStatus: htnStatusEnum('htn_status').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Encounters Table
export const encounters = pgTable('encounters', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  sessionNumber: integer('session_number').notNull(),
  communicationType: communicationTypeEnum('communication_type').notNull(),
  topic: varchar('topic', { length: 200 }).notNull(),
  content: text('content').notNull(),
  callStatus: varchar('call_status', { length: 50 }).notNull(),
  callerName: varchar('caller_name', { length: 100 }).notNull(),
  encounterDate: timestamp('encounter_date').notNull(),
  isCompleted: boolean('is_completed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Medical History Table
export const medicalHistory = pgTable('medical_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: uuid('member_id').notNull().references(() => members.id),
  condition: varchar('condition', { length: 200 }).notNull(),
  notes: text('notes'),
  reportedDate: timestamp('reported_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const membersRelations = relations(members, ({ many }) => ({
  bloodPressureReadings: many(bloodPressureReadings),
  encounters: many(encounters),
  medicalHistory: many(medicalHistory)
}));

export const bloodPressureReadingsRelations = relations(bloodPressureReadings, ({ one }) => ({
  member: one(members, {
    fields: [bloodPressureReadings.memberId],
    references: [members.id]
  })
}));

export const encountersRelations = relations(encounters, ({ one }) => ({
  member: one(members, {
    fields: [encounters.memberId],
    references: [members.id]
  })
}));

export const medicalHistoryRelations = relations(medicalHistory, ({ one }) => ({
  member: one(members, {
    fields: [medicalHistory.memberId],
    references: [members.id]
  })
}));

// Types
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type BloodPressureReading = typeof bloodPressureReadings.$inferSelect;
export type NewBloodPressureReading = typeof bloodPressureReadings.$inferInsert;
export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
export type MedicalHistory = typeof medicalHistory.$inferSelect;
export type NewMedicalHistory = typeof medicalHistory.$inferInsert;

