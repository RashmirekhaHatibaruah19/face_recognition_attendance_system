#!/usr/bin/env python3
"""
Face Recognition Service for Attendance System
Handles face detection, encoding, and recognition operations
"""

import cv2
import face_recognition
import numpy as np
import base64
import json
import sys
from typing import List, Dict, Optional, Tuple
import pickle
import os
from datetime import datetime

class FaceRecognitionService:
    def __init__(self):
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        self.tolerance = 0.6  # Lower is more strict
        
    def encode_image_to_base64(self, image_path: str) -> str:
        """Convert image file to base64 string"""
        with open(image_path, "rb") as image_file:
            return base64.b64encode(image_file.read()).decode('utf-8')
    
    def decode_base64_to_image(self, base64_string: str) -> np.ndarray:
        """Convert base64 string to OpenCV image"""
        # Remove data URL prefix if present
        if base64_string.startswith('data:image'):
            base64_string = base64_string.split(',')[1]
        
        image_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(image_data, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return image
    
    def extract_face_encoding(self, image: np.ndarray) -> Optional[List[float]]:
        """Extract face encoding from image"""
        # Convert BGR to RGB (OpenCV uses BGR, face_recognition uses RGB)
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        # Find face locations
        face_locations = face_recognition.face_locations(rgb_image)
        
        if not face_locations:
            return None
        
        # Get face encodings
        face_encodings = face_recognition.face_encodings(rgb_image, face_locations)
        
        if not face_encodings:
            return None
        
        # Return the first face encoding found
        return face_encodings[0].tolist()
    
    def extract_face_encoding_from_base64(self, base64_image: str) -> Optional[List[float]]:
        """Extract face encoding from base64 image"""
        try:
            image = self.decode_base64_to_image(base64_image)
            return self.extract_face_encoding(image)
        except Exception as e:
            print(f"Error processing image: {e}", file=sys.stderr)
            return None
    
    def load_known_faces(self, face_data: List[Dict]) -> None:
        """Load known faces from database data"""
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = []
        
        for person in face_data:
            try:
                # Parse the face encoding from JSON string
                encoding = json.loads(person['face_encoding'])
                self.known_face_encodings.append(np.array(encoding))
                self.known_face_names.append(person['name'])
                self.known_face_ids.append(person['id'])
            except Exception as e:
                print(f"Error loading face data for {person.get('name', 'unknown')}: {e}", file=sys.stderr)
    
    def recognize_face(self, base64_image: str) -> Dict:
        """Recognize face in the given image"""
        try:
            # Extract face encoding from input image
            face_encoding = self.extract_face_encoding_from_base64(base64_image)
            
            if face_encoding is None:
                return {
                    "success": False,
                    "message": "No face detected in the image",
                    "confidence": 0.0
                }
            
            if not self.known_face_encodings:
                return {
                    "success": False,
                    "message": "No registered faces in the system",
                    "confidence": 0.0
                }
            
            # Compare with known faces
            face_distances = face_recognition.face_distance(
                self.known_face_encodings, 
                np.array(face_encoding)
            )
            
            # Find the best match
            best_match_index = np.argmin(face_distances)
            best_distance = face_distances[best_match_index]
            
            # Check if the match is within tolerance
            if best_distance <= self.tolerance:
                confidence = (1 - best_distance) * 100  # Convert to percentage
                return {
                    "success": True,
                    "user_id": self.known_face_ids[best_match_index],
                    "user_name": self.known_face_names[best_match_index],
                    "confidence": round(confidence, 2),
                    "message": f"Face recognized: {self.known_face_names[best_match_index]}"
                }
            else:
                return {
                    "success": False,
                    "message": "Face not recognized",
                    "confidence": round((1 - best_distance) * 100, 2)
                }
                
        except Exception as e:
            return {
                "success": False,
                "message": f"Error during face recognition: {str(e)}",
                "confidence": 0.0
            }
    
    def validate_face_quality(self, base64_image: str) -> Dict:
        """Validate if the image has good quality for face recognition"""
        try:
            image = self.decode_base64_to_image(base64_image)
            rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Find face locations
            face_locations = face_recognition.face_locations(rgb_image)
            
            if not face_locations:
                return {
                    "valid": False,
                    "message": "No face detected in the image"
                }
            
            if len(face_locations) > 1:
                return {
                    "valid": False,
                    "message": "Multiple faces detected. Please ensure only one face is visible"
                }
            
            # Check face size (should be reasonable size)
            top, right, bottom, left = face_locations[0]
            face_width = right - left
            face_height = bottom - top
            
            if face_width < 50 or face_height < 50:
                return {
                    "valid": False,
                    "message": "Face too small. Please move closer to the camera"
                }
            
            # Check if face is too close to edges
            img_height, img_width = image.shape[:2]
            if (left < 20 or top < 20 or 
                right > img_width - 20 or bottom > img_height - 20):
                return {
                    "valid": False,
                    "message": "Face too close to image edge. Please center your face"
                }
            
            return {
                "valid": True,
                "message": "Face quality is good for recognition"
            }
            
        except Exception as e:
            return {
                "valid": False,
                "message": f"Error validating image: {str(e)}"
            }

def main():
    """Main function to handle command line interface"""
    if len(sys.argv) < 2:
        print("Usage: python face_recognition_service.py <command> [args...]")
        print("Commands:")
        print("  encode <base64_image> - Extract face encoding from image")
        print("  recognize <base64_image> <known_faces_json> - Recognize face")
        print("  validate <base64_image> - Validate face quality")
        sys.exit(1)
    
    service = FaceRecognitionService()
    command = sys.argv[1]
    
    if command == "encode":
        if len(sys.argv) != 3:
            print("Usage: encode <base64_image>")
            sys.exit(1)
        
        base64_image = sys.argv[2]
        encoding = service.extract_face_encoding_from_base64(base64_image)
        
        if encoding:
            result = {
                "success": True,
                "encoding": encoding,
                "message": "Face encoding extracted successfully"
            }
        else:
            result = {
                "success": False,
                "encoding": None,
                "message": "No face detected in image"
            }
        
        print(json.dumps(result))
    
    elif command == "recognize":
        if len(sys.argv) != 4:
            print("Usage: recognize <base64_image> <known_faces_json>")
            sys.exit(1)
        
        base64_image = sys.argv[2]
        known_faces_json = sys.argv[3]
        
        try:
            known_faces = json.loads(known_faces_json)
            service.load_known_faces(known_faces)
            result = service.recognize_face(base64_image)
            print(json.dumps(result))
        except json.JSONDecodeError:
            print(json.dumps({
                "success": False,
                "message": "Invalid JSON format for known faces"
            }))
    
    elif command == "validate":
        if len(sys.argv) != 3:
            print("Usage: validate <base64_image>")
            sys.exit(1)
        
        base64_image = sys.argv[2]
        result = service.validate_face_quality(base64_image)
        print(json.dumps(result))
    
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)

if __name__ == "__main__":
    main()
