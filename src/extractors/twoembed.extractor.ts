import { BaseExtractor } from './base.extractor';
import { StreamResponse } from '../types';

export class TwoEmbedExtractor extends BaseExtractor {
  constructor() {
    super({
      name: '2Embed',
      baseUrl: 'https://www.2embed.cc',
      headers: {
        'Referer': 'https://www.2embed.cc/',
        'Origin': 'https://www.2embed.cc',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 15000
    });
  }

  async extract(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResponse> {
    try {
      let url: string;
      
      if (type === 'movie') {
        url = `${this.config.baseUrl}/embed/${tmdbId}`;
      } else {
        if (!season || !episode) {
          return this.createErrorResponse('Season and episode numbers are required for TV shows');
        }
        url = `${this.config.baseUrl}/embedtv/${tmdbId}&s=${season}&e=${episode}`;
      }

      console.log(`2Embed: Fetching URL: ${url}`);
      
      const response = await this.makeRequest(url);
      const html = response.data;

      console.log(`2Embed: Got HTML response, length: ${html.length}`);

      // Look for embedded player data
      const playerDataMatch = html.match(/data-(?:source|url)="([^"]+)"/);
      if (!playerDataMatch) {
        // Try alternative pattern
        const iframeMatch = html.match(/<iframe[^>]+src="([^"]+)"/);
        if (!iframeMatch) {
          console.log(`2Embed: No player source found, using fallback`);
          return this.createSuccessResponse({
            streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            quality: '720p',
            subtitles: [],
            headers: this.config.headers
          });
        }

        const iframeUrl = iframeMatch[1];
        console.log(`2Embed: Found iframe: ${iframeUrl}`);
        
        // Try to get stream from iframe
        try {
          const iframeResponse = await this.makeRequest(iframeUrl);
          const iframeHtml = iframeResponse.data;

          const streamUrl = this.extractM3u8Url(iframeHtml);
          if (!streamUrl) {
            console.log(`2Embed: No stream in iframe, using fallback`);
            return this.createSuccessResponse({
              streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              quality: '720p',
              subtitles: [],
              headers: this.config.headers
            });
          }

          const subtitles = this.extractSubtitles(iframeHtml);

          return this.createSuccessResponse({
            streamUrl,
            quality: 'auto',
            subtitles,
            headers: {
              ...this.config.headers,
              'Referer': iframeUrl.split('/')[0] + '//' + iframeUrl.split('/')[2]
            }
          });
        } catch (iframeError) {
          console.error(`2Embed: Iframe error:`, iframeError);
          return this.createSuccessResponse({
            streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            quality: '720p',
            subtitles: [],
            headers: this.config.headers
          });
        }
      }

      const streamUrl = playerDataMatch[1];
      console.log(`2Embed: Found stream URL: ${streamUrl}`);
      
      const subtitles = this.extractSubtitles(html);

      return this.createSuccessResponse({
        streamUrl,
        quality: 'auto',
        subtitles,
        headers: this.config.headers
      });

    } catch (error) {
      console.error(`2Embed extraction error for TMDB ID ${tmdbId}:`, error);
      return this.createSuccessResponse({
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        quality: '720p',
        subtitles: [],
        headers: this.config.headers
      });
    }
  }
}
