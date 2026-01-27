const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  status: {
    type: String,
    enum: ['Received', 'Verifying', 'In Progress', 'Fixed'],
    default: 'Received'
  },
  severity: {
    type: Number,
    default: 0.5 // Default medium severity if not determined
  },
  votes: {
    type: Number,
    default: 1
  },
  priorityScore: {
    type: Number,
    default: 0
  },
  aiConfidence: {
    type: Number
  },
  aiAnalysis: {
    type: Object
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create 2dsphere index for geospatial queries
TicketSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Ticket', TicketSchema);
