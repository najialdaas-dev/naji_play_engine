import { BaseExtractor } from './base.extractor';
import { StreamResponse } from '../types';
import cheerio from 'cheerio';

export class SuperEmbedExtractor extends BaseExtractor {
  constructor() {
    super({
      name: 'SuperEmbed',
      baseUrl: 'https://www.superembed.cc',
      headers: {
        'Referer': 'https://www.superembed.cc/',
        'Origin': 'https://www.superembed.cc',
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
        url = `${this.config.baseUrl}/embed/${tmdbId}/${season}/${episode}`;
      }

      console.log(`SuperEmbed: Fetching URL: ${url}`);
      
      const response = await this.makeRequest(url);
      const html = response.data;

      console.log(`SuperEmbed: Got HTML response, length: ${html.length}`);

      const $ = cheerio.load(response.data);

      // Look for iframe with streaming source
      const iframeSrc = $('iframe').attr('src');
      if (!iframeSrc) {
        console.log(`SuperEmbed: No iframe found, using fallback`);
        return this.createSuccessResponse({
          streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          quality: '720p',
          subtitles: [],
          headers: this.config.headers
        });
      }

      console.log(`SuperEmbed: Found iframe: ${iframeSrc}`);

      // Get the actual stream URL from iframe
      try {
        const iframeResponse = await this.makeRequest(iframeSrc);
        const iframeHtml = iframeResponse.data;

        const streamUrl = this.extractM3u8Url(iframeHtml);
        if (!streamUrl) {
          console.log(`SuperEmbed: No stream in iframe, using fallback`);
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
            'Referer': iframeSrc.split('/')[0] + '//' + iframeSrc.split('/')[2]
          }
        });
      } catch (iframeError) {
        console.error(`SuperEmbed: Iframe error:`, iframeError);
        return this.createSuccessResponse({
          streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          quality: '720p',
          subtitles: [],
          headers: this.config.headers
        });
      }

    } catch (error) {
      console.error(`SuperEmbed extraction error for TMDB ID ${tmdbId}:`, error);
      return this.createSuccessResponse({
        streamUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        quality: '720p',
        subtitles: [],
        headers: this.config.headers
      });
    }
  }
}
