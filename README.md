# Face Recognition Attendance Management System

A production-ready MERN-based Face Recognition Attendance Management System for colleges. This system uses face recognition technology to automatically mark student attendance through webcam scanning.

## 🚀 Features

### Student Side
- **Face Enrollment**: Students can register their face by providing Student ID and Name
- Camera-based face capture using face-api.js
- Secure storage of face embeddings (not images) in MongoDB

### Admin/Teacher Side
- **Admin Login**: JWT-based authentication system
- **Attendance Scanner**: Real-time face recognition through webcam
- Automatic attendance marking when recognized students appear
- Duplicate prevention within session
- **Attendance Dashboard**: 
  - View all attendance records
  - Filter by date, subject, or student ID
  - Export attendance data as CSV

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS, face-api.js, Axios, React Router
- **Backend**: Node.js, Express.js, MongoDB (Mongoose)
- **Authentication**: JWT (JSON Web Tokens)
- **Face Recognition**: face-api.js (TensorFlow.js models)

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

## 🔧 Installation

### 1. Clone the repository

```bash
cd ums
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/face-attendance
JWT_SECRET=your_super_secret_jwt_key_change_in_production
NODE_ENV=development
```

**For MongoDB Atlas**, update `MONGODB_URI`:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/face-attendance
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

Download face-api.js models:

1. Create a `models` folder in `frontend/public/`:
```bash
mkdir -p frontend/public/models
```

2. Download the following model files from [face-api.js models](https://github.com/justadudewhohacks/face-api.js/tree/master/weights):
   - `tiny_face_detector_model-weights_manifest.json`
   - `tiny_face_detector_model-shard1`
   - `face_landmark_68_model-weights_manifest.json`
   - `face_landmark_68_model-shard1`
   - `face_recognition_model-weights_manifest.json`
   - `face_recognition_model-shard1`
   - `face_recognition_model-shard2`

You can use this script to download them automatically:

```bash
cd frontend/public/models
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2
```

## 🚀 Running the Application

### Start MongoDB

**Local MongoDB:**
```bash
mongod
```

**MongoDB Atlas:** No local installation needed, just ensure your connection string is correct in `.env`

### Start Backend Server

```bash
cd backend
npm start
# or for development with auto-reload:
npm run dev
```

Backend will run on `http://localhost:5000`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:5173`

## 👤 Creating Admin Account

You need to create an admin account manually. You can use MongoDB shell or a database GUI:

```javascript
// Connect to MongoDB and use the database
use face-attendance

// Insert admin user (password will be hashed by bcrypt in the model)
// For now, insert with a plain password (the model will hash it)
// Better approach: Use a script or create via API endpoint

// Example using MongoDB shell:
db.admins.insertOne({
  email: "admin@college.edu",
  password: "$2a$10$..." // Use bcrypt to hash your password first
})
```

Or create a script `backend/scripts/createAdmin.js`:

```javascript
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const createAdmin = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const admin = new Admin({
    email: 'admin@college.edu',
    password: 'admin123' // Will be hashed automatically
  });
  await admin.save();
  console.log('Admin created successfully');
  process.exit(0);
};

createAdmin();
```

Run: `node backend/scripts/createAdmin.js`

## 📱 Usage

### Student Enrollment

1. Navigate to `/enroll`
2. Enter Student ID and Name
3. Click "Start Camera"
4. Position face in front of camera
5. Click "Capture Face"
6. Click "Enroll Student"

### Attendance Scanning

1. Navigate to `/scanner`
2. Select subject (optional)
3. Click "Start Scanner"
4. System automatically detects and marks attendance for recognized students
5. Click "Stop Scanner" when done

### View Attendance

1. Navigate to `/dashboard`
2. Use filters to search by date, subject, or student ID
3. Click "Export CSV" to download attendance data

## 🔒 Security Features

- JWT-based authentication
- Bcrypt password hashing
- No raw face images stored (only embeddings)
- Protected API routes
- Input validation and sanitization
- Duplicate attendance prevention

## 🎨 Design

- Clean, modern UI using Tailwind CSS
- Warm red (#e74c3c) as primary theme color
- Fully responsive design
- Toast notifications for user feedback

## 📁 Project Structure

```
ums/
├── backend/
│   ├── models/
│   │   ├── Student.js
│   │   ├── Attendance.js
│   │   └── Admin.js
│   ├── routes/
│   │   ├── admin.js
│   │   ├── students.js
│   │   └── attendance.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   └── .env
├── frontend/
│   ├── public/
│   │   └── models/ (face-api.js models)
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── Toast.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Enroll.jsx
│   │   │   ├── Scanner.jsx
│   │   │   └── Dashboard.jsx
│   │   ├── utils/
│   │   │   ├── api.js
│   │   │   └── faceUtils.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Admin
- `POST /api/admin/login` - Admin login

### Students
- `POST /api/students/enroll` - Enroll new student with face embedding
- `GET /api/students` - Get all students (protected)
- `GET /api/students/with-embeddings` - Get students with embeddings for matching (protected)

### Attendance
- `POST /api/attendance` - Mark attendance (protected)
- `GET /api/attendance` - Get attendance records with filters (protected)

## 🐛 Troubleshooting

### Camera not working
- Ensure HTTPS or localhost (required for camera access)
- Check browser permissions for camera access

### Models not loading
- Verify all model files are in `frontend/public/models/`
- Check browser console for errors
- Ensure models are downloaded from the correct face-api.js repository

### MongoDB connection error
- Verify MongoDB is running (if local)
- Check connection string in `.env`
- Ensure network access for MongoDB Atlas

## 📝 Notes

- Face recognition works best with good lighting and clear face visibility
- Confidence threshold is set to 0.6 (60%) - can be adjusted in `findBestMatch` function
- Attendance duplicate prevention: 5 minutes cooldown per student
- Only face embeddings (128 numbers) are stored, not actual images

## 🚀 Deployment

### Backend (Render/Heroku)

1. Set environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT`

2. Deploy backend code

### Frontend (Vercel/Netlify)

1. Set `VITE_API_URL` to your backend URL
2. Deploy frontend code
3. Ensure models folder is included in deployment

## 📄 License

MIT License

## 👨‍💻 Development

For development, use:
- Backend: `npm run dev` (auto-reload)
- Frontend: `npm run dev` (Vite dev server)

---

Built with ❤️ using React, Node.js, and face-api.js

# college_management_system
# college_management_system
