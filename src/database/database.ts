// src/database/database.ts

import * as SQLite from 'expo-sqlite';
import { schema } from './schema';
import { migrations } from './migrations';

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    console.log('Opening SQLite database...');
    db = await SQLite.openDatabaseAsync('sscboard.db');
    console.log('SQLite database opened successfully');
  }

  return db;
};

export const initializeDatabase = async (): Promise<void> => {
  if (isInitialized) {
    console.log('Database already initialized');
    return;
  }

  try {
    console.log('Initializing SQLite database...');

    const database = await getDatabase();

    // Enable foreign keys
    await database.execAsync('PRAGMA foreign_keys = ON;');

    console.log('Creating database tables...');

    // Create tables
    for (const tableSchema of schema) {
      try {
        await database.execAsync(tableSchema);
        console.log('Table created successfully');
      } catch (error) {
        console.error('Error creating table:', error);
        throw error;
      }
    }

    console.log('Database tables created');

    // Run migrations
    console.log('Running migrations...');

    for (const migration of migrations) {
      try {
        await database.execAsync(migration);

        console.log(
          'Migration executed:',
          migration.substring(0, 50) + '...'
        );
      } catch (error: any) {
        // Migration may already be applied
        console.log(
          'Migration skipped (likely already applied):',
          error?.message || error
        );
      }
    }

    isInitialized = true;

    console.log(
      'SQLite database initialized successfully'
    );
  } catch (error) {
    console.error(
      'Database initialization error:',
      error
    );

    throw error;
  }
};

export const executeQuery = async (
  query: string,
  params: any[] = []
): Promise<any[]> => {
  try {
    // Ensure database is initialized before executing queries
    if (!isInitialized) {
      console.warn('Database not initialized, initializing now...');
      await initializeDatabase();
    }

    const database = await getDatabase();

    const sql = query.trim().toLowerCase();

    console.log(
      'Executing SQL:',
      query,
      params
    );

    // SELECT query
    if (sql.startsWith('select')) {
      const rows = await database.getAllAsync(
        query,
        ...params
      );

      return rows as any[];
    }

    // INSERT / UPDATE / DELETE
    const result = await database.runAsync(
      query,
      ...params
    );

    console.log('Query completed:', {
      lastInsertRowId: result.lastInsertRowId,
      changes: result.changes,
    });

    return [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const platformInfo = typeof window !== 'undefined' ? 'web' : 'native';
    
    console.error(
      'Query execution error:',
      {
        query,
        params,
        error: errorMessage,
        platform: platformInfo,
        isInitialized
      }
    );

    // Provide more context for web platform
    if (platformInfo === 'web' && errorMessage.includes('no such table')) {
      throw new Error(
        `Database table missing on web platform. This may indicate the database initialization failed. ` +
        `Please refresh the page or try the native app. Original error: ${errorMessage}`
      );
    }

    throw error;
  }
};

export const executeTransaction = async (
  queries: {
    query: string;
    params?: any[];
  }[]
): Promise<void> => {
  const database = await getDatabase();

  try {
    await database.withTransactionAsync(
      async () => {
        for (const {
          query,
          params = [],
        } of queries) {
          await database.runAsync(
            query,
            ...params
          );
        }
      }
    );

    console.log(
      'Transaction completed successfully'
    );
  } catch (error) {
    console.error(
      'Transaction failed:',
      error
    );

    throw error;
  }
};

export const isDatabaseReady = () => {
  return isInitialized;
};

export const closeDatabase = async (): Promise<void> => {
  if (!db) {
    return;
  }

  try {
    await db.closeAsync();

    db = null;
    isInitialized = false;

    console.log(
      'SQLite database closed'
    );
  } catch (error) {
    console.error(
      'Error closing database:',
      error
    );
  }
};