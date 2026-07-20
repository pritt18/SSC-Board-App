import { executeQuery } from '../database';

export interface User {
  id?: number;
  username: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: 'admin' | 'teacher' | 'parent' | 'student' | 'distributor';
  medium?: 'marathi' | 'english';
  class_id?: number | null;
  device_id?: string | null;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean | number;
}

export const UserModel = {
  create: async (user: Omit<User, 'id'>): Promise<number> => {
    const query = `
      INSERT INTO users (
        username, email, password_hash, full_name, role, 
        medium, class_id, device_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      user.username, 
      user.email, 
      user.password_hash, 
      user.full_name,
      user.role, 
      user.medium || 'english', 
      user.class_id || null, 
      user.device_id || null
    ];
    
    console.log('Creating user with params:', params);
    const result = await executeQuery(query, params);
    console.log('Create result:', result);
    
    // Find the user by email to get the ID
    const users = await UserModel.findByEmail(user.email);
    return users?.id || 0;
  },

  findByEmail: async (email: string): Promise<User | null> => {
    const query = 'SELECT * FROM users WHERE email = ?';
    const results = await executeQuery(query, [email]);
    console.log('Find by email results:', results);
    return results && results.length > 0 ? results[0] as User : null;
  },

  findById: async (id: number): Promise<User | null> => {
    const query = 'SELECT * FROM users WHERE id = ?';
    const results = await executeQuery(query, [id]);
    return results && results.length > 0 ? results[0] as User : null;
  },

  findAll: async (): Promise<User[]> => {
    const query = 'SELECT * FROM users';
    const results = await executeQuery(query, []);
    return results as User[];
  },

  findByUsername: async (username: string): Promise<User | null> => {
    const query = 'SELECT * FROM users WHERE username = ?';
    const results = await executeQuery(query, [username]);
    return results && results.length > 0 ? results[0] as User : null;
  },

  updateDeviceId: async (userId: number, deviceId: string): Promise<void> => {
    const query = 'UPDATE users SET device_id = ? WHERE id = ?';
    await executeQuery(query, [deviceId, userId]);
  },

  update: async (userId: number, data: Partial<User>): Promise<void> => {
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    const query = `UPDATE users SET ${fields} WHERE id = ?`;
    await executeQuery(query, [...values, userId]);
  },

  delete: async (userId: number): Promise<void> => {
    const query = 'DELETE FROM users WHERE id = ?';
    await executeQuery(query, [userId]);
  }
};