import bcrypt from 'bcrypt';
import { db } from './db/index.js';
import { users, members, bloodPressureReadings, encounters } from './db/schema.js';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create demo users
    const saltRounds = 10;
    const adminPasswordHash = await bcrypt.hash('admin123', saltRounds);
    const userPasswordHash = await bcrypt.hash('user123', saltRounds);

    // Insert super admin user
    const [superAdmin] = await db.insert(users).values({
      username: 'superadmin',
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      role: 'super_admin',
      firstName: 'Super',
      lastName: 'Admin'
    }).returning();

    // Insert regular user
    const [regularUser] = await db.insert(users).values({
      username: 'regularuser',
      email: 'user@example.com',
      passwordHash: userPasswordHash,
      role: 'user',
      firstName: 'Regular',
      lastName: 'User'
    }).returning();

    console.log('✅ Demo users created:');
    console.log('   Super Admin: admin@example.com / admin123');
    console.log('   Regular User: user@example.com / user123');

    // Create some demo members
    const demoMembers = [
      {
        employeeId: 'FF001',
        firstName: 'John',
        lastName: 'Smith',
        dateOfBirth: new Date('1985-03-15'),
        gender: 'Male',
        union: 'Firefighters' as const
      },
      {
        employeeId: 'PD002',
        firstName: 'Sarah',
        lastName: 'Johnson',
        dateOfBirth: new Date('1990-07-22'),
        gender: 'Female',
        union: 'Police' as const
      },
      {
        employeeId: 'EMS003',
        firstName: 'Mike',
        lastName: 'Davis',
        dateOfBirth: new Date('1988-11-08'),
        gender: 'Male',
        union: 'EMS' as const
      },
      {
        employeeId: 'FF004',
        firstName: 'Lisa',
        lastName: 'Wilson',
        dateOfBirth: new Date('1992-01-30'),
        gender: 'Female',
        union: 'Firefighters' as const
      },
      {
        employeeId: 'PD005',
        firstName: 'Robert',
        lastName: 'Brown',
        dateOfBirth: new Date('1987-09-12'),
        gender: 'Male',
        union: 'Police' as const
      }
    ];

    const insertedMembers = await db.insert(members).values(demoMembers).returning();
    console.log(`✅ Created ${insertedMembers.length} demo members`);

    // Create some demo blood pressure readings for today
    const today = new Date();
    const demoReadings = [];

    for (const member of insertedMembers) {
      // Create 1-3 readings per member for today
      const numReadings = Math.floor(Math.random() * 3) + 1;
      
      for (let i = 0; i < numReadings; i++) {
        const systolic = Math.floor(Math.random() * 60) + 110; // 110-170
        const diastolic = Math.floor(Math.random() * 40) + 70;  // 70-110
        const heartRate = Math.floor(Math.random() * 40) + 60;  // 60-100
        
        // Calculate HTN status
        let htnStatus: 'Normal' | 'Elevated' | 'Stage 1' | 'Stage 2' | 'Crisis';
        if (systolic >= 180 || diastolic >= 120) {
          htnStatus = 'Crisis';
        } else if (systolic >= 140 || diastolic >= 90) {
          htnStatus = 'Stage 2';
        } else if (systolic >= 130 || diastolic >= 80) {
          htnStatus = 'Stage 1';
        } else if (systolic >= 120 && diastolic < 80) {
          htnStatus = 'Elevated';
        } else {
          htnStatus = 'Normal';
        }

        const readingTime = new Date(today);
        readingTime.setHours(Math.floor(Math.random() * 12) + 8); // 8 AM to 8 PM
        readingTime.setMinutes(Math.floor(Math.random() * 60));

        demoReadings.push({
          memberId: member.id,
          systolic,
          diastolic,
          heartRate,
          readingDate: readingTime,
          htnStatus
        });
      }
    }

    const insertedReadings = await db.insert(bloodPressureReadings).values(demoReadings).returning();
    console.log(`✅ Created ${insertedReadings.length} demo blood pressure readings for today`);

    // Create some demo encounters
    const demoEncounters = [];
    for (const member of insertedMembers) {
      const numEncounters = Math.floor(Math.random() * 2) + 1;
      
      for (let i = 0; i < numEncounters; i++) {
        const encounterDate = new Date(today.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days
        const communicationTypes = ['Phone', 'Text', 'Email', 'In-Person'] as const;
        const communicationType = communicationTypes[Math.floor(Math.random() * communicationTypes.length)];
        
        demoEncounters.push({
          memberId: member.id,
          sessionNumber: i + 1,
          communicationType,
          topic: 'Blood Pressure Follow-up',
          content: `Follow-up call regarding recent blood pressure reading. Member was advised on lifestyle modifications.`,
          callStatus: 'Completed',
          callerName: 'Health Coordinator',
          encounterDate,
          isCompleted: Math.random() > 0.3 // 70% completed
        });
      }
    }

    const insertedEncounters = await db.insert(encounters).values(demoEncounters).returning();
    console.log(`✅ Created ${insertedEncounters.length} demo encounters`);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Users: 2`);
    console.log(`   Members: ${insertedMembers.length}`);
    console.log(`   Blood Pressure Readings: ${insertedReadings.length}`);
    console.log(`   Encounters: ${insertedEncounters.length}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log('✅ Seeding completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });

