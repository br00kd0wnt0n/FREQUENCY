import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

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
