import { BaseExtractor } from './base.extractor';
import { StreamResponse } from '../types';
import axios from 'axios';

export class VidLinkExtractor extends BaseExtractor {
  constructor() {
    super({
      name: 'VidLink',
      baseUrl: 'https://vidlink.pro',
      headers: {
        'Referer': 'https://vidlink.pro/',
        'Origin': 'https://vidlink.pro'
      },
      timeout: 10000
    });
  }

  async extract(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResponse> {
    try {
      let url: string;
      
      if (type === 'movie') {
        url = `${this.config.baseUrl}/movie/${tmdbId}`;
      } else {
        if (!season || !episode) {
          return this.createErrorResponse('Season and episode numbers are required for TV shows');
        }
        url = `${this.config.baseUrl}/tv/${tmdbId}/${season}-${episode}`;
      }

      const response = await this.makeRequest(url);
      const html = response.data;

      const streamUrl = this.extractM3u8Url(html);
      if (!streamUrl) {
        return this.createErrorResponse('No stream URL found');
      }

      const subtitles = this.extractSubtitles(html);

      return this.createSuccessResponse({
        streamUrl,
        quality: 'auto',
        subtitles,
        headers: this.config.headers
      });

    } catch (error) {
      console.error(`VidLink extraction error for TMDB ID ${tmdbId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(`VidLink extraction failed: ${errorMessage}`);
    }
  }
}
