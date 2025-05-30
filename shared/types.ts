// Shared types for the face recognition attendance system

export interface User {
  id: number;
  name: string;
  email: string;
  face_encoding: string; // Base64 encoded face data
  created_at: string;
  is_active: boolean;
}

export interface AttendanceRecord {
  id: number;
  user_id: number;
  user_name: string;
  check_in_time: string;
  check_out_time?: string;
  date: string;
  confidence_score: number;
}

export interface FaceRecognitionResult {
  success: boolean;
  user_id?: number;
  user_name?: string;
  confidence: number;
  message: string;
}

export interface CameraCapture {
  image_data: string; // Base64 encoded image
  timestamp: string;
}

export interface RegistrationData {
  name: string;
  email: string;
  face_images: string[]; // Multiple face captures for better accuracy
}

export interface AttendanceStats {
  total_users: number;
  present_today: number;
  total_checkins_today: number;
  recent_checkins: AttendanceRecord[];
}
