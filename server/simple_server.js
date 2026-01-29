const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Try to load uuid, fallback if missing
let uuidv4;
try {
  uuidv4 = require('uuid').v4;
} catch (e) {
  uuidv4 = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());
// Serve uploaded images statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Storage
const TICKETS_FILE = path.join(__dirname, 'tickets.json');
let tickets = [];

// Load tickets from disk if available
try {
  if (fs.existsSync(TICKETS_FILE)) {
    const data = fs.readFileSync(TICKETS_FILE, 'utf8');
    tickets = JSON.parse(data);
    console.log(`Loaded ${tickets.length} tickets from disk.`);
  }
} catch (e) {
  console.error("Failed to load tickets", e);
}

function saveTickets() {
  try {
    fs.writeFileSync(TICKETS_FILE, JSON.stringify(tickets, null, 2));
  } catch (e) {
    console.error("Failed to save tickets", e);
  }
}

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)){
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Sanitize filename and prepend timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// AI Simulation Logic
function analyzeImage(file, description) {
  const desc = (description || '').toLowerCase();
  const filename = (file ? file.originalname : '').toLowerCase();
  
  // Default values - defaulting to pothole as it's the primary use case
  let type = 'pothole';
  let confidence = 0.85 + Math.random() * 0.1; // High confidence default
  let priority = 0.8;

  // Keyword matching overrides
  if (desc.includes('garbage') || desc.includes('trash') || desc.includes('rubbish') || desc.includes('waste') || filename.includes('waste')) {
    type = 'garbage';
    priority = 0.6;
    confidence = 0.8 + Math.random() * 0.15;
  } else if (desc.includes('light') || desc.includes('lamp') || desc.includes('dark') || desc.includes('street')) {
    type = 'lighting';
    priority = 0.7;
  } else if (desc.includes('water') || desc.includes('flood') || desc.includes('leak') || desc.includes('pipe')) {
    type = 'water';
    priority = 0.9; // Urgent
  } else if (desc.includes('safety') || desc.includes('accident') || desc.includes('crash') || desc.includes('danger')) {
    type = 'public_safety';
    priority = 0.95;
  } else if (desc.includes('pothole') || desc.includes('hole') || desc.includes('road') || desc.includes('crack') || filename.includes('pothole')) {
    // Explicit pothole confirmation
    type = 'pothole';
    priority = 0.85;
    confidence = 0.9 + Math.random() * 0.09;
  }

  return { type, confidence, priority };
}

// --- Routes ---

// Health check
app.get('/api/v1/health', (req, res) => res.json({ status: 'ok' }));

// List tickets
app.get('/api/v1/tickets', (req, res) => {
  res.json(tickets);
});

// Create ticket (JSON only)
app.post('/api/v1/tickets', (req, res) => {
  const body = req.body;
  const ticket = {
    ticketId: uuidv4(),
    type: body.type || 'pothole',
    description: body.description || 'User report',
    location: body.location && body.location.lat 
      ? { type: 'Point', coordinates: [Number(body.location.lng), Number(body.location.lat)] }
      : { type: 'Point', coordinates: [-74.0060, 40.7128] },
    status: 'Received',
    aiConfidence: typeof body.aiConfidence === 'number' ? body.aiConfidence : 0.85,
    priorityScore: typeof body.priorityScore === 'number' ? body.priorityScore : 0.5,
    votes: 0,
    imageUrl: body.imageUrl || '',
    createdAt: new Date().toISOString(),
  };
  tickets.push(ticket);
  saveTickets();
  res.status(201).json(ticket);
});

// Report endpoint (Multipart/form-data)
app.post('/api/v1/report', upload.single('image'), (req, res) => {
  try {
    const file = req.file;
    const body = req.body;
    
    // Parse location (multipart sends strings)
    let lat = 40.7128;
    let lng = -74.0060;
    if (body.lat && body.lng) {
      lat = parseFloat(body.lat);
      lng = parseFloat(body.lng);
    }

    // AI Analysis
    const aiResult = analyzeImage(file, body.description);
    
    const ticket = {
      ticketId: uuidv4(),
      type: aiResult.type,
      description: body.description || 'User report',
      location: { type: 'Point', coordinates: [lng, lat] },
      status: 'Received',
      aiConfidence: aiResult.confidence,
      priorityScore: aiResult.priority,
      votes: 0,
      // Store relative path (e.g., /uploads/filename.jpg)
      // Frontend will prepend http://localhost:4000
      imageUrl: file ? `/uploads/${file.filename}` : (body.imageUrl || ''),
      createdAt: new Date().toISOString(),
    };

    tickets.push(ticket);
    saveTickets();
    
    res.status(201).json({ 
      message: 'Report submitted successfully', 
      ticket: ticket 
    });
  } catch (error) {
    console.error("Error processing report:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Update status
app.put('/api/v1/tickets/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  
  const t = tickets.find(x => x.ticketId === id);
  if (!t) return res.status(404).json({ error: 'Not Found' });

  // Normalize status
  const valid = ['Received', 'Verifying', 'In Progress', 'Fixed'];
  // Map input to valid status
  let next = status;
  // Simple normalization if needed
  if (next === 'fixed') next = 'Fixed';

  t.status = next;
  const rewardPoints = next === 'Fixed' ? 50 : 0;
  
  saveTickets();
  res.json({ ok: true, ticket: t, rewardPoints });
});

// Seed data
app.post('/api/v1/seed', (req, res) => {
  // Add some demo data
  for (let i = 0; i < 5; i++) {
     tickets.push({
        ticketId: uuidv4(),
        type: i % 2 === 0 ? 'pothole' : 'garbage',
        description: 'Demo ticket ' + i,
        location: { type: 'Point', coordinates: [-74.0060 + i * 0.005, 40.7128 + i * 0.005] },
        status: 'Received',
        aiConfidence: 0.9,
        priorityScore: 0.7,
        votes: i,
        // Use external images for seeded data
        imageUrl: `https://picsum.photos/seed/civicflo${Date.now()}${i}/300/200`,
        createdAt: new Date().toISOString(),
      });
  }
  saveTickets();
  res.json({ ok: true, count: tickets.length });
});

app.listen(PORT, () => {
  console.log(`Express API server running at http://localhost:${PORT}/`);
  console.log(`Serving static files from ${path.join(__dirname, 'uploads')}`);
});
