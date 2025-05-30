import { sqlite } from "https://esm.town/v/stevekrouse/sqlite";
import type { User, AttendanceRecord, AttendanceStats } from "../../shared/types.ts";

// User management queries
export async function createUser(name: string, email: string, faceEncoding: string): Promise<number> {
  const result = await sqlite.execute(
    `INSERT INTO users_v1 (name, email, face_encoding) VALUES (?, ?, ?)`,
    [name, email, faceEncoding]
  );
  return result.lastInsertRowId as number;
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await sqlite.execute(
    `SELECT * FROM users_v1 WHERE id = ? AND is_active = 1`,
    [id]
  );
  return result.rows.length > 0 ? result.rows[0] as User : null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sqlite.execute(
    `SELECT * FROM users_v1 WHERE email = ? AND is_active = 1`,
    [email]
  );
  return result.rows.length > 0 ? result.rows[0] as User : null;
}

export async function getAllUsers(): Promise<User[]> {
  const result = await sqlite.execute(
    `SELECT id, name, email, created_at, is_active FROM users_v1 WHERE is_active = 1 ORDER BY name`
  );
  return result.rows as User[];
}

export async function getAllUserEncodings(): Promise<Array<{id: number, name: string, face_encoding: string}>> {
  const result = await sqlite.execute(
    `SELECT id, name, face_encoding FROM users_v1 WHERE is_active = 1`
  );
  return result.rows as Array<{id: number, name: string, face_encoding: string}>;
}

// Face samples management
export async function addFaceSample(userId: number, imageData: string, encodingData: string): Promise<void> {
  await sqlite.execute(
    `INSERT INTO face_samples_v1 (user_id, image_data, encoding_data) VALUES (?, ?, ?)`,
    [userId, imageData, encodingData]
  );
}

export async function getFaceSamples(userId: number): Promise<Array<{encoding_data: string}>> {
  const result = await sqlite.execute(
    `SELECT encoding_data FROM face_samples_v1 WHERE user_id = ?`,
    [userId]
  );
  return result.rows as Array<{encoding_data: string}>;
}

// Attendance management queries
export async function recordCheckIn(userId: number, confidenceScore: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  // Try to insert new attendance record
  try {
    await sqlite.execute(
      `INSERT INTO attendance_v1 (user_id, date, confidence_score) VALUES (?, ?, ?)`,
      [userId, today, confidenceScore]
    );
  } catch (error) {
    // If record already exists for today, update check_in_time
    await sqlite.execute(
      `UPDATE attendance_v1 SET check_in_time = CURRENT_TIMESTAMP, confidence_score = ? 
       WHERE user_id = ? AND date = ?`,
      [confidenceScore, userId, today]
    );
  }
}

export async function recordCheckOut(userId: number): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  await sqlite.execute(
    `UPDATE attendance_v1 SET check_out_time = CURRENT_TIMESTAMP 
     WHERE user_id = ? AND date = ? AND check_out_time IS NULL`,
    [userId, today]
  );
}

export async function getTodayAttendance(): Promise<AttendanceRecord[]> {
  const today = new Date().toISOString().split('T')[0];
  
  const result = await sqlite.execute(`
    SELECT a.*, u.name as user_name 
    FROM attendance_v1 a 
    JOIN users_v1 u ON a.user_id = u.id 
    WHERE a.date = ? 
    ORDER BY a.check_in_time DESC
  `, [today]);
  
  return result.rows as AttendanceRecord[];
}

export async function getAttendanceByDateRange(startDate: string, endDate: string): Promise<AttendanceRecord[]> {
  const result = await sqlite.execute(`
    SELECT a.*, u.name as user_name 
    FROM attendance_v1 a 
    JOIN users_v1 u ON a.user_id = u.id 
    WHERE a.date BETWEEN ? AND ? 
    ORDER BY a.date DESC, a.check_in_time DESC
  `, [startDate, endDate]);
  
  return result.rows as AttendanceRecord[];
}

export async function getUserAttendance(userId: number, limit: number = 30): Promise<AttendanceRecord[]> {
  const result = await sqlite.execute(`
    SELECT a.*, u.name as user_name 
    FROM attendance_v1 a 
    JOIN users_v1 u ON a.user_id = u.id 
    WHERE a.user_id = ? 
    ORDER BY a.date DESC, a.check_in_time DESC 
    LIMIT ?
  `, [userId, limit]);
  
  return result.rows as AttendanceRecord[];
}

export async function getAttendanceStats(): Promise<AttendanceStats> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get total users
  const totalUsersResult = await sqlite.execute(
    `SELECT COUNT(*) as count FROM users_v1 WHERE is_active = 1`
  );
  const totalUsers = totalUsersResult.rows[0].count as number;
  
  // Get present today
  const presentTodayResult = await sqlite.execute(
    `SELECT COUNT(DISTINCT user_id) as count FROM attendance_v1 WHERE date = ?`,
    [today]
  );
  const presentToday = presentTodayResult.rows[0].count as number;
  
  // Get total check-ins today
  const checkinsResult = await sqlite.execute(
    `SELECT COUNT(*) as count FROM attendance_v1 WHERE date = ?`,
    [today]
  );
  const totalCheckinsToday = checkinsResult.rows[0].count as number;
  
  // Get recent check-ins
  const recentCheckins = await getTodayAttendance();
  
  return {
    total_users: totalUsers,
    present_today: presentToday,
    total_checkins_today: totalCheckinsToday,
    recent_checkins: recentCheckins.slice(0, 10)
  };
}
