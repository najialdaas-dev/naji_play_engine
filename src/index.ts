import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { StreamingService } from './services/streaming.service';

const app = express();
const PORT = process.env.PORT || 3001;
const streamingService = new StreamingService();

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://yourdomain.com',
    'http://localhost:8080',     // Flutter web development
    'http://127.0.0.1:8080',    // Flutter web development
    'https://localhost:8080',    // Flutter web development (HTTPS)
    'https://127.0.0.1:8080',   // Flutter web development (HTTPS)
    'capacitor://localhost',       // Capacitor (mobile app)
    'http://localhost:3000',      // Local development
    'http://192.168.0.181:3001',  // Local IP for mobile access
    'http://192.168.0.*',         // Allow all local network
    'http://10.0.2.2:8080',       // Android emulator
    'http://10.0.3.2:8080',       // Android emulator alternative
    'https://naji-play-engine-s3j7.onrender.com' // Production URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
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
    uptime: process.uptime(),
    cache: streamingService.getCacheStats()
  });
});

// Extract stream from VidSrc embed URL
app.post('/api/extract', async (req, res) => {
  try {
    const { embedUrl } = req.body;
    
    if (!embedUrl) {
      return res.status(400).json({
        success: false,
        error: 'embedUrl is required'
      });
    }

    console.log(`=== Starting extraction from embed URL ===`);
    console.log(`Embed URL: ${embedUrl}`);

    // Extract TMDB ID and type from embed URL
    const movieMatch = embedUrl.match(/\/movie\/(\d+)/);
    const tvMatch = embedUrl.match(/\/tv\/(\d+)\/(\d+)\/(\d+)/);
    
    let tmdbId: string;
    let type: 'movie' | 'tv';
    let seasonNum: number | undefined;
    let episodeNum: number | undefined;

    if (movieMatch) {
      tmdbId = movieMatch[1];
      type = 'movie';
    } else if (tvMatch) {
      tmdbId = tvMatch[1];
      type = 'tv';
      seasonNum = parseInt(tvMatch[2]);
      episodeNum = parseInt(tvMatch[3]);
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid embed URL format'
      });
    }

    console.log(`Extracted: TMDB ID=${tmdbId}, Type=${type}, Season=${seasonNum}, Episode=${episodeNum}`);

    // Use streaming service to extract real stream
    const result = await streamingService.getStream(tmdbId, type, seasonNum, episodeNum);

    console.log(`=== Extraction complete ===`);
    res.json(result);

  } catch (error) {
    console.error('Extraction error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during extraction'
    });
  }
});

// Main streaming endpoint
app.post('/api/stream', async (req, res) => {
  try {
    console.log(`=== API Request Received ===`);
    console.log(`Body:`, req.body);
    
    const { tmdbId, type, season, episode } = req.body;

    // Validate required parameters
    if (!tmdbId || !type) {
      console.log(`Validation failed: missing tmdbId or type`);
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: tmdbId and type are required'
      });
    }

    // Validate type
    if (!['movie', 'tv'].includes(type)) {
      console.log(`Validation failed: invalid type ${type}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Must be "movie" or "tv"'
      });
    }

    // For TV shows, validate season and episode
    if (type === 'tv' && (!season || !episode)) {
      console.log(`Validation failed: TV show missing season or episode`);
      return res.status(400).json({
        success: false,
        error: 'TV shows require season and episode numbers'
      });
    }

    console.log(`Processing request: ${type} ${tmdbId}${type === 'tv' ? ` S${season}E${episode}` : ''}`);

    const result = await streamingService.getStream(
      tmdbId.toString(),
      type as 'movie' | 'tv',
      season ? parseInt(season.toString()) : undefined,
      episode ? parseInt(episode.toString()) : undefined
    );

    console.log(`Final result:`, result);

    if (result.success) {
      res.json(result);
    } else {
      res.status(404).json(result);
    }

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

// Batch streaming endpoint
app.post('/api/stream/batch', async (req, res) => {
  try {
    const { requests } = req.body;

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid requests array'
      });
    }

    const results = await streamingService.getMultipleStreams(requests);
    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Batch API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Cache management endpoints
app.post('/api/cache/clear', (req, res) => {
  streamingService.clearCache();
  res.json({
    success: true,
    message: 'Cache cleared successfully'
  });
});

app.get('/api/cache/stats', (req, res) => {
  res.json({
    success: true,
    stats: streamingService.getCacheStats()
  });
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
  console.log(`🔄 Cache stats: http://localhost:${PORT}/api/cache/stats`);
});

export default app;
