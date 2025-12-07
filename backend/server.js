require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { pool, initDB } = require('./config/db');

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://myclass-uoxo.onrender.com'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'OK', message: 'Server is running', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: 'Database connection failed' });
  }
});

// Routes
const authRoutes = require('./routes/auth');
const subjectRoutes = require('./routes/subjects');
const assignmentRoutes = require('./routes/assignments');
const notificationRoutes = require('./routes/notifications');
const chatRoutes = require('./routes/chat');
const announcementRoutes = require('./routes/announcements');
const leaveRequestRoutes = require('./routes/leaveRequests');

app.use('/api/admin', require('./routes/admin'));
app.use('/api/students', require('./routes/students'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/users', require('./routes/users'));

// Handle 404 - must be last
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Retry database connection
const connectWithRetry = async (maxRetries = 3, delay = 2000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      console.log(`Attempting to connect to PostgreSQL... (${i + 1}/${maxRetries})`);
      await pool.query('SELECT NOW()');
      console.log('✅ PostgreSQL Connected');
      return true;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      console.log(`⏳ Retry in ${delay / 1000} seconds...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Initialize database and start server
const startServer = async () => {
  let dbConnected = false;

  // Try to connect to database (non-blocking)
  connectWithRetry()
    .then(async () => {
      dbConnected = true;
      console.log('Initializing database tables...');
      try {
        await initDB();
        console.log('✅ Database initialized');
      } catch (error) {
        console.log('⚠️  Tables may already exist or initialization failed:', error.message);
      }
    })
    .catch((error) => {
      console.error('\n❌ Could not connect to database:', error.message);
      console.error('\n💡 Solutions:');
      console.error('   1. Check Neon dashboard - wake up the database if it\'s sleeping');
      console.error('   2. Verify network/VPN settings');
      console.error('   3. Create tables manually: Run backend/scripts/initTables.sql in Neon SQL editor');
      console.error('   4. The server will start, but API calls will fail until DB connects\n');
    });

  // Start server immediately (don't wait for DB)
  const PORT = process.env.PORT || 5001;
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    if (!dbConnected) {
      console.log('⚠️  Database connection pending - some features may not work');
      console.log('   Server will auto-connect when database becomes available\n');
    }
  });

  // Initialize Socket.io
  const { initSocket } = require('./socket/socketHandler');
  initSocket(server);
};

startServer();
