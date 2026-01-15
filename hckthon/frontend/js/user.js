// ========================================
// STUDENT DASHBOARD JAVASCRIPT - FIXED
// ========================================

let currentUser = null;
let events = [];
let attendanceRecords = [];

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    console.log('User dashboard initializing...');
    initializeUserDashboard();
    updateDateTime();
    setInterval(updateDateTime, 1000);
});

// Initialize User Dashboard
function initializeUserDashboard() {
    const userStr = localStorage.getItem('currentUser');
    
    if (!userStr) {
        console.log('No user logged in, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        
        if (!user || user.role !== 'student') {
            console.log('User is not a student, redirecting');
            window.location.href = 'index.html';
            return;
        }
        
        currentUser = user;
        console.log('Student logged in:', currentUser);
        
        loadUserData();
        loadEventsData();
        loadAttendanceData();
        displayUserInfo();
        displayActiveEvents();
        displayAttendanceSummary();
        loadSection('home');
    } catch (e) {
        console.error('Error initializing user dashboard:', e);
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

// Load updated user data
function loadUserData() {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const updatedUser = users.find(u => u.id === currentUser.id);
        if (updatedUser) {
            currentUser = updatedUser;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('User data refreshed');
        }
    } catch (e) {
        console.error('Error loading user data:', e);
    }
}

// Load events
function loadEventsData() {
    try {
        events = JSON.parse(localStorage.getItem('events') || '[]');
        console.log('Loaded events:', events.length);
    } catch (e) {
        console.error('Error loading events:', e);
        events = [];
    }
}

// Load attendance records
function loadAttendanceData() {
    try {
        const allAttendance = JSON.parse(localStorage.getItem('attendance') || '[]');
        attendanceRecords = allAttendance.filter(a => a.studentId === currentUser.id);
        console.log('Loaded attendance records:', attendanceRecords.length);
    } catch (e) {
        console.error('Error loading attendance:', e);
        attendanceRecords = [];
    }
}

// Display user information
function displayUserInfo() {
    const fullName = `${currentUser.firstName} ${currentUser.lastName}`;
    
    // Navigation bar
    document.getElementById('navUserName').textContent = fullName;
    const navAvatar = document.getElementById('navAvatar');
    if (currentUser.profilePhoto) {
        navAvatar.src = currentUser.profilePhoto;
    } else {
        navAvatar.src = 'assets/images/default-avatar.png';
    }
    navAvatar.onerror = function() { this.src = 'assets/images/default-avatar.png'; };
    
    // Home section
    document.getElementById('userName').textContent = fullName;
    document.getElementById('studentId').textContent = currentUser.studentId;
    document.getElementById('userEmail').textContent = currentUser.email;
    
    // Update status badge
    const statusBadge = document.getElementById('userStatus');
    if (currentUser.status === 'verified') {
        statusBadge.textContent = 'Verified';
        statusBadge.className = 'status-badge verified';
    } else {
        statusBadge.textContent = 'Pending Verification';
        statusBadge.className = 'status-badge pending';
    }
    
    // Profile section
    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileStudentId').textContent = `Student ID: ${currentUser.studentId}`;
    document.getElementById('profileEmail').textContent = currentUser.email;
    
    const profileAvatar = document.getElementById('profileAvatar');
    if (currentUser.profilePhoto) {
        profileAvatar.src = currentUser.profilePhoto;
    } else {
        profileAvatar.src = 'assets/images/default-avatar.png';
    }
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

// Display QR Code
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

// Update date and time
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

// Display active events
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

// Display attendance summary
function displayAttendanceSummary() {
    const totalEvents = events.length;
    const attendedEvents = attendanceRecords.length;
    const attendanceRate = totalEvents > 0 ? Math.round((attendedEvents / totalEvents) * 100) : 0;
    
    document.getElementById('totalAttended').textContent = attendedEvents;
    document.getElementById('attendanceRate').textContent = attendanceRate + '%';
    
    // Display recent attendance
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

// Navigation
function loadSection(section) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    
    // Show selected section
    const sectionId = `${section}-section`;
    const element = document.getElementById(sectionId);
    if (element) {
        element.classList.add('active');
    }
    
    // Update navbar
    document.querySelectorAll('.nav-menu a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`a[href="#${section}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Reload data when switching to profile
    if (section === 'profile') {
        loadUserData();
        displayUserInfo();
    }
}

// Handle profile photo upload
const avatarUpload = document.getElementById('avatarUpload');
if (avatarUpload) {
    avatarUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                showNotification('Image size must be less than 2MB', 'error');
                return;
            }
            
            const reader = new FileReader();
            reader.onload = function(event) {
                const imageData = event.target.result;
                
                // Update profile photo
                document.getElementById('profileAvatar').src = imageData;
                document.getElementById('navAvatar').src = imageData;
                
                // Save to user data
                currentUser.profilePhoto = imageData;
                updateUserInDatabase(currentUser);
                
                showNotification('Profile photo updated successfully', 'success');
            };
            reader.readAsDataURL(file);
        }
    });
}

// Update profile
function updateProfile(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('updateFirstName').value.trim();
    const lastName = document.getElementById('updateLastName').value.trim();
    const email = document.getElementById('updateEmail').value.trim();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate
    if (!firstName || !lastName || !email) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    // Validate password change if provided
    if (newPassword || confirmPassword) {
        if (!currentPassword) {
            showNotification('Please enter your current password', 'error');
            return;
        }
        
        if (currentPassword !== currentUser.password) {
            showNotification('Current password is incorrect', 'error');
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
        
        currentUser.password = newPassword;
    }
    
    // Update user data
    currentUser.firstName = firstName;
    currentUser.lastName = lastName;
    currentUser.email = email;
    
    updateUserInDatabase(currentUser);
    
    // Clear password fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    displayUserInfo();
    showNotification('Profile updated successfully', 'success');
}

// Update user in database
function updateUserInDatabase(updatedUser) {
    try {
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const index = users.findIndex(u => u.id === updatedUser.id);
        
        if (index !== -1) {
            users[index] = updatedUser;
            localStorage.setItem('users', JSON.stringify(users));
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            console.log('User updated in database');
        }
    } catch (e) {
        console.error('Error updating user:', e);
        showNotification('Error updating profile', 'error');
    }
}

// Download QR Code
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

// Show notification
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

// Logout
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}