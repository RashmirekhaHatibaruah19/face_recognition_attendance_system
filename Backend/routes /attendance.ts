import { Hono } from "https://esm.sh/hono@3.11.7";
import type { AttendanceRecord, FaceRecognitionResult, CameraCapture } from "../../shared/types.ts";
import * as db from "../database/queries.ts";

const attendance = new Hono();

// Process face recognition for check-in
attendance.post("/checkin", async (c) => {
  try {
    const { image_data } = await c.req.json() as CameraCapture;

    if (!image_data) {
      return c.json({ 
        success: false, 
        message: "Image data is required" 
      }, 400);
    }

    // Get all known faces from database
    const knownFaces = await db.getAllUserEncodings();
    
    if (knownFaces.length === 0) {
      return c.json({ 
        success: false, 
        message: "No registered users found in the system" 
      }, 400);
    }

    // Call Python service for face recognition
    const pythonProcess = new Deno.Command("python3", {
      args: [
        "/python/face_recognition_service.py", 
        "recognize", 
        image_data, 
        JSON.stringify(knownFaces)
      ],
      stdout: "piped",
      stderr: "piped"
    });

    const { code, stdout, stderr } = await pythonProcess.output();
    
    if (code !== 0) {
      const errorMsg = new TextDecoder().decode(stderr);
      console.error("Python service error:", errorMsg);
      return c.json({ 
        success: false, 
        message: "Face recognition service error" 
      }, 500);
    }

    const recognitionResult = JSON.parse(new TextDecoder().decode(stdout)) as FaceRecognitionResult;
    
    if (!recognitionResult.success) {
      return c.json(recognitionResult);
    }

    // Record attendance in database
    if (recognitionResult.user_id) {
      await db.recordCheckIn(recognitionResult.user_id, recognitionResult.confidence);
      
      return c.json({
        success: true,
        user_id: recognitionResult.user_id,
        user_name: recognitionResult.user_name,
        confidence: recognitionResult.confidence,
        message: `Welcome ${recognitionResult.user_name}! Attendance recorded.`,
        timestamp: new Date().toISOString()
      });
    } else {
      return c.json(recognitionResult);
    }

  } catch (error) {
    console.error("Error processing check-in:", error);
    return c.json({ 
      success: false, 
      message: "Failed to process check-in" 
    }, 500);
  }
});

// Process check-out
attendance.post("/checkout", async (c) => {
  try {
    const { image_data } = await c.req.json() as CameraCapture;

    if (!image_data) {
      return c.json({ 
        success: false, 
        message: "Image data is required" 
      }, 400);
    }

    // Get all known faces from database
    const knownFaces = await db.getAllUserEncodings();
    
    if (knownFaces.length === 0) {
      return c.json({ 
        success: false, 
        message: "No registered users found in the system" 
      }, 400);
    }

    // Call Python service for face recognition
    const pythonProcess = new Deno.Command("python3", {
      args: [
        "/python/face_recognition_service.py", 
        "recognize", 
        image_data, 
        JSON.stringify(knownFaces)
      ],
      stdout: "piped",
      stderr: "piped"
    });

    const { code, stdout, stderr } = await pythonProcess.output();
    
    if (code !== 0) {
      const errorMsg = new TextDecoder().decode(stderr);
      console.error("Python service error:", errorMsg);
      return c.json({ 
        success: false, 
        message: "Face recognition service error" 
      }, 500);
    }

    const recognitionResult = JSON.parse(new TextDecoder().decode(stdout)) as FaceRecognitionResult;
    
    if (!recognitionResult.success) {
      return c.json(recognitionResult);
    }

    // Record check-out in database
    if (recognitionResult.user_id) {
      await db.recordCheckOut(recognitionResult.user_id);
      
      return c.json({
        success: true,
        user_id: recognitionResult.user_id,
        user_name: recognitionResult.user_name,
        confidence: recognitionResult.confidence,
        message: `Goodbye ${recognitionResult.user_name}! Check-out recorded.`,
        timestamp: new Date().toISOString()
      });
    } else {
      return c.json(recognitionResult);
    }

  } catch (error) {
    console.error("Error processing check-out:", error);
    return c.json({ 
      success: false, 
      message: "Failed to process check-out" 
    }, 500);
  }
});

// Get today's attendance log
attendance.get("/today", async (c) => {
  try {
    const todayAttendance = await db.getTodayAttendance();
    return c.json({ 
      success: true, 
      attendance: todayAttendance,
      date: new Date().toISOString().split('T')[0]
    });
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    return c.json({ 
      success: false, 
      message: "Failed to fetch attendance records" 
    }, 500);
  }
});

// Get attendance by date range
attendance.get("/range", async (c) => {
  try {
    const startDate = c.req.query("start_date");
    const endDate = c.req.query("end_date");

    if (!startDate || !endDate) {
      return c.json({ 
        success: false, 
        message: "start_date and end_date parameters are required" 
      }, 400);
    }

    const attendanceRecords = await db.getAttendanceByDateRange(startDate, endDate);
    return c.json({ 
      success: true, 
      attendance: attendanceRecords,
      start_date: startDate,
      end_date: endDate
    });
  } catch (error) {
    console.error("Error fetching attendance by date range:", error);
    return c.json({ 
      success: false, 
      message: "Failed to fetch attendance records" 
    }, 500);
  }
});

// Get user's attendance history
attendance.get("/user/:id", async (c) => {
  try {
    const userId = parseInt(c.req.param("id"));
    const limit = parseInt(c.req.query("limit") || "30");

    if (isNaN(userId)) {
      return c.json({ 
        success: false, 
        message: "Invalid user ID" 
      }, 400);
    }

    const userAttendance = await db.getUserAttendance(userId, limit);
    return c.json({ 
      success: true, 
      attendance: userAttendance,
      user_id: userId
    });
  } catch (error) {
    console.error("Error fetching user attendance:", error);
    return c.json({ 
      success: false, 
      message: "Failed to fetch user attendance" 
    }, 500);
  }
});

// Get attendance statistics
attendance.get("/stats", async (c) => {
  try {
    const stats = await db.getAttendanceStats();
    return c.json({ 
      success: true, 
      stats: stats
    });
  } catch (error) {
    console.error("Error fetching attendance stats:", error);
    return c.json({ 
      success: false, 
      message: "Failed to fetch attendance statistics" 
    }, 500);
  }
});

export default attendance;
