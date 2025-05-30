# Face Recognition Attendance System

A comprehensive web-based face recognition attendance system built with Python, OpenCV, and face-recognition library. This system provides real-time face detection, user registration, and attendance tracking with a modern web interface.

## 🌟 Features

- **👤 Face Registration**: Register new users by capturing multiple face images for better accuracy
- **📷 Real-time Recognition**: Recognize faces through webcam feed with confidence scoring
- **⏰ Attendance Tracking**: Automatic check-in/check-out logging with timestamps
- **📊 Dashboard**: Real-time statistics and attendance monitoring
- **🌐 Web Interface**: Clean, responsive web interface with TailwindCSS
- **💾 Database Storage**: SQLite database for user and attendance data
- **🔒 Security**: Face encodings stored securely, no raw images saved
- **📱 Mobile Friendly**: Responsive design works on desktop and mobile devices

## 🏗️ Project Structure

```
├── backend/
│   ├── index.ts              # Main Hono server (HTTP endpoint)
│   ├── routes/
│   │   ├── attendance.ts     # Attendance API routes
│   │   └── users.ts          # User management routes
│   └── database/
│       ├── migrations.ts     # Database schema
│       └── queries.ts        # Database operations
├── frontend/
│   ├── index.html           # Main web interface
│   ├── index.tsx            # Frontend JavaScript entry
│   ├── components/
│   │   └── App.tsx          # React status component
│   ├── style.css            # Custom styles
│   └── favicon.svg          # App icon
├── python/
│   ├── face_recognition_service.py  # Python face recognition service
│   └── requirements.txt             # Python dependencies
└── shared/
    └── types.ts             # Shared TypeScript types
```

## 🚀 Setup Instructions

### Prerequisites

1. **Python 3.8+** with pip installed
2. **Camera access** in your browser
3. **Modern web browser** (Chrome, Firefox, Safari, Edge)

### Installation Steps

1. **Install Python Dependencies**
   ```bash
   cd python/
   pip install -r requirements.txt
   ```

   **Note**: Installing `dlib` and `face-recognition` may take some time and requires:
   - **Windows**: Visual Studio Build Tools
   - **macOS**: Xcode command line tools (`xcode-select --install`)
   - **Linux**: `sudo apt-get install cmake libopenblas-dev liblapack-dev`

2. **Database Setup**
   - SQLite database will be created automatically on first run
   - No manual database setup required

3. **Camera Permissions**
   - Allow camera access when prompted by your browser
   - Ensure good lighting for better face recognition accuracy

### 🎯 Quick Start

1. **Access the Application**
   - Open your browser and navigate to the Val Town URL
   - The system will automatically initialize the database

2. **Register Your First User**
   - Click on "Register User" tab
   - Fill in name and email
   - Start camera and capture 2-3 face images
   - Submit the registration

3. **Take Attendance**
   - Go to "Take Attendance" tab
   - Start camera
   - Position your face in front of the camera
   - Click "Check In" or "Check Out"

## 📡 API Endpoints

### User Management
- `GET /api/users` - List all registered users
- `GET /api/users/:id` - Get specific user details
- `POST /api/users/register` - Register new user with face data
- `POST /api/users/validate-face` - Validate face image quality
- `DELETE /api/users/:id` - Delete user (soft delete)

### Attendance
- `POST /api/attendance/checkin` - Process face recognition for check-in
- `POST /api/attendance/checkout` - Process face recognition for check-out
- `GET /api/attendance/today` - Get today's attendance records
- `GET /api/attendance/range` - Get attendance by date range
- `GET /api/attendance/user/:id` - Get user's attendance history
- `GET /api/attendance/stats` - Get attendance statistics

### System
- `GET /api/health` - System health check and statistics

## 🛠️ Technology Stack

- **Backend**: Hono (TypeScript) on Deno
- **Frontend**: Vanilla JavaScript + React components
- **Database**: SQLite with automatic migrations
- **Face Recognition**: Python with OpenCV and face-recognition
- **Styling**: TailwindCSS
- **Camera**: WebRTC getUserMedia API

## 📋 Usage Guide

### 1. User Registration
1. Navigate to the "Register User" tab
2. Enter the user's full name and email address
3. Click "Start Camera" to begin face capture
4. Ensure good lighting and center the face in the camera view
5. Click "Capture Face Image" to take 2-3 photos from different angles
6. Click "Register User" to save the user

### 2. Taking Attendance
1. Go to the "Take Attendance" tab
2. Click "Start Camera"
3. Position your face in front of the camera
4. Click "Check In" for arrival or "Check Out" for departure
5. The system will display recognition results with confidence score

### 3. Viewing Reports
1. **Attendance Logs**: View daily attendance with check-in/out times
2. **User Management**: See all registered users and their status
3. **Dashboard**: Real-time statistics and recent activity

## 🔧 Configuration

### Face Recognition Settings
- **Tolerance**: 0.6 (lower = more strict recognition)
- **Minimum Confidence**: 60% for successful recognition
- **Image Quality**: Automatic validation for face size and position

### Database Schema
- **Users**: ID, name, email, face_encoding, created_at, is_active
- **Attendance**: ID, user_id, check_in_time, check_out_time, date, confidence_score
- **Face Samples**: ID, user_id, image_data, encoding_data, created_at

## 🚨 Troubleshooting

### Common Issues

1. **Camera Not Working**
   - Check browser permissions for camera access
   - Ensure no other applications are using the camera
   - Try refreshing the page

2. **Face Not Recognized**
   - Ensure good lighting conditions
   - Position face directly in front of camera
   - Remove glasses or face coverings if possible
   - Re-register with better quality images

3. **Python Service Errors**
   - Verify Python dependencies are installed correctly
   - Check that `python3` command is available
   - Ensure sufficient system resources

4. **Low Recognition Accuracy**
   - Register multiple face images from different angles
   - Ensure consistent lighting during registration and recognition
   - Consider re-registering users with poor recognition rates

### Performance Tips

- **Good Lighting**: Ensure adequate, even lighting for best results
- **Camera Quality**: Higher resolution cameras provide better accuracy
- **Multiple Samples**: Register 2-3 face images per user for better recognition
- **Regular Updates**: Re-register users periodically if appearance changes significantly

## 🔐 Security Considerations

- Face encodings are stored as mathematical representations, not raw images
- No facial images are permanently stored in the database
- User data is stored locally in SQLite database
- Camera access is only active when explicitly started by user

## 📈 Future Enhancements

- **Multi-face Detection**: Support for multiple people in one frame
- **Attendance Reports**: Export functionality for attendance data
- **Email Notifications**: Automated attendance notifications
- **Mobile App**: Native mobile application
- **Advanced Analytics**: Attendance patterns and insights
- **Integration**: API integration with HR systems

## 🤝 Contributing

This is a complete, production-ready face recognition attendance system. Feel free to extend it with additional features or improvements based on your specific requirements.

## 📄 License

This project is provided as-is for educational and commercial use. Please ensure compliance with local privacy laws when implementing face recognition systems.
