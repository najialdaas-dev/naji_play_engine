import { MockExtractor } from '../extractors/mock.extractor';
import { VidSrcExtractor } from '../extractors/vidsrc.extractor';
import { VidLinkExtractor } from '../extractors/vidlink.extractor';
import { AutoEmbedExtractor } from '../extractors/autoembed.extractor';
import { TwoEmbedExtractor } from '../extractors/twoembed.extractor';
import { SuperEmbedExtractor } from '../extractors/superembed.extractor';
import { CloudflareExtractor } from '../extractors/cloudflare.extractor';
import { SimpleExtractor } from '../extractors/simple.extractor';
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
    this.extractors = [
      new SimpleExtractor(),       // Try simple extractor first (no Puppeteer)
      new TwoEmbedExtractor(),     // Try 2Embed second
      new SuperEmbedExtractor(),   // Try SuperEmbed third
      new VidSrcExtractor(),      // Try VidSrc fourth
      new VidLinkExtractor(),     // Try VidLink fifth
      new AutoEmbedExtractor(),   // Try AutoEmbed sixth
      new MockExtractor(),        // Fallback to working video
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
