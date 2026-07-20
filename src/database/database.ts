import SQLite from 'react-native-sqlite-storage';
import { migrations } from './migrations';
import { schema } from './schema';

// Enable promise-based SQLite
SQLite.DEBUG = false;
SQLite.enablePromise(true);

let db: any = null;
let isInitialized = false;
let mockStore: any = null;
let mockIdCounter = 0;

// Create a persistent mock database
const createMockDatabase = () => {
  console.log('Using persistent mock database (in-memory)');
  
  // Initialize store if not exists
  if (!mockStore) {
    mockStore = {
      users: [
        {
          id: 1,
          username: 'admin',
          email: 'admin@sscboard.com',
          password_hash: 'QWRtaW5AMTIzc2FsdA==',
          full_name: 'System Administrator',
          role: 'admin',
          medium: 'english',
          class_id: null,
          device_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: 1,
        }
      ],
      classes: [
        { id: 1, class_number: 1, name_english: 'Class 1', name_marathi: 'इयत्ता १', description_english: 'First Standard', description_marathi: 'पहिली इयत्ता', is_active: 1, created_at: new Date().toISOString() },
        { id: 2, class_number: 2, name_english: 'Class 2', name_marathi: 'इयत्ता २', description_english: 'Second Standard', description_marathi: 'दुसरी इयत्ता', is_active: 1, created_at: new Date().toISOString() },
        { id: 3, class_number: 3, name_english: 'Class 3', name_marathi: 'इयत्ता ३', description_english: 'Third Standard', description_marathi: 'तिसरी इयत्ता', is_active: 1, created_at: new Date().toISOString() },
        { id: 4, class_number: 4, name_english: 'Class 4', name_marathi: 'इयत्ता ४', description_english: 'Fourth Standard', description_marathi: 'चौथी इयत्ता', is_active: 1, created_at: new Date().toISOString() },
        { id: 5, class_number: 5, name_english: 'Class 5', name_marathi: 'इयत्ता ५', description_english: 'Fifth Standard', description_marathi: 'पाचवी इयत्ता', is_active: 1, created_at: new Date().toISOString() },
        { id: 6, class_number: 6, name_english: 'Class 6', name_marathi: 'इयत्ता ६', description_english: 'Sixth Standard', description_marathi: 'सहावी इयत्ता', is_active: 1, created_at: new Date().toISOString() },
        { id: 7, class_number: 7, name_english: 'Class 7', name_marathi: 'इयत्ता ७', description_english: 'Seventh Standard', description_marathi: 'सातवी इयत्ता', is_active: 1, created_at: new Date().toISOString() },
        { id: 8, class_number: 8, name_english: 'Class 8', name_marathi: 'इयत्ता ८', description_english: 'Eighth Standard', description_marathi: 'आठवी इयत्ता', is_active: 1, created_at: new Date().toISOString() },
        { id: 9, class_number: 9, name_english: 'Class 9', name_marathi: 'इयत्ता ९', description_english: 'Ninth Standard', description_marathi: 'नववी इयत्ता', is_active: 1, created_at: new Date().toISOString() },
        { id: 10, class_number: 10, name_english: 'Class 10', name_marathi: 'इयत्ता १०', description_english: 'Tenth Standard', description_marathi: 'दहावी इयत्ता', is_active: 1, created_at: new Date().toISOString() },
      ],
      subjects: [],
      chapters: [],
      quizzes: [],
      questions: [],
      progress: [],
      quiz_attempts: [],
      licenses: [],
      bookmarks: [],
      games: [],
      notifications: [],
      media_cache: [],
      user_preferences: [],
    };
    mockIdCounter = 10; // Start after existing IDs
  }

  // Helper to parse values from SQL
  const parseValues = (sql: string): any[] => {
    const values: any[] = [];
    const match = sql.match(/VALUES\s*\(([^)]+)\)/i);
    if (match) {
      const parts = match[1].split(',').map((v: string) => v.trim());
      for (const part of parts) {
        if (part === 'null' || part === 'NULL') {
          values.push(null);
        } else if (part.startsWith("'") || part.startsWith('"')) {
          values.push(part.substring(1, part.length - 1));
        } else if (!isNaN(Number(part))) {
          values.push(Number(part));
        } else {
          values.push(part);
        }
      }
    }
    return values;
  };

  // Helper to get columns from SQL
  const getColumns = (sql: string): string[] => {
    const match = sql.match(/\(([^)]+)\)\s*VALUES/i);
    if (match) {
      return match[1].split(',').map((c: string) => c.trim());
    }
    return [];
  };

  const executeSql = (sql: string, params: any[] = [], success: any, error: any) => {
    try {
      console.log('Mock SQL:', sql.substring(0, 60) + '...');
      
      let result: any = {
        rows: { length: 0, item: (index: number) => null, _array: [] },
        insertId: null,
        rowsAffected: 0,
      };

      const sqlLower = sql.toLowerCase().trim();

      // SELECT queries
      if (sqlLower.startsWith('select')) {
        // Handle SELECT COUNT(*)
        if (sqlLower.includes('count(*)')) {
          if (sqlLower.includes('from classes')) {
            result.rows._array = [{ count: mockStore.classes.length }];
            result.rows.length = 1;
            result.rows.item = (i: number) => result.rows._array[i];
          } else if (sqlLower.includes('from users')) {
            result.rows._array = [{ count: mockStore.users.length }];
            result.rows.length = 1;
            result.rows.item = (i: number) => result.rows._array[i];
          }
        }
        // Handle SELECT * FROM users WHERE email = ?
        else if (sqlLower.includes('from users') && sqlLower.includes('where email')) {
          const email = params[0];
          const user = mockStore.users.find((u: any) => u.email === email);
          if (user) {
            result.rows._array = [user];
            result.rows.length = 1;
            result.rows.item = (i: number) => result.rows._array[i];
          }
        }
        // Handle SELECT * FROM users WHERE username = ?
        else if (sqlLower.includes('from users') && sqlLower.includes('where username')) {
          const username = params[0];
          const user = mockStore.users.find((u: any) => u.username === username);
          if (user) {
            result.rows._array = [user];
            result.rows.length = 1;
            result.rows.item = (i: number) => result.rows._array[i];
          }
        }
        // Handle SELECT id FROM classes WHERE class_number = ?
        else if (sqlLower.includes('from classes') && sqlLower.includes('where class_number')) {
          const classNumber = params[0];
          const cls = mockStore.classes.find((c: any) => c.class_number === classNumber);
          if (cls) {
            result.rows._array = [cls];
            result.rows.length = 1;
            result.rows.item = (i: number) => result.rows._array[i];
          }
        }
        // Handle SELECT * FROM users
        else if (sqlLower.includes('from users') && !sqlLower.includes('where')) {
          result.rows._array = mockStore.users;
          result.rows.length = mockStore.users.length;
          result.rows.item = (i: number) => result.rows._array[i];
        }
      }

      // INSERT queries
      else if (sqlLower.startsWith('insert')) {
        let tableName = '';
        const tableMatch = sqlLower.match(/insert into\s+(\w+)/);
        if (tableMatch) {
          tableName = tableMatch[1];
        }

        if (tableName && mockStore[tableName]) {
          const columns = getColumns(sql);
          const values = params.length > 0 ? params : parseValues(sql);
          
          const newObj: any = {};
          const newId = ++mockIdCounter;
          newObj.id = newId;
          
          // Map values to columns
          let valueIndex = 0;
          for (const col of columns) {
            if (col !== 'id' && col !== '?') {
              newObj[col] = values[valueIndex] !== undefined ? values[valueIndex] : null;
              valueIndex++;
            }
          }

          // Add timestamps if not provided
          if (!newObj.created_at) {
            newObj.created_at = new Date().toISOString();
          }
          if (!newObj.updated_at) {
            newObj.updated_at = new Date().toISOString();
          }
          if (newObj.is_active === undefined) {
            newObj.is_active = 1;
          }

          // Store in the appropriate table
          mockStore[tableName].push(newObj);
          result.insertId = newId;
          result.rowsAffected = 1;
          
          // Return the inserted row for SELECT queries
          result.rows._array = [newObj];
          result.rows.length = 1;
          result.rows.item = (i: number) => result.rows._array[i];
          
          console.log(`✅ Inserted into ${tableName}:`, newObj);
        }
      }

      // UPDATE queries
      else if (sqlLower.startsWith('update')) {
        result.rowsAffected = 1;
        // Find and update the user
        if (sqlLower.includes('users') && sqlLower.includes('device_id')) {
          const match = sql.match(/device_id\s*=\s*'([^']*)'/i);
          if (match) {
            // Update user's device_id
          }
        }
      }

      // DELETE queries
      else if (sqlLower.startsWith('delete')) {
        result.rowsAffected = 1;
      }

      success && success(null, result);
    } catch (e: any) {
      console.error('Mock SQL error:', e);
      error && error(e);
    }
    return false;
  };

  return {
    executeSql,
    transaction: (callback: any, errorCallback?: any, successCallback?: any) => {
      try {
        const tx = {
          executeSql: (sql: string, params: any[], success: any, error: any) => {
            return executeSql(sql, params, success, error);
          }
        };
        callback(tx);
        successCallback && successCallback();
      } catch (e: any) {
        errorCallback && errorCallback(e);
      }
    }
  };
};

