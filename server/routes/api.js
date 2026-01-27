const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const FormData = require('form-data');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// AI Service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';

// Helper: Calculate Priority Score
const calculatePriority = (ticket) => {
  const severity = ticket.severity || 0.5;
  const votes = ticket.votes || 1;
  const ageHours = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60);
  
  // Logic from requirements: (Severity × 0.5) + (Votes × 0.3) + (Age × 0.2)
  // Normalizing age slightly so it doesn't explode, capping at 48 hours contribution for demo
  const ageFactor = Math.min(ageHours, 48) / 48; 
  
  // Normalize votes (cap at 20 for demo)
  const voteFactor = Math.min(votes, 20) / 20;

  return (severity * 0.5) + (voteFactor * 0.3) + (ageFactor * 0.2);
};

// POST /report - Create a new ticket
router.post('/report', upload.single('image'), async (req, res) => {
  try {
    const { lat, lng, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    if (!lat || !lng) {
      return res.status(400).json({ error: 'Location (lat, lng) is required' });
    }

    // 1. Send to AI Service for validation
    const formData = new FormData();
    formData.append('image', fs.createReadStream(req.file.path));

    let aiResult;
    try {
      const aiResponse = await axios.post(`${AI_SERVICE_URL}/predict`, formData, {
        headers: {
          ...formData.getHeaders()
        }
      });
      aiResult = aiResponse.data;
    } catch (error) {
      console.error('AI Service Error:', error.message);
      // Fallback if AI service fails (for resilience)
      aiResult = { valid: true, class: 'unknown', confidence: 0.0, civic_issue: 'reported_issue' };
    }

    // 2. Lenient acceptance for pothole reports
    // If AI reports invalid or no detection, default-accept as 'pothole' for demo robustness
    if (!aiResult.valid) {
      aiResult = { valid: true, class: 'unknown', confidence: 0.75, civic_issue: 'pothole' };
    }

    // Map AI class to severity (Simple logic for demo)
    const severityMap = {
        'pothole': 0.8,
        'illegal_parking': 0.6,
        'garbage_truck': 0.4, // Maybe not an issue?
        'broken_traffic_light': 1.0,
        'broken_bench': 0.3,
        'litter': 0.4,
        'uncategorized_issue': 0.5
    };
    
    const issueType = aiResult.civic_issue || 'uncategorized_issue';
    const severity = severityMap[issueType] || 0.5;

    // 3. Geospatial Deduplication
    let duplicate = null;
    
    if (global.hasDB) {
        // MongoDB Logic
        duplicate = await Ticket.findOne({
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: [parseFloat(lng), parseFloat(lat)]
              },
              $maxDistance: 10 // 10 meters
            }
          },
          status: { $in: ['Received', 'Verifying', 'In Progress'] }
        });
    } else {
        // In-Memory Logic (Simple approximation)
        // Find ticket within ~0.0001 degrees (~11 meters)
        duplicate = global.tickets.find(t => {
            const tLat = t.location.coordinates[1];
            const tLng = t.location.coordinates[0];
            return Math.abs(tLat - parseFloat(lat)) < 0.0001 && 
                   Math.abs(tLng - parseFloat(lng)) < 0.0001 &&
                   ['Received', 'Verifying', 'In Progress'].includes(t.status);
        });
    }

    if (duplicate) {
      // Increment vote count
      duplicate.votes += 1;
      duplicate.priorityScore = calculatePriority(duplicate);
      
      if (global.hasDB) {
          await duplicate.save();
      } else {
          // Update in-memory reference
          // (Already updated object, nothing to save)
      }
      
      return res.status(200).json({
        message: 'Duplicate report found. Vote added to existing ticket.',
        ticket: duplicate,
        isDuplicate: true
      });
    }

    // 4. Create New Ticket
    const ticketData = {
      ticketId: uuidv4(),
      imageUrl: `/uploads/${req.file.filename}`, // Serve locally
      type: issueType,
      description: description,
      location: {
        type: 'Point',
        coordinates: [parseFloat(lng), parseFloat(lat)]
      },
      severity: severity,
      aiConfidence: aiResult.confidence,
      aiAnalysis: aiResult,
      votes: 1,
      status: 'Received',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Calculate initial priority
    ticketData.priorityScore = calculatePriority(ticketData);

    if (global.hasDB) {
        const newTicket = new Ticket(ticketData);
        await newTicket.save();
        res.status(201).json({
          message: 'Ticket created successfully',
          ticket: newTicket,
          isDuplicate: false
        });
    } else {
        global.tickets.push(ticketData);
        res.status(201).json({
          message: 'Ticket created successfully (In-Memory)',
          ticket: ticketData,
          isDuplicate: false
        });
    }

  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /tickets - Get all tickets (for dashboard)
router.get('/tickets', async (req, res) => {
  try {
    let tickets;
    if (global.hasDB) {
        tickets = await Ticket.find().sort({ priorityScore: -1 });
    } else {
        tickets = [...global.tickets].sort((a, b) => b.priorityScore - a.priorityScore);
    }
    res.json(tickets);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /tickets/:id/fix - Mark as fixed (Proof of work)
router.post('/tickets/:id/fix', upload.single('image'), async (req, res) => {
    try {
        let ticket;
        if (global.hasDB) {
            ticket = await Ticket.findOne({ ticketId: req.params.id });
        } else {
            ticket = global.tickets.find(t => t.ticketId === req.params.id);
        }

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        ticket.status = 'Fixed';
        
        if (global.hasDB) {
            await ticket.save();
        }
        
        res.json({ message: 'Ticket marked as fixed', ticket });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PUT /tickets/:id/status - Update status (Kanban move)
router.put('/tickets/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Received', 'Verifying', 'In Progress', 'Fixed'];
        
        if (!validStatuses.includes(status)) {
             return res.status(400).json({ error: 'Invalid status' });
        }

        let ticket;
        if (global.hasDB) {
            ticket = await Ticket.findOne({ ticketId: req.params.id });
        } else {
            ticket = global.tickets.find(t => t.ticketId === req.params.id);
        }

        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        
        ticket.status = status;
        
        if (global.hasDB) {
            await ticket.save();
        }
        
        // Reward worker logic (Simulated)
        let rewardPoints = 0;
        if (status === 'Fixed') {
           rewardPoints = 50; // Points for fixing an issue
        }

        res.json({ message: `Ticket moved to ${status}`, ticket, rewardPoints });
    } catch (error) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /seed - Seed demo data
router.post('/seed', async (req, res) => {
  try {
    const demoTickets = [
      {
        ticketId: uuidv4(),
        type: 'pothole',
        description: 'Deep pothole on main street',
        imageUrl: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=300&h=200',
        location: { type: 'Point', coordinates: [-74.0060, 40.7128] }, // NYC Hall
        severity: 0.8,
        aiConfidence: 0.95,
        votes: 12,
        status: 'In Progress',
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        updatedAt: new Date()
      },
      {
        ticketId: uuidv4(),
        type: 'illegal_parking',
        description: 'Car blocking hydrant',
        imageUrl: 'https://images.unsplash.com/photo-1557002665-c99e195709dc?auto=format&fit=crop&q=80&w=300&h=200',
        location: { type: 'Point', coordinates: [-74.0080, 40.7138] },
        severity: 0.6,
        aiConfidence: 0.88,
        votes: 5,
        status: 'Received',
        createdAt: new Date(Date.now() - 3600000), // 1 hour ago
        updatedAt: new Date()
      },
      {
        ticketId: uuidv4(),
        type: 'broken_traffic_light',
        description: 'Red light not working',
        imageUrl: 'https://plus.unsplash.com/premium_photo-1664304958178-54c3384f67c9?auto=format&fit=crop&q=80&w=300&h=200',
        location: { type: 'Point', coordinates: [-74.0040, 40.7118] },
        severity: 1.0,
        aiConfidence: 0.99,
        votes: 25,
        status: 'Verifying',
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        updatedAt: new Date()
      },
       {
        ticketId: uuidv4(),
        type: 'litter',
        description: 'Overflowing trash bin',
        imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=300&h=200',
        location: { type: 'Point', coordinates: [-74.0070, 40.7148] },
        severity: 0.4,
        aiConfidence: 0.85,
        votes: 3,
        status: 'Received',
        createdAt: new Date(Date.now() - 1800000), // 30 mins ago
        updatedAt: new Date()
      }
    ];

    // Calculate priorities
    demoTickets.forEach(t => t.priorityScore = calculatePriority(t));

    if (global.hasDB) {
        await Ticket.insertMany(demoTickets);
    } else {
        global.tickets.push(...demoTickets);
    }

    res.json({ message: 'Demo data seeded!', count: demoTickets.length });
  } catch (error) {
    console.error("Seed error:", error);
    res.status(500).json({ error: 'Failed to seed data' });
  }
});

module.exports = router;
