const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const apiRoutes = require('./routes/api');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/civicflo';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/v1', apiRoutes);

// Health check
app.get('/', (req, res) => {
  res.send('CivicFlo Backend is running');
});

// Database Connection
const startServer = async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000 // Fail fast if no DB
    });
    console.log('MongoDB connected');
    global.hasDB = true;
  } catch (err) {
    console.warn('⚠️ MongoDB connection failed. Starting in IN-MEMORY MODE (Data will be lost on restart).');
    console.error('Error:', err.message);
    global.hasDB = false;
    global.tickets = []; // In-memory store
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Mode: ${global.hasDB ? 'Persistent (MongoDB)' : 'Demo (In-Memory)'}`);
  });
};

startServer();
