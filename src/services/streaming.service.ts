import { MockExtractor } from '../extractors/mock.extractor';
import { VidSrcExtractor } from '../extractors/vidsrc.extractor';
import { NuclearExtractor } from '../extractors/nuclear.extractor';
import { FastExtractor } from '../extractors/fast.extractor';
import { EmbedExtractor } from '../extractors/embed.extractor';
import { CacheService } from './cache.service';
import { StreamResponse } from '../types';

export class StreamingService {
  private extractors: any[] = [];
  private cache: CacheService;

  constructor() {
    this.cache = new CacheService();
    this.initializeExtractors();
  }

  private initializeExtractors(): void {
    console.log('🎬 Real Stream Mode - Extracting raw video URLs');
    this.extractors = [
      new NuclearExtractor(),      // 🎯 Real streaming links (primary)
      new FastExtractor(),       // ⚡ Fast backup
      new VidSrcExtractor(),      // � VidSrc extraction (backup)
      new EmbedExtractor(),       // 📱 Site embed players (fallback)
      new MockExtractor(),        // Final fallback
    ];
  }

  async getStream(
    tmdbId: string, 
    type: 'movie' | 'tv', 
    season?: number, 
    episode?: number
  ): Promise<StreamResponse> {
    console.log(`=== Starting stream extraction for ${type} ${tmdbId} ===`);
    
    // Check cache first
    const cached = this.cache.get(tmdbId, type, season, episode);
    if (cached && cached.success) {
      console.log(`Cache hit for ${type} ${tmdbId}`);
      return cached;
    }

    console.log(`Extracting stream for ${type} ${tmdbId}`);

    // Try each extractor in order (failover system)
    for (const extractor of this.extractors) {
      try {
        console.log(`Trying extractor: ${extractor.constructor.name}`);
        const result = await extractor.extract(tmdbId, type, season, episode);
        
        console.log(`Extractor ${extractor.constructor.name} result:`, result);
        
        if (result.success && result.sources.length > 0) {
          console.log(`Success with ${extractor.constructor.name}`);
          
          // Cache successful result
          this.cache.set(tmdbId, type, result, season, episode);
          
          return result;
        }
      } catch (error) {
        console.error(`Extractor ${extractor.constructor.name} failed:`, error);
        continue;
      }
    }

    // All extractors failed
    const errorResponse: StreamResponse = {
      success: false,
      sources: [],
      subtitles: [],
      error: 'All extraction sources failed. Please try again later.'
    };

    console.log(`All extractors failed for ${type} ${tmdbId}`);
    return errorResponse;
  }

  async getMultipleStreams(
    requests: Array<{
      tmdbId: string;
      type: 'movie' | 'tv';
      season?: number;
      episode?: number;
    }>
  ): Promise<StreamResponse[]> {
    const promises = requests.map(request => 
      this.getStream(request.tmdbId, request.type, request.season, request.episode)
    );

    return Promise.all(promises);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats() {
    return this.cache.getStats();
  }
}
