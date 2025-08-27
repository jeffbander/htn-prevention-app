import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Users Table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text('username', { length: 50 }).notNull().unique(),
  email: text('email', { length: 100 }).notNull().unique(),
  passwordHash: text('password_hash', { length: 255 }).notNull(),
  role: text('role', { enum: ['user', 'admin', 'super_admin'] }).default('user').notNull(),
  firstName: text('first_name', { length: 50 }).notNull(),
  lastName: text('last_name', { length: 50 }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  lastLogin: integer('last_login', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull()
});

// Members Table
export const members = sqliteTable('members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  employeeId: text('employee_id', { length: 20 }).notNull().unique(),
  firstName: text('first_name', { length: 50 }).notNull(),
  lastName: text('last_name', { length: 50 }).notNull(),
  dateOfBirth: integer('date_of_birth', { mode: 'timestamp' }).notNull(),
  gender: text('gender', { length: 10 }).notNull(),
  union: text('union', { enum: ['Firefighters', 'Police', 'EMS'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull()
});

// Blood Pressure Readings Table
export const bloodPressureReadings = sqliteTable('blood_pressure_readings', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text('member_id').notNull().references(() => members.id),
  systolic: integer('systolic').notNull(),
  diastolic: integer('diastolic').notNull(),
  heartRate: integer('heart_rate'),
  readingDate: integer('reading_date', { mode: 'timestamp' }).notNull(),
  htnStatus: text('htn_status', { enum: ['Normal', 'Elevated', 'Stage 1', 'Stage 2', 'Crisis'] }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull()
});

// Encounters Table
export const encounters = sqliteTable('encounters', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text('member_id').notNull().references(() => members.id),
  sessionNumber: integer('session_number').notNull(),
  communicationType: text('communication_type', { enum: ['Phone', 'Text', 'Email', 'In-Person'] }).notNull(),
  topic: text('topic', { length: 200 }).notNull(),
  content: text('content').notNull(),
  callStatus: text('call_status', { length: 50 }).notNull(),
  callerName: text('caller_name', { length: 100 }).notNull(),
  encounterDate: integer('encounter_date', { mode: 'timestamp' }).notNull(),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull()
});

// Medical History Table
export const medicalHistory = sqliteTable('medical_history', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text('member_id').notNull().references(() => members.id),
  condition: text('condition', { length: 200 }).notNull(),
  notes: text('notes'),
  reportedDate: integer('reported_date', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()).notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({}));

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
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;
export type BloodPressureReading = typeof bloodPressureReadings.$inferSelect;
export type NewBloodPressureReading = typeof bloodPressureReadings.$inferInsert;
export type Encounter = typeof encounters.$inferSelect;
export type NewEncounter = typeof encounters.$inferInsert;
export type MedicalHistory = typeof medicalHistory.$inferSelect;
export type NewMedicalHistory = typeof medicalHistory.$inferInsert;

