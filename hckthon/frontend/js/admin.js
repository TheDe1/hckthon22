const API_BASE = 'http://localhost:5000/api';

let currentAdmin = null;
let users = [];
let events = [];
let attendance = [];
let currentUserFilter = 'all';
let currentEventFilter = 'all';
let scannerActive = false;
let selectedEvent = null;
let scanInterval = null;
let isInitialized = false;


document.addEventListener('DOMContentLoaded', () => {
    if (isInitialized) return;
    isInitialized = true;
    initializeAdminDashboard();
});

async function initializeAdminDashboard() {
    const userStr = localStorage.getItem('currentUser');
    
    if (!userStr) {
        window.location.href = 'index.html';
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        
        if (!user || user.role !== 'admin') {
            window.location.href = 'index.html';
            return;
        }
        
        currentAdmin = user;
        document.getElementById('adminName').textContent = `${user.firstName} ${user.lastName}`;
        
        await loadAllData();
        updateDashboardStats();
        initializeCharts();
        loadSection('dashboard');
    } catch (error) {
        console.error('Init error:', error);
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    }
}

 const adminExists = users.some(u => u.email === 'admin@gmail.com');
        
        if (!adminExists) {
            const defaultAdmin = {
                id: 'admin_' + Date.now(),
                email: 'admin@gmail.com',
                password: 'admin123',
                role: 'admin',
                firstName: 'Admin',
                lastName: 'User',
                createdAt: new Date().toISOString()
            };
            users.push(defaultAdmin);
            saveUsers(users);
            console.log('Default admin created');
        }



async function loadAllData() {
    try {
        const [usersRes, eventsRes, attendanceRes] = await Promise.all([
            fetch(`${API_BASE}/users`, { credentials: 'include' }),
            fetch(`${API_BASE}/events`, { credentials: 'include' }),
            fetch(`${API_BASE}/attendance`, { credentials: 'include' })
        ]);
        
        users = await usersRes.json();
        events = await eventsRes.json();
        attendance = await attendanceRes.json();
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading data', 'error');
    }
}


function loadSection(section) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    const sectionElement = document.getElementById(`${section}-section`);
    if (sectionElement) {
        sectionElement.classList.add('active');
    }
    
    document.querySelectorAll('.sidebar-menu a').forEach(a => a.classList.remove('active'));
    const activeLink = document.querySelector(`a[href="#${section}"]`);
    if (activeLink) activeLink.classList.add('active');
    

    switch(section) {
        case 'users':
            loadUsersTable();
            break;
        case 'events':
            loadEventsTable();
            break;
        case 'attendance':
            loadScanAttendance();
            break;
    }
}


function updateDashboardStats() {
    const students = users.filter(u => u.role === 'student');
    const pending = students.filter(u => u.status === 'pending');
    const verified = students.filter(u => u.status === 'verified');
    
    document.getElementById('totalStudents').textContent = students.length;
    document.getElementById('pendingStudents').textContent = pending.length;
    document.getElementById('verifiedStudents').textContent = verified.length;
    document.getElementById('totalEvents').textContent = events.length;
    document.getElementById('totalAttendance').textContent = attendance.length;
}


function initializeCharts() {
    initializeAttendanceChart();
    initializeVerificationChart();
}