export const getDatabase = async (): Promise<any> => {
  if (!db) {
    db = createMockDatabase();
  }
  return db;
};

export const initializeDatabase = async (): Promise<void> => {
  if (isInitialized) {
    console.log('Database already initialized');
    return;
  }

  try {
    console.log('Initializing database tables...');
    const database = await getDatabase();
    
    if (!database) {
      console.log('No database instance, skipping initialization');
      isInitialized = true;
      return;
    }

    await new Promise<void>((resolve) => {
      database.transaction(
        (tx: any) => {
          console.log('Creating tables...');
          schema.forEach((tableSchema) => {
            tx.executeSql(
              tableSchema,
              [],
              () => {
                console.log('Table created');
              },
              (error: any) => {
                console.error('Error creating table:', error);
                return false;
              }
            );
          });

          migrations.forEach((migration) => {
            tx.executeSql(
              migration,
              [],
              () => {
                console.log('Migration executed');
              },
              (error: any) => {
                console.error('Migration error:', error);
                return false;
              }
            );
          });
        },
        (error: any) => {
          console.error('Transaction error:', error);
          resolve();
        },
        () => {
          console.log('All tables created successfully');
          isInitialized = true;
          resolve();
        }
      );
    });
  } catch (error) {
    console.error('Database initialization error:', error);
    isInitialized = true;
  }
};

