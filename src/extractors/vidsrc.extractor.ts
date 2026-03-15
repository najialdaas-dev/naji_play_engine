import { BaseExtractor } from './base.extractor';
import { StreamResponse } from '../types';

export class VidSrcExtractor extends BaseExtractor {
  constructor() {
    super({
      name: 'VidSrc',
      baseUrl: 'https://vidsrc-embed.ru',
      headers: {
        'Referer': 'https://vidsrc-embed.ru/',
        'Origin': 'https://vidsrc-embed.ru'
      },
      timeout: 15000
    });
  }

  async extract(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResponse> {
    try {
      let embedUrl: string;
      
      if (type === 'movie') {
        embedUrl = `${this.config.baseUrl}/embed/movie/${tmdbId}`;
      } else {
        if (!season || !episode) {
          return this.createErrorResponse('Season and episode numbers are required for TV shows');
        }
        embedUrl = `${this.config.baseUrl}/embed/tv/${tmdbId}/${season}-${episode}`;
      }

      console.log(`VidSrc: Fetching embed URL: ${embedUrl}`);
      
      const response = await this.makeRequest(embedUrl);
      const html = response.data;

      // Extract iframe or video sources from the embed page
      const streamUrl = this.extractStreamUrl(html);
      if (!streamUrl) {
        return this.createErrorResponse('No stream URL found in embed page');
      }

      const subtitles = this.extractSubtitles(html);

      return this.createSuccessResponse({
        streamUrl,
        quality: 'auto',
        subtitles,
        headers: this.config.headers
      });

    } catch (error) {
      console.error(`VidSrc extraction error for TMDB ID ${tmdbId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResponse(`VidSrc extraction failed: ${errorMessage}`);
    }
  }

  private extractStreamUrl(html: string): string | null {
    // Try multiple patterns to find stream URLs
    
    // Pattern 1: Direct iframe sources
    const iframeRegex = /<iframe[^>]+src=["']([^"']+)["']/i;
    const iframeMatch = html.match(iframeRegex);
    if (iframeMatch && iframeMatch[1]) {
      const src = iframeMatch[1];
      if (src.includes('m3u8') || src.includes('mp4')) {
        return src;
      }
    }

    // Pattern 2: Script variables with URLs
    const scriptRegex = /(?:source|src|url)["\s]*[:=]["\s]*([^"']+\.(?:m3u8|mp4)[^"']*)["\s]/i;
    const scriptMatch = html.match(scriptRegex);
    if (scriptMatch && scriptMatch[1]) {
      return scriptMatch[1];
    }

    // Pattern 3: JSON data with URLs
    const jsonRegex = /{[^}]*["'](?:url|src|source)["']\s*:\s*["']([^"']+\.(?:m3u8|mp4)[^"']*)["'][^}]*}/i;
    const jsonMatch = html.match(jsonRegex);
    if (jsonMatch && jsonMatch[1]) {
      return jsonMatch[1];
    }

    // Pattern 4: General m3u8/mp4 URL extraction
    const urlRegex = /https?:\/\/[^\s"'<>]*\.(?:m3u8|mp4)[^\s"'<>]*/i;
    const urlMatch = html.match(urlRegex);
    if (urlMatch && urlMatch[0]) {
      return urlMatch[0];
    }

    return null;
  }
}