function initializeAttendanceChart() {
    const canvas = document.getElementById('attendanceChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const eventNames = events.slice(0, 5).map(e => e.name || 'Event');
    const attendanceCounts = events.slice(0, 5).map(e => {
        return attendance.filter(a => a.eventId === e.id).length;
    });
    
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: eventNames.length > 0 ? eventNames : ['No Events'],
            datasets: [{
                label: 'Attendance Count',
                data: attendanceCounts.length > 0 ? attendanceCounts : [0],
                backgroundColor: '#007bff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function initializeVerificationChart() {
    const canvas = document.getElementById('verificationChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const students = users.filter(u => u.role === 'student');
    const pending = students.filter(u => u.status === 'pending').length;
    const verified = students.filter(u => u.status === 'verified').length;
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Verified', 'Pending'],
            datasets: [{
                data: [verified, pending],
                backgroundColor: ['#28a745', '#ffc107']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

// User management functions
function loadUsersTable() {
    let filteredUsers = users;
    
    if (currentUserFilter === 'pending') {
        filteredUsers = users.filter(u => u.role === 'student' && u.status === 'pending');
    } else if (currentUserFilter === 'verified') {
        filteredUsers = users.filter(u => u.role === 'student' && u.status === 'verified');
    } else if (currentUserFilter === 'admin') {
        filteredUsers = users.filter(u => u.role === 'admin');
    }
    
    const tbody = document.getElementById('usersTableBody');
    const pendingCount = users.filter(u => u.role === 'student' && u.status === 'pending').length;
    document.getElementById('pendingCount').textContent = pendingCount;
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>
                <img src="${user.profilePhoto || 'assets/images/default-avatar.png'}" 
                     alt="Profile" class="table-avatar" 
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2740%27 height=%2740%27%3E%3Crect fill=%27%23ddd%27 width=%2740%27 height=%2740%27/%3E%3C/svg%3E'">
            </td>
            <td>${user.studentId || '-'}</td>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td>
                ${user.role === 'student' ? 
                    `<span class="status-badge ${user.status}">${user.status}</span>` : 
                    '-'}
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>
                ${renderUserActions(user)}
            </td>
        </tr>
    `).join('');
}

function renderUserActions(user) {
    if (user.role === 'student' && user.status === 'pending') {
        return `
            <button class="btn-primary btn-sm" onclick="openVerifyModal('${user.id}')">
                <i class="fas fa-check"></i> Verify
            </button>
            <button class="btn-danger btn-sm" onclick="deleteUser('${user.id}')">
                <i class="fas fa-trash"></i>
            </button>
        `;
    } else if (user.role === 'student' && user.status === 'verified') {
        return `
            <button class="btn-secondary btn-sm" onclick="viewUser('${user.id}')">
                <i class="fas fa-eye"></i> View
            </button>
            <button class="btn-danger btn-sm" onclick="deleteUser('${user.id}')">
                <i class="fas fa-trash"></i>
            </button>
        `;
    } else if (user.role === 'admin' && user.id !== currentAdmin.id) {
        return `
            <button class="btn-secondary btn-sm" onclick="changeToStudent('${user.id}')">
                <i class="fas fa-user"></i> Make Student
            </button>
        `;
    } else if (user.role === 'student') {
        return `
            <button class="btn-primary btn-sm" onclick="makeAdmin('${user.id}')">
                <i class="fas fa-user-shield"></i> Make Admin
            </button>
        `;
    }
    return '-';
}

function filterUsers(filter) {
    currentUserFilter = filter;
    loadUsersTable();
    
    document.querySelectorAll('#users-section .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

function searchUsers() {
    const query = document.getElementById('userSearch').value.toLowerCase();
    const filteredUsers = users.filter(u => 
        u.firstName.toLowerCase().includes(query) ||
        u.lastName.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        (u.studentId && u.studentId.toLowerCase().includes(query))
    );
    
    renderFilteredUsers(filteredUsers);
}

function clearUserSearch() {
    document.getElementById('userSearch').value = '';
    loadUsersTable();
}

function renderFilteredUsers(filteredUsers) {
    const tbody = document.getElementById('usersTableBody');
    
    if (filteredUsers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No users found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredUsers.map(user => `
        <tr>
            <td>
                <img src="${user.profilePhoto || 'assets/images/default-avatar.png'}" 
                     alt="Profile" class="table-avatar">
            </td>
            <td>${user.studentId || '-'}</td>
            <td>${user.firstName} ${user.lastName}</td>
            <td>${user.email}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td>
                ${user.role === 'student' ? 
                    `<span class="status-badge ${user.status}">${user.status}</span>` : 
                    '-'}
            </td>
            <td>${new Date(user.createdAt).toLocaleDateString()}</td>
            <td>${renderUserActions(user)}</td>
        </tr>
    `).join('');
}

// Verify student modal
function openVerifyModal(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const modalContent = document.getElementById('verifyStudentContent');
    modalContent.innerHTML = `
        <div class="verify-student-info">
            <img src="${user.profilePhoto || 'assets/images/default-avatar.png'}" 
                 alt="Profile" class="verify-avatar">
            <h3>${user.firstName} ${user.lastName}</h3>
            <p><strong>Student ID:</strong> ${user.studentId}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>Registered:</strong> ${new Date(user.createdAt).toLocaleString()}</p>
        </div>
        <div class="verify-actions">
            <button class="btn-primary" onclick="verifyStudent('${user.id}')">
                <i class="fas fa-check"></i> Verify & Generate QR Code
            </button>
            <button class="btn-secondary" onclick="closeModal('verifyStudentModal')">
                Cancel
            </button>
        </div>
    `;
    
    openModal('verifyStudentModal');
}

async function verifyStudent(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    // Generate QR code data
    const qrData = JSON.stringify({
        studentId: user.studentId,
        id: user.id,
        name: `${user.firstName} ${user.lastName}`
    });
    
    // Create QR code using QRCode library
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);
    
    const qr = new QRCode(tempDiv, {
        text: qrData,
        width: 256,
        height: 256
    });
    
    // Wait for QR code generation
    setTimeout(async () => {
        const qrImage = tempDiv.querySelector('img');
        if (qrImage) {
            const qrCodeData = qrImage.src;
            
            try {
                const response = await fetch(`${API_BASE}/users/${userId}/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ qrCode: qrCodeData })
                });
                
                if (response.ok) {
                    await loadAllData();
                    closeModal('verifyStudentModal');
                    loadUsersTable();
                    updateDashboardStats();
                    showNotification('Student verified successfully!', 'success');
                } else {
                    showNotification('Error verifying student', 'error');
                }
            } catch (error) {
                console.error('Verify error:', error);
                showNotification('Network error', 'error');
            }
            
            document.body.removeChild(tempDiv);
        } else {
            document.body.removeChild(tempDiv);
            showNotification('Error generating QR code', 'error');
        }
    }, 500);
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/users/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            await loadAllData();
            loadUsersTable();
            updateDashboardStats();
            showNotification('User deleted successfully', 'success');
        } else {
            showNotification('Error deleting user', 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Network error', 'error');
    }
}

