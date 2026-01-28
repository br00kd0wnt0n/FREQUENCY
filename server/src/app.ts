import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware - allow all origins for now (Railway deployments)
app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// REST routes (for non-realtime operations)
app.get('/api/frequencies', async (req, res) => {
  try {
    const { frequencyManager } = await import('./services/FrequencyManager');
    const map = await frequencyManager.getFrequencyMap();
    res.json(map);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch frequencies' });
  }
});

export default app;
