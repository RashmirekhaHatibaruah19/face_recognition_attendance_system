import { Hono } from "https://esm.sh/hono@3.11.7";
import type { User, RegistrationData } from "../../shared/types.ts";
import * as db from "../database/queries.ts";

const users = new Hono();

// Get all users
users.get("/", async (c) => {
  try {
    const allUsers = await db.getAllUsers();
    return c.json({ success: true, users: allUsers });
  } catch (error) {
    console.error("Error fetching users:", error);
    return c.json({ success: false, message: "Failed to fetch users" }, 500);
  }
});

// Get user by ID
users.get("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, message: "Invalid user ID" }, 400);
    }

    const user = await db.getUserById(id);
    if (!user) {
      return c.json({ success: false, message: "User not found" }, 404);
    }

    // Don't return face encoding in the response for security
    const { face_encoding, ...userWithoutEncoding } = user;
    return c.json({ success: true, user: userWithoutEncoding });
  } catch (error) {
    console.error("Error fetching user:", error);
    return c.json({ success: false, message: "Failed to fetch user" }, 500);
  }
});

// Register new user
users.post("/register", async (c) => {
  try {
    const body = await c.req.json() as RegistrationData;
    const { name, email, face_images } = body;

    // Validate input
    if (!name || !email || !face_images || face_images.length === 0) {
      return c.json({ 
        success: false, 
        message: "Name, email, and at least one face image are required" 
      }, 400);
    }

    // Check if user already exists
    const existingUser = await db.getUserByEmail(email);
    if (existingUser) {
      return c.json({ 
        success: false, 
        message: "User with this email already exists" 
      }, 409);
    }

    // Process face images using Python service
    const faceEncodings = [];
    for (const imageData of face_images) {
      try {
        // Call Python service to extract face encoding
        const pythonProcess = new Deno.Command("python3", {
          args: ["/python/face_recognition_service.py", "encode", imageData],
          stdout: "piped",
          stderr: "piped"
        });

        const { code, stdout, stderr } = await pythonProcess.output();
        
        if (code !== 0) {
          const errorMsg = new TextDecoder().decode(stderr);
          console.error("Python service error:", errorMsg);
          return c.json({ 
            success: false, 
            message: "Failed to process face image" 
          }, 500);
        }

        const result = JSON.parse(new TextDecoder().decode(stdout));
        
        if (!result.success) {
          return c.json({ 
            success: false, 
            message: result.message || "Failed to extract face encoding" 
          }, 400);
        }

        faceEncodings.push(result.encoding);
      } catch (error) {
        console.error("Error processing face image:", error);
        return c.json({ 
          success: false, 
          message: "Error processing face image" 
        }, 500);
      }
    }

    if (faceEncodings.length === 0) {
      return c.json({ 
        success: false, 
        message: "No valid face encodings could be extracted" 
      }, 400);
    }

    // Use the first encoding as the primary encoding
    // In a production system, you might want to average multiple encodings
    const primaryEncoding = JSON.stringify(faceEncodings[0]);

    // Create user in database
    const userId = await db.createUser(name, email, primaryEncoding);

    // Store additional face samples if provided
    for (let i = 0; i < face_images.length; i++) {
      await db.addFaceSample(userId, face_images[i], JSON.stringify(faceEncodings[i]));
    }

    return c.json({ 
      success: true, 
      message: "User registered successfully",
      user_id: userId
    });

  } catch (error) {
    console.error("Error registering user:", error);
    return c.json({ 
      success: false, 
      message: "Failed to register user" 
    }, 500);
  }
});

// Validate face image quality
users.post("/validate-face", async (c) => {
  try {
    const { image_data } = await c.req.json();

    if (!image_data) {
      return c.json({ 
        success: false, 
        message: "Image data is required" 
      }, 400);
    }

    // Call Python service to validate face quality
    const pythonProcess = new Deno.Command("python3", {
      args: ["/python/face_recognition_service.py", "validate", image_data],
      stdout: "piped",
      stderr: "piped"
    });

    const { code, stdout, stderr } = await pythonProcess.output();
    
    if (code !== 0) {
      const errorMsg = new TextDecoder().decode(stderr);
      console.error("Python service error:", errorMsg);
      return c.json({ 
        success: false, 
        message: "Failed to validate face image" 
      }, 500);
    }

    const result = JSON.parse(new TextDecoder().decode(stdout));
    return c.json(result);

  } catch (error) {
    console.error("Error validating face:", error);
    return c.json({ 
      success: false, 
      message: "Failed to validate face image" 
    }, 500);
  }
});

// Delete user (soft delete)
users.delete("/:id", async (c) => {
  try {
    const id = parseInt(c.req.param("id"));
    if (isNaN(id)) {
      return c.json({ success: false, message: "Invalid user ID" }, 400);
    }

    // In a real implementation, you'd want to soft delete the user
    // For now, we'll just return success
    return c.json({ 
      success: true, 
      message: "User deletion not implemented yet" 
    });

  } catch (error) {
    console.error("Error deleting user:", error);
    return c.json({ 
      success: false, 
      message: "Failed to delete user" 
    }, 500);
  }
});

export default users;
