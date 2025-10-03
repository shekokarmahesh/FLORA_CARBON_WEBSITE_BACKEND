// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// Parse JSON
app.use(express.json());

// --- CORS (lock to your frontends) ---
const allowed = [
  'http://localhost:5173',
  'https://floracarbon.netlify.app',
  'https://floracarbon.ai',
  'https://www.floracarbon.ai',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser tools (curl/Postman)
      if (!origin) return callback(null, true);

      if (allowed.includes(origin)) {
        return callback(null, true);
      }
      // Block everything else (safer in production)
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: false,
  })
);

// --- Database connect ---
mongoose
  .connect(process.env.MONGO_URI, { autoIndex: true })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

// --- Health check ---
app.get('/health', (_req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// --- Self-ping to keep server awake (optional) ---
if (process.env.NODE_ENV === 'production') {
  const https = require('https');
  const url = require('url');
  
  const pingSelf = () => {
    const serverUrl = process.env.SERVER_URL || 'https://flora-carbon-website-backend.onrender.com';
    const parsedUrl = url.parse(`${serverUrl}/health`);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 443,
      path: parsedUrl.path,
      method: 'GET',
      timeout: 10000
    };
    
    const req = https.request(options, (res) => {
      console.log(`Self-ping successful: ${res.statusCode}`);
    });
    
    req.on('error', (err) => {
      console.log('Self-ping failed:', err.message);
    });
    
    req.on('timeout', () => {
      console.log('Self-ping timeout');
      req.destroy();
    });
    
    req.end();
  };
  
  // Ping every 10 minutes
  setInterval(pingSelf, 10 * 60 * 1000);
  console.log('Self-ping mechanism activated');
}

// --- Routes ---
app.use('/api/auth', require('./routes/auth'));

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ API running on port ${PORT}`));
