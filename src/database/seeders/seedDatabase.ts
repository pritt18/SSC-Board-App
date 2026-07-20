import { executeQuery } from '../database';
import { classesData } from '../../data/classes';

const simpleHash = async (password: string): Promise<string> => {
  return btoa(password + 'salt');
};

export const seedDatabase = async () => {
  try {
    console.log('Starting database seeding...');
    
    // Check if data already exists
    const classCount = await executeQuery('SELECT COUNT(*) as count FROM classes');
    console.log('Class count check:', classCount);
    
    if (classCount && classCount.length > 0 && classCount[0] && classCount[0].count > 0) {
      console.log('Database already seeded, skipping...');
      return;
    }

    console.log('Seeding classes...');
    for (const cls of classesData) {
      await executeQuery(
        `INSERT INTO classes (class_number, name_english, name_marathi, description_english, description_marathi) 
         VALUES (?, ?, ?, ?, ?)`,
        [cls.class_number, cls.name_english, cls.name_marathi, cls.description_english || '', cls.description_marathi || '']
      );
    }

    console.log('Seeding admin user...');
    const hashedPassword = await simpleHash('Admin@123');
    await executeQuery(
      `INSERT INTO users (username, email, password_hash, full_name, role) 
       VALUES (?, ?, ?, ?, ?)`,
      ['admin', 'admin@sscboard.com', hashedPassword, 'System Administrator', 'admin']
    );

    const subjects = [
      { name_english: 'Mathematics', name_marathi: 'गणित', icon: '➕' },
      { name_english: 'Science', name_marathi: 'विज्ञान', icon: '🔬' },
      { name_english: 'English', name_marathi: 'इंग्रजी', icon: '📚' },
      { name_english: 'Marathi', name_marathi: 'मराठी', icon: '📖' },
      { name_english: 'Hindi', name_marathi: 'हिंदी', icon: '📕' },
      { name_english: 'History', name_marathi: 'इतिहास', icon: '🏛️' },
      { name_english: 'Geography', name_marathi: 'भूगोल', icon: '🌍' },
    ];

    console.log('Seeding subjects...');
    const class10 = await executeQuery('SELECT id FROM classes WHERE class_number = 10');
    if (class10 && class10.length > 0 && class10[0]) {
      for (const subject of subjects) {
        await executeQuery(
          `INSERT INTO subjects (class_id, name_english, name_marathi, icon) 
           VALUES (?, ?, ?, ?)`,
          [class10[0].id, subject.name_english, subject.name_marathi, subject.icon]
        );
      }
    }

    console.log('Database seeded successfully ✅');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};