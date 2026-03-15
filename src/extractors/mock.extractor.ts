import { BaseExtractor } from './base.extractor';
import { StreamResponse } from '../types';

export class MockExtractor extends BaseExtractor {
  constructor() {
    super({
      name: 'Mock',
      baseUrl: 'https://example.com',
      headers: {},
      timeout: 5000
    });
  }

  async extract(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResponse> {
    console.log(`MockExtractor: Processing ${type} ${tmdbId}`);
    
    // Return a working mock stream URL for testing
    const mockStreamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
    
    return this.createSuccessResponse({
      streamUrl: mockStreamUrl,
      quality: '720p',
      subtitles: [{
        url: 'https://example.com/subtitle.vtt',
        language: 'en',
        label: 'English'
      }],
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
  }
}
