/** @jsxImportSource https://esm.sh/react@18.2.0 */
import React from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import App from "./components/App.tsx";

// Initialize the React application
const container = document.getElementById('react-root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}

// Initialize vanilla JavaScript functionality for the main interface
class AttendanceSystem {
  constructor() {
    this.currentStream = null;
    this.capturedImages = [];
    this.isProcessing = false;
    
    this.initializeEventListeners();
    this.initializeTabs();
    this.updateCurrentTime();
    this.loadInitialData();
    
    // Update time every second
    setInterval(() => this.updateCurrentTime(), 1000);
  }

  initializeEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        const tabName = e.target.getAttribute('data-tab');
        this.switchTab(tabName);
      });
    });

    // Camera controls for attendance
    document.getElementById('start-camera-btn')?.addEventListener('click', () => {
      this.startCamera('camera-video', 'camera-overlay', ['checkin-btn', 'checkout-btn']);
    });

    document.getElementById('checkin-btn')?.addEventListener('click', () => {
      this.processAttendance('checkin');
    });

    document.getElementById('checkout-btn')?.addEventListener('click', () => {
      this.processAttendance('checkout');
    });

    // Registration form
    document.getElementById('start-register-camera-btn')?.addEventListener('click', () => {
      this.startCamera('register-video', 'register-overlay', ['capture-face-btn']);
    });

    document.getElementById('capture-face-btn')?.addEventListener('click', () => {
      this.captureFaceImage();
    });

    document.getElementById('registration-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.registerUser();
    });

    document.getElementById('clear-form-btn')?.addEventListener('click', () => {
      this.clearRegistrationForm();
    });

    // Logs and users refresh
    document.getElementById('refresh-logs-btn')?.addEventListener('click', () => {
      this.loadAttendanceLogs();
    });

    document.getElementById('refresh-users-btn')?.addEventListener('click', () => {
      this.loadUsers();
    });

    document.getElementById('filter-logs-btn')?.addEventListener('click', () => {
      this.filterAttendanceLogs();
    });
  }

  initializeTabs() {
    // Set default dates for log filtering
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    
    if (startDateInput) startDateInput.value = weekAgo;
    if (endDateInput) endDateInput.value = today;
  }

  switchTab(tabName: string) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.add('hidden');
    });
    document.getElementById(`${tabName}-tab`)?.classList.remove('hidden');

    // Load data for specific tabs
    if (tabName === 'logs') {
      this.loadAttendanceLogs();
    } else if (tabName === 'users') {
      this.loadUsers();
    }

    // Stop any active camera streams when switching tabs
    this.stopCamera();
  }

  updateCurrentTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    const element = document.getElementById('current-time');
    if (element) {
      element.textContent = timeString;
    }
  }

  async loadInitialData() {
    try {
      // Use initial data injected by server if available
      const initialData = (window as any).__INITIAL_DATA__;
      if (initialData) {
        this.updateStats(initialData);
      } else {
        // Fallback to API call
        const response = await fetch('/api/attendance/stats');
        const data = await response.json();
        if (data.success) {
          this.updateStats(data.stats);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      this.updateSystemStatus('error');
    }
  }

  updateStats(stats: any) {
    document.getElementById('total-users')!.textContent = stats.total_users.toString();
    document.getElementById('present-today')!.textContent = stats.present_today.toString();
    document.getElementById('checkins-today')!.textContent = stats.total_checkins_today.toString();
    
    const lastCheckin = stats.recent_checkins?.[0];
    const lastCheckinElement = document.getElementById('last-checkin');
    if (lastCheckinElement) {
      if (lastCheckin) {
        const time = new Date(lastCheckin.check_in_time).toLocaleTimeString();
        lastCheckinElement.textContent = `${lastCheckin.user_name} at ${time}`;
      } else {
        lastCheckinElement.textContent = 'None today';
      }
    }
  }

  updateSystemStatus(status: 'healthy' | 'warning' | 'error') {
    const indicator = document.getElementById('status-indicator');
    if (indicator) {
      indicator.className = 'w-3 h-3 rounded-full';
      switch (status) {
        case 'healthy':
          indicator.classList.add('bg-green-400');
          break;
        case 'warning':
          indicator.classList.add('bg-yellow-400');
          break;
        case 'error':
          indicator.classList.add('bg-red-400');
          break;
      }
    }
  }

  async startCamera(videoId: string, overlayId: string, enableButtons: string[]) {
    try {
      const video = document.getElementById(videoId) as HTMLVideoElement;
      const overlay = document.getElementById(overlayId);
      
      if (!video) return;

      this.currentStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      video.srcObject = this.currentStream;
      overlay?.classList.add('hidden');
      
      // Enable related buttons
      enableButtons.forEach(buttonId => {
        const button = document.getElementById(buttonId) as HTMLButtonElement;
        if (button) button.disabled = false;
      });

    } catch (error) {
      console.error('Error starting camera:', error);
      this.showMessage('Failed to start camera. Please check permissions.', 'error');
    }
  }

  stopCamera() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }

    // Reset camera overlays and disable buttons
    document.querySelectorAll('video').forEach(video => {
      video.srcObject = null;
    });

    document.querySelectorAll('[id$="-overlay"]').forEach(overlay => {
      overlay.classList.remove('hidden');
    });

    document.querySelectorAll('button[id$="-btn"]').forEach(button => {
      if (button.id !== 'start-camera-btn' && button.id !== 'start-register-camera-btn') {
        (button as HTMLButtonElement).disabled = true;
      }
    });
  }

  async captureImage(videoId: string): Promise<string> {
    const video = document.getElementById(videoId) as HTMLVideoElement;
    const canvas = document.getElementById(videoId.replace('video', 'canvas')) as HTMLCanvasElement;
    
    if (!video || !canvas) {
      throw new Error('Video or canvas element not found');
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Flip the image horizontally to match the mirrored video
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  async captureFaceImage() {
    try {
      const imageData = await this.captureImage('register-video');
      
      // Validate face quality
      const validation = await this.validateFaceImage(imageData);
      if (!validation.valid) {
        this.showMessage(validation.message, 'warning');
        return;
      }

      this.capturedImages.push(imageData);
      this.updateCapturedImagesDisplay();
      this.updateRegistrationFormState();
      
      this.showMessage(`Face image ${this.capturedImages.length} captured successfully!`, 'success');
    } catch (error) {
      console.error('Error capturing face image:', error);
      this.showMessage('Failed to capture face image', 'error');
    }
  }

  async validateFaceImage(imageData: string) {
    try {
      const response = await fetch('/api/users/validate-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData })
      });
      
      return await response.json();
    } catch (error) {
      return { valid: false, message: 'Failed to validate image' };
    }
  }

  updateCapturedImagesDisplay() {
    const container = document.getElementById('captured-images');
    if (!container) return;

    container.innerHTML = '';
    
    this.capturedImages.forEach((imageData, index) => {
      const div = document.createElement('div');
      div.className = 'captured-image';
      div.innerHTML = `
        <img src="${imageData}" alt="Captured face ${index + 1}">
        <button class="remove-btn" onclick="attendanceSystem.removeCapturedImage(${index})">×</button>
      `;
      container.appendChild(div);
    });
  }

  removeCapturedImage(index: number) {
    this.capturedImages.splice(index, 1);
    this.updateCapturedImagesDisplay();
    this.updateRegistrationFormState();
  }

  updateRegistrationFormState() {
    const submitBtn = document.getElementById('register-submit-btn') as HTMLButtonElement;
    const nameInput = document.getElementById('user-name') as HTMLInputElement;
    const emailInput = document.getElementById('user-email') as HTMLInputElement;
    
    if (submitBtn) {
      submitBtn.disabled = !(
        this.capturedImages.length > 0 && 
        nameInput?.value.trim() && 
        emailInput?.value.trim()
      );
    }
  }

  async registerUser() {
    if (this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      this.showLoading(true);

      const nameInput = document.getElementById('user-name') as HTMLInputElement;
      const emailInput = document.getElementById('user-email') as HTMLInputElement;
      
      const registrationData = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        face_images: this.capturedImages
      };

      const response = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      const result = await response.json();
      
      if (result.success) {
        this.showMessage(`User ${registrationData.name} registered successfully!`, 'success');
        this.clearRegistrationForm();
        this.loadInitialData(); // Refresh stats
      } else {
        this.showMessage(result.message || 'Registration failed', 'error');
      }

    } catch (error) {
      console.error('Error registering user:', error);
      this.showMessage('Failed to register user', 'error');
    } finally {
      this.isProcessing = false;
      this.showLoading(false);
    }
  }

  clearRegistrationForm() {
    const form = document.getElementById('registration-form') as HTMLFormElement;
    form?.reset();
    
    this.capturedImages = [];
    this.updateCapturedImagesDisplay();
    this.updateRegistrationFormState();
    this.stopCamera();
  }

  async processAttendance(type: 'checkin' | 'checkout') {
    if (this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      this.showLoading(true);

      const imageData = await this.captureImage('camera-video');
      
      const response = await fetch(`/api/attendance/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_data: imageData })
      });

      const result = await response.json();
      this.showRecognitionResult(result);
      
      if (result.success) {
        this.loadInitialData(); // Refresh stats
      }

    } catch (error) {
      console.error(`Error processing ${type}:`, error);
      this.showMessage(`Failed to process ${type}`, 'error');
    } finally {
      this.isProcessing = false;
      this.showLoading(false);
    }
  }

  showRecognitionResult(result: any) {
    const resultDiv = document.getElementById('recognition-result');
    const contentDiv = document.getElementById('result-content');
    
    if (!resultDiv || !contentDiv) return;

    resultDiv.className = 'mt-6 p-4 rounded-lg border-2';
    
    if (result.success) {
      resultDiv.classList.add('recognition-success');
      contentDiv.innerHTML = `
        <div class="flex items-center">
          <div class="text-2xl mr-3">✅</div>
          <div>
            <p class="font-semibold">${result.message}</p>
            <p class="text-sm">Confidence: ${result.confidence}%</p>
            <p class="text-xs">Time: ${new Date(result.timestamp).toLocaleString()}</p>
          </div>
        </div>
      `;
    } else {
      resultDiv.classList.add('recognition-error');
      contentDiv.innerHTML = `
        <div class="flex items-center">
          <div class="text-2xl mr-3">❌</div>
          <div>
            <p class="font-semibold">${result.message}</p>
            ${result.confidence ? `<p class="text-sm">Confidence: ${result.confidence}%</p>` : ''}
          </div>
        </div>
      `;
    }
    
    resultDiv.classList.remove('hidden');
    
    // Hide result after 5 seconds
    setTimeout(() => {
      resultDiv.classList.add('hidden');
    }, 5000);
  }

  async loadAttendanceLogs() {
    try {
      const response = await fetch('/api/attendance/today');
      const data = await response.json();
      
      if (data.success) {
        this.displayAttendanceLogs(data.attendance);
      } else {
        this.showMessage('Failed to load attendance logs', 'error');
      }
    } catch (error) {
      console.error('Error loading attendance logs:', error);
      this.showMessage('Failed to load attendance logs', 'error');
    }
  }

  async filterAttendanceLogs() {
    try {
      const startDate = (document.getElementById('start-date') as HTMLInputElement).value;
      const endDate = (document.getElementById('end-date') as HTMLInputElement).value;
      
      if (!startDate || !endDate) {
        this.showMessage('Please select both start and end dates', 'warning');
        return;
      }

      const response = await fetch(`/api/attendance/range?start_date=${startDate}&end_date=${endDate}`);
      const data = await response.json();
      
      if (data.success) {
        this.displayAttendanceLogs(data.attendance);
      } else {
        this.showMessage('Failed to filter attendance logs', 'error');
      }
    } catch (error) {
      console.error('Error filtering attendance logs:', error);
      this.showMessage('Failed to filter attendance logs', 'error');
    }
  }

  displayAttendanceLogs(logs: any[]) {
    const tbody = document.getElementById('attendance-table-body');
    const noLogsMessage = document.getElementById('no-logs-message');
    
    if (!tbody || !noLogsMessage) return;

    if (logs.length === 0) {
      tbody.innerHTML = '';
      noLogsMessage.classList.remove('hidden');
      return;
    }

    noLogsMessage.classList.add('hidden');
    
    tbody.innerHTML = logs.map(log => `
      <tr class="hover:bg-gray-50">
        <td class="px-6 py-4 whitespace-nowrap">
          <div class="flex items-center">
            <div class="text-sm font-medium text-gray-900">${log.user_name}</div>
          </div>
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${new Date(log.date).toLocaleDateString()}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : '-'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          ${log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : '-'}
        </td>
        <td class="px-6 py-4 whitespace-nowrap">
          <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            log.confidence_score >= 80 ? 'bg-green-100 text-green-800' :
            log.confidence_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }">
            ${log.confidence_score.toFixed(1)}%
          </span>
        </td>
      </tr>
    `).join('');
  }

  async loadUsers() {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      
      if (data.success) {
        this.displayUsers(data.users);
      } else {
        this.showMessage('Failed to load users', 'error');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      this.showMessage('Failed to load users', 'error');
    }
  }

  displayUsers(users: any[]) {
    const grid = document.getElementById('users-grid');
    const noUsersMessage = document.getElementById('no-users-message');
    
    if (!grid || !noUsersMessage) return;

    if (users.length === 0) {
      grid.innerHTML = '';
      noUsersMessage.classList.remove('hidden');
      return;
    }

    noUsersMessage.classList.add('hidden');
    
    grid.innerHTML = users.map(user => `
      <div class="user-card bg-white rounded-lg shadow p-6 border">
        <div class="flex items-center space-x-4">
          <div class="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <span class="text-xl">👤</span>
          </div>
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900">${user.name}</h3>
            <p class="text-sm text-gray-500">${user.email}</p>
            <p class="text-xs text-gray-400">
              Registered: ${new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
          <div class="flex flex-col items-end">
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
            }">
              ${user.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>
    `).join('');
  }

  showMessage(message: string, type: 'success' | 'error' | 'warning') {
    // Create a temporary message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-yellow-500 text-black'
    }`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  showLoading(show: boolean) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      if (show) {
        overlay.classList.remove('hidden');
      } else {
        overlay.classList.add('hidden');
      }
    }
  }
}

// Initialize the attendance system
const attendanceSystem = new AttendanceSystem();

// Make it globally available for inline event handlers
(window as any).attendanceSystem = attendanceSystem;