async function makeAdmin(userId) {
    if (!confirm('Make this student an admin?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ role: 'admin' })
        });
        
        if (response.ok) {
            await loadAllData();
            loadUsersTable();
            showNotification('User role updated to admin', 'success');
        } else {
            showNotification('Error updating role', 'error');
        }
    } catch (error) {
        console.error('Role update error:', error);
        showNotification('Network error', 'error');
    }
}

async function changeToStudent(userId) {
    if (!confirm('Change this admin to a student?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ role: 'student' })
        });
        
        if (response.ok) {
            await loadAllData();
            loadUsersTable();
            showNotification('User role updated to student', 'success');
        } else {
            showNotification('Error updating role', 'error');
        }
    } catch (error) {
        console.error('Role update error:', error);
        showNotification('Network error', 'error');
    }
}

function viewUser(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    alert(`Student Details:\n\nName: ${user.firstName} ${user.lastName}\nStudent ID: ${user.studentId}\nEmail: ${user.email}\nStatus: ${user.status}\nRegistered: ${new Date(user.createdAt).toLocaleDateString()}`);
}

// Event management
function loadEventsTable() {
    let filteredEvents = events;
    
    if (currentEventFilter !== 'all') {
        filteredEvents = events.filter(e => e.status === currentEventFilter);
    }
    
    const tbody = document.getElementById('eventsTableBody');
    
    if (filteredEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="no-data">No events found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredEvents.map(event => {
        const attendeeCount = attendance.filter(a => a.eventId === event.id).length;
        return `
            <tr>
                <td><strong>${event.name}</strong></td>
                <td>${event.description}</td>
                <td>${new Date(event.date).toLocaleDateString()}</td>
                <td>${event.startTime} - ${event.endTime}</td>
                <td><span class="status-badge ${event.status}">${event.status}</span></td>
                <td>${attendeeCount}</td>
                <td>
                    <button class="btn-secondary btn-sm" onclick="toggleEventStatus('${event.id}')">
                        <i class="fas fa-toggle-on"></i> ${event.status === 'active' ? 'Complete' : 'Activate'}
                    </button>
                    <button class="btn-danger btn-sm" onclick="deleteEvent('${event.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function filterEvents(status) {
    currentEventFilter = status;
    loadEventsTable();
    
    document.querySelectorAll('#events-section .tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
}

async function createEvent(e) {
    e.preventDefault();
    
    const eventData = {
        name: document.getElementById('eventName').value,
        description: document.getElementById('eventDescription').value,
        date: document.getElementById('eventDate').value,
        startTime: document.getElementById('eventStartTime').value,
        endTime: document.getElementById('eventEndTime').value
    };
    
    try {
        const response = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(eventData)
        });
        
        if (response.ok) {
            await loadAllData();
            closeModal('createEventModal');
            e.target.reset();
            loadEventsTable();
            updateDashboardStats();
            showNotification('Event created successfully!', 'success');
        } else {
            showNotification('Error creating event', 'error');
        }
    } catch (error) {
        console.error('Create event error:', error);
        showNotification('Network error', 'error');
    }
}

async function toggleEventStatus(eventId) {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    const newStatus = event.status === 'active' ? 'completed' : 'active';
    
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            await loadAllData();
            loadEventsTable();
            showNotification('Event status updated', 'success');
        } else {
            showNotification('Error updating event', 'error');
        }
    } catch (error) {
        console.error('Update event error:', error);
        showNotification('Network error', 'error');
    }
}

async function deleteEvent(eventId) {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            await loadAllData();
            loadEventsTable();
            updateDashboardStats();
            showNotification('Event deleted', 'success');
        } else {
            showNotification('Error deleting event', 'error');
        }
    } catch (error) {
        console.error('Delete event error:', error);
        showNotification('Network error', 'error');
    }
}

// Attendance scanning
function loadScanAttendance() {
    const select = document.getElementById('eventSelect');
    const activeEvents = events.filter(e => e.status === 'active');
    
    select.innerHTML = '<option value="">-- Select an Event --</option>' +
        activeEvents.map(e => `<option value="${e.id}">${e.name} - ${new Date(e.date).toLocaleDateString()}</option>`).join('');
}

function selectEvent() {
    const eventId = document.getElementById('eventSelect').value;
    
    if (!eventId) {
        document.getElementById('scannerArea').style.display = 'none';
        document.getElementById('eventAttendance').style.display = 'none';
        document.getElementById('scanStats').style.display = 'none';
        stopScanner();
        return;
    }
    
    selectedEvent = events.find(e => e.id === eventId);
    document.getElementById('scanStats').style.display = 'flex';
    document.getElementById('scannerArea').style.display = 'block';
    document.getElementById('eventAttendance').style.display = 'block';
    
    updateAttendanceList();
    startScanner();
}

function startScanner() {
    if (scannerActive) return;
    
    const video = document.getElementById('qrVideo');
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas.getContext('2d');
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            video.srcObject = stream;
            video.play();
            scannerActive = true;
            
            scanInterval = setInterval(() => {
                if (!scannerActive) {
                    clearInterval(scanInterval);
                    return;
                }
                
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.width = video.videoWidth;
                    canvas.height = video.videoHeight;
                    ctx.drawImage(video, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const code = jsQR(imageData.data, canvas.width, canvas.height);
                    
                    if (code) {
                        processQRScan(code.data);
                    }
                }
            }, 100);
        })
        .catch(err => {
            console.error('Camera error:', err);
            showNotification('Camera access denied', 'error');
        });
}

function stopScanner() {
    scannerActive = false;
    
    if (scanInterval) {
        clearInterval(scanInterval);
        scanInterval = null;
    }
    
    const video = document.getElementById('qrVideo');
    if (video && video.srcObject) {
        video.srcObject.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
}

async function processQRScan(qrData) {
    try {
        const studentData = JSON.parse(qrData);
        
        const response = await fetch(`${API_BASE}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                eventId: selectedEvent.id,
                studentId: studentData.id
            })
        });
        
        if (response.ok) {
            await loadAllData();
            updateAttendanceList();
            updateDashboardStats();
            showScanResult(`✓ ${studentData.name} - Attendance recorded`, 'success');
            
            setTimeout(() => {
                document.getElementById('scanResult').innerHTML = '';
            }, 2000);
        } else {
            const data = await response.json();
            showScanResult(data.error || 'Error recording attendance', 'error');
        }
    } catch (error) {
        console.error('QR scan error:', error);
        showScanResult('Invalid QR code', 'error');
    }
}

