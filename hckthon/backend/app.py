from flask import Flask, request, jsonify, session
from flask_cors import CORS
from datetime import datetime
import json
import os
import base64
import uuid

app = Flask(__name__)
app.secret_key = 'your-secret-key-here'
CORS(app, supports_credentials=True)


DATA_DIR = 'data'
USERS_FILE = os.path.join(DATA_DIR, 'users.json')
EVENTS_FILE = os.path.join(DATA_DIR, 'events.json')
ATTENDANCE_FILE = os.path.join(DATA_DIR, 'attendance.json')


os.makedirs(DATA_DIR, exist_ok=True)


def init_data_files():
    if not os.path.exists(USERS_FILE):
        default_admin = {
            'id': str(uuid.uuid4()),
            'email': 'hckthon2026@gmail.com',
            'password': 'hckthon2026',
            'role': 'admin',
            'firstName': 'Admin',
            'lastName': 'User',
            'createdAt': datetime.now().isoformat()
        }
        save_data(USERS_FILE, [default_admin])
    
    if not os.path.exists(EVENTS_FILE):
        save_data(EVENTS_FILE, [])
    
    if not os.path.exists(ATTENDANCE_FILE):
        save_data(ATTENDANCE_FILE, [])

def load_data(filename):
    try:
        with open(filename, 'r') as f:
            return json.load(f)
    except:
        return []

def save_data(filename, data):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email', '').lower().strip()
    password = data.get('password', '')
    
    if not email or not password:
        return jsonify({'error': 'Email and password required'}), 400
    
    users = load_data(USERS_FILE)
    user = next((u for u in users if u['email'].lower() == email and u['password'] == password), None)
    
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401
    
    # Don't send password to frontend
    user_data = {k: v for k, v in user.items() if k != 'password'}
    session['user_id'] = user['id']
    
    return jsonify({'user': user_data}), 200

@app.route('/api/auth/signup', methods=['POST'])
def signup():
    data = request.json
    
    # Validate required fields
    required = ['student_id', 'first_name', 'last_name', 'email', 'password']
    if not all(data.get(field) for field in required):
        return jsonify({'error': 'All fields are required'}), 400
    
    users = load_data(USERS_FILE)
    
    # Check for duplicates
    email = data['email'].lower().strip()
    student_id = data['student_id'].strip()
    
    if any(u['email'].lower() == email for u in users):
        return jsonify({'error': 'Email already registered'}), 409
    
    if any(u.get('studentId') == student_id for u in users):
        return jsonify({'error': 'Student ID already registered'}), 409
    
    # Create new user
    new_user = {
        'id': str(uuid.uuid4()),
        'studentId': student_id,
        'firstName': data['first_name'].strip(),
        'lastName': data['last_name'].strip(),
        'email': email,
        'password': data['password'],
        'role': 'student',
        'status': 'pending',
        'qrCode': None,
        'profilePhoto': None,
        'createdAt': datetime.now().isoformat()
    }
    
    users.append(new_user)
    save_data(USERS_FILE, users)
    
    return jsonify({'message': 'Registration successful'}), 201

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'message': 'Logged out'}), 200

# User Routes
@app.route('/api/users', methods=['GET'])
def get_users():
    users = load_data(USERS_FILE)
    # Remove passwords from response
    safe_users = [{k: v for k, v in u.items() if k != 'password'} for u in users]
    return jsonify(safe_users), 200

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    users = load_data(USERS_FILE)
    user = next((u for u in users if u['id'] == user_id), None)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    safe_user = {k: v for k, v in user.items() if k != 'password'}
    return jsonify(safe_user), 200

@app.route('/api/users/<user_id>', methods=['PUT'])
def update_user(user_id):
    data = request.json
    users = load_data(USERS_FILE)
    
    user_index = next((i for i, u in enumerate(users) if u['id'] == user_id), None)
    if user_index is None:
        return jsonify({'error': 'User not found'}), 404
    
    # Update allowed fields
    allowed_fields = ['firstName', 'lastName', 'email', 'profilePhoto']
    for field in allowed_fields:
        if field in data:
            users[user_index][field] = data[field]
    
    # Handle password update separately
    if 'newPassword' in data and data.get('currentPassword'):
        if users[user_index]['password'] == data['currentPassword']:
            users[user_index]['password'] = data['newPassword']
        else:
            return jsonify({'error': 'Current password incorrect'}), 400
    
    save_data(USERS_FILE, users)
    
    safe_user = {k: v for k, v in users[user_index].items() if k != 'password'}
    return jsonify(safe_user), 200

@app.route('/api/users/<user_id>', methods=['DELETE'])
def delete_user(user_id):
    users = load_data(USERS_FILE)
    users = [u for u in users if u['id'] != user_id]
    save_data(USERS_FILE, users)
    return jsonify({'message': 'User deleted'}), 200

@app.route('/api/users/<user_id>/verify', methods=['POST'])
def verify_user(user_id):
    data = request.json
    users = load_data(USERS_FILE)
    
    user_index = next((i for i, u in enumerate(users) if u['id'] == user_id), None)
    if user_index is None:
        return jsonify({'error': 'User not found'}), 404
    
    users[user_index]['status'] = 'verified'
    users[user_index]['qrCode'] = data.get('qrCode')
    
    save_data(USERS_FILE, users)
    
    safe_user = {k: v for k, v in users[user_index].items() if k != 'password'}
    return jsonify(safe_user), 200

