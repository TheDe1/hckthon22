const API_BASE = 'http://localhost:5000/api';

let isAuthInitialized = false;

function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(inputId + 'Icon');
    
    if (!input || !icon) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Switch between login and signup forms
function showSignup() {
    document.getElementById('loginForm')?.classList.remove('active');
    document.getElementById('signupForm')?.classList.add('active');
}

function showLogin() {
    document.getElementById('signupForm')?.classList.remove('active');
    document.getElementById('loginForm')?.classList.add('active');
}

// Basic input sanitization
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';
    return input.trim().replace(/[<>]/g, '');
}

// Email validation
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastEl = document.getElementById('toastNotification');
    
    if (!toastEl) {
        alert(message);
        return;
    }
    
    const toastBody = toastEl.querySelector('.toast-body');
    const toastHeader = toastEl.querySelector('.toast-header');
    
    if (toastBody) toastBody.textContent = message;
    
    // Set icon based on type
    if (toastHeader) {
        const icon = toastHeader.querySelector('i');
        if (icon) {
            icon.className = '';
            switch(type) {
                case 'success':
                    icon.className = 'fas fa-check-circle me-2 text-success';
                    break;
                case 'error':
                    icon.className = 'fas fa-exclamation-circle me-2 text-danger';
                    break;
                case 'warning':
                    icon.className = 'fas fa-exclamation-triangle me-2 text-warning';
                    break;
                default:
                    icon.className = 'fas fa-info-circle me-2 text-info';
            }
        }
    }
    
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData(e.target);
        const email = sanitizeInput(formData.get('email')).toLowerCase();
        const password = formData.get('password');
        
        if (!email || !password) {
            showToast('Please enter both email and password', 'error');
            submitBtn.disabled = false;
            return;
        }
        
        if (!isValidEmail(email)) {
            showToast('Please enter a valid email address', 'error');
            submitBtn.disabled = false;
            return;
        }
        
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showToast(data.error || 'Login failed', 'error');
            submitBtn.disabled = false;
            return;
        }
        
        // Store user data in localStorage
        localStorage.setItem('currentUser', JSON.stringify(data.user));
        
        showToast('Login successful! Redirecting...', 'success');
        
        // Redirect based on role
        setTimeout(() => {
            if (data.user.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'user.html';
            }
        }, 500);
        
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Please try again.', 'error');
        submitBtn.disabled = false;
    }
}

// Handle signup form submission
async function handleSignup(e) {
    e.preventDefault();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    
    try {
        const formData = new FormData(e.target);
        const studentId = sanitizeInput(formData.get('student_id'));
        const firstName = sanitizeInput(formData.get('first_name'));
        const lastName = sanitizeInput(formData.get('last_name'));
        const email = sanitizeInput(formData.get('email')).toLowerCase();
        const password = formData.get('password');
        const confirmPassword = formData.get('confirm_password');
        
        // Validate all fields
        if (!studentId || !firstName || !lastName || !email || !password) {
            showToast('Please fill in all fields', 'error');
            submitBtn.disabled = false;
            return;
        }
        
        if (!isValidEmail(email)) {
            showToast('Please enter a valid email address', 'error');
            submitBtn.disabled = false;
            return;
        }
        
        if (password.length < 6) {
            showToast('Password must be at least 6 characters long', 'error');
            submitBtn.disabled = false;
            return;
        }
        
        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            submitBtn.disabled = false;
            return;
        }
        
        const response = await fetch(`${API_BASE}/auth/signup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                student_id: studentId,
                first_name: firstName,
                last_name: lastName,
                email,
                password
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showToast(data.error || 'Registration failed', 'error');
            submitBtn.disabled = false;
            
            // If email already exists, show login form
            if (response.status === 409 && data.error.includes('Email')) {
                setTimeout(showLogin, 2000);
            }
            return;
        }
        
        showToast('Registration successful! Please login.', 'success');
        
        // Reset form and show login
        e.target.reset();
        setTimeout(showLogin, 1500);
        
    } catch (error) {
        console.error('Signup error:', error);
        showToast('Network error. Please try again.', 'error');
    } finally {
        submitBtn.disabled = false;
    }
}

// Check if user is already logged in
function checkExistingSession() {
    const currentUser = localStorage.getItem('currentUser');
    
    if (currentUser) {
        try {
            const user = JSON.parse(currentUser);
            const currentPath = window.location.pathname;
            

            if (currentPath.endsWith('index.html') || currentPath.endsWith('/')) {
                if (user.role === 'admin') {
                    window.location.href = 'admin.html';
                } else if (user.role === 'student') {
                    window.location.href = 'user.html';
                }
            }
        } catch (error) {
            console.error('Session check error:', error);
            localStorage.removeItem('currentUser');
        }
    }
}


document.addEventListener('DOMContentLoaded', function() {
    if (isAuthInitialized) return;
    isAuthInitialized = true;
    
    console.log('Initializing authentication system');
    

    checkExistingSession();
    

    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');
    const showSignupLink = document.getElementById('showSignupLink');
    const showLoginLink = document.getElementById('showLoginLink');
    
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
    
    console.log('Authentication system ready');
});


window.togglePassword = togglePassword;