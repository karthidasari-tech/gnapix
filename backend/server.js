const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();

// Allowed Origins List
const allowedOrigins = [
  'http://localhost:3000',
  'https://gnapix-mu.vercel.app',
  'https://gnapix-cfntnsvo2-gnapix.vercel.app',
  'https://gnapix-ixp8-1dy9le86a-gnapix.vercel.app'
];

// Corrected CORS Configuration
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors()); // Enable pre-flight across-the-board
app.use(express.json());