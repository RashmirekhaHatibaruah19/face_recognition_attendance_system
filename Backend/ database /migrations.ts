import { sqlite } from "https://esm.town/v/stevekrouse/sqlite";

// Database schema for face recognition attendance system
export async function runMigrations() {
  console.log("Running database migrations...");

  // Users table - stores registered users and their face encodings
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS users_v1 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      face_encoding TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Attendance records table
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS attendance_v1 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      check_in_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      check_out_time DATETIME NULL,
      date DATE NOT NULL,
      confidence_score REAL NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users_v1 (id),
      UNIQUE(user_id, date)
    )
  `);

  // Face images table - stores multiple face samples per user for better accuracy
  await sqlite.execute(`
    CREATE TABLE IF NOT EXISTS face_samples_v1 (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      image_data TEXT NOT NULL,
      encoding_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users_v1 (id)
    )
  `);

  // Create indexes for better performance
  await sqlite.execute(`
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_v1(date);
  `);
  
  await sqlite.execute(`
    CREATE INDEX IF NOT EXISTS idx_attendance_user_date ON attendance_v1(user_id, date);
  `);

  console.log("Database migrations completed successfully");
}
