import { BaseExtractor } from './base.extractor';
import { StreamResponse } from '../types';
import cheerio from 'cheerio';

export class AutoEmbedExtractor extends BaseExtractor {
  constructor() {
    super({
      name: 'AutoEmbed',
      baseUrl: 'https://autoembed.cc',
      headers: {
        'Referer': 'https://autoembed.cc/',
        'Origin': 'https://autoembed.cc'
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
        url = `${this.config.baseUrl}/tv/${tmdbId}/${season}/${episode}`;
      }

      const response = await this.makeRequest(url);
      const $ = cheerio.load(response.data);

      // Look for iframe with streaming source
      const iframeSrc = $('iframe').attr('src');
      if (!iframeSrc) {
        return this.createErrorResponse('No iframe source found');
      }

      // Get the actual stream URL from iframe
      const iframeResponse = await this.makeRequest(iframeSrc);
      const iframeHtml = iframeResponse.data;

      const streamUrl = this.extractM3u8Url(iframeHtml);
      if (!streamUrl) {
        return this.createErrorResponse('No stream URL found in iframe');
      }

      const subtitles = this.extractSubtitles(iframeHtml);

      return this.createSuccessResponse({
        streamUrl,
        quality: 'auto',
        subtitles,
        headers: {
          ...this.config.headers,
          'Referer': iframeSrc.split('/')[0] + '//' + iframeSrc.split('/')[2]
        }
      });

    } catch (error) {
      console.error(`AutoEmbed extraction error for TMDB ID ${tmdbId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(`AutoEmbed extraction failed: ${errorMessage}`);
    }
  }
}
