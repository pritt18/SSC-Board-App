// src/database/models/User.ts
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
  permissions?: string; // 'admin' | 'user'
  created_at?: string;
  updated_at?: string;
  is_active?: boolean | number;
  is_approved?: boolean | number;
}

export const UserModel = {
  create: async (user: Omit<User, 'id'>): Promise<number> => {
    const query = `
      INSERT INTO users (
        username, email, password_hash, full_name, role, 
        medium, class_id, device_id, permissions, is_active, is_approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const params = [
      user.username, 
      user.email, 
      user.password_hash, 
      user.full_name,
      user.role, 
      user.medium || 'english', 
      user.class_id || null, 
      user.device_id || null,
      user.permissions || 'user',
      1, // is_active default 1
      1  // is_approved default 1
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
    const query = 'SELECT * FROM users ORDER BY created_at DESC';
    const results = await executeQuery(query, []);
    return results as User[];
  },

  findByRole: async (role: User['role']): Promise<User[]> => {
    const query = `
      SELECT *
      FROM users
      WHERE role = ? AND is_active = 1
      ORDER BY full_name ASC
    `;
    const results = await executeQuery(query, [role]);
    return results as User[];
  },

  findByUsername: async (username: string): Promise<User | null> => {
    const query = 'SELECT * FROM users WHERE username = ?';
    const results = await executeQuery(query, [username]);
    return results && results.length > 0 ? results[0] as User : null;
  },

  findByClass: async (classId: number): Promise<User[]> => {
    const query = `
      SELECT *
      FROM users
      WHERE class_id = ? AND is_active = 1
      ORDER BY full_name ASC
    `;
    const results = await executeQuery(query, [classId]);
    return results as User[];
  },

  findActive: async (): Promise<User[]> => {
    const query = 'SELECT * FROM users WHERE is_active = 1 ORDER BY full_name ASC';
    const results = await executeQuery(query, []);
    return results as User[];
  },

  findApproved: async (): Promise<User[]> => {
    const query = 'SELECT * FROM users WHERE is_approved = 1 AND is_active = 1 ORDER BY full_name ASC';
    const results = await executeQuery(query, []);
    return results as User[];
  },

  findByPermissions: async (permissions: string): Promise<User[]> => {
    const query = 'SELECT * FROM users WHERE permissions = ? AND is_active = 1 ORDER BY full_name ASC';
    const results = await executeQuery(query, [permissions]);
    return results as User[];
  },

  updateDeviceId: async (userId: number, deviceId: string): Promise<void> => {
    const query = 'UPDATE users SET device_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(query, [deviceId, userId]);
  },

  update: async (userId: number, data: Partial<User>): Promise<void> => {
    const fields = Object.keys(data)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map(key => `${key} = ?`)
      .join(', ');
    
    const values = Object.keys(data)
      .filter(key => key !== 'id' && key !== 'created_at')
      .map(key => data[key as keyof User]);
    
    const query = `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    await executeQuery(query, [...values, userId]);
  },

  updateRole: async (userId: number, role: User['role']): Promise<void> => {
    const query = 'UPDATE users SET role = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(query, [role, userId]);
  },

  updatePermissions: async (userId: number, permissions: string): Promise<void> => {
    const query = 'UPDATE users SET permissions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(query, [permissions, userId]);
  },

  activate: async (userId: number): Promise<void> => {
    const query = 'UPDATE users SET is_active = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(query, [userId]);
  },

  deactivate: async (userId: number): Promise<void> => {
    const query = 'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(query, [userId]);
  },

  approve: async (userId: number): Promise<void> => {
    const query = 'UPDATE users SET is_approved = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(query, [userId]);
  },

  disapprove: async (userId: number): Promise<void> => {
    const query = 'UPDATE users SET is_approved = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await executeQuery(query, [userId]);
  },

  delete: async (userId: number): Promise<void> => {
    const query = 'DELETE FROM users WHERE id = ?';
    await executeQuery(query, [userId]);
  },

  getCount: async (): Promise<number> => {
    const query = 'SELECT COUNT(*) as count FROM users WHERE is_active = 1';
    const result = await executeQuery(query, []);
    return result && result.length > 0 ? result[0].count : 0;
  },

  getCountByRole: async (role: User['role']): Promise<number> => {
    const query = 'SELECT COUNT(*) as count FROM users WHERE role = ? AND is_active = 1';
    const result = await executeQuery(query, [role]);
    return result && result.length > 0 ? result[0].count : 0;
  },

  getCountByClass: async (classId: number): Promise<number> => {
    const query = 'SELECT COUNT(*) as count FROM users WHERE class_id = ? AND is_active = 1';
    const result = await executeQuery(query, [classId]);
    return result && result.length > 0 ? result[0].count : 0;
  },

  search: async (searchTerm: string): Promise<User[]> => {
    const query = `
      SELECT *
      FROM users
      WHERE (username LIKE ? OR email LIKE ? OR full_name LIKE ?)
        AND is_active = 1
      ORDER BY full_name ASC
    `;
    const searchPattern = `%${searchTerm}%`;
    const results = await executeQuery(query, [searchPattern, searchPattern, searchPattern]);
    return results as User[];
  },

  getRecent: async (limit: number = 10): Promise<User[]> => {
    const query = 'SELECT * FROM users ORDER BY created_at DESC LIMIT ?';
    const results = await executeQuery(query, [limit]);
    return results as User[];
  },

  // Get users with their class names
  getUsersWithClassNames: async (): Promise<any[]> => {
    const query = `
      SELECT 
        u.*,
        c.name_english as class_name,
        c.class_number
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.is_active = 1
      ORDER BY u.created_at DESC
    `;
    const results = await executeQuery(query, []);
    return results;
  },

  // Get users with class names by role
  getUsersWithClassNamesByRole: async (role: User['role']): Promise<any[]> => {
    const query = `
      SELECT 
        u.*,
        c.name_english as class_name,
        c.class_number
      FROM users u
      LEFT JOIN classes c ON u.class_id = c.id
      WHERE u.role = ? AND u.is_active = 1
      ORDER BY u.full_name ASC
    `;
    const results = await executeQuery(query, [role]);
    return results;
  }
};

export default UserModel;