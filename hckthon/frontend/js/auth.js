// ========================================
// AUTHENTICATION JAVASCRIPT - FIXED
// ========================================

// Initialize users in localStorage if not exists
function initializeDefaultUsers() {
    if (!localStorage.getItem('users')) {
        const defaultUsers = [
            {
                id: 'admin1',
                email: 'admin@system.com',
                password: 'admin123',
                role: 'admin',
                firstName: 'System',
                lastName: 'Administrator',
                createdAt: new Date().toISOString()
            }
        ];
        localStorage.setItem('users', JSON.stringify(defaultUsers));
        console.log('Default users initialized');
    }
}

// Check if user is already logged in on page load
function checkExistingSession() {
    const currentUser = localStorage.getItem('currentUser');
    
    // Only redirect if we're on the index page AND user is logged in
    if (currentUser && window.location.pathname.endsWith('index.html')) {
        try {
            const user = JSON.parse(currentUser);
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else if (user.role === 'student') {
                window.location.href = 'user.html';
            }
        } catch (e) {
            // If there's an error parsing, clear the corrupt data
            localStorage.removeItem('currentUser');
        }
    }
}

// Show signup form
function showSignup() {
    document.getElementById('loginForm').classList.remove('active');
    document.getElementById('signupForm').classList.add('active');
}

// Show login form
function showLogin() {
    document.getElementById('signupForm').classList.remove('active');
    document.getElementById('loginForm').classList.add('active');
}

// Handle signup form submission
function handleSignup(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const studentId = formData.get('student_id').trim();
    const firstName = formData.get('first_name').trim();
    const lastName = formData.get('last_name').trim();
    const email = formData.get('email').trim().toLowerCase();
    const password = formData.get('password');
    
    // Validation
    if (!studentId || !firstName || !lastName || !email || !password) {
        alert('Please fill in all fields');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    const userData = {
        id: 'student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        studentId: studentId,
        firstName: firstName,
        lastName: lastName,
        email: email,
        password: password,
        role: 'student',
        status: 'pending',
        qrCode: null,
        profilePhoto: null,
        createdAt: new Date().toISOString()
    };
    
    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if email already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email);
    if (existingUser) {
        alert('Email already registered. Please login or use a different email.');
        showLogin();
        return;
    }
    
    // Check if student ID already exists
    const existingStudentId = users.find(u => u.studentId === studentId);
    if (existingStudentId) {
        alert('Student ID already registered. Please use a different ID.');
        return;
    }
    
    // Add new user
    users.push(userData);
    localStorage.setItem('users', JSON.stringify(users));
    
    console.log('User registered successfully:', userData);
    
    // Show success message
    alert('Registration successful! Your account is pending admin verification. Please login.');
    
    // Redirect to login form
    showLogin();
    e.target.reset();
}

// Handle login form submission
function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email').trim().toLowerCase();
    const password = formData.get('password');
    
    // Validation
    if (!email || !password) {
        alert('Please enter both email and password');
        return;
    }
    
    // Get all users
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Find user with matching credentials
    const user = users.find(u => u.email.toLowerCase() === email && u.password === password);
    
    if (user) {
        console.log('Login successful:', user);
        
        // Set current user
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Small delay to ensure localStorage is written
        setTimeout(() => {
            // Redirect based on role
            if (user.role === 'admin') {
                window.location.href = 'admin.html';
            } else if (user.role === 'student') {
                window.location.href = 'user.html';
            }
        }, 100);
    } else {
        alert('Invalid email or password! Please check your credentials.');
        console.log('Login failed for email:', email);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Auth.js loaded');
    
    // Initialize default users
    initializeDefaultUsers();
    
    // Check for existing session
    checkExistingSession();
    
    // Get form elements
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');
    const showSignupLink = document.getElementById('showSignupLink');
    const showLoginLink = document.getElementById('showLoginLink');
    
    // Add event listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    if (showSignupLink) {
        showSignupLink.addEventListener('click', function(e) {
            e.preventDefault();
            showSignup();
        });
    }
    
    if (showLoginLink) {
        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            showLogin();
        });
    }
});