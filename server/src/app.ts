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

// Test ElevenLabs connection
app.get('/api/test-elevenlabs', async (req, res) => {
  try {
    const { elevenlabsClient } = await import('./config/elevenlabs');
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      return res.json({ status: 'error', message: 'ELEVENLABS_API_KEY not set' });
    }
    // Try a minimal synthesis
    const audio = await elevenlabsClient.synthesize('Test.', 'Q4oILuo4P8VeXtE6FMLI');
    res.json({
      status: audio ? 'ok' : 'failed',
      keyPresent: true,
      keyPrefix: apiKey.substring(0, 8) + '...',
      audioBytes: audio ? audio.length : 0,
    });
  } catch (error) {
    res.json({ status: 'error', message: String(error) });
  }
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