function showScanResult(message, type) {
    const resultDiv = document.getElementById('scanResult');
    resultDiv.innerHTML = `<div class="scan-message ${type}">${message}</div>`;
}

function updateAttendanceList() {
    const eventAttendance = attendance.filter(a => a.eventId === selectedEvent.id);
    document.getElementById('totalScanned').textContent = eventAttendance.length;
    
    const tbody = document.getElementById('eventAttendanceBody');
    
    if (eventAttendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">No attendance recorded yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = eventAttendance.map(a => `
        <tr>
            <td>
                <img src="${a.studentPhoto || 'assets/images/default-avatar.png'}" 
                     alt="Profile" class="table-avatar">
            </td>
            <td>${users.find(u => u.id === a.studentId)?.studentId || '-'}</td>
            <td>${a.studentName}</td>
            <td>${new Date(a.timestamp).toLocaleString()}</td>
            <td>
                <button class="btn-danger btn-sm" onclick="removeAttendance('${a.id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function removeAttendance(attendanceId) {
    if (!confirm('Remove this attendance record?')) return;
    
    try {
        const response = await fetch(`${API_BASE}/attendance/${attendanceId}`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            await loadAllData();
            updateAttendanceList();
            showNotification('Attendance removed', 'success');
        } else {
            showNotification('Error removing attendance', 'error');
        }
    } catch (error) {
        console.error('Remove attendance error:', error);
        showNotification('Network error', 'error');
    }
}

function manualEntry() {
    openModal('manualEntryModal');
}

async function submitManualEntry(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('manualStudentId').value;
    const student = users.find(u => u.studentId === studentId);
    
    if (!student) {
        showNotification('Student not found', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/attendance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                eventId: selectedEvent.id,
                studentId: student.id
            })
        });
        
        if (response.ok) {
            await loadAllData();
            updateAttendanceList();
            updateDashboardStats();
            closeModal('manualEntryModal');
            e.target.reset();
            showNotification('Attendance recorded', 'success');
        } else {
            const data = await response.json();
            showNotification(data.error || 'Error recording attendance', 'error');
        }
    } catch (error) {
        console.error('Manual entry error:', error);
        showNotification('Network error', 'error');
    }
}

