import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: ['http://localhost:3000', 'https://yourdomain.com'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Main streaming endpoint
app.post('/api/stream', async (req, res) => {
  try {
    const { tmdbId, type, season, episode } = req.body;

    // Validate required parameters
    if (!tmdbId || !type) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: tmdbId and type are required'
      });
    }

    // Validate type
    if (!['movie', 'tv'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be "movie" or "tv"'
      });
    }

    // For TV shows, validate season and episode
    if (type === 'tv' && (!season || !episode)) {
      return res.status(400).json({
        success: false,
        error: 'TV shows require season and episode numbers'
      });
    }

    console.log(`Processing request: ${type} ${tmdbId}${type === 'tv' ? ` S${season}E${episode}` : ''}`);

    // Mock response for now
    const result = {
      success: true,
      sources: [{
        url: 'https://example.com/stream.m3u8',
        quality: '1080p',
        format: 'm3u8',
        headers: {
          'Referer': 'https://example.com'
        }
      }],
      subtitles: [{
        url: 'https://example.com/subtitle.vtt',
        language: 'ar',
        label: 'Arabic'
      }]
    };

    res.json(result);

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      sources: [],
      subtitles: []
    });
  }
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Naji Play Engine running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🎬 Streaming API: http://localhost:${PORT}/api/stream`);
});

export default app;
