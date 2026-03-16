import { BaseExtractor } from './base.extractor';
import { StreamResponse } from '../types';

export class EmbedExtractor extends BaseExtractor {
  constructor() {
    super({
      name: 'Embed',
      baseUrl: 'https://vidsrc.to',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 15000
    });
  }

  async extract(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResponse> {
    try {
      console.log(`🎬 EmbedExtractor: Creating embed player for ${type} ${tmdbId}`);
      
      // Return embed URLs directly - WebView will handle Cloudflare
      const embedSources = [
        {
          // Source 1: Vidsrc embed (best quality)
          url: type === 'movie' 
            ? `https://vidsrc.to/embed/movie/${tmdbId}`
            : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`,
          quality: 'auto',
          isEmbed: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        },
        {
          // Source 2: 2embed embed (1080p)
          url: type === 'movie'
            ? `https://www.2embed.cc/embed/${tmdbId}`
            : `https://www.2embed.cc/embedtv/${tmdbId}&s=${season}&e=${episode}`,
          quality: '1080p',
          isEmbed: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        },
        {
          // Source 3: Vidsrc pro embed (alternative)
          url: type === 'movie'
            ? `https://vidsrc.pro/embed/movie/${tmdbId}`
            : `https://vidsrc.pro/embed/tv/${tmdbId}/${season}/${episode}`,
          quality: '720p',
          isEmbed: true,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      ];

      // Just return the first embed URL - no testing needed
      const selectedEmbed = embedSources[0];
      console.log(`✅ EmbedExtractor: Returning embed URL: ${selectedEmbed.url}`);
      
      return this.createSuccessResponse({
        streamUrl: selectedEmbed.url,
        quality: selectedEmbed.quality,
        subtitles: [{
          url: 'https://example.com/subtitle.vtt',
          language: 'ar',
          label: '🇸🇦 العربية'
        }],
        headers: selectedEmbed.headers,
        isEmbed: selectedEmbed.isEmbed
      });

    } catch (error) {
      console.error(`💥 EmbedExtractor: Error:`, error);
      
      // Return first embed URL even on error
      const fallbackUrl = type === 'movie' 
        ? `https://vidsrc.to/embed/movie/${tmdbId}`
        : `https://vidsrc.to/embed/tv/${tmdbId}/${season}/${episode}`;
      
      return this.createSuccessResponse({
        streamUrl: fallbackUrl,
        quality: 'auto',
        subtitles: [{
          url: 'https://example.com/subtitle.vtt',
          language: 'ar',
          label: '🇸🇦 العربية'
        }],
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        isEmbed: true
      });
    }
  }
}