@app.route('/api/users/<user_id>/role', methods=['PUT'])
def update_user_role(user_id):
    data = request.json
    new_role = data.get('role')
    
    if new_role not in ['admin', 'student']:
        return jsonify({'error': 'Invalid role'}), 400
    
    users = load_data(USERS_FILE)
    user_index = next((i for i, u in enumerate(users) if u['id'] == user_id), None)
    
    if user_index is None:
        return jsonify({'error': 'User not found'}), 404
    
    users[user_index]['role'] = new_role
    save_data(USERS_FILE, users)
    
    safe_user = {k: v for k, v in users[user_index].items() if k != 'password'}
    return jsonify(safe_user), 200

# Event Routes
@app.route('/api/events', methods=['GET'])
def get_events():
    events = load_data(EVENTS_FILE)
    return jsonify(events), 200

@app.route('/api/events', methods=['POST'])
def create_event():
    data = request.json
    
    required = ['name', 'description', 'date', 'startTime', 'endTime']
    if not all(data.get(field) for field in required):
        return jsonify({'error': 'All fields are required'}), 400
    
    events = load_data(EVENTS_FILE)
    
    new_event = {
        'id': str(uuid.uuid4()),
        'name': data['name'].strip(),
        'description': data['description'].strip(),
        'date': data['date'],
        'startTime': data['startTime'],
        'endTime': data['endTime'],
        'status': 'active',
        'createdAt': datetime.now().isoformat()
    }
    
    events.append(new_event)
    save_data(EVENTS_FILE, events)
    
    return jsonify(new_event), 201

@app.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    data = request.json
    events = load_data(EVENTS_FILE)
    
    event_index = next((i for i, e in enumerate(events) if e['id'] == event_id), None)
    if event_index is None:
        return jsonify({'error': 'Event not found'}), 404
    
    # Update allowed fields
    allowed_fields = ['name', 'description', 'date', 'startTime', 'endTime', 'status']
    for field in allowed_fields:
        if field in data:
            events[event_index][field] = data[field]
    
    save_data(EVENTS_FILE, events)
    return jsonify(events[event_index]), 200

@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    events = load_data(EVENTS_FILE)
    events = [e for e in events if e['id'] != event_id]
    save_data(EVENTS_FILE, events)
    
    # Also delete related attendance records
    attendance = load_data(ATTENDANCE_FILE)
    attendance = [a for a in attendance if a['eventId'] != event_id]
    save_data(ATTENDANCE_FILE, attendance)
    
    return jsonify({'message': 'Event deleted'}), 200

# Attendance Routes
@app.route('/api/attendance', methods=['GET'])
def get_attendance():
    attendance = load_data(ATTENDANCE_FILE)
    return jsonify(attendance), 200

@app.route('/api/attendance', methods=['POST'])
def record_attendance():
    data = request.json
    
    required = ['eventId', 'studentId']
    if not all(data.get(field) for field in required):
        return jsonify({'error': 'Event ID and Student ID required'}), 400
    
    attendance = load_data(ATTENDANCE_FILE)
    
    # Check for duplicate attendance
    existing = next((a for a in attendance 
                    if a['eventId'] == data['eventId'] 
                    and a['studentId'] == data['studentId']), None)
    
    if existing:
        return jsonify({'error': 'Attendance already recorded'}), 409
    
    # Get student info
    users = load_data(USERS_FILE)
    student = next((u for u in users if u['id'] == data['studentId']), None)
    
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    
    if student['status'] != 'verified':
        return jsonify({'error': 'Student not verified'}), 403
    
    new_attendance = {
        'id': str(uuid.uuid4()),
        'eventId': data['eventId'],
        'studentId': data['studentId'],
        'studentName': f"{student['firstName']} {student['lastName']}",
        'studentPhoto': student.get('profilePhoto'),
        'timestamp': datetime.now().isoformat()
    }
    
    attendance.append(new_attendance)
    save_data(ATTENDANCE_FILE, attendance)
    
    return jsonify(new_attendance), 201

@app.route('/api/attendance/<attendance_id>', methods=['DELETE'])
def delete_attendance(attendance_id):
    attendance = load_data(ATTENDANCE_FILE)
    attendance = [a for a in attendance if a['id'] != attendance_id]
    save_data(ATTENDANCE_FILE, attendance)
    return jsonify({'message': 'Attendance deleted'}), 200

# Stats Routes
@app.route('/api/stats/dashboard', methods=['GET'])
def get_dashboard_stats():
    users = load_data(USERS_FILE)
    events = load_data(EVENTS_FILE)
    attendance = load_data(ATTENDANCE_FILE)
    
    students = [u for u in users if u['role'] == 'student']
    pending = [u for u in students if u['status'] == 'pending']
    verified = [u for u in students if u['status'] == 'verified']
    
    stats = {
        'totalStudents': len(students),
        'pendingStudents': len(pending),
        'verifiedStudents': len(verified),
        'totalEvents': len(events),
        'totalAttendance': len(attendance)
    }
    
    return jsonify(stats), 200

if __name__ == '__main__':
    init_data_files()
    app.run(debug=True, port=5000)