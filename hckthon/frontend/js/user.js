const API_BASE = 'http://localhost:5000/api';

let currentUser = null;
let events = [];
let attendanceRecords = [];
let isInitialized = false;

// Initialize user dashboard
document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    isInitialized = true;
    initializeUserDashboard();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

async function initializeUserDashboard() {
    const userStr = localStorage.getItem('currentUser');
    
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        
        if (!user || user.role !== 'student') {
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = user;
        
        await loadUserData();
        await loadEventsData();
        await loadAttendanceData();
        displayUserInfo();
        displayActiveEvents();
        displayAttendanceSummary();
        loadSection('home');
    } catch (error) {
        console.error('Init error:', error);
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// Load fresh user data from backend
async function loadUserData() {
    try {
        const response = await fetch(`${API_BASE}/users/${currentUser.id}`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            currentUser = updatedUser;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

async function loadEventsData() {
    try {
        const response = await fetch(`${API_BASE}/events`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            events = await response.json();
        }
    } catch (error) {
        console.error('Error loading events:', error);
        events = [];
    }
}

async function loadAttendanceData() {
    try {
        const response = await fetch(`${API_BASE}/attendance`, {
            credentials: 'include'
        });
        
        if (response.ok) {
            const allAttendance = await response.json();
            attendanceRecords = allAttendance.filter(a => a.studentId === currentUser.id);
        }
    } catch (error) {
        console.error('Error loading attendance:', error);
        attendanceRecords = [];
    }
}

// Display user information across the dashboard
function displayUserInfo() {
    const fullName = `${currentUser.firstName} ${currentUser.lastName}`;
    
    // Update nav bar
    document.getElementById('navUserName').textContent = fullName;
    const navAvatar = document.getElementById('navAvatar');
    navAvatar.src = currentUser.profilePhoto || 'assets/images/default-avatar.png';
    navAvatar.onerror = function() { this.src = 'assets/images/default-avatar.png'; };
    
    // Update welcome section
    document.getElementById('userName').textContent = fullName;
    document.getElementById('studentId').textContent = currentUser.studentId;
    document.getElementById('userEmail').textContent = currentUser.email;
    
    const statusBadge = document.getElementById('userStatus');
    if (currentUser.status === 'verified') {
        statusBadge.textContent = 'Verified';
        statusBadge.className = 'status-badge verified';
    } else {
        statusBadge.textContent = 'Pending Verification';
        statusBadge.className = 'status-badge pending';
    }
    
    // Update profile section
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileStudentId').textContent = `Student ID: ${currentUser.studentId}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    
    const profileAvatar = document.getElementById('profileAvatar');
    profileAvatar.src = currentUser.profilePhoto || 'assets/images/default-avatar.png';
    profileAvatar.onerror = function() { this.src = 'assets/images/default-avatar.png'; };
    
    const profileStatus = document.getElementById('profileStatus');
    if (currentUser.status === 'verified') {
        profileStatus.textContent = 'Verified';
        profileStatus.className = 'status-badge verified';
    } else {
        profileStatus.textContent = 'Pending Verification';
        profileStatus.className = 'status-badge pending';
    }
    
    // Update form fields
    document.getElementById('updateFirstName').value = currentUser.firstName;
    document.getElementById('updateLastName').value = currentUser.lastName;
    document.getElementById('updateEmail').value = currentUser.email;
    
    // Show/hide QR code section
    if (currentUser.status === 'verified' && currentUser.qrCode) {
        document.getElementById('qrSection').style.display = 'block';
        document.getElementById('pendingMessage').style.display = 'none';
        displayQRCode();
    } else {
        document.getElementById('qrSection').style.display = 'none';
        document.getElementById('pendingMessage').style.display = 'block';
    }
}

function displayQRCode() {
    const qrContainer = document.getElementById('studentQRCode');
    qrContainer.innerHTML = '';
    
    if (currentUser.qrCode) {
        const img = document.createElement('img');
        img.src = currentUser.qrCode;
        img.alt = 'Student QR Code';
        img.style.maxWidth = '100%';
        qrContainer.appendChild(img);
    }
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
    };
    const dateTimeElement = document.getElementById('currentDateTime');
    if (dateTimeElement) {
        dateTimeElement.textContent = now.toLocaleDateString('en-US', options);
    }
}

function displayActiveEvents() {
    const activeEvents = events.filter(e => e.status === 'active');
    const grid = document.getElementById('activeEventsGrid');
    
    if (activeEvents.length === 0) {
        grid.innerHTML = '<div class="no-events"><i class="fas fa-calendar-times"></i><p>No active events at the moment</p></div>';
        return;
    }
    
    grid.innerHTML = activeEvents.map(event => `
        <div class="event-card">
            <div class="event-header">
                <h3>${event.name}</h3>
                <span class="event-status active">Active</span>
            </div>
            <div class="event-body">
                <p class="event-description">${event.description}</p>
                <div class="event-details">
                    <div class="detail">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(event.date).toLocaleDateString()}</span>
                    </div>
                    <div class="detail">
                        <i class="fas fa-clock"></i>
                        <span>${event.startTime} - ${event.endTime}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function displayAttendanceSummary() {
    const totalEvents = events.length;
    const attendedEvents = attendanceRecords.length;
    const attendanceRate = totalEvents > 0 ? Math.round((attendedEvents / totalEvents) * 100) : 0;
    
    document.getElementById('totalAttended').textContent = attendedEvents;
    document.getElementById('attendanceRate').textContent = attendanceRate + '%';
    
    const recentAttendance = attendanceRecords.slice(-5).reverse();
    const tbody = document.getElementById('recentAttendanceBody');
    
    if (recentAttendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-data">No attendance records yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = recentAttendance.map(record => {
        const event = events.find(e => e.id === record.eventId);
        return `
            <tr>
                <td>${event ? event.name : 'Unknown Event'}</td>
                <td>${new Date(record.timestamp).toLocaleDateString()}</td>
                <td>${new Date(record.timestamp).toLocaleTimeString()}</td>
                <td><span class="status-badge verified">Present</span></td>
            </tr>
        `;
    }).join('');
}

// Section navigation
function loadSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    const sectionId = `${section}-section`;
    const element = document.getElementById(sectionId);
    if (element) {
        element.classList.add('active');
    }
    
    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`a[href="#${section}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    if (section === 'profile') {
        loadUserData();
        displayUserInfo();
    }
}

// Profile photo upload
const avatarUpload = document.getElementById('avatarUpload');
if (avatarUpload) {
    avatarUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        if (file.size > 2 * 1024 * 1024) {
            showNotification('Image size must be less than 2MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = async function(event) {
            const imageData = event.target.result;
            
            try {
                const response = await fetch(`${API_BASE}/users/${currentUser.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ profilePhoto: imageData })
                });
                
                if (response.ok) {
                    const updatedUser = await response.json();
                    currentUser = updatedUser;
                    localStorage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    document.getElementById('profileAvatar').src = imageData;
                    document.getElementById('navAvatar').src = imageData;
                    
                    showNotification('Profile photo updated successfully', 'success');
                } else {
                    showNotification('Error updating photo', 'error');
                }
            } catch (error) {
                console.error('Photo upload error:', error);
                showNotification('Network error', 'error');
            }
        };
        reader.readAsDataURL(file);
    });
}

// Update profile form
async function updateProfile(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('updateFirstName').value.trim();
    const lastName = document.getElementById('updateLastName').value.trim();
    const email = document.getElementById('updateEmail').value.trim();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!firstName || !lastName || !email) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const updateData = {
        firstName,
        lastName,
        email
    };
    
    // Handle password update if provided
    if (newPassword || confirmPassword) {
        if (!currentPassword) {
            showNotification('Please enter your current password', 'error');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            showNotification('New passwords do not match', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            showNotification('Password must be at least 6 characters', 'error');
            return;
        }
        
        updateData.currentPassword = currentPassword;
        updateData.newPassword = newPassword;
    }
    
    try {
        const response = await fetch(`${API_BASE}/users/${currentUser.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(updateData)
        });
        
        if (response.ok) {
            const updatedUser = await response.json();
            currentUser = updatedUser;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // Clear password fields
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            displayUserInfo();
            showNotification('Profile updated successfully', 'success');
        } else {
            const data = await response.json();
            showNotification(data.error || 'Error updating profile', 'error');
        }
    } catch (error) {
        console.error('Update profile error:', error);
        showNotification('Network error', 'error');
    }
}

function downloadQRCode() {
    if (!currentUser.qrCode) {
        showNotification('QR Code not available', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.href = currentUser.qrCode;
    link.download = `${currentUser.studentId}_QRCode.png`;
    link.click();
    
    showNotification('QR Code downloaded', 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.className = `notification show ${type}`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    } else {
        alert(message);
    }
}

async function logout() {
    if (!confirm('Are you sure you want to logout?')) return;
    
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}