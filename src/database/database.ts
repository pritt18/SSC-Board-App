import * as SQLite from 'expo-sqlite';

import { migrations } from './migrations';
import { schema } from './schema';

let db: SQLite.SQLiteDatabase | null = null;
let isInitialized = false;

/**
 * Get or open the local SQLite database.
 *
 * This database is stored locally on the mobile device
 * and works without an internet connection.
 */
export const getDatabase =
  async (): Promise<SQLite.SQLiteDatabase> => {
    if (!db) {
      console.log(
        'Opening SQLite database...',
      );

      db = await SQLite.openDatabaseAsync(
        'sscboard.db',
      );

      console.log(
        'SQLite database opened successfully',
      );
    }

    return db;
  };

/**
 * Initialize database tables and migrations.
 */
export const initializeDatabase =
  async (): Promise<void> => {
    if (isInitialized) {
      console.log(
        'Database already initialized',
      );

      return;
    }

    try {
      console.log(
        'Initializing SQLite database...',
      );

      const database =
        await getDatabase();

      // Enable foreign keys
      await database.execAsync(
        'PRAGMA foreign_keys = ON;',
      );

      console.log(
        'Creating database tables...',
      );

      for (const tableSchema of schema) {
        try {
          await database.execAsync(
            tableSchema,
          );
        } catch (error) {
          console.error(
            'Error creating table:',
            error,
          );

          throw error;
        }
      }

      console.log(
        'Database tables created',
      );

      // Run migrations
      for (const migration of migrations) {
        try {
          await database.execAsync(
            migration,
          );
        } catch (error: any) {
          /*
           * Some migrations may try to add columns
           * that already exist.
           *
           * Log the error without crashing the app.
           */
          console.log(
            'Migration skipped or failed:',
            error?.message || error,
          );
        }
      }

      isInitialized = true;

      console.log(
        'SQLite database initialized successfully',
      );
    } catch (error) {
      console.error(
        'Database initialization error:',
        error,
      );

      throw error;
    }
  };

/**
 * Execute SELECT, INSERT, UPDATE or DELETE queries.
 *
 * Existing models expect this function to return
 * an array, so this keeps the current project
 * architecture compatible.
 */
export const executeQuery = async (
  query: string,
  params: any[] = [],
): Promise<any[]> => {
  try {
    const database =
      await getDatabase();

    const sql =
      query.trim().toLowerCase();

    console.log(
      'Executing SQL:',
      query,
      params,
    );

    // SELECT queries
    if (sql.startsWith('select')) {
      const rows =
        await database.getAllAsync(
          query,
          ...params,
        );

      return rows as any[];
    }

    // INSERT / UPDATE / DELETE
    const result =
      await database.runAsync(
        query,
        ...params,
      );

    console.log(
      'Query completed:',
      {
        lastInsertRowId:
          result.lastInsertRowId,

        changes:
          result.changes,
      },
    );

    /*
     * Some existing project code only waits
     * for the query to finish and does not use
     * the returned result.
     *
     * Keep the return type as an array for
     * compatibility.
     */
    return [];
  } catch (error) {
    console.error(
      'Query execution error:',
      error,
    );

    throw error;
  }
};

/**
 * Execute multiple queries inside one transaction.
 */
export const executeTransaction =
  async (
    queries: {
      query: string;
      params?: any[];
    }[],
  ): Promise<void> => {
    const database =
      await getDatabase();

    try {
      await database.withTransactionAsync(
        async () => {
          for (const {
            query,
            params = [],
          } of queries) {
            await database.runAsync(
              query,
              ...params,
            );
          }
        },
      );

      console.log(
        'Transaction completed successfully',
      );
    } catch (error) {
      console.error(
        'Transaction failed:',
        error,
      );

      throw error;
    }
  };

/**
 * Check whether database initialization completed.
 */
export const isDatabaseReady = () =>
  isInitialized;

/**
 * Close database if needed.
 */
export const closeDatabase =
  async (): Promise<void> => {
    if (!db) {
      return;
    }

    try {
      await db.closeAsync();

      db = null;
      isInitialized = false;

      console.log(
        'SQLite database closed',
      );
    } catch (error) {
      console.error(
        'Error closing database:',
        error,
      );
    }
  };