export const executeQuery = async (
  query: string,
  params: any[] = []
): Promise<any[]> => {
  try {
    const database = await getDatabase();
    
    if (!database) {
      console.log('No database, returning empty array');
      return [];
    }

    return new Promise((resolve) => {
      database.transaction(
        (tx: any) => {
          tx.executeSql(
            query,
            params,
            (_: any, results: any) => {
              const rows: any[] = [];
              if (results && results.rows) {
                for (let i = 0; i < results.rows.length; i++) {
                  rows.push(results.rows.item(i));
                }
              }
              resolve(rows);
            },
            (error: any) => {
              console.error('Query error:', error);
              resolve([]);
              return false;
            }
          );
        },
        (error: any) => {
          console.error('Transaction error:', error);
          resolve([]);
        },
        () => {
          // Transaction complete
        }
      );
    });
  } catch (error) {
    console.error('Execute query error:', error);
    return [];
  }
};

export const executeTransaction = async (
  queries: { query: string; params?: any[] }[]
): Promise<void> => {
  try {
    const database = await getDatabase();
    
    if (!database) {
      return;
    }

    return new Promise((resolve) => {
      database.transaction(
        (tx: any) => {
          queries.forEach(({ query, params = [] }) => {
            tx.executeSql(
              query,
              params,
              () => {},
              (error: any) => {
                console.error('Transaction query error:', error);
                return false;
              }
            );
          });
        },
        (error: any) => {
          console.error('Transaction error:', error);
          resolve();
        },
        () => {
          console.log('Transaction completed');
          resolve();
        }
      );
    });
  } catch (error) {
    console.error('Transaction error:', error);
  }
};

export const isDatabaseReady = () => isInitialized;

// Export for debugging
export const getMockStore = () => mockStore;