// Reports
function generateReport() {
    const reportType = document.getElementById('reportType').value;
    
    let reportData = [];
    let headers = [];
    
    if (reportType === 'event') {
        headers = ['Event Name', 'Date', 'Total Students', 'Attended', 'Attendance Rate'];
        reportData = events.map(event => {
            const eventAttendance = attendance.filter(a => a.eventId === event.id);
            const totalStudents = users.filter(u => u.role === 'student' && u.status === 'verified').length;
            const attendanceRate = totalStudents > 0 ? Math.round((eventAttendance.length / totalStudents) * 100) : 0;
            
            return [
                event.name,
                new Date(event.date).toLocaleDateString(),
                totalStudents,
                eventAttendance.length,
                attendanceRate + '%'
            ];
        });
    } else if (reportType === 'student') {
        headers = ['Student ID', 'Name', 'Total Events', 'Attended', 'Attendance Rate'];
        const students = users.filter(u => u.role === 'student' && u.status === 'verified');
        reportData = students.map(student => {
            const studentAttendance = attendance.filter(a => a.studentId === student.id);
            const totalEvents = events.length;
            const attendanceRate = totalEvents > 0 ? Math.round((studentAttendance.length / totalEvents) * 100) : 0;
            
            return [
                student.studentId<function_results>OK/function_calls
                `${student.firstName} ${student.lastName}`,
                totalEvents,
                studentAttendance.length,
                attendanceRate + '%'
            ];
        });
    }           
    exportToCSV(`report_${reportType}_${Date.now()}.csv`, headers, reportData);
}   

 