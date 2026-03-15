import axios from 'axios';
import { ExtractorConfig, ExtractedData, StreamResponse } from '../types';

interface AxiosResponse {
  data: any;
  status: number;
  statusText: string;
  headers: any;
}

export abstract class BaseExtractor {
  protected config: ExtractorConfig;

  constructor(config: ExtractorConfig) {
    this.config = config;
  }

  abstract extract(tmdbId: string, type: 'movie' | 'tv', season?: number, episode?: number): Promise<StreamResponse>;

  protected async makeRequest(url: string, customHeaders?: Record<string, string>): Promise<AxiosResponse> {
    const headers = {
      ...this.config.headers,
      ...customHeaders,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    return axios.get(url, {
      headers,
      timeout: this.config.timeout,
    });
  }

  protected decodeBase64(encoded: string): string {
    try {
      return Buffer.from(encoded, 'base64').toString('utf-8');
    } catch (error) {
      console.error('Base64 decode error:', error);
      return '';
    }
  }

  protected extractM3u8Url(text: string): string | null {
    const m3u8Regex = /https?:\/\/[^\s"']*\.m3u8[^\s"']*/g;
    const matches = text.match(m3u8Regex);
    return matches && matches.length > 0 ? matches[0] : null;
  }

  protected extractSubtitles(text: string): Array<{ url: string; language: string; label: string }> {
    const subtitles: Array<{ url: string; language: string; label: string }> = [];
    const vttRegex = /https?:\/\/[^\s"']*\.vtt[^\s"']*/g;
    const matches = text.match(vttRegex);
    
    if (matches) {
      matches.forEach((url, index) => {
        const language = this.extractLanguageFromUrl(url);
        subtitles.push({
          url,
          language,
          label: language.toUpperCase()
        });
      });
    }
    
    return subtitles;
  }

  private extractLanguageFromUrl(url: string): string {
    const langMatch = url.match(/[-_]([a-z]{2})[._]/i);
    return langMatch ? langMatch[1] : 'en';
  }

  protected createSuccessResponse(data: ExtractedData): StreamResponse {
    return {
      success: true,
      sources: [{
        url: data.streamUrl,
        quality: data.quality,
        format: data.streamUrl.includes('.m3u8') ? 'm3u8' : 'mp4',
        headers: data.headers
      }],
      subtitles: data.subtitles,
      headers: data.headers
    };
  }

  protected createErrorResponse(error: string): StreamResponse {
    return {
      success: false,
      sources: [],
      subtitles: [],
      error
    };
  }
}
